import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useChatRealtime } from "../hooks/useChatRealtime";
import notificationApi, {
  normalizeNotification,
} from "../services/apis/notificationApi";
import { notifyPostCatalogChanged } from "../utils/postCatalogEvents";
import NotificationContext from "./notification-context";

const PREVIEW_PAGE_SIZE = 8;

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const getPayloadUnreadCount = (payload) => {
  const source = payload?.data ?? payload ?? {};
  const raw = source.unreadCount ?? source.UnreadCount;

  if (raw === undefined || raw === null) return null;

  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
};

const mergeNotifications = (primary, secondary) => {
  const ids = new Set();

  return [...primary, ...secondary]
    .filter((item) => {
      if (!item || ids.has(item.notificationId)) return false;
      ids.add(item.notificationId);
      return true;
    })
    .slice(0, PREVIEW_PAGE_SIZE);
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { subscribe, reconnectVersion } = useChatRealtime();

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [toastNotification, setToastNotification] = useState(null);

  const processedCreatedIdsRef = useRef(new Set());
  const mutationVersionRef = useRef(0);
  const listRequestRef = useRef({ id: 0, controller: null });
  const countRequestIdRef = useRef(0);

  const rememberNotificationId = useCallback((notificationId) => {
    const ids = processedCreatedIdsRef.current;
    ids.add(notificationId);

    if (ids.size > 500) {
      const oldest = ids.values().next().value;
      if (oldest) ids.delete(oldest);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return 0;
    }

    const requestId = countRequestIdRef.current + 1;
    countRequestIdRef.current = requestId;
    let count = 0;

    while (countRequestIdRef.current === requestId) {
      const mutationVersion = mutationVersionRef.current;
      count = await notificationApi.getUnreadCount();

      if (countRequestIdRef.current !== requestId) break;

      if (mutationVersionRef.current === mutationVersion) {
        setUnreadCount(count);
        break;
      }
    }

    return count;
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setRecentNotifications([]);
      setNotificationsError("");
      setNotificationsLoading(false);
      return null;
    }

    listRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = listRequestRef.current.id + 1;
    const mutationVersion = mutationVersionRef.current;
    listRequestRef.current = { id: requestId, controller };

    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const [page] = await Promise.all([
        notificationApi.getMine({
          pageNumber: 1,
          pageSize: PREVIEW_PAGE_SIZE,
          signal: controller.signal,
        }),
        refreshUnreadCount(),
      ]);

      if (
        controller.signal.aborted ||
        listRequestRef.current.id !== requestId
      ) {
        return null;
      }

      page.items.forEach((item) => rememberNotificationId(item.notificationId));
      setRecentNotifications((current) =>
        mutationVersionRef.current === mutationVersion
          ? page.items.slice(0, PREVIEW_PAGE_SIZE)
          : mergeNotifications(current, page.items),
      );

      return page;
    } catch (error) {
      if (
        !controller.signal.aborted &&
        !isCanceledRequest(error) &&
        listRequestRef.current.id === requestId
      ) {
        setNotificationsError("Không thể tải thông báo lúc này.");
      }
      return null;
    } finally {
      if (listRequestRef.current.id === requestId) {
        setNotificationsLoading(false);
      }
    }
  }, [isAuthenticated, refreshUnreadCount, rememberNotificationId]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    const result = await notificationApi.markAsRead(notificationId);
    mutationVersionRef.current += 1;
    setUnreadCount(result.unreadCount);
    setRecentNotifications((current) =>
      current.map((item) =>
        item.notificationId === notificationId
          ? { ...item, isRead: true }
          : item,
      ),
    );
    return result;
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    const result = await notificationApi.markAllAsRead();
    mutationVersionRef.current += 1;
    setUnreadCount(result.unreadCount);
    setRecentNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    );
    return result;
  }, []);

  const dismissNotificationToast = useCallback((notificationId) => {
    setToastNotification((current) =>
      !notificationId || current?.notificationId === notificationId
        ? null
        : current,
    );
  }, []);

  useEffect(() => {
    processedCreatedIdsRef.current.clear();
    mutationVersionRef.current += 1;
    countRequestIdRef.current += 1;
    listRequestRef.current.controller?.abort();
    listRequestRef.current = {
      id: listRequestRef.current.id + 1,
      controller: null,
    };

    if (!isAuthenticated) {
      const resetTimeoutId = window.setTimeout(() => {
        setUnreadCount(0);
        setRecentNotifications([]);
        setToastNotification(null);
        setNotificationsError("");
        setNotificationsLoading(false);
      }, 0);
      return () => window.clearTimeout(resetTimeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      void refreshNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      listRequestRef.current.controller?.abort();
    };
  }, [isAuthenticated, refreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const handleCreated = (payload) => {
      const item = normalizeNotification(payload);

      if (!item) {
        void refreshNotifications();
        return;
      }

      if (processedCreatedIdsRef.current.has(item.notificationId)) return;

      rememberNotificationId(item.notificationId);
      mutationVersionRef.current += 1;

      if (item.targetType === "post" && item.targetId) {
        notifyPostCatalogChanged({ postId: item.targetId, reason: "notification" });
      }

      setRecentNotifications((current) =>
        mergeNotifications([item], current),
      );
      setToastNotification(item);

      if (!item.isRead) setUnreadCount((current) => current + 1);
    };

    const handleRead = (payload) => {
      const source = payload?.data ?? payload ?? {};
      const notificationId = String(
        source.notificationId ?? source.NotificationId ?? "",
      ).trim();
      const exactCount = getPayloadUnreadCount(payload);

      mutationVersionRef.current += 1;
      if (notificationId) {
        setRecentNotifications((current) =>
          current.map((item) =>
            item.notificationId === notificationId
              ? { ...item, isRead: true }
              : item,
          ),
        );
      }

      if (exactCount !== null) setUnreadCount(exactCount);
      else void refreshUnreadCount().catch(() => {});
    };

    const handleAllRead = (payload) => {
      mutationVersionRef.current += 1;
      setRecentNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true })),
      );
      setUnreadCount(getPayloadUnreadCount(payload) ?? 0);
    };

    const unsubscribers = [
      subscribe("NotificationCreated", handleCreated),
      subscribe("NotificationRead", handleRead),
      subscribe("NotificationsReadAll", handleAllRead),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    subscribe,
    isAuthenticated,
    refreshNotifications,
    refreshUnreadCount,
    rememberNotificationId,
  ]);

  useEffect(() => {
    if (!isAuthenticated || reconnectVersion <= 0) return undefined;

    const timeoutId = window.setTimeout(() => {
      void refreshNotifications();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated, reconnectVersion, refreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshNotifications();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAuthenticated, refreshNotifications]);

  const contextValue = useMemo(
    () => ({
      unreadCount,
      recentNotifications,
      notificationsLoading,
      notificationsError,
      toastNotification,
      refreshUnreadCount,
      refreshNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      dismissNotificationToast,
    }),
    [
      unreadCount,
      recentNotifications,
      notificationsLoading,
      notificationsError,
      toastNotification,
      refreshUnreadCount,
      refreshNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      dismissNotificationToast,
    ],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;

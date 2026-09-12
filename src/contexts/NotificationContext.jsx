import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { useChatRealtime } from "../hooks/useChatRealtime";
import notificationApi, {
  normalizeNotification,
} from "../services/apis/notificationApi";
import NotificationContext from "./notification-context";

const getPayloadUnreadCount = (
  payload,
) => {
  const source =
    payload?.data ??
    payload ??
    {};

  const raw =
    source.unreadCount ??
    source.UnreadCount;

  if (
    raw === undefined ||
    raw === null
  ) {
    return null;
  }

  const value =
    Number(raw);

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
};

export const NotificationProvider = ({
  children,
}) => {
  const {
    isAuthenticated,
  } = useAuth();

  const {
    connection,
    reconnectVersion,
  } = useChatRealtime();

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const processedCreatedIdsRef =
    useRef(new Set());

  const refreshUnreadCount =
    useCallback(
      async () => {
        if (!isAuthenticated) {
          setUnreadCount(0);
          return 0;
        }

        const count =
          await notificationApi
            .getUnreadCount();

        setUnreadCount(
          count,
        );

        return count;
      },
      [isAuthenticated],
    );

  const markNotificationAsRead =
    useCallback(
      async (notificationId) => {
        const result =
          await notificationApi
            .markAsRead(
              notificationId,
            );

        setUnreadCount(
          result.unreadCount,
        );

        return result;
      },
      [],
    );

  const markAllNotificationsAsRead =
    useCallback(
      async () => {
        const result =
          await notificationApi
            .markAllAsRead();

        setUnreadCount(
          result.unreadCount,
        );

        return result;
      },
      [],
    );

  useEffect(() => {
    const processedIds =
      processedCreatedIdsRef.current;

    processedIds.clear();

    if (!isAuthenticated) {
      return undefined;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          void refreshUnreadCount()
            .catch(() => {
              /*
               * Badge không được làm hỏng
               * phần còn lại của giao diện.
               */
            });
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    isAuthenticated,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    if (
      !connection ||
      !isAuthenticated
    ) {
      return undefined;
    }

    const processedIds =
      processedCreatedIdsRef.current;

    const handleCreated = (
      payload,
    ) => {
      const item =
        normalizeNotification(
          payload,
        );

      if (!item) {
        void refreshUnreadCount()
          .catch(() => {});
        return;
      }

      if (
        processedIds.has(
          item.notificationId,
        )
      ) {
        return;
      }

      processedIds.add(
        item.notificationId,
      );

      if (
        processedIds.size > 500
      ) {
        const oldest =
          processedIds
            .values()
            .next()
            .value;

        if (oldest) {
          processedIds.delete(
            oldest,
          );
        }
      }

      if (!item.isRead) {
        setUnreadCount(
          (current) =>
            current + 1,
        );
      }
    };

    const handleRead = (
      payload,
    ) => {
      const exactCount =
        getPayloadUnreadCount(
          payload,
        );

      if (exactCount !== null) {
        setUnreadCount(
          exactCount,
        );
        return;
      }

      void refreshUnreadCount()
        .catch(() => {});
    };

    const handleAllRead = (
      payload,
    ) => {
      const exactCount =
        getPayloadUnreadCount(
          payload,
        );

      setUnreadCount(
        exactCount ?? 0,
      );
    };

    connection.on(
      "NotificationCreated",
      handleCreated,
    );

    connection.on(
      "NotificationRead",
      handleRead,
    );

    connection.on(
      "NotificationsReadAll",
      handleAllRead,
    );

    return () => {
      connection.off(
        "NotificationCreated",
        handleCreated,
      );

      connection.off(
        "NotificationRead",
        handleRead,
      );

      connection.off(
        "NotificationsReadAll",
        handleAllRead,
      );
    };
  }, [
    connection,
    isAuthenticated,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      reconnectVersion <= 0
    ) {
      return undefined;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          void refreshUnreadCount()
            .catch(() => {});
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    isAuthenticated,
    reconnectVersion,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void refreshUnreadCount()
            .catch(() => {});
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    isAuthenticated,
    refreshUnreadCount,
  ]);

  const contextValue =
    useMemo(
      () => ({
        unreadCount,
        refreshUnreadCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }),
      [
        unreadCount,
        refreshUnreadCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      ],
    );

  return (
    <NotificationContext.Provider
      value={contextValue}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;

import { HubConnectionState } from "@microsoft/signalr";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  CHAT_HUB_EVENTS,
  CHAT_HUB_GROUPS,
  CHAT_REALTIME_STATUS,
  createChatConnection,
} from "../services/realtime/chatRealtimeService";
import ChatRealtimeContext from "./chat-realtime-context";

const START_RETRY_DELAYS_MS = [1000, 2000, 5000, 10000, 15000];

const waitForRetry = (milliseconds) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const normalizeGroupId = (value) => String(value || "").trim();

const createGroupSets = () => ({
  negotiation: new Set(),
  conversation: new Set(),
  order: new Set(),
});

/*
 * Một HubConnection duy nhất tới /hubs/chat cho toàn ứng dụng.
 *
 * - Đăng ký đủ tên sự kiện Backend trước khi start(); các trang nhận sự
 *   kiện qua subscribe(event, handler) thay vì tự tạo kết nối riêng.
 * - Theo dõi group Negotiation/Conversation/Order đang hoạt động để tự
 *   tham gia lại sau khi reconnect. Sự kiện theo user (Notification,
 *   Offer, Appointment, Cart, ConversationUpdated) không cần group.
 */
export const ChatRealtimeProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState(CHAT_REALTIME_STATUS.DISCONNECTED);
  const [reconnectVersion, setReconnectVersion] = useState(0);

  const connectionRef = useRef(null);
  const listenersRef = useRef(new Map());
  const groupsRef = useRef(createGroupSets());

  const dispatch = useCallback((eventName, args) => {
    const handlers = listenersRef.current.get(eventName);

    if (!handlers || handlers.size === 0) {
      return;
    }

    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch {
        /* Lỗi của một listener không được chặn các listener còn lại. */
      }
    });
  }, []);

  const subscribe = useCallback((eventName, handler) => {
    if (!CHAT_HUB_EVENTS.includes(eventName) || typeof handler !== "function") {
      return () => undefined;
    }

    let handlers = listenersRef.current.get(eventName);

    if (!handlers) {
      handlers = new Set();
      listenersRef.current.set(eventName, handlers);
    }

    handlers.add(handler);

    return () => {
      handlers.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let cancelled = false;
    let hasConnectedOnce = false;
    let startPromise = null;

    const groups = groupsRef.current;
    const hubConnection = createChatConnection();
    connectionRef.current = hubConnection;

    // Listener tồn tại trước khi start() theo yêu cầu của Backend.
    CHAT_HUB_EVENTS.forEach((eventName) => {
      hubConnection.on(eventName, (...args) => dispatch(eventName, args));
    });

    const rejoinTrackedGroups = async () => {
      if (hubConnection.state !== HubConnectionState.Connected) {
        return;
      }

      const invocations = Object.entries(CHAT_HUB_GROUPS).flatMap(
        ([kind, methods]) =>
          Array.from(groups[kind]).map((id) =>
            hubConnection.invoke(methods.join, id),
          ),
      );

      await Promise.allSettled(invocations);
    };

    const startConnection = (restart = false) => {
      if (startPromise) {
        return startPromise;
      }

      startPromise = (async () => {
        let retryIndex = 0;

        while (!cancelled) {
          try {
            if (hubConnection.state === HubConnectionState.Disconnected) {
              setStatus(CHAT_REALTIME_STATUS.CONNECTING);
              await hubConnection.start();
            }

            if (cancelled) {
              return;
            }

            await rejoinTrackedGroups();

            if (cancelled) {
              return;
            }

            setConnection(hubConnection);
            setStatus(CHAT_REALTIME_STATUS.CONNECTED);

            if (restart || hasConnectedOnce) {
              setReconnectVersion((current) => current + 1);
            }

            hasConnectedOnce = true;
            return;
          } catch {
            if (cancelled) {
              return;
            }

            setStatus(CHAT_REALTIME_STATUS.DISCONNECTED);

            const delay =
              START_RETRY_DELAYS_MS[
                Math.min(retryIndex, START_RETRY_DELAYS_MS.length - 1)
              ];

            retryIndex += 1;
            await waitForRetry(delay);
          }
        }
      })().finally(() => {
        startPromise = null;
      });

      return startPromise;
    };

    hubConnection.onreconnecting(() => {
      if (!cancelled) {
        setStatus(CHAT_REALTIME_STATUS.RECONNECTING);
      }
    });

    hubConnection.onreconnected(async () => {
      // Reconnect tự động không xóa group đang theo dõi; chỉ tham gia lại.
      await rejoinTrackedGroups();

      if (!cancelled) {
        hasConnectedOnce = true;
        setStatus(CHAT_REALTIME_STATUS.CONNECTED);
        setReconnectVersion((current) => current + 1);
      }
    });

    hubConnection.onclose(() => {
      if (!cancelled) {
        setStatus(CHAT_REALTIME_STATUS.DISCONNECTED);
        void startConnection(true);
      }
    });

    void startConnection(false);

    return () => {
      cancelled = true;

      // Chỉ chạy khi đăng xuất/unmount, không chạy trong reconnect tự động.
      Object.values(groups).forEach((set) => set.clear());

      if (connectionRef.current === hubConnection) {
        connectionRef.current = null;
      }

      setConnection(null);
      void hubConnection.stop();
    };
  }, [dispatch, isAuthenticated]);

  const joinGroup = useCallback(async (kind, rawId) => {
    const id = normalizeGroupId(rawId);

    if (!id) {
      return false;
    }

    groupsRef.current[kind].add(id);

    const currentConnection = connectionRef.current;

    if (currentConnection?.state !== HubConnectionState.Connected) {
      // Sẽ được tham gia khi kết nối sẵn sàng (rejoinTrackedGroups).
      return false;
    }

    await currentConnection.invoke(CHAT_HUB_GROUPS[kind].join, id);
    return true;
  }, []);

  const leaveGroup = useCallback(async (kind, rawId) => {
    const id = normalizeGroupId(rawId);

    if (!id) {
      return;
    }

    groupsRef.current[kind].delete(id);

    const currentConnection = connectionRef.current;

    if (currentConnection?.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await currentConnection.invoke(CHAT_HUB_GROUPS[kind].leave, id);
    } catch {
      /* Kết nối có thể vừa bị ngắt; tracking cục bộ đã được xóa. */
    }
  }, []);

  const joinNegotiation = useCallback(
    (id) => joinGroup("negotiation", id),
    [joinGroup],
  );
  const leaveNegotiation = useCallback(
    (id) => leaveGroup("negotiation", id),
    [leaveGroup],
  );
  const joinConversation = useCallback(
    (id) => joinGroup("conversation", id),
    [joinGroup],
  );
  const leaveConversation = useCallback(
    (id) => leaveGroup("conversation", id),
    [leaveGroup],
  );
  const joinOrder = useCallback((id) => joinGroup("order", id), [joinGroup]);
  const leaveOrder = useCallback(
    (id) => leaveGroup("order", id),
    [leaveGroup],
  );

  const visibleConnection = isAuthenticated ? connection : null;

  const contextValue = useMemo(
    () => ({
      connection: visibleConnection,
      status: isAuthenticated ? status : CHAT_REALTIME_STATUS.DISCONNECTED,
      reconnectVersion,
      subscribe,
      joinNegotiation,
      leaveNegotiation,
      joinConversation,
      leaveConversation,
      joinOrder,
      leaveOrder,
    }),
    [
      visibleConnection,
      isAuthenticated,
      status,
      reconnectVersion,
      subscribe,
      joinNegotiation,
      leaveNegotiation,
      joinConversation,
      leaveConversation,
      joinOrder,
      leaveOrder,
    ],
  );

  return (
    <ChatRealtimeContext.Provider value={contextValue}>
      {children}
    </ChatRealtimeContext.Provider>
  );
};

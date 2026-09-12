import {
  HubConnectionState,
} from "@microsoft/signalr";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  createChatConnection,
} from "../services/realtime/chatRealtimeService";
import ChatRealtimeContext from "./chat-realtime-context";

const START_RETRY_DELAYS_MS = [
  1000,
  2000,
  5000,
  10000,
  15000,
];

const waitForRetry = (
  milliseconds,
) =>
  new Promise((resolve) => {
    window.setTimeout(
      resolve,
      milliseconds,
    );
  });

export const ChatRealtimeProvider = ({
  children,
}) => {
  const { isAuthenticated } =
    useAuth();

  const [
    connection,
    setConnection,
  ] = useState(null);

  const [
    reconnectVersion,
    setReconnectVersion,
  ] = useState(0);

  const connectionRef =
    useRef(null);

  const joinedOrdersRef =
    useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let cancelled = false;
    let hasConnectedOnce = false;
    let startPromise = null;

    const joinedOrders =
      joinedOrdersRef.current;

    const hubConnection =
      createChatConnection();

    connectionRef.current =
      hubConnection;

    const rejoinTrackedOrders =
      async () => {
        if (
          hubConnection.state !==
          HubConnectionState.Connected
        ) {
          return;
        }

        const orderIds =
          Array.from(
            joinedOrders,
          );

        await Promise.allSettled(
          orderIds.map(
            (orderId) =>
              hubConnection.invoke(
                "JoinOrder",
                orderId,
              ),
          ),
        );
      };

    const startConnection = (
      restart = false,
    ) => {
      if (startPromise) {
        return startPromise;
      }

      startPromise =
        (async () => {
          let retryIndex = 0;

          while (!cancelled) {
            try {
              if (
                hubConnection.state ===
                HubConnectionState.Disconnected
              ) {
                await hubConnection.start();
              }

              if (cancelled) {
                return;
              }

              await rejoinTrackedOrders();

              if (cancelled) {
                return;
              }

              setConnection(
                hubConnection,
              );

              if (
                restart ||
                hasConnectedOnce
              ) {
                setReconnectVersion(
                  (current) =>
                    current + 1,
                );
              }

              hasConnectedOnce = true;

              return;
            } catch {
              if (cancelled) {
                return;
              }

              const delay =
                START_RETRY_DELAYS_MS[
                  Math.min(
                    retryIndex,
                    START_RETRY_DELAYS_MS
                      .length - 1,
                  )
                ];

              retryIndex += 1;

              await waitForRetry(
                delay,
              );
            }
          }
        })().finally(() => {
          startPromise = null;
        });

      return startPromise;
    };

    hubConnection.onreconnected(
      async () => {
        await rejoinTrackedOrders();

        if (!cancelled) {
          hasConnectedOnce = true;

          setReconnectVersion(
            (current) =>
              current + 1,
          );
        }
      },
    );

    hubConnection.onclose(() => {
      if (!cancelled) {
        void startConnection(true);
      }
    });

    void startConnection(false);

    return () => {
      cancelled = true;

      joinedOrders.clear();

      if (
        connectionRef.current ===
        hubConnection
      ) {
        connectionRef.current =
          null;
      }

      void hubConnection.stop();
    };
  }, [isAuthenticated]);

  const joinOrder =
    useCallback(
      async (orderId) => {
        const normalizedOrderId =
          String(orderId || "")
            .trim();

        if (!normalizedOrderId) {
          return;
        }

        joinedOrdersRef.current.add(
          normalizedOrderId,
        );

        const currentConnection =
          connectionRef.current;

        if (
          currentConnection?.state ===
          HubConnectionState.Connected
        ) {
          await currentConnection.invoke(
            "JoinOrder",
            normalizedOrderId,
          );
        }
      },
      [],
    );

  const leaveOrder =
    useCallback(
      async (orderId) => {
        const normalizedOrderId =
          String(orderId || "")
            .trim();

        if (!normalizedOrderId) {
          return;
        }

        joinedOrdersRef.current.delete(
          normalizedOrderId,
        );

        const currentConnection =
          connectionRef.current;

        if (
          currentConnection?.state !==
          HubConnectionState.Connected
        ) {
          return;
        }

        try {
          await currentConnection.invoke(
            "LeaveOrder",
            normalizedOrderId,
          );
        } catch {
          /*
           * Connection có thể vừa bị ngắt.
           * Local tracked set đã được xóa.
           */
        }
      },
      [],
    );

  const visibleConnection =
    isAuthenticated
      ? connection
      : null;

  const contextValue =
    useMemo(
      () => ({
        connection:
          visibleConnection,

        reconnectVersion,

        joinOrder,
        leaveOrder,
      }),
      [
        visibleConnection,
        reconnectVersion,
        joinOrder,
        leaveOrder,
      ],
    );

  return (
    <ChatRealtimeContext.Provider
      value={contextValue}
    >
      {children}
    </ChatRealtimeContext.Provider>
  );
};

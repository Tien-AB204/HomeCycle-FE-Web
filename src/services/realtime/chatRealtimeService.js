import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

const DEFAULT_API_BASE_URL =
  "https://homecycle-backend.onrender.com/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const DEFAULT_HUB_URL = `${API_BASE_URL.replace(/\/api$/i, "")}/hubs/chat`;

export const CHAT_HUB_URL = (
  import.meta.env.VITE_CHAT_HUB_URL || DEFAULT_HUB_URL
).replace(/\/+$/, "");

export const CHAT_REALTIME_STATUS = Object.freeze({
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  DISCONNECTED: "disconnected",
});

const getAccessToken = () => {
  return localStorage.getItem("accessToken") || "";
};

export const createChatConnection = () => {
  return new HubConnectionBuilder()
    .withUrl(CHAT_HUB_URL, {
      accessTokenFactory: getAccessToken,
      withCredentials: true,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error)
    .build();
};

export const joinNegotiation = async (connection, negotiationId) => {
  if (connection?.state !== HubConnectionState.Connected) {
    throw new Error("Kết nối phòng thương lượng chưa sẵn sàng.");
  }

  await connection.invoke("JoinNegotiation", negotiationId);
};

export const leaveNegotiation = async (connection, negotiationId) => {
  if (connection?.state !== HubConnectionState.Connected) {
    return;
  }

  await connection.invoke("LeaveNegotiation", negotiationId);
};

export default {
  createConnection: createChatConnection,
  joinNegotiation,
  leaveNegotiation,
};

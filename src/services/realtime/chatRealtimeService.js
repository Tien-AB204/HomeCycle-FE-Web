import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { getStoredAccessToken } from "../../utils/authStorage";

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

/*
 * Toàn bộ sự kiện Backend phát qua hub /hubs/chat. Provider đăng ký đủ
 * danh sách này trước khi connection.start() để không bỏ lỡ sự kiện.
 */
export const CHAT_HUB_EVENTS = Object.freeze([
  // Group Negotiation
  "MessageCreated",
  "MessageUpdated",
  "MessagesRead",
  // Group Conversation
  "ConversationMessageCreated",
  "ConversationMessageUpdated",
  "ConversationMessagesRead",
  // Theo user
  "ConversationUpdated",
  "OfferCreated",
  "OfferUpdated",
  "NotificationCreated",
  "NotificationRead",
  "NotificationsReadAll",
  "AppointmentUpdated",
  "CartUpdated",
  // Group Order
  "OrderTrackingUpdated",
]);

/*
 * Các group hub hỗ trợ join/leave. Appointment, Cart, Notification, Offer
 * là sự kiện theo user nên không có group để tham gia.
 */
export const CHAT_HUB_GROUPS = Object.freeze({
  negotiation: { join: "JoinNegotiation", leave: "LeaveNegotiation" },
  conversation: { join: "JoinConversation", leave: "LeaveConversation" },
  order: { join: "JoinOrder", leave: "LeaveOrder" },
});

const getAccessToken = () => {
  return getStoredAccessToken();
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

export const isConnectionReady = (connection) =>
  connection?.state === HubConnectionState.Connected;

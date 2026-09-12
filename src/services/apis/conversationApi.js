import { normalizeOfferStatus } from "../../constants/offers";
import { normalizeNegotiationStatus } from "../../constants/negotiations";
import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 20;

const normalizeIdentifier = (value, errorMessage) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new Error(errorMessage);
  }

  return normalizedValue;
};

const normalizePositiveInteger = (value, fallbackValue) =>
  Number.isInteger(value) && value > 0 ? value : fallbackValue;

const normalizeParticipant = (participant) => ({
  userId: participant?.userId || "",
  displayName: participant?.displayName || "Người dùng HomeCycle",
  avatarUrl: participant?.avatarUrl || "",
});

const normalizeConversationListItem = (item) => ({
  conversationId: item?.conversationId || "",
  otherParticipant: normalizeParticipant(item?.otherParticipant),
  latestNegotiationId: item?.latestNegotiationId || "",
  latestMessageId: item?.latestMessageId || "",
  latestMessageSenderId: item?.latestMessageSenderId || "",
  latestMessageType: item?.latestMessageType || "",
  latestMessagePreview: item?.latestMessagePreview || "",
  latestMessageAt: item?.latestMessageAt ?? null,
  unreadCount: Number(item?.unreadCount) || 0,
  lastActivityAt: item?.lastActivityAt ?? null,
  createdAt: item?.createdAt ?? null,
});

const normalizeMessage = (message) => {
  if (!message || typeof message !== "object") {
    return null;
  }

  return {
    ...message,
    messageContent: message.messageContent || "",
    messageType: String(message.messageType || "").trim(),
    offerStatus: normalizeOfferStatus(message.offerStatus),
    mediaUrl: message.mediaUrl || "",
    isRead: Boolean(message.isRead),
  };
};

const normalizeNegotiationListItem = (negotiation) => ({
  ...negotiation,
  negotiationStatus: normalizeNegotiationStatus(
    negotiation?.negotiationStatus,
  ),
});

const unwrapPaged = (response) => {
  const data = response?.data ?? response ?? {};

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    pageNumber: data?.pageNumber ?? DEFAULT_PAGE_NUMBER,
    pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  };
};

export const conversationApi = {
  /*
   * Inbox: danh sách hội thoại của tôi, sắp xếp theo hoạt động gần nhất.
   */
  getConversations: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const normalizedPageNumber = normalizePositiveInteger(
      pageNumber,
      DEFAULT_PAGE_NUMBER,
    );
    const normalizedPageSize = normalizePositiveInteger(
      pageSize,
      DEFAULT_PAGE_SIZE,
    );

    const response = await axiosClient.get("/conversations", {
      params: {
        PageNumber: normalizedPageNumber,
        PageSize: normalizedPageSize,
      },
      signal,
    });

    const paged = unwrapPaged(response);

    return {
      ...paged,
      items: paged.items.map(normalizeConversationListItem),
    };
  },

  getConversationById: async (conversationId, { signal } = {}) => {
    const id = normalizeIdentifier(
      conversationId,
      "Không tìm thấy mã hội thoại.",
    );

    const response = await axiosClient.get(
      `/conversations/${encodeURIComponent(id)}`,
      { signal },
    );

    const data = response?.data ?? response;

    return normalizeConversationListItem(data);
  },

  /*
   * Timeline tổng hợp tin nhắn của mọi Negotiation trong Conversation.
   * Chỉ đọc lịch sử - không dùng để gửi tin (gửi tin vẫn qua màn hình
   * Negotiation cụ thể).
   */
  getMessages: async (
    conversationId,
    { pageNumber = DEFAULT_PAGE_NUMBER, pageSize = DEFAULT_PAGE_SIZE, signal } = {},
  ) => {
    const id = normalizeIdentifier(
      conversationId,
      "Không tìm thấy mã hội thoại.",
    );

    const normalizedPageNumber = normalizePositiveInteger(
      pageNumber,
      DEFAULT_PAGE_NUMBER,
    );
    const normalizedPageSize = normalizePositiveInteger(
      pageSize,
      DEFAULT_PAGE_SIZE,
    );

    const response = await axiosClient.get(
      `/conversations/${encodeURIComponent(id)}/messages`,
      {
        params: {
          PageNumber: normalizedPageNumber,
          PageSize: normalizedPageSize,
        },
        signal,
      },
    );

    const paged = unwrapPaged(response);

    return {
      ...paged,
      items: paged.items.map(normalizeMessage).filter(Boolean),
    };
  },

  getNegotiations: async (
    conversationId,
    { pageNumber = DEFAULT_PAGE_NUMBER, pageSize = DEFAULT_PAGE_SIZE, signal } = {},
  ) => {
    const id = normalizeIdentifier(
      conversationId,
      "Không tìm thấy mã hội thoại.",
    );

    const normalizedPageNumber = normalizePositiveInteger(
      pageNumber,
      DEFAULT_PAGE_NUMBER,
    );
    const normalizedPageSize = normalizePositiveInteger(
      pageSize,
      DEFAULT_PAGE_SIZE,
    );

    const response = await axiosClient.get(
      `/conversations/${encodeURIComponent(id)}/negotiations`,
      {
        params: {
          PageNumber: normalizedPageNumber,
          PageSize: normalizedPageSize,
        },
        signal,
      },
    );

    const paged = unwrapPaged(response);

    return {
      ...paged,
      items: paged.items.map(normalizeNegotiationListItem),
    };
  },

  markAsRead: async (conversationId) => {
    const id = normalizeIdentifier(
      conversationId,
      "Không tìm thấy mã hội thoại.",
    );

    await axiosClient.patch(
      `/conversations/${encodeURIComponent(id)}/read`,
    );

    return true;
  },
};

export default conversationApi;

import { normalizeOfferStatus } from "../../constants/offers";
import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

const createApiError = (response, fallbackMessage) => {
  return new Error(
    response?.error?.message ||
      response?.message ||
      fallbackMessage,
  );
};

const unwrapResponse = (response, fallbackMessage) => {
  if (response?.isSuccess === false) {
    throw createApiError(response, fallbackMessage);
  }

  return response?.data ?? response;
};

const normalizeIdentifier = (value, errorMessage) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new Error(errorMessage);
  }

  return normalizedValue;
};

const normalizePositiveInteger = (value, fallbackValue, maximumValue) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 1) {
    return fallbackValue;
  }

  return Math.min(numericValue, maximumValue);
};

export const normalizeMessage = (message) => {
  if (!message || typeof message !== "object") {
    return null;
  }

  const messageId = String(message.messageId || "").trim();

  if (!messageId) {
    return null;
  }

  const clientMessageId = String(message.clientMessageId || "").trim();

  return {
    ...message,
    messageId,
    negotiationId: String(message.negotiationId || "").trim(),
    senderId: String(message.senderId || "").trim(),
    clientMessageId:
      clientMessageId === EMPTY_GUID ? "" : clientMessageId,
    messageContent: String(message.messageContent || ""),
    messageType: String(message.messageType || "").trim(),
    offerStatus: normalizeOfferStatus(message.offerStatus),
    mediaUrl: String(message.mediaUrl || "").trim(),
    isRead: Boolean(message.isRead),
  };
};

const normalizePagedMessages = (
  response,
  fallbackPageNumber,
  fallbackPageSize,
) => {
  const data = unwrapResponse(
    response,
    "Không thể tải lịch sử tin nhắn.",
  );

  return {
    items: Array.isArray(data?.items)
      ? data.items.map(normalizeMessage).filter(Boolean)
      : [],
    pageNumber: data?.pageNumber ?? fallbackPageNumber,
    pageSize: data?.pageSize ?? fallbackPageSize,
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  };
};

const normalizeMessageContent = (value) => {
  const normalizedContent = String(value || "").trim();

  if (!normalizedContent) {
    throw new Error("Nội dung tin nhắn không được để trống.");
  }

  if (normalizedContent.length > 2000) {
    throw new Error("Nội dung tin nhắn không được vượt quá 2000 ký tự.");
  }

  return normalizedContent;
};

export const messageApi = {
  getHistory: async (
    negotiationId,
    {
      pageNumber = DEFAULT_PAGE_NUMBER,
      pageSize = DEFAULT_PAGE_SIZE,
      signal,
    } = {},
  ) => {
    const normalizedId = normalizeIdentifier(
      negotiationId,
      "Không tìm thấy mã phiên thương lượng.",
    );
    const normalizedPageNumber = normalizePositiveInteger(
      pageNumber,
      DEFAULT_PAGE_NUMBER,
      Number.MAX_SAFE_INTEGER,
    );
    const normalizedPageSize = normalizePositiveInteger(
      pageSize,
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const response = await axiosClient.get("/Messages", {
      params: {
        negotiationId: normalizedId,
        PageNumber: normalizedPageNumber,
        PageSize: normalizedPageSize,
      },
      signal,
    });

    return normalizePagedMessages(
      response,
      normalizedPageNumber,
      normalizedPageSize,
    );
  },

  sendText: async (
    negotiationId,
    {
      messageContent,
      clientMessageId,
    },
  ) => {
    const normalizedId = normalizeIdentifier(
      negotiationId,
      "Không tìm thấy mã phiên thương lượng.",
    );
    const normalizedClientMessageId = normalizeIdentifier(
      clientMessageId,
      "Không thể tạo mã tin nhắn.",
    );
    const response = await axiosClient.post(
      "/Messages",
      {
        messageContent: normalizeMessageContent(messageContent),
        clientMessageId: normalizedClientMessageId,
      },
      {
        params: { negotiationId: normalizedId },
      },
    );
    const message = normalizeMessage(
      unwrapResponse(response, "Không thể gửi tin nhắn."),
    );

    if (!message) {
      throw new Error("Response gửi tin nhắn không hợp lệ.");
    }

    return message;
  },

  markAsRead: async (negotiationId) => {
    const normalizedId = normalizeIdentifier(
      negotiationId,
      "Không tìm thấy mã phiên thương lượng.",
    );

    await axiosClient.patch("/Messages/read", null, {
      params: { negotiationId: normalizedId },
    });

    return true;
  },
};

export default messageApi;

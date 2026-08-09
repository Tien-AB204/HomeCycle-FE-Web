import {
  normalizeNegotiationStatus,
} from "../../constants/negotiations";
import { normalizeOfferStatus } from "../../constants/offers";
import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 10;

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

const normalizePositiveInteger = (value, fallbackValue) => {
  return Number.isInteger(value) && value > 0 ? value : fallbackValue;
};

const normalizeTerms = ({ offerPrice, offerQuantity }) => {
  const normalizedPrice = Number(offerPrice);
  const normalizedQuantity = Number(offerQuantity);

  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    throw new Error("Giá đề xuất phải lớn hơn 0.");
  }

  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new Error("Số lượng phải là số nguyên lớn hơn 0.");
  }

  return {
    offerPrice: normalizedPrice,
    offerQuantity: normalizedQuantity,
  };
};

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

const normalizeNegotiation = (negotiation) => {
  if (!negotiation || typeof negotiation !== "object") {
    return null;
  }

  return {
    ...negotiation,
    negotiationStatus: normalizeNegotiationStatus(
      negotiation.negotiationStatus,
    ),
    messages: Array.isArray(negotiation.messages)
      ? negotiation.messages.map(normalizeMessage).filter(Boolean)
      : [],
  };
};

const normalizeListItem = (negotiation) => {
  return {
    ...negotiation,
    otherPartyName:
      negotiation?.otherPartyName || "Người dùng HomeCycle",
    otherPartyAvatarUrl: negotiation?.otherPartyAvatarUrl || "",
    negotiationStatus: normalizeNegotiationStatus(
      negotiation?.negotiationStatus,
    ),
  };
};

const ensureNegotiation = (response, fallbackMessage) => {
  const negotiation = normalizeNegotiation(
    unwrapResponse(response, fallbackMessage),
  );

  if (!negotiation?.negotiationId) {
    throw new Error("Response phiên thương lượng không hợp lệ.");
  }

  return negotiation;
};

const ensureSuccessfulMutation = (response, fallbackMessage) => {
  const result = unwrapResponse(response, fallbackMessage);

  if (!result || typeof result !== "object") {
    throw new Error("Response xử lý phiên thương lượng không hợp lệ.");
  }

  return result;
};

export const negotiationApi = {
  getAll: async ({
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
    const response = await axiosClient.get("/negotiations", {
      params: {
        PageNumber: normalizedPageNumber,
        PageSize: normalizedPageSize,
      },
      signal,
    });
    const data = unwrapResponse(
      response,
      "Không thể tải danh sách phiên thương lượng.",
    );

    return {
      items: Array.isArray(data?.items)
        ? data.items.map(normalizeListItem)
        : [],
      pageNumber: data?.pageNumber ?? normalizedPageNumber,
      pageSize: data?.pageSize ?? normalizedPageSize,
      totalCount: data?.totalCount ?? 0,
      totalPages: data?.totalPages ?? 0,
      hasPreviousPage: Boolean(data?.hasPreviousPage),
      hasNextPage: Boolean(data?.hasNextPage),
    };
  },

  getById: async (negotiationId, { signal } = {}) => {
    const normalizedId = normalizeIdentifier(
      negotiationId,
      "Không tìm thấy mã phiên thương lượng.",
    );
    const response = await axiosClient.get(
      `/negotiations/${encodeURIComponent(normalizedId)}`,
      { signal },
    );

    return ensureNegotiation(
      response,
      "Không thể tải chi tiết phiên thương lượng.",
    );
  },

  getByOfferId: async (offerId, { signal } = {}) => {
    const normalizedOfferId = normalizeIdentifier(
      offerId,
      "Không tìm thấy mã đề nghị.",
    );
    const response = await axiosClient.get(
      `/negotiations/by-offer/${encodeURIComponent(normalizedOfferId)}`,
      { signal },
    );

    return ensureNegotiation(
      response,
      "Không thể tìm phiên thương lượng của đề nghị.",
    );
  },

  counter: async (negotiationId, terms) => {
    const normalizedId = normalizeIdentifier(
      negotiationId,
      "Không tìm thấy mã phiên thương lượng.",
    );
    const response = await axiosClient.post(
      `/negotiations/${encodeURIComponent(normalizedId)}/counter`,
      normalizeTerms(terms),
    );

    return ensureSuccessfulMutation(
      response,
      "Không thể gửi đề xuất mới.",
    );
  },

  acceptProposal: async (negotiationId, proposalMessageId) => {
    const normalizedId = normalizeIdentifier(
      negotiationId,
      "Không tìm thấy mã phiên thương lượng.",
    );
    const normalizedMessageId = normalizeIdentifier(
      proposalMessageId,
      "Không tìm thấy mã đề xuất.",
    );
    const response = await axiosClient.patch(
      `/negotiations/${encodeURIComponent(normalizedId)}/proposals/${encodeURIComponent(normalizedMessageId)}/accept`,
    );

    // Backend đang trả sai DTO; caller phải tải lại GET sau khi thành công.
    return ensureSuccessfulMutation(
      response,
      "Không thể chấp nhận đề xuất.",
    );
  },

  rejectProposal: async (negotiationId, proposalMessageId) => {
    const normalizedId = normalizeIdentifier(
      negotiationId,
      "Không tìm thấy mã phiên thương lượng.",
    );
    const normalizedMessageId = normalizeIdentifier(
      proposalMessageId,
      "Không tìm thấy mã đề xuất.",
    );
    const response = await axiosClient.patch(
      `/negotiations/${encodeURIComponent(normalizedId)}/proposals/${encodeURIComponent(normalizedMessageId)}/reject`,
    );

    return ensureSuccessfulMutation(
      response,
      "Không thể từ chối đề xuất.",
    );
  },

  cancel: async (negotiationId) => {
    const normalizedId = normalizeIdentifier(
      negotiationId,
      "Không tìm thấy mã phiên thương lượng.",
    );
    const response = await axiosClient.post(
      `/negotiations/${encodeURIComponent(normalizedId)}/cancel`,
    );

    // Backend đang trả sai DTO; caller phải tải lại GET sau khi thành công.
    return ensureSuccessfulMutation(
      response,
      "Không thể hủy phiên thương lượng.",
    );
  },
};

export default negotiationApi;

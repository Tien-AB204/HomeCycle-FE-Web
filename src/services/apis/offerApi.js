import { normalizeOfferStatus } from "../../constants/offers";
import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 10;

const createApiError = (response, fallbackMessage) => {
  const message =
    response?.error?.message ||
    response?.message ||
    fallbackMessage;

  return new Error(message);
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

const normalizePageNumber = (value) => {
  return Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_PAGE_NUMBER;
};

const normalizePageSize = (value) => {
  return Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_PAGE_SIZE;
};

const normalizeTerms = ({ offerPrice, offerQuantity }) => {
  const normalizedPrice = Number(offerPrice);
  const normalizedQuantity = Number(offerQuantity);

  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    throw new Error("Giá đề nghị phải lớn hơn 0.");
  }

  if (
    !Number.isInteger(normalizedQuantity) ||
    normalizedQuantity <= 0
  ) {
    throw new Error("Số lượng đề nghị phải là số nguyên lớn hơn 0.");
  }

  return {
    offerPrice: normalizedPrice,
    offerQuantity: normalizedQuantity,
  };
};

const normalizeParticipant = (participant) => {
  if (!participant || typeof participant !== "object") {
    return null;
  }

  return {
    ...participant,
    userId: String(participant.userId || "").trim(),
    displayName:
      participant.displayName || "Người dùng HomeCycle",
    avatarUrl: participant.avatarUrl || "",
  };
};

const normalizeOffer = (offer) => {
  if (!offer || typeof offer !== "object") {
    return null;
  }

  return {
    ...offer,
    offerStatus: normalizeOfferStatus(offer.offerStatus),
    sender: normalizeParticipant(offer.sender),
    receiver: normalizeParticipant(offer.receiver),
  };
};

const normalizeOfferListItem = (offer) => {
  return {
    ...offer,
    offerStatus: normalizeOfferStatus(offer?.offerStatus),
    senderName: offer?.senderName || "Người gửi",
    senderAvatarUrl: offer?.senderAvatarUrl || "",
    receiverName: offer?.receiverName || "Người nhận",
    receiverAvatarUrl: offer?.receiverAvatarUrl || "",
  };
};

const normalizePagination = (
  data,
  fallbackPageNumber,
  fallbackPageSize,
) => {
  return {
    items: Array.isArray(data?.items)
      ? data.items.map(normalizeOfferListItem)
      : [],
    pageNumber: data?.pageNumber ?? fallbackPageNumber,
    pageSize: data?.pageSize ?? fallbackPageSize,
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  };
};

const ensureOffer = (response, fallbackMessage) => {
  const offer = normalizeOffer(
    unwrapResponse(response, fallbackMessage),
  );

  if (!offer?.offerId) {
    throw new Error("Response offer không hợp lệ.");
  }

  return offer;
};

const getPagedOffers = async (
  endpoint,
  { pageNumber, pageSize, signal },
  fallbackMessage,
) => {
  const normalizedPageNumber = normalizePageNumber(pageNumber);
  const normalizedPageSize = normalizePageSize(pageSize);
  const response = await axiosClient.get(endpoint, {
    params: {
      PageNumber: normalizedPageNumber,
      PageSize: normalizedPageSize,
    },
    signal,
  });
  const data = unwrapResponse(response, fallbackMessage);

  return normalizePagination(
    data,
    normalizedPageNumber,
    normalizedPageSize,
  );
};

export const offerApi = {
  create: async ({ postId, offerPrice, offerQuantity }) => {
    const normalizedPostId = normalizeIdentifier(
      postId,
      "Không tìm thấy mã bài đăng.",
    );
    const terms = normalizeTerms({ offerPrice, offerQuantity });
    const response = await axiosClient.post("/offers", {
      postId: normalizedPostId,
      ...terms,
    });

    return ensureOffer(response, "Không thể gửi đề nghị thương lượng.");
  },

  update: async (offerId, terms) => {
    const normalizedOfferId = normalizeIdentifier(
      offerId,
      "Không tìm thấy mã đề nghị.",
    );
    const response = await axiosClient.put(
      `/offers/${encodeURIComponent(normalizedOfferId)}`,
      normalizeTerms(terms),
    );

    return ensureOffer(response, "Không thể cập nhật đề nghị.");
  },

  getById: async (offerId, { signal } = {}) => {
    const normalizedOfferId = normalizeIdentifier(
      offerId,
      "Không tìm thấy mã đề nghị.",
    );
    const response = await axiosClient.get(
      `/offers/${encodeURIComponent(normalizedOfferId)}`,
      { signal },
    );

    return ensureOffer(response, "Không thể tải chi tiết đề nghị.");
  },

  getSent: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    return getPagedOffers(
      "/offers/sent",
      { pageNumber, pageSize, signal },
      "Không thể tải các đề nghị đã gửi.",
    );
  },

  getReceived: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    return getPagedOffers(
      "/offers/received",
      { pageNumber, pageSize, signal },
      "Không thể tải các đề nghị đã nhận.",
    );
  },

  cancel: async (offerId) => {
    const normalizedOfferId = normalizeIdentifier(
      offerId,
      "Không tìm thấy mã đề nghị.",
    );
    const response = await axiosClient.post(
      `/offers/${encodeURIComponent(normalizedOfferId)}/cancel`,
    );

    return ensureOffer(response, "Không thể hủy đề nghị.");
  },

  reject: async (offerId) => {
    const normalizedOfferId = normalizeIdentifier(
      offerId,
      "Không tìm thấy mã đề nghị.",
    );
    const response = await axiosClient.post(
      `/offers/${encodeURIComponent(normalizedOfferId)}/reject`,
    );

    return ensureOffer(response, "Không thể từ chối đề nghị.");
  },

  accept: async (offerId) => {
    const normalizedOfferId = normalizeIdentifier(
      offerId,
      "Không tìm thấy mã đề nghị.",
    );
    const response = await axiosClient.patch(
      `/offers/${encodeURIComponent(normalizedOfferId)}/accept`,
    );
    const result = unwrapResponse(
      response,
      "Không thể chấp nhận đề nghị.",
    );

    if (!result?.offerId || !result?.negotiationId) {
      throw new Error("Response chấp nhận đề nghị không hợp lệ.");
    }

    return {
      ...result,
      offerStatus: normalizeOfferStatus(result.offerStatus),
    };
  },
};

export default offerApi;

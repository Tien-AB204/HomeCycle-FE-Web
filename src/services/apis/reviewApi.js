import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_REVIEW_IMAGES = 3;

const normalizeIdentifier = (value, message) => {
  const id = String(value || "").trim();
  if (!id) throw new Error(message);
  return id;
};

const normalizeRating = (value) => {
  const rating = Number(value);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Số sao đánh giá phải là số nguyên từ 1 đến 5.");
  }

  return rating;
};

const unwrapPayload = (response) => response?.data ?? response;

const normalizeImages = (review) => {
  const images =
    review?.imageUrls || review?.images || review?.reviewImages || [];

  if (!Array.isArray(images)) return [];

  return images
    .map((image) =>
      typeof image === "string"
        ? image
        : image?.imageUrl || image?.url || image?.fileUrl,
    )
    .filter(Boolean);
};

export const normalizeReview = (value) => {
  const review = unwrapPayload(value)?.review ?? unwrapPayload(value);

  if (!review || typeof review !== "object") return null;

  return {
    ...review,
    reviewId: review.reviewId || review.id || "",
    rating: Number(review.rating || 0),
    comment: review.comment || "",
    reviewerName:
      review.reviewerName ||
      review.reviewerFullName ||
      review.authorName ||
      review.userName ||
      review.reviewer?.fullName ||
      review.reviewer?.name ||
      "Người dùng HomeCycle",
    reviewerAvatarUrl:
      review.reviewerAvatarUrl ||
      review.reviewerAvatar ||
      review.authorAvatarUrl ||
      review.reviewer?.avatarUrl ||
      "",
    images: normalizeImages(review),
    createdAt: review.createdAt || review.reviewedAt || null,
    updatedAt: review.updatedAt || null,
    canEdit: review.canEdit,
    editableUntil: review.editableUntil || null,
  };
};

const normalizePagination = (
  response,
  pageNumber = DEFAULT_PAGE_NUMBER,
  pageSize = DEFAULT_PAGE_SIZE,
) => {
  const payload = unwrapPayload(response) || {};
  const rawItems = Array.isArray(payload)
    ? payload
    : payload.items || payload.reviews || [];
  const items = Array.isArray(rawItems)
    ? rawItems.map(normalizeReview).filter(Boolean)
    : [];

  return {
    items,
    pageNumber: payload.pageNumber ?? pageNumber,
    pageSize: payload.pageSize ?? pageSize,
    totalCount: payload.totalCount ?? items.length,
    totalPages:
      payload.totalPages ??
      Math.max(1, Math.ceil((payload.totalCount ?? items.length) / pageSize)),
    hasPreviousPage:
      payload.hasPreviousPage ?? Number(payload.pageNumber ?? pageNumber) > 1,
    hasNextPage:
      payload.hasNextPage ??
      Number(payload.pageNumber ?? pageNumber) <
        Number(
          payload.totalPages ??
            Math.max(
              1,
              Math.ceil((payload.totalCount ?? items.length) / pageSize),
            ),
        ),
    averageRating: Number(
      payload.averageRating ?? payload.ratingAverage ?? payload.average ?? 0,
    ),
  };
};

const validateImages = (images) => {
  const files = Array.from(images || []);

  if (files.length > MAX_REVIEW_IMAGES) {
    throw new Error(`Chỉ được tải lên tối đa ${MAX_REVIEW_IMAGES} ảnh.`);
  }

  if (files.some((file) => !file?.type?.startsWith("image/"))) {
    throw new Error("Tệp đính kèm đánh giá phải là hình ảnh.");
  }

  return files;
};

export const reviewApi = {
  createForOrder: async (orderId, { rating, comment = "", images = [] }) => {
    const id = normalizeIdentifier(orderId, "Không tìm thấy mã đơn hàng.");
    const formData = new FormData();

    formData.append("Rating", String(normalizeRating(rating)));
    formData.append("Comment", String(comment || "").trim());
    validateImages(images).forEach((image) => formData.append("Images", image));

    const response = await axiosClient.post(
      `/reviews/orders/${encodeURIComponent(id)}`,
      formData,
      {
        skipGlobalErrorPage: true,
      },
    );

    return normalizeReview(response);
  },

  getByOrder: async (
    orderId,
    {
      pageNumber = DEFAULT_PAGE_NUMBER,
      pageSize = DEFAULT_PAGE_SIZE,
      signal,
    } = {},
  ) => {
    const id = normalizeIdentifier(orderId, "Không tìm thấy mã đơn hàng.");
    const response = await axiosClient.get(
      `/reviews/orders/${encodeURIComponent(id)}`,
      {
        params: { pageNumber, pageSize },
        signal,
      },
    );

    return normalizePagination(response, pageNumber, pageSize);
  },

  update: async (reviewId, { rating, comment = "" }) => {
    const id = normalizeIdentifier(reviewId, "Không tìm thấy mã đánh giá.");
    const response = await axiosClient.put(
      `/reviews/${encodeURIComponent(id)}`,
      {
        rating: normalizeRating(rating),
        comment: String(comment || "").trim(),
      },
    );

    return normalizeReview(response);
  },

  getById: async (reviewId, { signal } = {}) => {
    const id = normalizeIdentifier(reviewId, "Không tìm thấy mã đánh giá.");
    const response = await axiosClient.get(
      `/reviews/${encodeURIComponent(id)}`,
      {
        signal,
      },
    );

    return normalizeReview(response);
  },

  getMineByOrder: async (orderId, { signal } = {}) => {
    const id = normalizeIdentifier(orderId, "Không tìm thấy mã đơn hàng.");

    try {
      const response = await axiosClient.get(
        `/reviews/orders/${encodeURIComponent(id)}/mine`,
        { signal },
      );

      return normalizeReview(response);
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  getByUser: async (
    userId,
    {
      pageNumber = DEFAULT_PAGE_NUMBER,
      pageSize = DEFAULT_PAGE_SIZE,
      signal,
    } = {},
  ) => {
    const id = normalizeIdentifier(userId, "Không tìm thấy người dùng.");
    const response = await axiosClient.get(
      `/reviews/users/${encodeURIComponent(id)}`,
      {
        params: { pageNumber, pageSize },
        signal,
      },
    );

    return normalizePagination(response, pageNumber, pageSize);
  },
};

export default reviewApi;

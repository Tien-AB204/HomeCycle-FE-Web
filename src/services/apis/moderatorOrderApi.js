import axiosClient from "./axiosClient";

const normalizePositiveInteger = (value, fallback) => {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0
    ? normalized
    : fallback;
};

const normalizePagedResponse = (
  response,
  fallbackPageNumber,
  fallbackPageSize,
) => {
  const source = response?.data ?? response ?? {};

  const pageNumber = normalizePositiveInteger(
    source.pageNumber ?? source.PageNumber,
    fallbackPageNumber,
  );

  const pageSize = normalizePositiveInteger(
    source.pageSize ?? source.PageSize,
    fallbackPageSize,
  );

  const totalCount = Math.max(
    0,
    Number(source.totalCount ?? source.TotalCount) || 0,
  );

  const totalPages = Math.max(
    0,
    Number(source.totalPages ?? source.TotalPages) ||
      Math.ceil(totalCount / pageSize),
  );

  return {
    items: Array.isArray(source.items ?? source.Items)
      ? source.items ?? source.Items
      : [],
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: Boolean(
      source.hasPreviousPage ?? source.HasPreviousPage ?? pageNumber > 1,
    ),
    hasNextPage: Boolean(
      source.hasNextPage ?? source.HasNextPage ?? pageNumber < totalPages,
    ),
  };
};

const moderatorOrderApi = {
  getOrders: async ({
    keyword,
    status,
    paymentStatus,
    buyerId,
    sellerId,
    hasActiveDispute,
    hasInspection,
    createdFrom,
    createdTo,
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) => {
    const normalizedPage = normalizePositiveInteger(pageNumber, 1);

    const normalizedPageSize = Math.min(
      100,
      normalizePositiveInteger(pageSize, 10),
    );

    const params = {
      PageNumber: normalizedPage,
      PageSize: normalizedPageSize,
    };

    if (String(keyword || "").trim()) {
      params.Keyword = String(keyword).trim();
    }

    if (status !== undefined && status !== null && status !== "") {
      params.Status = status;
    }

    if (
      paymentStatus !== undefined &&
      paymentStatus !== null &&
      paymentStatus !== ""
    ) {
      params.PaymentStatus = paymentStatus;
    }

    if (String(buyerId || "").trim()) {
      params.BuyerId = String(buyerId).trim();
    }

    if (String(sellerId || "").trim()) {
      params.SellerId = String(sellerId).trim();
    }

    if (typeof hasActiveDispute === "boolean") {
      params.HasActiveDispute = hasActiveDispute;
    }

    if (typeof hasInspection === "boolean") {
      params.HasInspection = hasInspection;
    }

    if (createdFrom) {
      params.CreatedFrom = createdFrom;
    }

    if (createdTo) {
      params.CreatedTo = createdTo;
    }

    const response = await axiosClient.get("/moderator/orders", {
      params,
      signal,
    });

    return normalizePagedResponse(
      response,
      normalizedPage,
      normalizedPageSize,
    );
  },

  getOrderById: async (orderId, { signal } = {}) => {
    const id = String(orderId || "").trim();

    if (!id) {
      throw new Error("Không tìm thấy mã đơn hàng.");
    }

    const response = await axiosClient.get(
      `/moderator/orders/${encodeURIComponent(id)}`,
      { signal },
    );

    const source = response?.data ?? response ?? {};

    const responseOrderId = String(
      source.orderId ?? source.OrderId ?? "",
    ).trim();

    if (!responseOrderId) {
      throw new Error("Response chi tiết đơn hàng không hợp lệ.");
    }

    return source;
  },

  getOrderFinancialHistory: async (orderId, { signal } = {}) => {
    const id = String(orderId || "").trim();

    if (!id) {
      throw new Error("Không tìm thấy mã đơn hàng.");
    }

    const response = await axiosClient.get(
      `/moderator/orders/${encodeURIComponent(id)}/financial-history`,
      { signal },
    );

    const source = response?.data ?? response ?? [];

    return Array.isArray(source) ? source : [];
  },
};

export default moderatorOrderApi;

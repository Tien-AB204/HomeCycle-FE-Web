import axiosClient from "./axiosClient";

const normalizePositiveInteger = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

const normalizePage = (response, fallbackPage, fallbackSize) => {
  const source = response?.data ?? response ?? {};
  const pageNumber = normalizePositiveInteger(source.pageNumber ?? source.PageNumber, fallbackPage);
  const pageSize = normalizePositiveInteger(source.pageSize ?? source.PageSize, fallbackSize);
  const totalCount = Math.max(0, Number(source.totalCount ?? source.TotalCount) || 0);
  return {
    items: Array.isArray(source.items ?? source.Items) ? source.items ?? source.Items : [],
    pageNumber,
    pageSize,
    totalCount,
    totalPages: Math.max(0, Number(source.totalPages ?? source.TotalPages) || Math.ceil(totalCount / pageSize)),
  };
};

const normalizeId = (value) => {
  const id = String(value || "").trim();
  if (!id) throw new Error("Không tìm thấy mã phiên thương lượng.");
  return encodeURIComponent(id);
};

const moderatorNegotiationApi = {
  getAll: async ({ keyword, pageNumber = 1, pageSize = 10, signal } = {}) => {
    const normalizedPage = normalizePositiveInteger(pageNumber, 1);
    const normalizedSize = Math.min(100, normalizePositiveInteger(pageSize, 10));
    const params = { PageNumber: normalizedPage, PageSize: normalizedSize };
    if (String(keyword || "").trim()) params.Keyword = String(keyword).trim();
    const response = await axiosClient.get("/moderator/negotiations", {
      params,
      signal,
      skipGlobalErrorPage: true,
    });
    return normalizePage(response, normalizedPage, normalizedSize);
  },

  getById: async (negotiationId, { signal } = {}) => {
    const response = await axiosClient.get(
      `/moderator/negotiations/${normalizeId(negotiationId)}`,
      { signal, skipGlobalErrorPage: true },
    );
    return response?.data ?? response ?? {};
  },

  getMessages: async (
    negotiationId,
    { pageNumber = 1, pageSize = 50, signal } = {},
  ) => {
    const normalizedPage = normalizePositiveInteger(pageNumber, 1);
    const normalizedSize = Math.min(100, normalizePositiveInteger(pageSize, 50));
    const response = await axiosClient.get(
      `/moderator/negotiations/${normalizeId(negotiationId)}/messages`,
      {
        params: { PageNumber: normalizedPage, PageSize: normalizedSize },
        signal,
        skipGlobalErrorPage: true,
      },
    );
    return normalizePage(response, normalizedPage, normalizedSize);
  },
};

export default moderatorNegotiationApi;

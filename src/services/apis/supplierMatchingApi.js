import axiosClient from "./axiosClient";

const normalizeId = (value, message) => {
  const id = String(value || "").trim();
  if (!id) throw new Error(message);
  return id;
};

const normalizeResponse = (response) => {
  const source = response?.data ?? response ?? {};

  return {
    buyPostId: source.buyPostId ?? null,
    tier: String(source.tier || "FREE").toUpperCase(),
    rankingSource: String(source.rankingSource || "BACKEND_ONLY").toUpperCase(),
    aiStatus: String(source.aiStatus || "NOT_ELIGIBLE").toUpperCase(),
    advancedFiltersApplied: Boolean(source.advancedFiltersApplied),
    resultLimit: Number(source.resultLimit) || 0,
    remainingAiRefreshes:
      source.remainingAiRefreshes === null ||
      source.remainingAiRefreshes === undefined
        ? null
        : Number(source.remainingAiRefreshes),
    resetsAt: source.resetsAt || null,
    fromCache: Boolean(source.fromCache),
    candidateCount: Number(source.candidateCount) || 0,
    generatedAt: source.generatedAt || null,
    matches: Array.isArray(source.matches) ? source.matches : [],
  };
};

const supplierMatchingApi = {
  suggestDraft: async (payload, { signal } = {}) => {
    const response = await axiosClient.post(
      "/ai/supplier-matches/draft",
      payload,
      { signal, skipGlobalErrorPage: true },
    );

    return normalizeResponse(response);
  },

  suggestForBuyPost: async (
    buyPostId,
    advancedFilters = {},
    { signal } = {},
  ) => {
    const id = normalizeId(
      buyPostId,
      "Không tìm thấy mã tin thu mua.",
    );

    const response = await axiosClient.post(
      `/ai/supplier-matches/buy-post/${encodeURIComponent(id)}`,
      advancedFilters || {},
      { signal, skipGlobalErrorPage: true },
    );

    return normalizeResponse(response);
  },
};

export default supplierMatchingApi;

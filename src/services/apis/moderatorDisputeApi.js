import axiosClient from "./axiosClient";

const localRequestConfig = (config = {}) => ({
  ...config,
  skipGlobalErrorPage: true,
});

const normalizeDisputeId = (disputeId) => {
  const id = String(disputeId || "").trim();

  if (!id) {
    throw new Error("Không tìm thấy mã tranh chấp.");
  }

  return encodeURIComponent(id);
};

const moderatorDisputeApi = {
  getAll: (params, { signal } = {}) =>
    axiosClient.get(
      "/moderator/disputes",
      localRequestConfig({ params, signal }),
    ),

  getById: (disputeId, { signal } = {}) =>
    axiosClient.get(
      `/moderator/disputes/${normalizeDisputeId(disputeId)}`,
      localRequestConfig({ signal }),
    ),

  getCategories: async ({ targetType, signal } = {}) => {
    const response = await axiosClient.get(
      "/dispute-categories",
      localRequestConfig({
        params:
          targetType === undefined || targetType === null
            ? undefined
            : { targetType },
        signal,
      }),
    );

    const data = response?.data ?? response;

    return Array.isArray(data) ? data : [];
  },

  claim: (disputeId) =>
    axiosClient.post(
      `/moderator/disputes/${normalizeDisputeId(disputeId)}/claim`,
      undefined,
      localRequestConfig(),
    ),

  resolve: (disputeId, payload) =>
    axiosClient.post(
      `/moderator/disputes/${normalizeDisputeId(disputeId)}/resolve`,
      payload,
      localRequestConfig(),
    ),

  reject: (disputeId, payload) =>
    axiosClient.post(
      `/moderator/disputes/${normalizeDisputeId(disputeId)}/reject`,
      payload,
      localRequestConfig(),
    ),

  verifyReturn: (disputeId, payload) =>
    axiosClient.post(
      `/moderator/disputes/${normalizeDisputeId(disputeId)}/verify-return`,
      payload,
      localRequestConfig(),
    ),
};

export default moderatorDisputeApi;

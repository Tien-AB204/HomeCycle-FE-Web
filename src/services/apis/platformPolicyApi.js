import axiosClient from "./axiosClient";

export const PLATFORM_POLICY_TYPES = Object.freeze({
  DISPUTE: "dispute",
  APPOINTMENT: "appointment",
  FILE_UPLOAD: "file-upload",
  PAYMENT: "payment",
  ORDER: "order",
});

const SUPPORTED_POLICY_TYPES = new Set(
  Object.values(PLATFORM_POLICY_TYPES),
);

const normalizePolicyType = (policyType) => {
  const normalizedType = String(policyType || "")
    .trim()
    .toLowerCase();

  if (!SUPPORTED_POLICY_TYPES.has(normalizedType)) {
    throw new Error("Loại chính sách hệ thống không được hỗ trợ.");
  }

  return normalizedType;
};

const normalizeVersion = (version) => {
  const normalizedVersion = Number(version);

  if (
    !Number.isInteger(normalizedVersion) ||
    normalizedVersion < 1
  ) {
    throw new Error("Phiên bản chính sách không hợp lệ.");
  }

  return normalizedVersion;
};

const unwrapResult = (result, fallbackMessage) => {
  if (result?.success === false || result?.isSuccess === false) {
    throw new Error(
      result?.error?.message ||
        result?.message ||
        fallbackMessage,
    );
  }

  return result?.data ?? result;
};

const platformPolicyApi = {
  getAllActive: async ({ signal } = {}) => {
    const result = await axiosClient.get(
      "/admin/platform-policies",
      { signal },
    );

    return unwrapResult(
      result,
      "Không thể tải danh sách chính sách hệ thống.",
    );
  },

  getCurrent: async (policyType, { signal } = {}) => {
    const normalizedType = normalizePolicyType(policyType);

    const result = await axiosClient.get(
      `/admin/platform-policies/${normalizedType}`,
      { signal },
    );

    return unwrapResult(
      result,
      "Không thể tải chính sách hiện tại.",
    );
  },

  updateCurrent: async (policyType, payload) => {
    const normalizedType = normalizePolicyType(policyType);

    if (!payload || typeof payload !== "object") {
      throw new Error("Dữ liệu cập nhật chính sách không hợp lệ.");
    }

    const result = await axiosClient.patch(
      `/admin/platform-policies/${normalizedType}`,
      payload,
    );

    return unwrapResult(
      result,
      "Không thể cập nhật chính sách hệ thống.",
    );
  },

  getVersions: async (policyType, { signal } = {}) => {
    const normalizedType = normalizePolicyType(policyType);

    const result = await axiosClient.get(
      `/admin/platform-policies/${normalizedType}/versions`,
      { signal },
    );

    const data = unwrapResult(
      result,
      "Không thể tải lịch sử chính sách.",
    );

    return Array.isArray(data) ? data : [];
  },

  getVersion: async (
    policyType,
    version,
    { signal } = {},
  ) => {
    const normalizedType = normalizePolicyType(policyType);
    const normalizedVersion = normalizeVersion(version);

    const result = await axiosClient.get(
      `/admin/platform-policies/${normalizedType}/versions/${normalizedVersion}`,
      { signal },
    );

    return unwrapResult(
      result,
      "Không thể tải chi tiết phiên bản chính sách.",
    );
  },

  restoreVersion: async (policyType, version) => {
    const normalizedType = normalizePolicyType(policyType);
    const normalizedVersion = normalizeVersion(version);

    const result = await axiosClient.post(
      `/admin/platform-policies/${normalizedType}/versions/${normalizedVersion}/restore`,
    );

    return unwrapResult(
      result,
      "Không thể khôi phục phiên bản chính sách.",
    );
  },
};

export default platformPolicyApi;
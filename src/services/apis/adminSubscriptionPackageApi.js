import axiosClient from "./axiosClient";

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

const appendIfPresent = (params, key, value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  params[key] = value;
};

const normalizePackageId = (packageId) => {
  const id = String(packageId || "").trim();

  if (!id) {
    throw new Error(
      "Không tìm thấy mã gói đăng ký.",
    );
  }

  return id;
};

const adminSubscriptionPackageApi = {
  getEntitlementDefinitions: async ({
    signal,
  } = {}) => {
    const result = await axiosClient.get(
      "/admin/subscription-packages/entitlement-definitions",
      {
        signal,
        skipGlobalErrorPage: true,
      },
    );

    const data = unwrapResult(
      result,
      "Không thể tải danh sách quyền lợi gói đăng ký.",
    );

    return Array.isArray(data) ? data : [];
  },

  getPackages: async ({
    isActive,
    targetRole,
    signal,
  } = {}) => {
    const params = {};

    appendIfPresent(
      params,
      "isActive",
      isActive,
    );

    appendIfPresent(
      params,
      "targetRole",
      targetRole,
    );

    const result = await axiosClient.get(
      "/admin/subscription-packages",
      {
        params,
        signal,
        skipGlobalErrorPage: true,
      },
    );

    const data = unwrapResult(
      result,
      "Không thể tải danh sách gói đăng ký.",
    );

    return Array.isArray(data) ? data : [];
  },

  getPackageById: async (
    packageId,
    { signal } = {},
  ) => {
    const id = normalizePackageId(packageId);

    const result = await axiosClient.get(
      `/admin/subscription-packages/${encodeURIComponent(id)}`,
      {
        signal,
        skipGlobalErrorPage: true,
      },
    );

    return unwrapResult(
      result,
      "Không thể tải chi tiết gói đăng ký.",
    );
  },

  createPackage: async (payload) => {
    const result = await axiosClient.post(
      "/admin/subscription-packages",
      payload,
      {
        skipGlobalErrorPage: true,
      },
    );

    return unwrapResult(
      result,
      "Không thể tạo gói đăng ký.",
    );
  },

  updatePackage: async (
    packageId,
    payload,
  ) => {
    const id = normalizePackageId(packageId);

    const result = await axiosClient.patch(
      `/admin/subscription-packages/${encodeURIComponent(id)}`,
      payload,
      {
        skipGlobalErrorPage: true,
      },
    );

    return unwrapResult(
      result,
      "Không thể cập nhật gói đăng ký.",
    );
  },

  updatePackageStatus: async (
    packageId,
    isActive,
  ) => {
    const id = normalizePackageId(packageId);

    const result = await axiosClient.patch(
      `/admin/subscription-packages/${encodeURIComponent(id)}/status`,
      {
        isActive: Boolean(isActive),
      },
      {
        skipGlobalErrorPage: true,
      },
    );

    return unwrapResult(
      result,
      "Không thể cập nhật trạng thái gói đăng ký.",
    );
  },
};

export default adminSubscriptionPackageApi;

import axiosClient from "./axiosClient";

const toPositiveInteger = (value, message) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(message);
  }

  return parsed;
};

const normalizeList = (value) =>
  Array.isArray(value) ? value : [];

const ghnApi = {
  getProvinces: async ({ signal } = {}) => {
    const response = await axiosClient.get(
      "/GHN/provinces",
      {
        signal,
        skipGlobalErrorPage: true,
      },
    );

    return normalizeList(response);
  },

  getDistricts: async (
    provinceId,
    { signal } = {},
  ) => {
    const id = toPositiveInteger(
      provinceId,
      "Mã tỉnh/thành GHN không hợp lệ.",
    );

    const response = await axiosClient.get(
      `/GHN/provinces/${id}/districts`,
      {
        signal,
        skipGlobalErrorPage: true,
      },
    );

    return normalizeList(response);
  },

  getWards: async (
    districtId,
    { signal } = {},
  ) => {
    const id = toPositiveInteger(
      districtId,
      "Mã quận/huyện GHN không hợp lệ.",
    );

    const response = await axiosClient.get(
      `/GHN/districts/${id}/wards`,
      {
        signal,
        skipGlobalErrorPage: true,
      },
    );

    return normalizeList(response);
  },

  lookupAdminOrder: async ({
    orderCode,
    clientOrderCode,
    signal,
  } = {}) => {
    const trimmedOrderCode = String(orderCode || "").trim();
    const trimmedClientOrderCode = String(
      clientOrderCode || "",
    ).trim();

    const params = {};

    if (trimmedOrderCode) {
      params.orderCode = trimmedOrderCode;
    }

    if (trimmedClientOrderCode) {
      params.clientOrderCode = trimmedClientOrderCode;
    }

    return axiosClient.get("/GHN/admin/orders/lookup", {
      params,
      signal,
      skipGlobalErrorPage: true,
    });
  },

  simulateWebhook: async (payload, { signal } = {}) =>
    axiosClient.post("/GHN/webhook", payload, {
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-HomeCycle-Demo": "true",
      },
      skipGlobalErrorPage: true,
    }),
};

export default ghnApi;
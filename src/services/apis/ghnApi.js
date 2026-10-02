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
};

export default ghnApi;
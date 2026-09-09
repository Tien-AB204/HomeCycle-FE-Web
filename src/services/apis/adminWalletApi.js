import axiosClient from "./axiosClient";

const adminWalletApi = {
  getSystemSummary: async ({ signal } = {}) =>
    axiosClient.get(
      "/wallet/system",
      {
        signal,
        skipGlobalErrorPage: true,
      },
    ),
};

export default adminWalletApi;
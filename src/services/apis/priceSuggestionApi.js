import axiosClient from "./axiosClient";

const unwrap = (response) => response?.data ?? response;

/*
 * Gợi ý giá bằng AI cho tin đăng bán của tài khoản cá nhân. Hạn mức theo
 * ngày phụ thuộc gói đăng ký; POST mới là nơi Backend kiểm tra cuối cùng.
 */
export const priceSuggestionApi = {
  getQuota: async ({ signal } = {}) => {
    const quota = unwrap(
      await axiosClient.get("/ai/price-suggestions/quota", {
        signal,
        skipGlobalErrorPage: true,
      }),
    );

    return {
      dailyLimit: Number(quota?.dailyLimit),
      remainingToday: Number(quota?.remainingToday),
      resetsAt: quota?.resetsAt ? String(quota.resetsAt) : "",
    };
  },

  suggestDraftPrice: async (product) =>
    unwrap(
      await axiosClient.post(
        "/ai/price-suggestions/draft",
        { product },
        {
          // Backend tra cứu nguồn giá bên ngoài nên có thể chậm.
          timeout: 60000,
          skipGlobalErrorPage: true,
        },
      ),
    ),
};

export default priceSuggestionApi;

import axiosClient from "./axiosClient";

const ensureId = (value) => {
  const id = String(value || "").trim();
  if (!id) throw new Error("Không tìm thấy mã thỏa thuận.");
  return id;
};

export const paymentApi = {
  createPayOsCheckout: async (agreementId) => {
    const id = ensureId(agreementId);
    const response = await axiosClient.post(`/payments/payos/checkout/${encodeURIComponent(id)}`);
    if (!response?.checkoutUrl) throw new Error("Không nhận được liên kết thanh toán PayOS.");
    return response;
  },

  checkoutWithWallet: async (agreementId) => {
    const id = ensureId(agreementId);
    return axiosClient.post(`/payments/wallet/checkout/${encodeURIComponent(id)}`);
  },

  getStatus: async (agreementId, { signal } = {}) => {
    const id = ensureId(agreementId);
    const response = await axiosClient.get(`/payments/${encodeURIComponent(id)}/status`, { signal });
    return String(response || "").trim();
  },
};

export default paymentApi;

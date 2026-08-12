import axiosClient from "./axiosClient";

export const orderApi = {
  getByAgreementId: async (agreementId, { signal } = {}) => {
    const id = String(agreementId || "").trim();
    if (!id) throw new Error("Không tìm thấy mã thỏa thuận.");
    return axiosClient.get(`/orders/agreement/${encodeURIComponent(id)}`, { signal });
  },
};

export default orderApi;

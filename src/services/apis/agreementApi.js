import { normalizeAgreementStatus } from "../../constants/agreements";
import axiosClient from "./axiosClient";

const normalizeIdentifier = (value, message) => {
  const id = String(value || "").trim();
  if (!id) throw new Error(message);
  return id;
};

const normalizeAgreement = (agreement) => {
  if (!agreement || typeof agreement !== "object") return null;
  return {
    ...agreement,
    agreementStatus: normalizeAgreementStatus(agreement.agreementStatus),
    agreementDetails: agreement.agreementDetails || {},
  };
};

export const agreementApi = {
  getPreview: async (negotiationId, { signal } = {}) => {
    const id = normalizeIdentifier(negotiationId, "Không tìm thấy mã phiên thương lượng.");
    return axiosClient.get(`/agreements/preview/${encodeURIComponent(id)}`, { signal });
  },

  create: async (payload) => {
    const response = await axiosClient.post("/agreements", payload);
    if (!response?.agreementId) throw new Error("Response tạo thỏa thuận không hợp lệ.");
    return response;
  },

  getById: async (agreementId, { signal } = {}) => {
    const id = normalizeIdentifier(agreementId, "Không tìm thấy mã thỏa thuận.");
    const agreement = normalizeAgreement(
      await axiosClient.get(`/agreements/${encodeURIComponent(id)}`, { signal }),
    );
    if (!agreement?.agreementId) throw new Error("Response thỏa thuận không hợp lệ.");
    return agreement;
  },

  update: async (agreementId, payload) => {
    const id = normalizeIdentifier(agreementId, "Không tìm thấy mã thỏa thuận.");
    return axiosClient.put(`/agreements/${encodeURIComponent(id)}`, payload);
  },

  accept: async (agreementId, expectedRevision) => {
    const id = normalizeIdentifier(agreementId, "Không tìm thấy mã thỏa thuận.");
    const revision = Number(expectedRevision);

    if (!Number.isInteger(revision) || revision < 1) {
      throw new Error(
        "Không xác định được phiên bản thỏa thuận mới nhất. Vui lòng tải lại trang.",
      );
    }

    return axiosClient.patch(
      `/agreements/${encodeURIComponent(id)}/accept`,
      { expectedRevision: revision },
    );
  },

  requestEdit: async (agreementId) => {
    const id = normalizeIdentifier(agreementId, "Không tìm thấy mã thỏa thuận.");
    return axiosClient.patch(`/agreements/${encodeURIComponent(id)}/request-edit`);
  },

  getPendingPayment: async ({ pageNumber = 1, pageSize = 10, signal } = {}) => {
    const response = await axiosClient.get("/agreements/pending-payment", {
      params: { PageNumber: pageNumber, PageSize: pageSize },
      signal,
    });
    return {
      items: Array.isArray(response?.items) ? response.items : [],
      pageNumber: response?.pageNumber ?? pageNumber,
      pageSize: response?.pageSize ?? pageSize,
      totalCount: response?.totalCount ?? 0,
      totalPages: response?.totalPages ?? 0,
      hasPreviousPage: Boolean(response?.hasPreviousPage),
      hasNextPage: Boolean(response?.hasNextPage),
    };
  },
};

export default agreementApi;

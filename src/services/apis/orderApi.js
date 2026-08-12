import { ORDER_PERSPECTIVE } from "../../constants/orders";
import axiosClient from "./axiosClient";

const normalizeIdentifier = (value, message) => {
  const id = String(value || "").trim();
  if (!id) throw new Error(message);
  return id;
};

const normalizePagination = (response, pageNumber, pageSize) => ({
  items: Array.isArray(response?.items) ? response.items : [],
  pageNumber: response?.pageNumber ?? pageNumber,
  pageSize: response?.pageSize ?? pageSize,
  totalCount: response?.totalCount ?? 0,
  totalPages: response?.totalPages ?? 0,
  hasPreviousPage: Boolean(response?.hasPreviousPage),
  hasNextPage: Boolean(response?.hasNextPage),
});

export const orderApi = {
  getAll: async ({
    perspective = ORDER_PERSPECTIVE.BUYER,
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) => {
    if (!Object.values(ORDER_PERSPECTIVE).includes(perspective)) {
      throw new Error("Vai trò trong đơn hàng không hợp lệ.");
    }

    const response = await axiosClient.get(`/orders/${perspective}`, {
      params: { PageNumber: pageNumber, PageSize: pageSize },
      signal,
    });

    return normalizePagination(response, pageNumber, pageSize);
  },

  getBuyerOrders: (options = {}) =>
    orderApi.getAll({ ...options, perspective: ORDER_PERSPECTIVE.BUYER }),

  getSellerOrders: (options = {}) =>
    orderApi.getAll({ ...options, perspective: ORDER_PERSPECTIVE.SELLER }),

  getById: async (orderId, { signal } = {}) => {
    const id = normalizeIdentifier(orderId, "Không tìm thấy mã đơn hàng.");
    const response = await axiosClient.get(`/orders/${encodeURIComponent(id)}`, {
      signal,
    });

    if (!response?.order?.orderId) {
      throw new Error("Response chi tiết đơn hàng không hợp lệ.");
    }

    return response;
  },

  getByAgreementId: async (agreementId, { signal } = {}) => {
    const id = normalizeIdentifier(
      agreementId,
      "Không tìm thấy mã thỏa thuận.",
    );
    const response = await axiosClient.get(
      `/orders/agreement/${encodeURIComponent(id)}`,
      { signal },
    );

    if (!response?.orderId) {
      throw new Error("Response đơn hàng theo thỏa thuận không hợp lệ.");
    }

    return response;
  },
};

export default orderApi;

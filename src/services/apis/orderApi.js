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
      params: {
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
      signal,
    });

    return normalizePagination(response, pageNumber, pageSize);
  },

  getBuyerOrders: (options = {}) =>
    orderApi.getAll({
      ...options,
      perspective: ORDER_PERSPECTIVE.BUYER,
    }),

  getSellerOrders: (options = {}) =>
    orderApi.getAll({
      ...options,
      perspective: ORDER_PERSPECTIVE.SELLER,
    }),

  getById: async (orderId, { signal } = {}) => {
    const id = normalizeIdentifier(
      orderId,
      "Không tìm thấy mã đơn hàng.",
    );

    const response = await axiosClient.get(
      `/orders/${encodeURIComponent(id)}`,
      {
        signal,
      },
    );

    /*
     * BE hiện trả OrderDetailDto trực tiếp.
     * Giữ compatibility với response legacy có field `order`
     * để không làm vỡ các màn hình đã triển khai trước đó.
     */
    const order =
      response?.order?.orderId
        ? response.order
        : response;

    if (!order?.orderId) {
      throw new Error(
        "Response chi tiết đơn hàng không hợp lệ.",
      );
    }

    if (response?.order?.orderId) {
      return response;
    }

    return {
      order,

      negotiationId:
        order.negotiationId || "",

      thumbnailUrl:
        order.thumbnailUrl || "",

      postDescription:
        order.postDescription || "",

      counterpartyName:
        order.counterparty?.username || "",

      counterpartyUserId:
        order.counterparty?.userId || "",

      paymentMethod:
        order.payment?.paymentMethod ??
        null,

      paidAt:
        order.payment?.paidAt ?? null,

      shipment:
        order.shipment ?? null,

      appointments:
        Array.isArray(order.appointments)
          ? order.appointments
          : [],

      review:
        order.review || {},

      dispute:
        order.dispute || {},

      actions:
        order.actions || {},

      timeline:
        Array.isArray(order.timeline)
          ? order.timeline
          : [],
    };
  },

  getByAgreementId: async (
    agreementId,
    { signal } = {},
  ) => {
    const id = normalizeIdentifier(
      agreementId,
      "Không tìm thấy mã thỏa thuận.",
    );

    const response = await axiosClient.get(
      `/orders/agreement/${encodeURIComponent(id)}`,
      {
        signal,
      },
    );

    if (!response?.orderId) {
      throw new Error(
        "Response đơn hàng theo thỏa thuận không hợp lệ.",
      );
    }

    return response;
  },

  /**
   * Đồng bộ trạng thái GHN theo Order.
   * Backend tự lấy GHNOrderCode nên FE không gửi mã vận đơn.
   */
  getShipmentTracking: async (
    orderId,
    { signal } = {},
  ) => {
    const id = normalizeIdentifier(
      orderId,
      "Không tìm thấy mã đơn hàng để theo dõi vận chuyển.",
    );

    const response = await axiosClient.get(
      `/orders/${encodeURIComponent(id)}/shipment-tracking`,
      {
        signal,
        /*
         * Tracking có thể trả 409 khi worker chưa tạo xong
         * vận đơn. Giữ lỗi tại card thay vì bật global page.
         */
        skipGlobalErrorPage: true,
      },
    );

    if (!response?.orderId) {
      throw new Error(
        "Response theo dõi vận chuyển không hợp lệ.",
      );
    }

    return response;
  },

  /**
   * Hủy Order sau khi kết quả kiểm định bị từ chối.
   * Quyền thao tác lấy từ OrderDetailDto.actions.canCancel.
   */
  cancelAfterRejectedInspection: async (orderId) => {
    const id = normalizeIdentifier(
      orderId,
      "Không tìm thấy mã đơn hàng để hủy.",
    );

    return axiosClient.post(
      `/orders/${encodeURIComponent(id)}/cancel`,
    );
  },

  /**
   * Buyer xác nhận đã trả hàng trong luồng tranh chấp/hoàn trả.
   */
  confirmReturn: async (orderId) => {
    const id = normalizeIdentifier(
      orderId,
      "Không tìm thấy mã đơn hàng để xác nhận trả hàng.",
    );

    return axiosClient.post(
      `/orders/${encodeURIComponent(id)}/confirm-return`,
    );
  },

  /**
   * Seller xác nhận đã nhận lại hàng.
   */
  confirmReturnReceived: async (orderId) => {
    const id = normalizeIdentifier(
      orderId,
      "Không tìm thấy mã đơn hàng để xác nhận nhận lại hàng.",
    );

    return axiosClient.post(
      `/orders/${encodeURIComponent(id)}/confirm-return-received`,
    );
  },

  /**
   * Người bán xác nhận hàng đã chuẩn bị xong.
   * Quyền thao tác lấy từ
   * actions.canConfirmSellerReady.
   */
  confirmSellerReady: async (
    shipmentId,
  ) => {
    const id = normalizeIdentifier(
      shipmentId,
      "Không tìm thấy mã vận chuyển để xác nhận hàng sẵn sàng.",
    );

    const response =
      await axiosClient.post(
        "/shipments/" +
          encodeURIComponent(id) +
          "/seller-ready",
      );

    if (!response) {
      throw new Error(
        "Không nhận được phản hồi xác nhận chuẩn bị hàng.",
      );
    }

    return response;
  },

  /**
   * Người bán xác nhận đã bàn giao hàng.
   *
   * Backend chỉ cho phép thao tác này với hình thức giao nhận trực tiếp.
   * Response là OrderConfirmationResponseDto, không phải OrderDetailDto.
   */
  confirmHandover: async (orderId) => {
    const id = normalizeIdentifier(
      orderId,
      "Không tìm thấy mã đơn hàng để xác nhận bàn giao.",
    );

    const response = await axiosClient.post(
      `/orders/${encodeURIComponent(id)}/confirm-handover`,
    );

    if (!response?.orderId) {
      throw new Error(
        "Response xác nhận bàn giao không hợp lệ.",
      );
    }

    return response;
  },

  /**
   * Người mua xác nhận đã nhận hàng.
   *
   * Backend có thể chuyển Order sang Completed khi yêu cầu hợp lệ.
   * Response là OrderConfirmationResponseDto.
   */
  confirmReceived: async (orderId) => {
    const id = normalizeIdentifier(
      orderId,
      "Không tìm thấy mã đơn hàng để xác nhận đã nhận hàng.",
    );

    const response = await axiosClient.post(
      `/orders/${encodeURIComponent(id)}/confirm-received`,
    );

    if (!response?.orderId) {
      throw new Error(
        "Response xác nhận nhận hàng không hợp lệ.",
      );
    }

    return response;
  },
};

export default orderApi;
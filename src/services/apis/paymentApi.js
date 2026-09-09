import axiosClient from "./axiosClient";

const PAYMENT_STATUS_BY_VALUE = {
  0: "Pending",
  1: "Completed",
  2: "Failed",
  3: "Refunded",
  4: "PartiallyRefunded",
  5: "Expired",
  6: "Cancelled",
};

const ensureId = (
  value,
  message = "Không tìm thấy mã thỏa thuận.",
) => {
  const id = String(value || "").trim();

  if (!id) {
    throw new Error(message);
  }

  return id;
};

const normalizePaymentStatus = (value) => {
  if (
    typeof value === "number" ||
    /^\d+$/.test(String(value || "").trim())
  ) {
    const numericValue = Number(value);

    return (
      PAYMENT_STATUS_BY_VALUE[numericValue] ||
      String(value || "").trim()
    );
  }

  return String(value || "").trim();
};

const normalizeStatusResponse = (response) => {
  if (
    response &&
    typeof response === "object" &&
    !Array.isArray(response)
  ) {
    return {
      paymentStatus:
        normalizePaymentStatus(
          response.paymentStatus,
        ),

      orderId:
        response.orderId || null,

      appointmentId:
        response.appointmentId || null,
    };
  }

  return {
    paymentStatus:
      normalizePaymentStatus(response),

    orderId: null,
    appointmentId: null,
  };
};

const normalizeRedirectUrls = ({
  returnUrl,
  cancelUrl,
} = {}) => {
  const normalizedReturnUrl =
    String(returnUrl || "").trim();

  const normalizedCancelUrl =
    String(cancelUrl || "").trim();

  if (
    !normalizedReturnUrl ||
    !normalizedCancelUrl
  ) {
    throw new Error(
      "Không xác định được đường dẫn quay lại sau thanh toán.",
    );
  }

  return {
    returnUrl: normalizedReturnUrl,
    cancelUrl: normalizedCancelUrl,
  };
};

export const paymentApi = {
  createPayOsCheckout: async (
    agreementId,
    redirectUrls = {},
  ) => {
    const id =
      ensureId(agreementId);

    const payload =
      normalizeRedirectUrls(
        redirectUrls,
      );

    const response =
      await axiosClient.post(
        `/payments/payos/checkout/${encodeURIComponent(
          id,
        )}`,
        payload,
      );

    if (!response?.checkoutUrl) {
      throw new Error(
        "Không nhận được liên kết thanh toán PayOS.",
      );
    }

    return response;
  },

  checkoutWithWallet: async (
    agreementId,
  ) => {
    const id =
      ensureId(agreementId);

    return axiosClient.post(
      `/payments/wallet/checkout/${encodeURIComponent(
        id,
      )}`,
    );
  },

  getStatus: async (
    agreementId,
    { signal } = {},
  ) => {
    const id =
      ensureId(agreementId);

    const response =
      await axiosClient.get(
        `/payments/${encodeURIComponent(
          id,
        )}/status`,
        { signal },
      );

    return normalizeStatusResponse(
      response,
    ).paymentStatus;
  },

  createOrderSettlementPayOsCheckout:
    async (
      paymentId,
      redirectUrls = {},
    ) => {
      const id =
        ensureId(
          paymentId,
          "Không tìm thấy khoản thanh toán bổ sung.",
        );

      const payload =
        normalizeRedirectUrls(
          redirectUrls,
        );

      const response =
        await axiosClient.post(
          `/payments/order-settlements/${encodeURIComponent(
            id,
          )}/payos/checkout`,
          payload,
          {
            skipGlobalErrorPage: true,
          },
        );

      if (!response?.checkoutUrl) {
        throw new Error(
          "Không nhận được liên kết PayOS cho khoản thanh toán bổ sung.",
        );
      }

      return response;
    },

  checkoutOrderSettlementWithWallet:
    async (paymentId) => {
      const id =
        ensureId(
          paymentId,
          "Không tìm thấy khoản thanh toán bổ sung.",
        );

      const response =
        await axiosClient.post(
          `/payments/order-settlements/${encodeURIComponent(
            id,
          )}/wallet/checkout`,
          undefined,
          {
            skipGlobalErrorPage: true,
          },
        );

      return normalizeStatusResponse(
        response,
      );
    },

  getOrderSettlementStatus:
    async (
      paymentId,
      { signal } = {},
    ) => {
      const id =
        ensureId(
          paymentId,
          "Không tìm thấy khoản thanh toán bổ sung.",
        );

      const response =
        await axiosClient.get(
          `/payments/order-settlements/${encodeURIComponent(
            id,
          )}/status`,
          {
            signal,
            skipGlobalErrorPage: true,
          },
        );

      return normalizeStatusResponse(
        response,
      );
    },
};

export default paymentApi;
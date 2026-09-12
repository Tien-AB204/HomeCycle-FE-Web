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
  const source =
    response?.data ?? response;

  if (
    source &&
    typeof source === "object" &&
    !Array.isArray(source)
  ) {
    return {
      paymentStatus:
        normalizePaymentStatus(
          source.paymentStatus ??
            source.PaymentStatus,
        ),

      orderId:
        source.orderId ??
        source.OrderId ??
        null,

      appointmentId:
        source.appointmentId ??
        source.AppointmentId ??
        null,
    };
  }

  return {
    paymentStatus:
      normalizePaymentStatus(source),

    orderId: null,
    appointmentId: null,
  };
};

const normalizePositiveInteger = (
  value,
  fallback,
) => {
  const normalized =
    Number(value);

  return (
    Number.isInteger(normalized) &&
    normalized > 0
  )
    ? normalized
    : fallback;
};

const normalizeHistoryResponse = (
  response,
  fallbackPage,
  fallbackPageSize,
) => {
  const source =
    response?.data ?? response ?? {};

  const items =
    Array.isArray(source?.items)
      ? source.items
      : [];

  const pageNumber =
    normalizePositiveInteger(
      source?.pageNumber,
      fallbackPage,
    );

  const pageSize =
    normalizePositiveInteger(
      source?.pageSize,
      fallbackPageSize,
    );

  const totalCount =
    Math.max(
      0,
      Number(
        source?.totalCount,
      ) || 0,
    );

  const totalPages =
    Math.max(
      0,
      Number(
        source?.totalPages,
      ) ||
        Math.ceil(
          totalCount /
            pageSize,
        ),
    );

  return {
    items,
    pageNumber,
    pageSize,
    totalCount,
    totalPages,

    hasPreviousPage:
      source?.hasPreviousPage ??
      pageNumber > 1,

    hasNextPage:
      source?.hasNextPage ??
      pageNumber < totalPages,
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

  getStatusDetail: async (
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
    );
  },

  /*
   * Compatibility wrapper:
   * AgreementPage currently consumes only the normalized status string.
   * PaymentResultPage uses getStatusDetail() so OrderId/AppointmentId
   * from the current Backend contract are not discarded.
   */
  getStatus: async (
    agreementId,
    options = {},
  ) => {
    const detail =
      await paymentApi
        .getStatusDetail(
          agreementId,
          options,
        );

    return detail.paymentStatus;
  },

  getHistory: async ({
    pageNumber = 1,
    pageSize = 20,
    status,
    method,
    fromDate,
    toDate,
    signal,
  } = {}) => {
    const normalizedPage =
      normalizePositiveInteger(
        pageNumber,
        1,
      );

    const normalizedPageSize =
      Math.min(
        100,
        normalizePositiveInteger(
          pageSize,
          20,
        ),
      );

    const params = {
      PageNumber:
        normalizedPage,

      PageSize:
        normalizedPageSize,
    };

    if (
      status !== undefined &&
      status !== null &&
      status !== ""
    ) {
      params.Status = status;
    }

    if (
      method !== undefined &&
      method !== null &&
      method !== ""
    ) {
      params.Method = method;
    }

    if (fromDate) {
      params.FromDate =
        fromDate;
    }

    if (toDate) {
      params.ToDate =
        toDate;
    }

    const response =
      await axiosClient.get(
        "/payments/history",
        {
          params,
          signal,
        },
      );

    return normalizeHistoryResponse(
      response,
      normalizedPage,
      normalizedPageSize,
    );
  },
};

export default paymentApi;
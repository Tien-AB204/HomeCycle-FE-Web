export const ORDER_PERSPECTIVE = Object.freeze({
  BUYER: "buyer",
  SELLER: "seller",
});

export const ORDER_STATUS = Object.freeze({
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  DISPUTING: 4,
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 0,
  COMPLETED: 1,
  FAILED: 2,
  REFUNDED: 3,
  PARTIALLY_REFUNDED: 4,
});

const ORDER_STATUS_META = Object.freeze({
  [ORDER_STATUS.PENDING]: {
    label: "Chờ xử lý",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  [ORDER_STATUS.PROCESSING]: {
    label: "Đang xử lý",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  [ORDER_STATUS.COMPLETED]: {
    label: "Hoàn tất",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  [ORDER_STATUS.CANCELLED]: {
    label: "Đã hủy",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  [ORDER_STATUS.DISPUTING]: {
    label: "Đang tranh chấp",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
});

const PAYMENT_STATUS_META = Object.freeze({
  [PAYMENT_STATUS.PENDING]: {
    label: "Chờ thanh toán",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  [PAYMENT_STATUS.COMPLETED]: {
    label: "Đã thanh toán",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  [PAYMENT_STATUS.FAILED]: {
    label: "Thanh toán thất bại",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  [PAYMENT_STATUS.REFUNDED]: {
    label: "Đã hoàn tiền",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: {
    label: "Đã hoàn tiền một phần",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
});

const UNKNOWN_STATUS_META = Object.freeze({
  label: "Chưa xác định",
  className: "border-gray-200 bg-gray-50 text-gray-600",
});

export const getOrderStatusMeta = (status) =>
  ORDER_STATUS_META[Number(status)] || UNKNOWN_STATUS_META;

export const getPaymentStatusMeta = (status) =>
  PAYMENT_STATUS_META[Number(status)] || UNKNOWN_STATUS_META;

export const getPaymentDisplayMeta = (order) => {
  const status = Number(order?.paymentStatus);
  const amountPaid = Number(order?.amountPaid || 0);
  const amountRemaining = Number(order?.amountRemaining || 0);

  if (
    status === PAYMENT_STATUS.PENDING &&
    amountPaid > 0 &&
    amountRemaining > 0
  ) {
    return {
      label: "Đã đặt cọc",
      description: "Chờ thanh toán phần còn lại",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  const meta = getPaymentStatusMeta(status);
  return { ...meta, description: "" };
};

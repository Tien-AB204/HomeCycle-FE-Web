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
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  [ORDER_STATUS.PROCESSING]: {
    label: "Đang xử lý",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  [ORDER_STATUS.COMPLETED]: {
    label: "Hoàn tất",
    className: "border-success/30 bg-success/10 text-success",
  },
  [ORDER_STATUS.CANCELLED]: {
    label: "Đã hủy",
    className: "border-error/30 bg-error/10 text-error",
  },
  [ORDER_STATUS.DISPUTING]: {
    label: "Đang tranh chấp",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
});

const PAYMENT_STATUS_META = Object.freeze({
  [PAYMENT_STATUS.PENDING]: {
    label: "Chờ thanh toán",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  [PAYMENT_STATUS.COMPLETED]: {
    label: "Đã thanh toán",
    className: "border-success/30 bg-success/10 text-success",
  },
  [PAYMENT_STATUS.FAILED]: {
    label: "Thanh toán thất bại",
    className: "border-error/30 bg-error/10 text-error",
  },
  [PAYMENT_STATUS.REFUNDED]: {
    label: "Đã hoàn tiền",
    className: "border-border bg-textLight/10 text-textLight",
  },
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: {
    label: "Đã hoàn tiền một phần",
    className: "border-border bg-textLight/10 text-textLight",
  },
});

const UNKNOWN_STATUS_META = Object.freeze({
  label: "Chưa xác định",
  className: "border-border bg-textLight/10 text-textLight",
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
      className: "border-primary/30 bg-primary/10 text-primary",
    };
  }

  const meta = getPaymentStatusMeta(status);
  return { ...meta, description: "" };
};

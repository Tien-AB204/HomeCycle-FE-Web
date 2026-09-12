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
  RETURNED: 5,
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 0,
  COMPLETED: 1,
  FAILED: 2,
  REFUNDED: 3,
  PARTIALLY_REFUNDED: 4,
  EXPIRED: 5,
  CANCELLED: 6,
});

/*
 * Backend OrderStatus/PaymentStatus enum names, dùng làm canonical key.
 * List DTO trả int, Detail DTO trả enum-name string (JsonStringEnumConverter) -
 * bảng meta phải tra được cả hai dạng cho cùng 1 trạng thái.
 */
const ORDER_STATUS_NAMES = Object.freeze({
  [ORDER_STATUS.PENDING]: "Pending",
  [ORDER_STATUS.PROCESSING]: "Processing",
  [ORDER_STATUS.COMPLETED]: "Completed",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
  [ORDER_STATUS.DISPUTING]: "Disputing",
  [ORDER_STATUS.RETURNED]: "Returned",
});

const PAYMENT_STATUS_NAMES = Object.freeze({
  [PAYMENT_STATUS.PENDING]: "Pending",
  [PAYMENT_STATUS.COMPLETED]: "Completed",
  [PAYMENT_STATUS.FAILED]: "Failed",
  [PAYMENT_STATUS.REFUNDED]: "Refunded",
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: "PartiallyRefunded",
  [PAYMENT_STATUS.EXPIRED]: "Expired",
  [PAYMENT_STATUS.CANCELLED]: "Cancelled",
});

const ORDER_STATUS_META = Object.freeze({
  Pending: {
    label: "Chờ xử lý",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  Processing: {
    label: "Đang xử lý",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  Completed: {
    label: "Hoàn tất",
    className: "border-success/30 bg-success/10 text-success",
  },
  Cancelled: {
    label: "Đã hủy",
    className: "border-error/30 bg-error/10 text-error",
  },
  Disputing: {
    label: "Đang tranh chấp",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  Returned: {
    label: "Đã trả hàng",
    className: "border-border bg-textLight/10 text-textLight",
  },
});

const PAYMENT_STATUS_META = Object.freeze({
  Pending: {
    label: "Chờ thanh toán",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  Completed: {
    label: "Đã thanh toán",
    className: "border-success/30 bg-success/10 text-success",
  },
  Failed: {
    label: "Thanh toán thất bại",
    className: "border-error/30 bg-error/10 text-error",
  },
  Refunded: {
    label: "Đã hoàn tiền",
    className: "border-border bg-textLight/10 text-textLight",
  },
  PartiallyRefunded: {
    label: "Đã hoàn tiền một phần",
    className: "border-border bg-textLight/10 text-textLight",
  },
  Expired: {
    label: "Đã hết hạn thanh toán",
    className: "border-border bg-textLight/10 text-textLight",
  },
  Cancelled: {
    label: "Đã hủy thanh toán",
    className: "border-error/30 bg-error/10 text-error",
  },
});

const UNKNOWN_STATUS_META = Object.freeze({
  label: "Chưa xác định",
  className: "border-border bg-textLight/10 text-textLight",
});

/*
 * Chuẩn hoá 1 giá trị status (number | numeric string | enum-name string)
 * về đúng tên enum Backend (vd "Completed"), hoặc null nếu không nhận diện được.
 */
const normalizeStatusName = (value, namesByNumber) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" && Object.values(namesByNumber).includes(value)) {
    return value;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) && namesByNumber[numeric] !== undefined
    ? namesByNumber[numeric]
    : null;
};

export const normalizeOrderStatus = (value) =>
  normalizeStatusName(value, ORDER_STATUS_NAMES);

export const normalizePaymentStatus = (value) =>
  normalizeStatusName(value, PAYMENT_STATUS_NAMES);

export const isOrderStatus = (value, canonicalName) =>
  normalizeOrderStatus(value) === canonicalName;

export const isPaymentStatus = (value, canonicalName) =>
  normalizePaymentStatus(value) === canonicalName;

export const getOrderStatusMeta = (status) => {
  const name = normalizeOrderStatus(status);
  return (name && ORDER_STATUS_META[name]) || UNKNOWN_STATUS_META;
};

export const getPaymentStatusMeta = (status) => {
  const name = normalizePaymentStatus(status);
  return (name && PAYMENT_STATUS_META[name]) || UNKNOWN_STATUS_META;
};

export const getPaymentDisplayMeta = (order) => {
  const isPending = isPaymentStatus(order?.paymentStatus, "Pending");
  const amountPaid = Number(order?.amountPaid || 0);
  const amountRemaining = Number(order?.amountRemaining || 0);

  if (isPending && amountPaid > 0 && amountRemaining > 0) {
    return {
      label: "Đã đặt cọc",
      description: "Chờ thanh toán phần còn lại",
      className: "border-primary/30 bg-primary/10 text-primary",
    };
  }

  const meta = getPaymentStatusMeta(order?.paymentStatus);
  return { ...meta, description: "" };
};

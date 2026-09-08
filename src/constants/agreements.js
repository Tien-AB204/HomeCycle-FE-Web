export const AGREEMENT_TYPE = Object.freeze({
  INSPECTION: "Inspection",
  NO_INSPECTION: "No_Inspection",
});

export const PAYMENT_TYPE = Object.freeze({
  DEPOSIT: "Deposit",
  FULL_PAYMENT: "Full_Payment",
  SUBSCRIPTION: "Subscription",
});

export const DELIVERY_METHOD = Object.freeze({
  UNKNOWN: "Unknown",
  GHN: "GhnDelivery",
  SELLER_DELIVERS: "SellerDelivers",
  BUYER_PICK_UP: "BuyerPickUp",
});

export const AGREEMENT_STATUS = Object.freeze({
  PENDING: "Pending",
  AWAITING_PAYMENT: "Awaiting_Payment",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
});

const AGREEMENT_STATUS_BY_NUMBER = Object.freeze({
  0: AGREEMENT_STATUS.PENDING,
  1: AGREEMENT_STATUS.AWAITING_PAYMENT,
  2: AGREEMENT_STATUS.CONFIRMED,
  3: AGREEMENT_STATUS.CANCELLED,
  4: AGREEMENT_STATUS.EXPIRED,
});

const AGREEMENT_STATUS_META = Object.freeze({
  pending: {
    label: "Chờ hai bên xác nhận",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  awaitingpayment: {
    label: "Chờ thanh toán",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "border-success/30 bg-success/10 text-success",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-error/30 bg-error/10 text-error",
  },
  expired: {
    label: "Đã hết hạn",
    className: "border-border bg-textLight/10 text-textLight",
  },
});

export const AGREEMENT_TYPE_OPTIONS = Object.freeze([
  {
    value: AGREEMENT_TYPE.INSPECTION,
    label: "Có kiểm định sản phẩm",
    description: "Hai bên gặp trực tiếp để kiểm tra sản phẩm trước khi hoàn tất giao dịch.",
  },
  {
    value: AGREEMENT_TYPE.NO_INSPECTION,
    label: "Không kiểm định",
    description: "Hai bên chuyển thẳng sang bước giao nhận sau khi xác nhận và thanh toán.",
  },
]);

export const PAYMENT_TYPE_OPTIONS = Object.freeze([
  { value: PAYMENT_TYPE.DEPOSIT, label: "Thanh toán đặt cọc" },
  { value: PAYMENT_TYPE.FULL_PAYMENT, label: "Thanh toán toàn bộ" },
]);

export const DELIVERY_METHOD_OPTIONS = Object.freeze([
  { value: DELIVERY_METHOD.BUYER_PICK_UP, label: "Người mua tự đến lấy" },
  { value: DELIVERY_METHOD.SELLER_DELIVERS, label: "Người bán giao hàng" },
]);

export const normalizeAgreementStatus = (status) => {
  if (typeof status === "number") {
    return AGREEMENT_STATUS_BY_NUMBER[status] || String(status);
  }

  return String(status || "").trim();
};

export const getAgreementStatusMeta = (status) => {
  const normalizedStatus = normalizeAgreementStatus(status);
  const key = normalizedStatus.replace(/[\s_-]+/g, "").toLowerCase();

  return AGREEMENT_STATUS_META[key] || {
    label: normalizedStatus || "Chưa xác định",
    className: "border-border bg-textLight/10 text-textLight",
  };
};

export const getAgreementTypeLabel = (type) => {
  return AGREEMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "Chưa xác định";
};

export const getPaymentTypeLabel = (type) => {
  return PAYMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "Chưa xác định";
};

export const getDeliveryMethodLabel = (method) => {
  if (method === DELIVERY_METHOD.GHN) return "Giao hàng nhanh (GHN)";
  return DELIVERY_METHOD_OPTIONS.find((option) => option.value === method)?.label || method || "Chưa xác định";
};

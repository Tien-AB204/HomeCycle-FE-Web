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
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  awaitingpayment: {
    label: "Chờ thanh toán",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  expired: {
    label: "Đã hết hạn",
    className: "border-slate-200 bg-slate-100 text-slate-600",
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
    className: "border-gray-200 bg-gray-50 text-gray-600",
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

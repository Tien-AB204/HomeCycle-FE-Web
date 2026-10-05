const normalizeEnum = (value) => String(value ?? "").trim().toLowerCase();

/*
 * TransactionType của Backend (chuỗi hoặc số). "flow" là chiều tiền xét theo
 * ví của người dùng: in/out cộng trừ số dư, lock khóa tiền chờ rút, none
 * không đi qua ví (ví dụ thanh toán PayOS).
 */
const TRANSACTION_TYPES = {
  escrow_deposit: { label: "Thanh toán đơn hàng (PayOS)", flow: "none" },
  wallet_payment: { label: "Thanh toán đơn hàng bằng ví", flow: "out" },
  payout_release: { label: "Nhận tiền bán hàng", flow: "in" },
  order_refund: { label: "Hoàn tiền đơn hàng", flow: "in" },
  withdrawal_lock: { label: "Khóa tiền chờ rút", flow: "lock" },
  withdrawal_success: { label: "Rút tiền thành công", flow: "out" },
  withdrawal_revert: { label: "Hoàn lại tiền rút", flow: "in" },
  commission_fee: { label: "Phí hoa hồng", flow: "out" },
  subscription_fee: { label: "Thanh toán gói dịch vụ", flow: "out" },
  shipping_fee_collected: { label: "Thu phí vận chuyển", flow: "none" },
};

const TRANSACTION_TYPE_BY_NUMBER = {
  1: "escrow_deposit",
  2: "wallet_payment",
  3: "payout_release",
  4: "order_refund",
  5: "withdrawal_lock",
  6: "withdrawal_success",
  7: "withdrawal_revert",
  8: "commission_fee",
  9: "subscription_fee",
  10: "shipping_fee_collected",
};

export const getTransactionTypeInfo = (value) => {
  const normalized = normalizeEnum(value);
  const key = TRANSACTION_TYPE_BY_NUMBER[normalized] ?? normalized;
  return TRANSACTION_TYPES[key] ?? { label: "", flow: "none" };
};

/*
 * Giao dịch không cộng/trừ vào ví của mình thì dùng mô tả của Backend.
 */
export const getTransactionTitle = (item) => {
  const typeInfo = getTransactionTypeInfo(item?.transactionType);

  return typeInfo.flow === "none"
    ? item?.description || typeInfo.label || "Giao dịch ví"
    : typeInfo.label || item?.description || "Giao dịch ví";
};

export const getAmountSign = (flow) =>
  flow === "in" ? "+" : flow === "out" ? "-" : "";

const TRANSACTION_STATUS_LABELS = {
  0: "Đang xử lý",
  pending: "Đang xử lý",
  2: "Thất bại",
  failed: "Thất bại",
  3: "Đã hủy",
  cancelled: "Đã hủy",
};

// Giao dịch hoàn tất là trạng thái bình thường nên không ghi nhãn.
export const getTransactionStatusLabel = (value) =>
  TRANSACTION_STATUS_LABELS[normalizeEnum(value)] || "";

export const isDirectionIn = (value) =>
  ["0", "in"].includes(normalizeEnum(value));

export const getBalanceTypeLabel = (value) =>
  ["1", "hold"].includes(normalizeEnum(value))
    ? "Đang chờ rút"
    : "Số dư khả dụng";

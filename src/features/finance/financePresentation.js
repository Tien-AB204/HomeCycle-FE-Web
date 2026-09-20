export const TRANSACTION_TYPE_LABELS = Object.freeze({
  1: "Tạm giữ tiền cho đơn hàng",
  2: "Thanh toán bằng ví",
  3: "Chuyển tiền cho người bán",
  4: "Hoàn tiền đơn hàng",
  5: "Tiền của người dùng đang yêu cầu rút",
  6: "Rút tiền thành công",
  7: "Tiền được trả lại sau yêu cầu rút",
  9: "Phí gói đăng ký",
  10: "Thu phí vận chuyển GHN",
  Escrow_Deposit: "Tạm giữ tiền cho đơn hàng",
  Wallet_Payment: "Thanh toán bằng ví",
  Payout_Release: "Chuyển tiền cho người bán",
  Order_Refund: "Hoàn tiền đơn hàng",
  Withdrawal_Lock: "Tiền của người dùng đang yêu cầu rút",
  Withdrawal_Success: "Rút tiền thành công",
  Withdrawal_Revert: "Tiền được trả lại sau yêu cầu rút",
  Subscription_Fee: "Phí gói đăng ký",
  Shipping_Fee_Collected: "Thu phí vận chuyển GHN",
});

export const REFERENCE_TYPE_LABELS = Object.freeze({
  1: "Đơn hàng",
  2: "Gói đăng ký",
  3: "Tranh chấp",
  4: "Yêu cầu rút tiền",
  Order: "Đơn hàng",
  Subscription: "Gói đăng ký",
  Dispute: "Tranh chấp",
  Withdrawal: "Yêu cầu rút tiền",
});

export const TRANSACTION_STATUS_LABELS = Object.freeze({
  0: "Đang chờ",
  1: "Hoàn tất",
  2: "Thất bại",
  3: "Đã hủy",
  Pending: "Đang chờ",
  Completed: "Hoàn tất",
  Failed: "Thất bại",
  Cancelled: "Đã hủy",
});

export const USER_ROLE_LABELS = Object.freeze({
  1: "Cá nhân",
  2: "Doanh nghiệp",
  3: "Kiểm duyệt viên",
  4: "Quản trị viên",
  Personal: "Cá nhân",
  Business: "Doanh nghiệp",
  Moderator: "Kiểm duyệt viên",
  Admin: "Quản trị viên",
});

export const WALLET_TYPE_LABELS = Object.freeze({
  0: "Cá nhân",
  1: "Doanh nghiệp",
  99: "Hệ thống",
  Personal: "Cá nhân",
  Business: "Doanh nghiệp",
  System: "Hệ thống",
});

export const SYSTEM_PURPOSE_LABELS = Object.freeze({
  1: "Quỹ phí vận chuyển GHN",
  2: "Doanh thu nền tảng",
  Shipping_Escrow: "Quỹ phí vận chuyển GHN",
  Platform_Revenue: "Doanh thu nền tảng",
});

export const PAYMENT_METHOD_LABELS = Object.freeze({
  1: "PayOS",
  2: "Ví HomeCycle",
  3: "Chưa xác định",
  PayOS: "PayOS",
  Internal_Wallet: "Ví HomeCycle",
  Unknown: "Chưa xác định",
});

export const LEDGER_DIRECTION_LABELS = Object.freeze({
  0: "Vào",
  1: "Ra",
  In: "Vào",
  Out: "Ra",
});

export const LEDGER_BALANCE_TYPE_LABELS = Object.freeze({
  0: "Khả dụng",
  1: "Tạm giữ",
  Available: "Khả dụng",
  Hold: "Tạm giữ",
});

export const getFinanceLabel = (labels, value) => {
  if (value === null || value === undefined || value === "") return "—";
  return labels[value] || "Chưa xác định";
};

export const formatFinanceCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatFinanceDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

export const shortenFinanceId = (value) => {
  const id = String(value || "").trim();
  if (!id) return "";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
};

export const getFinanceReferenceLabel = (
  referenceType,
  referenceCode,
  referenceId,
) => {
  const typeLabel = referenceType
    ? getFinanceLabel(REFERENCE_TYPE_LABELS, referenceType)
    : "";
  const reference = referenceCode || shortenFinanceId(referenceId);
  if (typeLabel && reference) return `${typeLabel} · ${reference}`;
  return reference || typeLabel || "—";
};

export const TRANSACTION_TYPE_OPTIONS = Object.freeze(
  Object.entries(TRANSACTION_TYPE_LABELS)
    .filter(([value]) => Number.isNaN(Number(value)))
    .map(([value, label]) => ({ value, label })),
);

export const REFERENCE_TYPE_OPTIONS = Object.freeze(
  Object.entries(REFERENCE_TYPE_LABELS)
    .filter(([value]) => Number.isNaN(Number(value)))
    .map(([value, label]) => ({ value, label })),
);

export const TRANSACTION_STATUS_OPTIONS = Object.freeze(
  Object.entries(TRANSACTION_STATUS_LABELS)
    .filter(([value]) => Number.isNaN(Number(value)))
    .map(([value, label]) => ({ value, label })),
);

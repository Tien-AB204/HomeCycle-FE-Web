const VN_OFFSET_MS = 7 * 3600 * 1000;

export const ORDER_STATUS_LABELS = Object.freeze({
  Pending: "Đang chờ",
  Processing: "Đang xử lý",
  Completed: "Hoàn tất",
  Disputing: "Đang tranh chấp",
  Cancelled: "Đã hủy",
});

// Luồng hoàn trả đã bỏ ở Backend: không đưa "Returned" vào bộ lọc/biểu đồ, chỉ giữ nhãn cho dữ liệu cũ.
export const ORDER_STATUS_ORDER = Object.freeze([
  "Pending",
  "Processing",
  "Completed",
  "Disputing",
  "Cancelled",
]);

export const LEGACY_ORDER_STATUS_LABELS = Object.freeze({
  Returned: "Đã hoàn trả",
});

export const APPOINTMENT_STATUS_LABELS = Object.freeze({
  Proposed: "Đề xuất đổi lịch",
  Scheduled: "Đã thống nhất",
  InProgress: "Đang diễn ra",
  Completed: "Đã hoàn tất",
  Cancelled: "Đã hủy",
  Expired: "Đã hết hạn",
});

export const EFFECTIVE_APPOINTMENT_STATUSES = Object.freeze([
  "Scheduled",
  "InProgress",
  "Completed",
  "Cancelled",
  "Expired",
]);

export const APPOINTMENT_TYPE_LABELS = Object.freeze({
  Inspection: "Kiểm định",
  Collection: "Thu gom",
});

export const DELIVERY_METHOD_LABELS = Object.freeze({
  GhnDelivery: "GHN",
  SellerDelivers: "Người bán giao",
  BuyerPickUp: "Người mua đến lấy",
  Unknown: "Chưa xác định",
  Unspecified: "Chưa xác định",
});

export const PAYMENT_METHOD_LABELS = Object.freeze({
  PayOS: "PayOS",
  Internal_Wallet: "Ví nội bộ",
  Unknown: "Chưa xác định",
  Unspecified: "Chưa xác định",
});

export const PAYMENT_STATUS_LABELS = Object.freeze({
  Pending: "Chờ thanh toán",
  Completed: "Đã thanh toán",
  Failed: "Thanh toán thất bại",
  Refunded: "Đã hoàn tiền",
  PartiallyRefunded: "Hoàn tiền một phần",
  Expired: "Hết hạn thanh toán",
  Cancelled: "Đã hủy thanh toán",
});

export const ORDER_GROUP_OPTIONS = Object.freeze([
  { value: "Trading", label: "Đang giao dịch" },
  { value: "Issue", label: "Có vấn đề" },
  { value: "Successful", label: "Thành công" },
]);

const ENUM_INDEX = {
  order: ["Pending", "Processing", "Completed", "Cancelled", "Disputing", "Returned"],
  appointment: ["Proposed", "Scheduled", "Completed", "Cancelled", "Expired", "InProgress"],
  appointmentType: ["Inspection", "Collection"],
  delivery: ["Unknown", "GhnDelivery", "SellerDelivers", "BuyerPickUp"],
  payment: ["Pending", "Completed", "Failed", "Refunded", "PartiallyRefunded", "Expired", "Cancelled"],
};

// Backend trả enum dạng tên; vài chỗ cũ trả số. Đưa về tên để tra nhãn.
export const enumKey = (value, kind) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return ENUM_INDEX[kind]?.[value] ?? String(value);
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return ENUM_INDEX[kind]?.[Number(text)] ?? text;
  const match = ENUM_INDEX[kind]?.find((name) => name.toLowerCase() === text.toLowerCase());
  return match || text;
};

export const labelOf = (labels, value, kind, fallback = "Chưa xác định") => {
  const key = enumKey(value, kind);
  return labels[key] || LEGACY_ORDER_STATUS_LABELS[key] || fallback;
};

export const countOf = (distribution, key) =>
  (Array.isArray(distribution) ? distribution : [])
    .filter((item) => String(item?.key).toLowerCase() === key.toLowerCase())
    .reduce((sum, item) => sum + (Number(item?.count) || 0), 0);

export const formatNumber = (value) =>
  Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });

export const formatMoney = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : `${Number(value).toLocaleString("vi-VN")} đ`;

export const formatPercent = (count, total) =>
  total ? `${(count / total * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "0%";

const toUtcInstant = (value) => {
  if (!value) return null;
  const text = String(value);
  const date = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(text) || text.length <= 10 ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Thời điểm từ Backend là UTC; hiển thị theo giờ Việt Nam.
export const formatDateTime = (value) => {
  const date = toUtcInstant(value);
  if (!date) return "—";
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTime = (value) => {
  const date = toUtcInstant(value);
  if (!date) return "";
  return date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// "yyyy-MM-dd" theo giờ Việt Nam của một thời điểm UTC.
export const vnDayKey = (value) => {
  const date = toUtcInstant(value);
  if (!date) return "";
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
};

export const todayKey = () => new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);

export const shiftDayKey = (dayKey, days) => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

export const formatDayKey = (dayKey) => (dayKey ? dayKey.split("-").reverse().join("/") : "—");

// Mốc 00:00 giờ Việt Nam của một ngày, đổi ra ISO UTC để gửi Backend.
export const vnDayStartIso = (dayKey) => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS).toISOString();
};

/*
 * Kỳ "N ngày đã hoàn tất": không gồm hôm nay. Backend nhận From/To dạng
 * ngày, To không tính vào kỳ.
 */
export const completedPeriod = (days) => {
  const to = todayKey();
  return { from: shiftDayKey(to, -days), to };
};

export const STATUS_PILL_TONES = Object.freeze({
  Completed: "green",
  Disputing: "red",
  Cancelled: "red",
  Pending: "amber",
  Proposed: "amber",
  Expired: "amber",
});

export const pillTone = (key) => STATUS_PILL_TONES[key] || "";

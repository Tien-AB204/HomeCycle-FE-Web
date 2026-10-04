export const POST_STATES = [
  ["Active", "Đang hoạt động", "var(--green)"],
  ["Suspended", "Bị đình chỉ", "var(--red)"],
  ["Closed", "Đã đóng", "var(--teal)"],
  ["Deleted", "Đã xóa", "var(--muted)"],
];

export const EMPTY_POST_FILTERS = Object.freeze({
  Keyword: "",
  PostType: "",
  Status: "",
  CategoryId: "",
  City: "",
  OwnerRole: "",
  HasOpenReports: "",
  SortBy: "Newest",
});

export const num = (value) => Number(value || 0).toLocaleString("vi-VN");

export const pct = (count, total) =>
  total ? `${((count / total) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "—";

export const stateKey = (value) =>
  POST_STATES.find(([key]) => key.toLowerCase() === String(value ?? "").toLowerCase())?.[0] || "";

export const stateLabel = (value) =>
  POST_STATES.find(([key]) => key === stateKey(value))?.[1] || "Chưa xác định";

export const isBuy = (item) => String(item?.postType ?? "").toLowerCase() === "buy";

export const countOf = (items, key) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => String(item?.key).toLowerCase() === key.toLowerCase())
    .reduce((sum, item) => sum + (Number(item?.count) || 0), 0);

// Ngày tạo (UTC) hiển thị theo giờ Việt Nam.
export const formatDate = (value) => {
  if (!value) return "—";
  const text = String(value);
  const date = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(text) ? text : `${text}Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

export const isCanceled = (error) => error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

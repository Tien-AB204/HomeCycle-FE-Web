export const EMPTY_LISTING_FILTERS = Object.freeze({
  Keyword: "",
  PostType: "",
  Status: "",
  CategoryId: "",
  City: "",
  OwnerRole: "",
  HasOpenReports: "",
});

export const LISTING_STATUS_LABELS = Object.freeze({
  Active: "Đang hoạt động",
  Suspended: "Đình chỉ",
  Closed: "Đã đóng",
  Deleted: "Đã xóa",
  Unspecified: "Chưa xác định",
});

export const LISTING_STATUS_OPTIONS = Object.freeze(
  ["Active", "Suspended", "Closed", "Deleted"].map((value) => ({
    value,
    label: LISTING_STATUS_LABELS[value],
  })),
);

export const LISTING_POST_TYPE_LABELS = Object.freeze({
  Sell: "Bán",
  Buy: "Mua",
});

export const OWNER_ROLE_OPTIONS = Object.freeze([
  { value: "Personal", label: "Cá nhân" },
  { value: "Business", label: "Doanh nghiệp" },
]);

export const OWNER_ROLE_LABELS = Object.freeze({
  Personal: "Cá nhân",
  Business: "Doanh nghiệp",
  Moderator: "Kiểm duyệt viên",
  Admin: "Quản trị viên",
});

export const USER_STATUS_LABELS = Object.freeze({
  Pending: "Chờ kích hoạt",
  Active: "Đang hoạt động",
  Suspended: "Đang tạm khóa",
  Deleted: "Đã xóa",
});

export const VERIFICATION_STATUS_LABELS = Object.freeze({
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Bị từ chối",
  NotSubmitted: "Chưa gửi",
  None: "Chưa gửi",
});

export const getListingStatusLabel = (status) =>
  LISTING_STATUS_LABELS[status] || "Chưa xác định";

export const getLabel = (labels, value, empty = "Chưa có") => {
  if (value === null || value === undefined || value === "") {
    return empty;
  }

  return labels[value] || String(value);
};

export const formatListingMoney = (value) =>
  value === null || value === undefined
    ? "Chưa cung cấp"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(value);

export const formatListingPrice = (item) => {
  if (item?.postType === "Sell") {
    return formatListingMoney(item.basePrice);
  }

  if (item?.postType === "Buy") {
    if (item.priceFrom == null && item.priceTo == null) return "Chưa cung cấp";
    if (item.priceFrom == null) return `Đến ${formatListingMoney(item.priceTo)}`;
    if (item.priceTo == null) return `Từ ${formatListingMoney(item.priceFrom)}`;
    return `${formatListingMoney(item.priceFrom)} – ${formatListingMoney(item.priceTo)}`;
  }

  return "Chưa xác định";
};

// Thời điểm từ Backend là UTC; chuỗi thiếu hậu tố múi giờ được hiểu là UTC.
export const formatListingDateTime = (value) => {
  if (!value) return "—";
  const utcValue = /Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(utcValue);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

// DateOnly (yyyy-MM-dd): định dạng trực tiếp, không đổi múi giờ.
export const formatDateOnly = (value, offsetDays = 0) => {
  const parts = String(value || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "—";
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + offsetDays));
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
};

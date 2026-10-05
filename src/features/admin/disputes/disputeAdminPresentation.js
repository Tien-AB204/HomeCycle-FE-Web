export const DISPUTE_STATUS_LABELS = Object.freeze({
  Pending: "Chờ xử lý",
  AwaitingResponse: "Chờ phản hồi",
  UnderReview: "Đang xem xét",
  Resolved: "Đã giải quyết",
  Rejected: "Đã từ chối",
  Closed: "Đã đóng",
  // Luồng hoàn trả đã bỏ ở Backend; nhãn chỉ giữ cho dữ liệu cũ.
  AwaitingReturn: "Chờ hoàn trả",
});

export const DISPUTE_STATUS_ORDER = Object.freeze([
  "Pending",
  "AwaitingResponse",
  "UnderReview",
  "Resolved",
  "Rejected",
  "Closed",
]);

const STATUS_BY_NUMBER = ["Pending", "Resolved", "Rejected", "Closed", "UnderReview", "AwaitingReturn", "AwaitingResponse"];

export const statusKey = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" || /^\d+$/.test(String(value))) return STATUS_BY_NUMBER[Number(value)] || "";
  const text = String(value);
  return STATUS_BY_NUMBER.find((key) => key.toLowerCase() === text.toLowerCase()) || text;
};

export const statusBadgeTone = (key) =>
  key === "Resolved"
    ? "green"
    : key === "AwaitingResponse"
      ? "blue"
      : key === "Pending" || key === "AwaitingReturn"
        ? "amber"
        : key === "Rejected"
          ? "red"
          : key === "Closed"
            ? "gray"
            : "";

// Backend chỉ có bộ xử lý tranh chấp cho Đơn hàng, Bài đăng, Đánh giá.
export const TARGET_TYPE_LABELS = Object.freeze({
  Order: "Đơn hàng",
  Post: "Bài đăng",
  Review: "Đánh giá",
  Appointment: "Lịch hẹn",
});

export const TARGET_TYPE_OPTIONS = Object.freeze(["Order", "Post", "Review"]);

const TARGET_BY_NUMBER = { 1: "Appointment", 2: "Order", 3: "Review", 4: "Post" };

export const targetKey = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" || /^\d+$/.test(String(value))) return TARGET_BY_NUMBER[Number(value)] || "";
  return String(value);
};

export const RESOLUTION_OUTCOME_LABELS = Object.freeze({
  BuyerFavored: "Có lợi cho người mua",
  SellerFavored: "Có lợi cho người bán",
  ViolationConfirmed: "Xác nhận vi phạm",
  NoViolation: "Không vi phạm",
});

const OUTCOME_BY_NUMBER = { 1: "BuyerFavored", 2: "SellerFavored", 3: "ViolationConfirmed", 4: "NoViolation" };

export const outcomeLabel = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const key = /^\d+$/.test(String(value)) ? OUTCOME_BY_NUMBER[Number(value)] : String(value);
  return RESOLUTION_OUTCOME_LABELS[key] || "";
};

export const RESPONSE_TYPE_LABELS = Object.freeze({
  Accept: "Chấp nhận",
  Rebut: "Phản bác",
  Statement: "Trình bày",
  1: "Chấp nhận",
  2: "Phản bác",
  3: "Trình bày",
});

export const ORIGIN_LABELS = Object.freeze({
  UserReported: "Người dùng báo cáo",
  InspectionRejected: "Kết quả kiểm định bị từ chối",
  InspectionNoShow: "Không đủ check-in tại lịch kiểm định",
  CollectionNoShow: "Quá thời gian chờ giao nhận",
  1: "Người dùng báo cáo",
  2: "Kết quả kiểm định bị từ chối",
  3: "Không đủ check-in tại lịch kiểm định",
  4: "Quá thời gian chờ giao nhận",
});

export const disputeCode = (item) =>
  item?.orderCode || item?.target?.order?.orderCode || `TC-${String(item?.disputeId || "").slice(0, 8).toUpperCase()}`;

export const extractPaged = (response) => {
  const payload = response?.data ?? response ?? {};
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const pageSize = Number(payload?.pageSize) || 8;
  const totalCount = Number(payload?.totalCount ?? items.length) || 0;
  return {
    items,
    totalCount,
    totalPages: Number(payload?.totalPages) || Math.max(1, Math.ceil(totalCount / pageSize)),
  };
};

/*
 * Nhãn và quy tắc cho trang "Theo dõi vận chuyển" của kiểm duyệt viên.
 * Query gửi số; response trả tên enum (chuỗi). Hàm nhận được cả hai dạng.
 */
export const DELIVERY_METHODS = Object.freeze([
  { name: "GhnDelivery", value: 1, label: "GHN" },
  { name: "SellerDelivers", value: 2, label: "Người bán tự giao" },
  { name: "BuyerPickUp", value: 3, label: "Người mua đến lấy" },
]);

export const SHIPMENT_STATUSES = Object.freeze([
  { name: "ReadyToPick", value: 1, label: "Chờ lấy hàng", tone: "amber" },
  { name: "Delivering", value: 2, label: "Đang giao", tone: "" },
  { name: "Delivered", value: 3, label: "Đã giao", tone: "green" },
  { name: "Cancelled", value: 4, label: "Đã hủy", tone: "gray" },
  { name: "Returning", value: 5, label: "Đang hoàn", tone: "red" },
  { name: "Returned", value: 6, label: "Đã hoàn", tone: "red" },
  { name: "Damage_Lost", value: 7, label: "Hư hỏng / thất lạc", tone: "red" },
  { name: "Exception", value: 8, label: "Ngoại lệ", tone: "red" },
]);

const GHN_CREATION_LABELS = Object.freeze({
  Pending: "Chờ gửi sang GHN",
  Processing: "Đang tạo vận đơn",
  Success: "Đã tạo vận đơn",
  Failed: "Tạo vận đơn thất bại",
  Uncertain: "Chưa xác định, cần kiểm tra",
});
const GHN_CREATION_NAMES = ["Pending", "Processing", "Success", "Failed", "Uncertain"];

// Vận chuyển "có vấn đề" theo hướng dẫn BE.
const ISSUE_STATUSES = new Set(["Cancelled", "Returning", "Returned", "Damage_Lost", "Exception"]);

const findEnum = (list, value) => {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value);
  return list.find((item) => item.name === text || String(item.value) === text) || null;
};

export const getDeliveryMethod = (value) => findEnum(DELIVERY_METHODS, value);

export const getDeliveryMethodLabel = (value) =>
  getDeliveryMethod(value)?.label || "Chưa xác định";

export const isGhnDelivery = (value) => getDeliveryMethod(value)?.name === "GhnDelivery";

export const getShipmentStatus = (value) => findEnum(SHIPMENT_STATUSES, value);

export const getShipmentStatusMeta = (value) => {
  const status = getShipmentStatus(value);
  return status
    ? { label: status.label, tone: status.tone }
    : { label: "Chưa có trạng thái", tone: "gray" };
};

export const isShipmentIssue = (value) => ISSUE_STATUSES.has(getShipmentStatus(value)?.name);

export const getGhnCreationLabel = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const name = GHN_CREATION_NAMES[Number(value)] ?? String(value);
  return GHN_CREATION_LABELS[name] || String(value);
};

// Thống kê chỉ trên trang đang xem: BE chưa có API thống kê toàn hệ thống.
export const getPageStats = (items) => {
  const rows = Array.isArray(items) ? items : [];
  return {
    total: rows.length,
    delivering: rows.filter((item) => getShipmentStatus(item?.shipmentStatus)?.name === "Delivering").length,
    issues: rows.filter((item) => isShipmentIssue(item?.shipmentStatus)).length,
  };
};

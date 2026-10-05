import {
  ORDER_PERSPECTIVE,
  ORDER_STATUS,
  getOrderStatusMeta,
  normalizeOrderStatus,
} from "../../constants/orders.js";

export const ORDER_SCOPE = Object.freeze({
  ALL: "all",
  OPEN: "open",
  HISTORY: "history",
});

// Đơn còn cần theo dõi: chưa kết thúc hoặc đang có tranh chấp.
const OPEN_STATUS_NAMES = Object.freeze(["Pending", "Processing", "Disputing"]);

export const ORDER_RING_STATUSES = Object.freeze([
  { status: ORDER_STATUS.PENDING, color: "#9A6418" },
  { status: ORDER_STATUS.PROCESSING, color: "#2B5659" },
  { status: ORDER_STATUS.COMPLETED, color: "#2F765D" },
  { status: ORDER_STATUS.DISPUTING, color: "#B04E57" },
  { status: ORDER_STATUS.CANCELLED, color: "#9AA8A0" },
  { status: ORDER_STATUS.RETURNED, color: "#537DA9" },
]);

export const isOpenOrder = (order) =>
  OPEN_STATUS_NAMES.includes(normalizeOrderStatus(order?.orderStatus));

const hasStatus = (order, status) =>
  status === "" ||
  status === null ||
  status === undefined ||
  normalizeOrderStatus(order?.orderStatus) === normalizeOrderStatus(status);

const matchesScope = (order, scope) => {
  if (scope === ORDER_SCOPE.OPEN) return isOpenOrder(order);
  if (scope === ORDER_SCOPE.HISTORY) return !isOpenOrder(order);
  return true;
};

const matchesKeyword = (order, keyword) => {
  const normalized = String(keyword || "").trim().toLocaleLowerCase("vi-VN");
  if (!normalized) return true;

  return [order?.productName, order?.orderCode]
    .filter(Boolean)
    .some((value) =>
      String(value).toLocaleLowerCase("vi-VN").includes(normalized),
    );
};

const getCreatedTime = (order) => new Date(order?.createdAt).getTime() || 0;

export const sortNewestFirst = (orders) =>
  [...orders].sort((left, right) => getCreatedTime(right) - getCreatedTime(left));

export const getOrdersForPerspective = (orders, perspective) =>
  (Array.isArray(orders) ? orders : []).filter(
    (order) => order?.viewPerspective === perspective,
  );

export const hasSellerOrders = (orders) =>
  getOrdersForPerspective(orders, ORDER_PERSPECTIVE.SELLER).length > 0;

export const countOrdersByStatus = (orders, status) =>
  orders.filter((order) => hasStatus(order, status)).length;

export const getOrderRingRows = (orders) =>
  ORDER_RING_STATUSES.map(({ status, color }) => ({
    key: status,
    label: getOrderStatusMeta(status).label,
    color,
    count: countOrdersByStatus(orders, status),
  }));

export const filterOrders = (orders, { scope, status, keyword } = {}) =>
  sortNewestFirst(
    orders.filter(
      (order) =>
        matchesScope(order, scope) &&
        hasStatus(order, status) &&
        matchesKeyword(order, keyword),
    ),
  );

export const getPriorityOrders = (orders) =>
  sortNewestFirst(orders.filter(isOpenOrder));

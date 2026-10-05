import assert from "node:assert/strict";
import test from "node:test";
import { ORDER_STATUS } from "../../constants/orders.js";
import {
  ORDER_SCOPE,
  countOrdersByStatus,
  filterOrders,
  getOrderRingRows,
  getOrdersForPerspective,
  getPriorityOrders,
  hasSellerOrders,
} from "./businessOrderOverview.js";

const orders = [
  { orderId: "a", orderCode: "HC-1", productName: "Máy giặt", orderStatus: 0, createdAt: "2026-10-01T08:00:00Z", viewPerspective: "buyer" },
  { orderId: "b", orderCode: "HC-2", productName: "Tủ lạnh", orderStatus: 2, createdAt: "2026-10-03T08:00:00Z", viewPerspective: "buyer" },
  { orderId: "c", orderCode: "HC-3", productName: "Máy lạnh", orderStatus: 4, createdAt: "2026-10-02T08:00:00Z", viewPerspective: "buyer" },
  { orderId: "d", orderCode: "HC-4", productName: "Bếp từ", orderStatus: "Cancelled", createdAt: "2026-09-30T08:00:00Z", viewPerspective: "buyer" },
  { orderId: "e", orderCode: "HC-5", productName: "Ghế", orderStatus: 1, createdAt: "2026-10-04T08:00:00Z", viewPerspective: "seller" },
];

test("splits orders by perspective", () => {
  assert.equal(getOrdersForPerspective(orders, "buyer").length, 4);
  assert.equal(hasSellerOrders(orders), true);
  assert.equal(hasSellerOrders(orders.slice(0, 4)), false);
});

test("counts statuses given as numbers or enum names", () => {
  const buyer = getOrdersForPerspective(orders, "buyer");
  assert.equal(countOrdersByStatus(buyer, ORDER_STATUS.CANCELLED), 1);
  assert.equal(countOrdersByStatus(buyer, ""), 4);

  const rows = getOrderRingRows(buyer);
  assert.equal(rows.length, 6);
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 4);
});

test("filters by scope, status and keyword, newest first", () => {
  const buyer = getOrdersForPerspective(orders, "buyer");

  assert.deepEqual(
    filterOrders(buyer, { scope: ORDER_SCOPE.OPEN }).map((order) => order.orderId),
    ["c", "a"],
  );
  assert.deepEqual(
    filterOrders(buyer, { scope: ORDER_SCOPE.HISTORY }).map((order) => order.orderId),
    ["b", "d"],
  );
  assert.deepEqual(
    filterOrders(buyer, { status: ORDER_STATUS.COMPLETED }).map((order) => order.orderId),
    ["b"],
  );
  assert.deepEqual(
    filterOrders(buyer, { keyword: "hc-4" }).map((order) => order.orderId),
    ["d"],
  );
  assert.deepEqual(
    getPriorityOrders(buyer).map((order) => order.orderId),
    ["c", "a"],
  );
});

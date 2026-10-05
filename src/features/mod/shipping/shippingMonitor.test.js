import assert from "node:assert/strict";
import test from "node:test";
import {
  getDeliveryMethodLabel,
  getGhnCreationLabel,
  getPageStats,
  getShipmentStatusMeta,
  isGhnDelivery,
  isShipmentIssue,
} from "./shippingMonitor.js";

test("reads enums sent as names or numbers", () => {
  assert.equal(getDeliveryMethodLabel("GhnDelivery"), "GHN");
  assert.equal(getDeliveryMethodLabel(3), "Người mua đến lấy");
  assert.equal(getDeliveryMethodLabel(null), "Chưa xác định");
  assert.equal(isGhnDelivery("GhnDelivery"), true);
  assert.equal(isGhnDelivery("SellerDelivers"), false);

  assert.deepEqual(getShipmentStatusMeta("Delivered"), { label: "Đã giao", tone: "green" });
  assert.deepEqual(getShipmentStatusMeta(8), { label: "Ngoại lệ", tone: "red" });
  assert.deepEqual(getShipmentStatusMeta(null), { label: "Chưa có trạng thái", tone: "gray" });
});

test("flags problem shipments and counts the current page", () => {
  assert.equal(isShipmentIssue("Returning"), true);
  assert.equal(isShipmentIssue("Delivering"), false);
  assert.equal(isShipmentIssue(null), false);

  assert.deepEqual(
    getPageStats([
      { shipmentStatus: "Delivering" },
      { shipmentStatus: "Delivering" },
      { shipmentStatus: "Exception" },
      { shipmentStatus: "Damage_Lost" },
      { shipmentStatus: null },
    ]),
    { total: 5, delivering: 2, issues: 2 },
  );
});

test("labels GHN waybill creation states", () => {
  assert.equal(getGhnCreationLabel("Failed"), "Tạo vận đơn thất bại");
  assert.equal(getGhnCreationLabel(2), "Đã tạo vận đơn");
  assert.equal(getGhnCreationLabel(null), "—");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  getFinanceTabPath,
  getHoldRelation,
  getHoldRelationKey,
  matchesKeyword,
  paginate,
  resolveFinanceTab,
} from "./financeLookup.js";

test("maps old finance links to the merged tabs", () => {
  assert.equal(resolveFinanceTab("payments"), "payments");
  assert.equal(resolveFinanceTab("transactions"), "ledger");
  assert.equal(resolveFinanceTab("funds"), "overview");
  assert.equal(resolveFinanceTab("ghn"), "overview");
  assert.equal(resolveFinanceTab("unknown"), "overview");
  assert.equal(getFinanceTabPath("holds"), "/admin/dashboard/finance?tab=holds");
  assert.equal(getFinanceTabPath(null), "/admin/dashboard/finance");
});

test("searches loaded rows without case or accent surprises", () => {
  assert.equal(matchesKeyword(["Thanh toán gói Business", "HC-1025"], "hc-10"), true);
  assert.equal(matchesKeyword(["Thanh toán gói Business"], "GÓI"), true);
  assert.equal(matchesKeyword([null, undefined], "x"), false);
  assert.equal(matchesKeyword(["anything"], "  "), true);
});

test("describes a hold only from its reference type", () => {
  assert.equal(getHoldRelation({ referenceType: "Withdrawal" }), "Liên quan yêu cầu rút tiền");
  assert.equal(getHoldRelation({ referenceType: 4 }), "Liên quan yêu cầu rút tiền");
  assert.equal(getHoldRelation({ referenceType: "Order" }), "Liên quan đơn hàng");
  assert.equal(getHoldRelation({ referenceType: null }), "Chưa có tham chiếu");
  assert.equal(getHoldRelationKey({ referenceType: 4 }), "Withdrawal");
  assert.equal(getHoldRelationKey({}), "none");
});

test("paginates loaded rows and clamps the page", () => {
  const rows = Array.from({ length: 23 }, (_, index) => index);
  assert.deepEqual(paginate(rows, 3, 10), { page: 3, totalPages: 3, items: [20, 21, 22] });
  assert.equal(paginate(rows, 9, 10).page, 3);
  assert.deepEqual(paginate([], 1, 10), { page: 1, totalPages: 1, items: [] });
});

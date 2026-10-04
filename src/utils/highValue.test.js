import assert from "node:assert/strict";
import test from "node:test";
import { getContractTotal, isHighValueWithoutInspection } from "./highValue.js";

test("warns only for contracts above 3,000,000 đ without inspection", () => {
  assert.equal(getContractTotal(1_500_000, 2), 3_000_000);
  assert.equal(isHighValueWithoutInspection(1_500_000, 2, false), false);
  assert.equal(isHighValueWithoutInspection(1_500_001, 2, false), true);
  assert.equal(isHighValueWithoutInspection(5_000_000, 1, true), false);
  assert.equal(isHighValueWithoutInspection("abc", 1, false), false);
});

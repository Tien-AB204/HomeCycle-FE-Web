import assert from "node:assert/strict";
import test from "node:test";
import { MAIN_CATEGORIES } from "../constants/filterOptions.js";
import { getCategoryFilterOptions } from "./searchUtils.js";

test("returns household-specific filters for household category", () => {
  const filters = getCategoryFilterOptions(MAIN_CATEGORIES.HOUSEHOLD);

  assert.ok(filters);
  assert.ok(filters.materialTypes.length > 0);
  assert.ok(filters.coreMaterials.length > 0);
  assert.ok(filters.brands.length > 0);
});

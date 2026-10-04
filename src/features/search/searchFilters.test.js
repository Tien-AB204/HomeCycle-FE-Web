import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSearchCriteria,
  countActiveFilters,
  createInitialFilters,
  restoreFilters,
  toggleAttributeOption,
} from "./searchFilters.js";

test("sends sorting and swaps reversed ranges for the backend", () => {
  const criteria = buildSearchCriteria({
    filters: {
      ...createInitialFilters(),
      minPrice: "500000",
      maxPrice: "100000",
      minDamageLevel: "4",
      maxDamageLevel: "1",
      minUsageDuration: "-3",
    },
    sortMode: "price-descending",
  });

  assert.equal(criteria.sortBy, "PriceDesc");
  assert.deepEqual([criteria.minPrice, criteria.maxPrice], [100000, 500000]);
  assert.deepEqual(
    [criteria.minDamageLevel, criteria.maxDamageLevel],
    [1, 4],
  );
  assert.equal(criteria.minUsageDuration, undefined);
});

test("sends attribute options only with a category and product type", () => {
  const filters = {
    ...createInitialFilters(),
    categoryId: "fridge-category",
    productTypeId: "fridge",
    attributeOptions: { door: ["glass", "steel"], empty: [] },
  };

  assert.deepEqual(buildSearchCriteria({ filters }).attributeFilters, [
    { attributeId: "door", optionIds: ["glass", "steel"] },
  ]);

  const withoutCategory = buildSearchCriteria({
    filters: { ...filters, categoryId: "" },
  });
  assert.equal(withoutCategory.productTypeId, "");
  assert.deepEqual(withoutCategory.attributeFilters, []);
});

test("limits business users to sell posts", () => {
  const filters = { ...createInitialFilters(), postType: "Buy" };

  assert.equal(buildSearchCriteria({ filters }).postType, "Buy");
  assert.equal(
    buildSearchCriteria({ filters, isBusinessUser: true }).postType,
    "Sell",
  );
});

test("toggles attribute options and counts active filters", () => {
  let options = toggleAttributeOption({}, "door", "steel");
  options = toggleAttributeOption(options, "door", "glass");
  assert.deepEqual(options, { door: ["steel", "glass"] });

  options = toggleAttributeOption(
    toggleAttributeOption(options, "door", "steel"),
    "door",
    "glass",
  );
  assert.deepEqual(options, {});

  assert.equal(
    countActiveFilters({
      ...createInitialFilters(),
      city: "Thành phố Hà Nội",
      attributeOptions: { door: ["steel"] },
    }),
    2,
  );
});

test("drops unsupported keys from restored filters", () => {
  const restored = restoreFilters({
    city: "Tỉnh Cao Bằng",
    priorityLevel: "High",
    attributeOptions: { door: ["steel"], empty: [] },
  });

  assert.equal(restored.city, "Tỉnh Cao Bằng");
  assert.equal("priorityLevel" in restored, false);
  assert.deepEqual(restored.attributeOptions, { door: ["steel"] });
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiPricingContext,
  countAiPriceSamples,
  getSampleGroups,
  hasUsablePrice,
} from "./aiPriceSuggestion.js";

const completeForm = {
  productTypeId: "type",
  brandId: "brand",
  productName: " Máy giặt Samsung ",
  modelNumber: "WW90T",
  functionalityStatus: "FullyFunctional",
  damageLevel: "None",
  usageDuration: "12",
};

const contextFor = (overrides = {}) =>
  buildAiPricingContext({
    form: { ...completeForm, ...overrides },
    attributeValues: [],
    missingRequiredAttribute: false,
    isLoadingAttributes: false,
    ...overrides.options,
  });

test("is ready once the core product fields are filled", () => {
  const context = contextFor();

  assert.equal(context.issue, "");
  assert.equal(context.product.productName, "Máy giặt Samsung");
  assert.equal(context.product.usageDuration, 12);
});

test("explains what is still missing", () => {
  assert.match(contextFor({ modelNumber: " " }).issue, /mã model/);
  assert.match(contextFor({ usageDuration: "-1" }).issue, /chưa hợp lệ/);
  assert.match(
    buildAiPricingContext({
      form: completeForm,
      attributeValues: [],
      missingRequiredAttribute: true,
      isLoadingAttributes: false,
    }).issue,
    /bắt buộc/,
  );
});

test("changes the key whenever the draft changes", () => {
  assert.notEqual(contextFor().key, contextFor({ damageLevel: "Minor_Damage" }).key);
});

test("only offers to apply prices from usable statuses", () => {
  assert.equal(hasUsablePrice({ status: "suggested", suggestedPrice: 900000 }), true);
  assert.equal(hasUsablePrice({ status: "NO_RELIABLE_DATA", suggestedPrice: 900000 }), false);
  assert.equal(hasUsablePrice({ status: "SUGGESTED", suggestedPrice: 0 }), false);
});

test("counts only web listings used in the calculation when flagged", () => {
  const evidence = {
    completedTradeSamples: 2,
    internalListingSamples: 1,
    externalListingSamples: 5,
  };
  const sources = [
    { sourceType: "EXTERNAL_USED_LISTING", usedInCalculation: true },
    { sourceType: "EXTERNAL_USED_LISTING", usedInCalculation: false },
    { sourceType: "NEW_MARKET_REFERENCE", usedInCalculation: true },
  ];

  assert.equal(countAiPriceSamples(evidence, sources), 4);
  assert.equal(countAiPriceSamples(evidence, []), 8);
  assert.deepEqual(getSampleGroups(evidence, sources).at(-1), {
    label: "Tin rao trên mạng",
    text: "1 dùng để tính / 5 tìm thấy",
  });
});

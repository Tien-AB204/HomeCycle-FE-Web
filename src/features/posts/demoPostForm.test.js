import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_BUY_POST_SAMPLES,
  DEMO_SELL_POST_SAMPLES,
} from "../../constants/demoPostSample.js";
import {
  buildDemoAttributeValues,
  buildDemoBuyForm,
  buildDemoSellForm,
} from "./demoPostForm.js";

test("every demo sample fills the required web form fields", () => {
  const required = [
    "categoryId",
    "productTypeId",
    "productName",
    "price",
    "quantity",
    "description",
    "city",
    "ward",
    "streetAddress",
  ];

  DEMO_SELL_POST_SAMPLES.forEach((sample) => {
    const form = buildDemoSellForm({ medias: ["keep"] }, sample);
    required.forEach((field) => assert.ok(form[field], `${sample.key}.${field}`));
    assert.deepEqual(form.medias, ["keep"]);
  });

  DEMO_BUY_POST_SAMPLES.forEach((sample) => {
    const form = buildDemoBuyForm({}, sample);
    required.forEach((field) => assert.ok(form[field], `${sample.key}.${field}`));
    assert.ok(Number(form.priceFrom) <= Number(form.price), sample.key);
  });
});

test("demo attributes map to the form's option, text and number values", () => {
  assert.deepEqual(
    buildDemoAttributeValues([
      { attributeId: "a", optionId: "o1" },
      { attributeId: "b", valueNumber: 180 },
      { optionId: "ignored" },
    ]),
    {
      a: { optionId: "o1", valueBoolean: "", valueText: "", valueNumber: "" },
      b: { optionId: "", valueBoolean: "", valueText: "", valueNumber: "180" },
    },
  );
});

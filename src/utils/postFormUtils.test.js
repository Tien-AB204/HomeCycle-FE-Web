import assert from "node:assert/strict";
import test from "node:test";
import {
  getFunctionalityForDamageLevel,
  getPostConditionFieldErrors,
  getPostFormApiErrors,
  normalizePostConditionValues,
} from "./postFormUtils.js";

test("maps every supported damage level to the required functionality", () => {
  assert.equal(getFunctionalityForDamageLevel("None"), "FullyFunctional");
  assert.equal(
    getFunctionalityForDamageLevel("Cosmetic_Damage"),
    "FullyFunctional",
  );
  assert.equal(
    getFunctionalityForDamageLevel("Minor_Damage"),
    "PartiallyFunctional",
  );
  assert.equal(
    getFunctionalityForDamageLevel("Severe_Damage"),
    "NonFunctional",
  );
});

test("normalizes legacy edit values to backend-supported enum values", () => {
  assert.deepEqual(
    normalizePostConditionValues("Major_Damage", "NotFunctional"),
    {
      damageLevel: "Severe_Damage",
      functionalityStatus: "NonFunctional",
    },
  );
  assert.deepEqual(
    normalizePostConditionValues("Total_Loss", "NonFunctional"),
    {
      damageLevel: "Severe_Damage",
      functionalityStatus: "NonFunctional",
    },
  );
});

test("returns Vietnamese inline errors for an incompatible condition pair", () => {
  assert.deepEqual(
    getPostConditionFieldErrors("Minor_Damage", "FullyFunctional"),
    {
      damageLevel:
        "Mức độ hư hỏng chưa phù hợp với tình trạng hoạt động.",
      functionalityStatus:
        "Với “Hư hỏng nhẹ”, tình trạng hoạt động phải là “Hoạt động một phần”.",
    },
  );
});

test("maps backend enum validation errors to Vietnamese form fields", () => {
  const result = getPostFormApiErrors({
    response: {
      status: 400,
      data: {
        errors: {
          "Product.DamageLevel": [
            "The value 'Major_Damage' is not valid for DamageLevel.",
          ],
          "Product.FunctionalityStatus": [
            "The value 'NotFunctional' is not valid for FunctionalityStatus.",
          ],
        },
      },
    },
  });

  assert.deepEqual(result, {
    fieldErrors: {
      damageLevel: "Mức độ hư hỏng không hợp lệ.",
      functionalityStatus: "Tình trạng hoạt động không hợp lệ.",
    },
    generalMessage: "",
  });
});

test("never exposes an English network error to the user", () => {
  assert.equal(
    getPostFormApiErrors(new Error("Network Error")).generalMessage,
    "Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng và thử lại.",
  );
});

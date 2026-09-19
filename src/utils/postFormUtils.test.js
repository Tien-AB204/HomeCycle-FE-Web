import assert from "node:assert/strict";
import test from "node:test";
import {
  POST_NOT_EDITABLE_MESSAGE,
  getManagedPostQuantity,
  getPostConditionFieldErrors,
  getPostFormApiErrors,
  isPostStatusEditable,
  normalizePostConditionValues,
} from "./postFormUtils.js";

test("preserves current backend damage/functionality values independently", () => {
  assert.deepEqual(
    normalizePostConditionValues(
      "Moderate_Damage",
      "FullyFunctional",
    ),
    {
      damageLevel: "Moderate_Damage",
      functionalityStatus: "FullyFunctional",
    },
  );
  assert.deepEqual(
    normalizePostConditionValues(
      "Total_Loss",
      "NonFunctional",
    ),
    {
      damageLevel: "Total_Loss",
      functionalityStatus: "NonFunctional",
    },
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
});

test("returns no errors for any valid independent condition combination", () => {
  assert.deepEqual(
    getPostConditionFieldErrors("Minor_Damage", "FullyFunctional"),
    {},
  );
});

test("validates damage level and functionality status independently", () => {
  assert.deepEqual(
    getPostConditionFieldErrors(
      "INVALID_DAMAGE",
      "FullyFunctional",
    ),
    {
      damageLevel:
        "Mức độ hư hỏng không hợp lệ.",
    },
  );

  assert.deepEqual(
    getPostConditionFieldErrors(
      "None",
      "INVALID_FUNCTIONALITY",
    ),
    {
      functionalityStatus:
        "Tình trạng hoạt động không hợp lệ.",
    },
  );

  assert.deepEqual(
    getPostConditionFieldErrors(
      "INVALID_DAMAGE",
      "INVALID_FUNCTIONALITY",
    ),
    {
      damageLevel:
        "Mức độ hư hỏng không hợp lệ.",
      functionalityStatus:
        "Tình trạng hoạt động không hợp lệ.",
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

test("shows the quantity configured by the post owner instead of remaining stock", () => {
  assert.equal(
    getManagedPostQuantity({ quantity: 5, remainingQuantity: 3 }),
    5,
  );
  assert.equal(getManagedPostQuantity({ remainingQuantity: 3 }), 3);
});

test("allows editing active and closed posts", () => {
  assert.equal(isPostStatusEditable("Active"), true);
  assert.equal(isPostStatusEditable("Closed"), true);
  assert.equal(isPostStatusEditable("Suspended"), false);
  assert.equal(
    POST_NOT_EDITABLE_MESSAGE,
    "Không thể chỉnh sửa bài đăng không hoạt động.",
  );
});

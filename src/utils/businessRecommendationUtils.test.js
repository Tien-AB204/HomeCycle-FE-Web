import assert from "node:assert/strict";
import test from "node:test";
import {
  getBusinessRecommendationMismatchMessage,
  getBusinessRecommendationMismatchReasons,
  getBusinessRecommendations,
  isEligibleBusinessRecommendation,
  normalizeBusinessSurvey,
} from "./businessRecommendationUtils.js";

const BED_TYPE_ID = "11111111-1111-1111-1111-111111111111";
const VACUUM_TYPE_ID = "22222222-2222-2222-2222-222222222222";
const TV_TYPE_ID = "33333333-3333-3333-3333-333333333333";

const survey = normalizeBusinessSurvey({
  targetCities: ["Thành phố Hồ Chí Minh", "Thành phố Hà Nội"],
  productTypeIds: [BED_TYPE_ID.toUpperCase(), VACUUM_TYPE_ID],
  acceptableDamageLevels: ["Minor_Damage"],
  acceptableFunctionalityStatuses: ["FullyFunctional"],
  procurementScales: ["Retail"],
});

const createPost = ({
  postId,
  productTypeId,
  city,
  damageLevel = "Minor_Damage",
  functionalityStatus = "PartiallyFunctional",
}) => ({
  postId,
  status: "Active",
  postType: "Sell",
  productTypeId,
  city,
  damageLevel,
  functionalityStatus,
  createdAt: "2026-08-16T00:00:00Z",
});

test("requires both surveyed product type and surveyed city", () => {
  const correctBed = createPost({
    postId: "correct-bed",
    productTypeId: BED_TYPE_ID,
    city: "Hồ Chí Minh",
  });
  const wrongCity = createPost({
    postId: "wrong-city",
    productTypeId: BED_TYPE_ID,
    city: "Đà Nẵng",
  });
  const wrongProductType = createPost({
    postId: "wrong-product-type",
    productTypeId: TV_TYPE_ID,
    city: "Thành phố Hà Nội",
  });

  const recommendations = getBusinessRecommendations({
    posts: [wrongCity, wrongProductType, correctBed],
    survey,
    limit: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(
    recommendations.map((post) => post.postId),
    ["correct-bed"],
  );
});

test("normalizes administrative prefixes and common Ho Chi Minh aliases", () => {
  const recommendations = getBusinessRecommendations({
    posts: [
      createPost({
        postId: "hcm-alias",
        productTypeId: VACUUM_TYPE_ID,
        city: "TP. HCM",
      }),
      createPost({
        postId: "hanoi-without-prefix",
        productTypeId: BED_TYPE_ID,
        city: "Hà Nội",
      }),
    ],
    survey,
    limit: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(
    recommendations.map((post) => post.postId).sort(),
    ["hanoi-without-prefix", "hcm-alias"],
  );
});

test("does not admit unrelated posts just because condition fields match", () => {
  const recommendations = getBusinessRecommendations({
    posts: [
      createPost({
        postId: "condition-only-match",
        productTypeId: TV_TYPE_ID,
        city: "Đà Nẵng",
      }),
    ],
    survey,
    limit: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(recommendations, []);
});

test("accepts a hydrated search item after restoring fields omitted by search API", () => {
  const searchItem = {
    postId: "vacuum-search-item",
    status: "Active",
    postType: "Sell",
    productTypeName: "Máy hút bụi",
    city: "Thành phố Hồ Chí Minh",
  };

  assert.equal(
    isEligibleBusinessRecommendation(searchItem, survey),
    false,
  );
  assert.equal(
    isEligibleBusinessRecommendation(
      {
        ...searchItem,
        productTypeId: VACUUM_TYPE_ID,
        damageLevel: "Minor_Damage",
        functionalityStatus: "PartiallyFunctional",
      },
      survey,
    ),
    true,
  );
});

test("excludes an otherwise matching post when remaining quantity is zero", () => {
  const soldOutPost = createPost({
    postId: "sold-out-vacuum",
    productTypeId: VACUUM_TYPE_ID,
    city: "Thành phố Hồ Chí Minh",
  });
  soldOutPost.quantity = 1;
  soldOutPost.remainingQuantity = 0;

  const recommendations = getBusinessRecommendations({
    posts: [soldOutPost],
    survey,
    limit: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(recommendations, []);
  assert.equal(
    getBusinessRecommendationMismatchMessage(soldOutPost, survey),
    "Sản phẩm trong bài đăng đã hết số lượng khả dụng.",
  );
});

test("requires damage level and functionality status selected in the survey", () => {
  const changedPost = createPost({
    postId: "changed-vacuum",
    productTypeId: TV_TYPE_ID,
    city: "Đà Nẵng",
    damageLevel: "Severe_Damage",
    functionalityStatus: "NonFunctional",
  });

  assert.deepEqual(
    getBusinessRecommendationMismatchReasons(changedPost, survey),
    [
      "productType",
      "city",
      "damageLevel",
      "functionalityStatus",
    ],
  );
  assert.equal(
    getBusinessRecommendationMismatchMessage(changedPost, survey),
    "Loại sản phẩm, thành phố, mức độ hư hỏng và tình trạng hoạt động của bài đăng không còn phù hợp với yêu cầu khảo sát của bạn.",
  );
});

test("derives survey functionality from damage and migrates legacy damage values", () => {
  const normalizedSurvey = normalizeBusinessSurvey({
    targetCities: ["Hà Nội"],
    productTypeIds: [BED_TYPE_ID],
    acceptableDamageLevels: [3, 5],
    acceptableFunctionalityStatuses: [0],
    procurementScales: [0],
  });

  assert.deepEqual(normalizedSurvey.acceptableDamageLevels, [
    "severedamage",
  ]);
  assert.deepEqual(
    normalizedSurvey.acceptableFunctionalityStatuses,
    ["nonfunctional"],
  );
});

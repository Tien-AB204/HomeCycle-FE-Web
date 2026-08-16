import assert from "node:assert/strict";
import test from "node:test";
import {
  getBusinessRecommendations,
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
  functionalityStatus = "FullyFunctional",
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

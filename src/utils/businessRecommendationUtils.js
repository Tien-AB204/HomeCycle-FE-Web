const FUNCTIONALITY_BY_NUMBER = {
  0: "FullyFunctional",
  1: "PartiallyFunctional",
  2: "NonFunctional",
};

const DAMAGE_LEVEL_BY_NUMBER = {
  0: "None",
  1: "Cosmetic_Damage",
  2: "Minor_Damage",
  3: "Moderate_Damage",
  4: "Severe_Damage",
  5: "Total_Loss",
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .trim();

const normalizeArray = (value) =>
  Array.isArray(value) ? value : [];

const getItemValue = (item, keys) => {
  if (
    item === null ||
    item === undefined
  ) {
    return "";
  }

  if (typeof item !== "object") {
    return item;
  }

  for (const key of keys) {
    if (
      item[key] !== undefined &&
      item[key] !== null
    ) {
      return item[key];
    }
  }

  return "";
};

const normalizeEnumValues = (
  values,
  numberMap,
) => {
  return normalizeArray(values)
    .map((item) =>
      getItemValue(item, [
        "value",
        "id",
        "name",
        "status",
      ]),
    )
    .map((value) => {
      const numericValue = Number(value);

      if (
        Number.isInteger(numericValue) &&
        numberMap[numericValue] !==
          undefined
      ) {
        return normalizeText(
          numberMap[numericValue],
        );
      }

      return normalizeText(value);
    })
    .filter(Boolean);
};

export const normalizeBusinessSurvey = (
  surveyResponse,
) => {
  const survey =
    surveyResponse?.survey ||
    surveyResponse?.businessSurvey ||
    surveyResponse ||
    {};

  const targetCities = normalizeArray(
    survey.targetCities || survey.cities,
  )
    .map((item) =>
      getItemValue(item, [
        "name",
        "city",
        "value",
      ]),
    )
    .map(normalizeText)
    .filter(Boolean);

  const productTypeIds = normalizeArray(
    survey.productTypeIds ||
      survey.productTypes,
  )
    .map((item) =>
      getItemValue(item, [
        "productTypeId",
        "id",
        "value",
      ]),
    )
    .map((value) =>
      String(value || "").trim(),
    )
    .filter(Boolean);

  return {
    targetCities,
    productTypeIds,
    acceptableDamageLevels:
      normalizeEnumValues(
        survey.acceptableDamageLevels,
        DAMAGE_LEVEL_BY_NUMBER,
      ),
    acceptableFunctionalityStatuses:
      normalizeEnumValues(
        survey.acceptableFunctionalityStatuses,
        FUNCTIONALITY_BY_NUMBER,
      ),
    procurementScales: normalizeArray(
      survey.procurementScales,
    ),
  };
};

export const hasCompletedBusinessSurvey = (
  survey,
) => {
  return Boolean(
    survey &&
      survey.targetCities.length > 0 &&
      survey.productTypeIds.length > 0 &&
      survey.acceptableDamageLevels
        .length > 0 &&
      survey
        .acceptableFunctionalityStatuses
        .length > 0 &&
      survey.procurementScales.length > 0,
  );
};

const getPostValue = (post, keys) => {
  const product = post?.product || {};

  for (const key of keys) {
    const value =
      post?.[key] ?? product?.[key];

    if (
      value !== undefined &&
      value !== null
    ) {
      return value;
    }
  }

  return "";
};

const getRecommendationScore = (
  post,
  survey,
) => {
  let score = 0;

  const productTypeId = String(
    getPostValue(post, [
      "productTypeId",
      "ProductTypeId",
    ]),
  ).trim();

  const city = normalizeText(
    getPostValue(post, [
      "city",
      "provinceName",
      "province",
    ]),
  );

  const damageLevel = normalizeText(
    getPostValue(post, [
      "damageLevel",
      "condition",
    ]),
  );

  const functionalityStatus =
    normalizeText(
      getPostValue(post, [
        "functionalityStatus",
      ]),
    );

  if (
    productTypeId &&
    survey.productTypeIds.includes(
      productTypeId,
    )
  ) {
    score += 8;
  }

  if (
    city &&
    survey.targetCities.includes(city)
  ) {
    score += 4;
  }

  if (
    damageLevel &&
    survey.acceptableDamageLevels.includes(
      damageLevel,
    )
  ) {
    score += 2;
  }

  if (
    functionalityStatus &&
    survey.acceptableFunctionalityStatuses.includes(
      functionalityStatus,
    )
  ) {
    score += 2;
  }

  return score;
};

export const getBusinessRecommendations = ({
  posts,
  survey,
  limit = 4,
}) => {
  if (
    !Array.isArray(posts) ||
    !hasCompletedBusinessSurvey(survey)
  ) {
    return [];
  }

  return posts
    .filter(
      (post) =>
        String(post?.status || "")
          .trim()
          .toLowerCase() === "active" &&
        String(post?.postType || "")
          .trim()
          .toLowerCase() === "sell",
    )
    .map((post) => ({
      post,
      score: getRecommendationScore(
        post,
        survey,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return (
        new Date(
          second.post.updatedAt ||
            second.post.createdAt ||
            0,
        ).getTime() -
        new Date(
          first.post.updatedAt ||
            first.post.createdAt ||
            0,
        ).getTime()
      );
    })
    .slice(0, limit)
    .map(({ post }) => post);
};

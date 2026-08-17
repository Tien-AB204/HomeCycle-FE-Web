import { getBusinessRecommendationMismatchReasons } from "../../utils/businessRecommendationUtils";
import postApi from "./postApi";
import productTypeApi from "./productTypeApi";

const DETAIL_BATCH_SIZE = 6;
const DETAIL_ONLY_MISMATCH_REASONS = new Set([
  "damageLevel",
  "functionalityStatus",
]);

const normalizeId = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const matchesOptionalId = (filterValue, expectedValue) => {
  const normalizedFilterValue = normalizeId(filterValue);

  return (
    !normalizedFilterValue ||
    normalizedFilterValue === normalizeId(expectedValue)
  );
};

const annotateProductType = (post, productType) => ({
  ...post,
  productTypeId: productType.productTypeId,
  product: {
    ...(post?.product || {}),
    productTypeId: productType.productTypeId,
  },
});

const hydratePostDetails = async (posts, signal) => {
  const hydratedPosts = [];

  for (
    let startIndex = 0;
    startIndex < posts.length;
    startIndex += DETAIL_BATCH_SIZE
  ) {
    const batch = posts.slice(
      startIndex,
      startIndex + DETAIL_BATCH_SIZE,
    );
    const detailResults = await Promise.allSettled(
      batch.map((post) =>
        postApi.getById(post.postId, { signal }),
      ),
    );

    detailResults.forEach((result, index) => {
      const listPost = batch[index];

      hydratedPosts.push(
        result.status === "fulfilled"
          ? {
              ...listPost,
              ...result.value,
              productTypeId:
                result.value.productTypeId || listPost.productTypeId,
            }
          : listPost,
      );
    });
  }

  return hydratedPosts;
};

const getSurveyProductTypes = async (productTypeIds, signal) => {
  const results = await Promise.allSettled(
    productTypeIds.map((productTypeId) =>
      productTypeApi.getById(productTypeId, { signal }),
    ),
  );
  const productTypes = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .filter(
      (productType) =>
        productType?.productTypeId && productType?.categoryId,
    );

  if (productTypes.length === 0 && productTypeIds.length > 0) {
    throw results.find((result) => result.status === "rejected")?.reason ||
      new Error("Không thể xác định loại sản phẩm trong khảo sát.");
  }

  return productTypes;
};

export const businessRecommendationApi = {
  search: async ({
    survey,
    searchCriteria = {},
    signal,
  } = {}) => {
    if (!Array.isArray(survey?.productTypeIds)) {
      return [];
    }

    const productTypes = await getSurveyProductTypes(
      survey.productTypeIds,
      signal,
    );
    const matchingProductTypes = productTypes.filter(
      (productType) =>
        matchesOptionalId(
          searchCriteria.productTypeId,
          productType.productTypeId,
        ) &&
        matchesOptionalId(
          searchCriteria.categoryId,
          productType.categoryId,
        ),
    );

    if (matchingProductTypes.length === 0) {
      return [];
    }

    const searchResults = await Promise.allSettled(
      matchingProductTypes.map((productType) =>
        postApi
          .searchAll({
            ...searchCriteria,
            postType: "Sell",
            categoryId: productType.categoryId,
            productTypeId: productType.productTypeId,
            onlyAvailable: true,
            signal,
          })
          .then((result) => ({
            productType,
            posts: result.items,
          })),
      ),
    );
    const successfulSearches = searchResults.filter(
      (result) => result.status === "fulfilled",
    );

    if (successfulSearches.length === 0) {
      throw searchResults[0]?.reason || new Error(
        "Không thể tải danh sách đề xuất doanh nghiệp.",
      );
    }

    const uniqueCandidates = new Map();

    successfulSearches.forEach((result) => {
      result.value.posts.forEach((post) => {
        const annotatedPost = annotateProductType(
          post,
          result.value.productType,
        );

        const mismatchReasons =
          getBusinessRecommendationMismatchReasons(
            annotatedPost,
            survey,
          );
        const needsDetailOnly = mismatchReasons.every((reason) =>
          DETAIL_ONLY_MISMATCH_REASONS.has(reason),
        );

        if (annotatedPost.postId && needsDetailOnly) {
          uniqueCandidates.set(annotatedPost.postId, annotatedPost);
        }
      });
    });

    return hydratePostDetails(
      [...uniqueCandidates.values()],
      signal,
    );
  },
};

export default businessRecommendationApi;

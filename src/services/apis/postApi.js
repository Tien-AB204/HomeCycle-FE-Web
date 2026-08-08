import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 10;
const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

const createApiError = (response, fallbackMessage) => {
  const message =
    response?.error?.message || response?.message || fallbackMessage;

  return new Error(message);
};

const unwrapResponse = (response, fallbackMessage) => {
  if (response?.isSuccess === false) {
    throw createApiError(response, fallbackMessage);
  }

  return response?.data ?? response;
};

const normalizePageNumber = (value) => {
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_PAGE_NUMBER;
};

const normalizePageSize = (value) => {
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_PAGE_SIZE;
};

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeMedias = (medias) => {
  if (!Array.isArray(medias)) {
    return [];
  }

  return [...medias].sort(
    (firstMedia, secondMedia) =>
      (firstMedia?.displayOrder ?? 0) - (secondMedia?.displayOrder ?? 0),
  );
};

const normalizeAttributeValues = (attributeValues) => {
  return Array.isArray(attributeValues) ? attributeValues : [];
};

const normalizePostListItem = (post) => {
  return {
    ...post,
    medias: normalizeMedias(post?.medias),
  };
};

const normalizePagination = (data, fallbackPageNumber, fallbackPageSize) => {
  return {
    items: Array.isArray(data?.items)
      ? data.items.map(normalizePostListItem)
      : [],
    pageNumber: data?.pageNumber ?? fallbackPageNumber,
    pageSize: data?.pageSize ?? fallbackPageSize,
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  };
};

const normalizePostDetail = (post) => {
  const product = post?.product || {};

  return {
    ...post,
    productId:
      product.productId ||
      (post?.productId !== ZERO_GUID ? post?.productId : ""),
    productName: product.productName || post?.productName || "",
    productTypeName: product.productTypeName || post?.productTypeName || "",
    categoryName: product.categoryName || post?.categoryName || "",
    brandName: product.brandName || post?.brandName || "",
    medias: normalizeMedias(post?.medias),
    product: {
      ...product,
      attributeValues: normalizeAttributeValues(product.attributeValues),
    },
  };
};

const addOptionalText = (target, key, value) => {
  const normalizedValue = normalizeText(value);

  if (normalizedValue) {
    target[key] = normalizedValue;
  }
};

const addOptionalNumber = (target, key, value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    target[key] = value;
  }
};

const normalizeAttributeFilters = (attributeFilters) => {
  if (!Array.isArray(attributeFilters)) {
    return [];
  }

  return attributeFilters
    .map((filter) => ({
      attributeId: normalizeText(filter?.attributeId),
      optionIds: Array.isArray(filter?.optionIds)
        ? filter.optionIds.map(normalizeText).filter(Boolean)
        : [],
    }))
    .filter((filter) => filter.attributeId && filter.optionIds.length > 0);
};

const createSearchPayload = ({
  pageNumber,
  pageSize,
  keyword,
  postType,
  categoryId,
  productTypeId,
  brandId,
  spaceUsage,
  functionalityStatus,
  minUsageDuration,
  maxUsageDuration,
  minDamageLevel,
  maxDamageLevel,
  minPrice,
  maxPrice,
  onlyAvailable,
  postedWithinDays,
  deliveryMethod,
  priorityLevel,
  city,
  ward,
  sortBy,
  attributeFilters,
}) => {
  const payload = {
    pageNumber,
    pageSize,
    attributeFilters: normalizeAttributeFilters(attributeFilters),
  };

  addOptionalText(payload, "keyword", keyword);
  addOptionalText(payload, "postType", postType);
  addOptionalText(payload, "categoryId", categoryId);
  addOptionalText(payload, "productTypeId", productTypeId);
  addOptionalText(payload, "brandId", brandId);
  addOptionalText(payload, "spaceUsage", spaceUsage);
  addOptionalText(payload, "functionalityStatus", functionalityStatus);
  addOptionalNumber(payload, "minUsageDuration", minUsageDuration);
  addOptionalNumber(payload, "maxUsageDuration", maxUsageDuration);
  addOptionalNumber(payload, "minDamageLevel", minDamageLevel);
  addOptionalNumber(payload, "maxDamageLevel", maxDamageLevel);
  addOptionalNumber(payload, "minPrice", minPrice);
  addOptionalNumber(payload, "maxPrice", maxPrice);
  addOptionalNumber(payload, "postedWithinDays", postedWithinDays);
  addOptionalText(payload, "deliveryMethod", deliveryMethod);
  addOptionalText(payload, "priorityLevel", priorityLevel);
  addOptionalText(payload, "city", city);
  addOptionalText(payload, "ward", ward);
  addOptionalText(payload, "sortBy", sortBy);

  if (typeof onlyAvailable === "boolean") {
    payload.onlyAvailable = onlyAvailable;
  }

  return payload;
};

export const postApi = {
  getAll: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const normalizedPageNumber = normalizePageNumber(pageNumber);
    const normalizedPageSize = normalizePageSize(pageSize);

    const response = await axiosClient.get("/posts/get-all", {
      params: {
        PageNumber: normalizedPageNumber,
        PageSize: normalizedPageSize,
      },
      signal,
    });

    const data = unwrapResponse(response, "Không thể tải danh sách bài đăng.");

    return normalizePagination(data, normalizedPageNumber, normalizedPageSize);
  },

  search: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    keyword,
    postType,
    categoryId,
    productTypeId,
    brandId,
    spaceUsage,
    functionalityStatus,
    minUsageDuration,
    maxUsageDuration,
    minDamageLevel,
    maxDamageLevel,
    minPrice,
    maxPrice,
    onlyAvailable = true,
    postedWithinDays,
    deliveryMethod,
    priorityLevel,
    city,
    ward,
    sortBy = "Newest",
    attributeFilters = [],
    signal,
  } = {}) => {
    const normalizedPageNumber = normalizePageNumber(pageNumber);
    const normalizedPageSize = normalizePageSize(pageSize);

    const response = await axiosClient.post(
      "/posts/search",
      createSearchPayload({
        pageNumber: normalizedPageNumber,
        pageSize: normalizedPageSize,
        keyword,
        postType,
        categoryId,
        productTypeId,
        brandId,
        spaceUsage,
        functionalityStatus,
        minUsageDuration,
        maxUsageDuration,
        minDamageLevel,
        maxDamageLevel,
        minPrice,
        maxPrice,
        onlyAvailable,
        postedWithinDays,
        deliveryMethod,
        priorityLevel,
        city,
        ward,
        sortBy,
        attributeFilters,
      }),
      {
        signal,
      },
    );

    const data = unwrapResponse(response, "Không thể tìm kiếm bài đăng.");

    return normalizePagination(data, normalizedPageNumber, normalizedPageSize);
  },

  getById: async (postId, { signal } = {}) => {
    const normalizedPostId = normalizeText(postId);

    if (!normalizedPostId) {
      throw new Error("Không tìm thấy mã bài đăng.");
    }

    const response = await axiosClient.get(
      `/posts/get-by-id/${encodeURIComponent(normalizedPostId)}`,
      {
        signal,
      },
    );

    const post = unwrapResponse(response, "Không thể tải chi tiết bài đăng.");

    if (!post?.postId) {
      throw new Error("Response chi tiết bài đăng không hợp lệ.");
    }

    return normalizePostDetail(post);
  },

  getAllByUser: async (
    userId,
    {
      pageNumber = DEFAULT_PAGE_NUMBER,
      pageSize = DEFAULT_PAGE_SIZE,
      signal,
    } = {},
  ) => {
    const normalizedUserId = normalizeText(userId);

    if (!normalizedUserId) {
      throw new Error("Không tìm thấy mã người dùng.");
    }

    const normalizedPageNumber = normalizePageNumber(pageNumber);
    const normalizedPageSize = normalizePageSize(pageSize);

    const response = await axiosClient.get(
      `/posts/get-all/by-user/${encodeURIComponent(normalizedUserId)}`,
      {
        params: {
          PageNumber: normalizedPageNumber,
          PageSize: normalizedPageSize,
        },
        signal,
      },
    );

    const data = unwrapResponse(
      response,
      "Không thể tải danh sách bài đăng của bạn.",
    );

    return normalizePagination(
      data,
      normalizedPageNumber,
      normalizedPageSize,
    );
  },

  getDetailByUser: async (userId, postId, { signal } = {}) => {
    const normalizedUserId = normalizeText(userId);
    const normalizedPostId = normalizeText(postId);

    if (!normalizedUserId) {
      throw new Error("Không tìm thấy mã người dùng.");
    }

    if (!normalizedPostId) {
      throw new Error("Không tìm thấy mã bài đăng.");
    }

    const response = await axiosClient.get(
      `/posts/get-detail-by-user/${encodeURIComponent(
        normalizedUserId,
      )}/${encodeURIComponent(normalizedPostId)}`,
      {
        signal,
      },
    );

    const post = unwrapResponse(
      response,
      "Không thể tải chi tiết bài đăng của bạn.",
    );

    if (!post?.postId) {
      throw new Error("Response chi tiết bài đăng không hợp lệ.");
    }

    return normalizePostDetail(post);
  },
};

export default postApi;

import axiosClient from "./axiosClient";
import { notifyPostCatalogChanged } from "../../utils/postCatalogEvents";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SEARCH_ALL_PAGE_SIZE = 100;
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

const appendFormValue = (formData, key, value) => {
  if (value === undefined || value === null || value === "") {
    return;
  }

  formData.append(key, String(value));
};

const appendMedias = (formData, medias) => {
  if (!Array.isArray(medias)) {
    return;
  }

  medias.forEach((media) => {
    if (media instanceof File) {
      formData.append("Medias", media, media.name);
    }
  });
};

const appendAttributeValues = (formData, fieldName, attributeValues) => {
  if (!Array.isArray(attributeValues)) {
    return;
  }

  attributeValues.forEach((attributeValue) => {
    if (!attributeValue?.attributeId) {
      return;
    }

    formData.append(
      fieldName,
      JSON.stringify({
        attributeId: attributeValue.attributeId,
        optionId: attributeValue.optionId || null,
        valueBoolean:
          typeof attributeValue.valueBoolean === "boolean"
            ? attributeValue.valueBoolean
            : null,
        valueText: attributeValue.valueText || null,
        valueNumber:
          typeof attributeValue.valueNumber === "number" &&
          Number.isFinite(attributeValue.valueNumber)
            ? attributeValue.valueNumber
            : null,
      }),
    );
  });
};

const appendCommonPostFields = (formData, postData) => {
  appendFormValue(formData, "PriorityLevel", postData.priorityLevel);
  appendFormValue(formData, "Quantity", postData.quantity);
  appendFormValue(formData, "City", postData.city);
  appendFormValue(formData, "StreetAddress", postData.streetAddress);
  appendFormValue(formData, "DeliveryMethod", postData.deliveryMethod);
  appendFormValue(formData, "Ward", postData.ward);
  appendFormValue(formData, "Description", postData.description);
  appendMedias(formData, postData.medias);
};

const createSellFormData = (postData) => {
  const formData = new FormData();

  appendCommonPostFields(formData, postData);
  appendFormValue(formData, "BasePrice", postData.price);
  appendFormValue(formData, "Product.CategoryId", postData.categoryId);
  appendFormValue(formData, "Product.ProductTypeId", postData.productTypeId);
  appendFormValue(formData, "Product.BrandId", postData.brandId);
  appendFormValue(formData, "Product.ProductName", postData.productName);
  appendFormValue(formData, "Product.ModelNumber", postData.modelNumber);
  appendFormValue(formData, "Product.OriginalPrice", postData.originalPrice);
  appendFormValue(formData, "Product.Length", postData.length);
  appendFormValue(formData, "Product.Width", postData.width);
  appendFormValue(formData, "Product.Height", postData.height);
  appendFormValue(formData, "Product.Weight", postData.weight);
  appendFormValue(formData, "Product.SpaceUsage", postData.spaceUsage);
  appendFormValue(
    formData,
    "Product.FunctionalityStatus",
    postData.functionalityStatus,
  );
  appendFormValue(formData, "Product.UsageDuration", postData.usageDuration);
  appendFormValue(formData, "Product.DamageLevel", postData.damageLevel);
  appendFormValue(
    formData,
    "Product.DetailDescription",
    postData.detailDescription,
  );
  appendAttributeValues(
    formData,
    "Product.AttributeValues",
    postData.attributeValues,
  );

  return formData;
};

const createBuyPayload = (postData) => {
  let expiryDate = null;

  const expiryDateValue =
    normalizeText(postData.expiryDate);

  if (expiryDateValue) {
    const parsedExpiryDate =
      new Date(
        expiryDateValue + "T23:59:59",
      );

    if (!Number.isNaN(parsedExpiryDate.getTime())) {
      expiryDate =
        parsedExpiryDate.toISOString();
    }
  }

  return {
    title: normalizeText(postData.productName),
    description: normalizeText(postData.description),

    brandId:
      normalizeText(postData.brandId) || null,

    categoryId:
      normalizeText(postData.categoryId) || null,

    productTypeId:
      normalizeText(postData.productTypeId) || null,

    functionalityStatus:
      normalizeText(
        postData.functionalityStatus,
      ) || null,

    usageDuration:
      typeof postData.usageDuration === "number" &&
      Number.isFinite(postData.usageDuration)
        ? postData.usageDuration
        : null,

    damageLevel:
      normalizeText(postData.damageLevel) || null,

    attributeValues:
      normalizeAttributeValues(
        postData.attributeValues,
      ),

    streetAddress:
      normalizeText(postData.streetAddress) || null,

    ward:
      normalizeText(postData.ward) || null,

    city:
      normalizeText(postData.city) || null,

    priorityLevel:
      normalizeText(postData.priorityLevel) || null,

    priceFrom:
      typeof postData.priceFrom === "number" &&
      Number.isFinite(postData.priceFrom)
        ? postData.priceFrom
        : null,

    priceTo:
      typeof postData.price === "number" &&
      Number.isFinite(postData.price)
        ? postData.price
        : null,

    quantity:
      Number.isInteger(postData.quantity) &&
      postData.quantity > 0
        ? postData.quantity
        : null,

    expiryDate,
  };
};

const ensureCreatedPost = (response, fallbackMessage) => {
  const post = unwrapResponse(response, fallbackMessage);

  if (!post?.postId) {
    throw new Error("Response tạo bài đăng không hợp lệ.");
  }

  return normalizePostListItem(post);
};

const normalizeRequiredIdentifier = (value, errorMessage) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    throw new Error(errorMessage);
  }

  return normalizedValue;
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
  createSell: async (postData) => {
    if (!postData || typeof postData !== "object") {
      throw new Error("Dữ liệu tạo tin đăng bán không hợp lệ.");
    }

    const response = await axiosClient.post(
      "/posts/create/sell",
      createSellFormData(postData),
    );
    const post = ensureCreatedPost(response, "Không thể tạo tin đăng bán.");

    notifyPostCatalogChanged({ postId: post.postId, reason: "created" });
    return post;
  },

  createBuy: async (postData) => {
    if (!postData || typeof postData !== "object") {
      throw new Error("Dữ liệu tạo tin thu mua không hợp lệ.");
    }

    const response = await axiosClient.post(
      "/posts/create/buy",
      createBuyPayload(postData),
    );
    const post = ensureCreatedPost(response, "Không thể tạo tin thu mua.");

    notifyPostCatalogChanged({ postId: post.postId, reason: "created" });
    return post;
  },

  updateSell: async (postId, postData) => {
    const normalizedPostId = normalizeRequiredIdentifier(
      postId,
      "Không tìm thấy mã tin đăng bán.",
    );

    if (!postData || typeof postData !== "object") {
      throw new Error("Dữ liệu cập nhật tin đăng bán không hợp lệ.");
    }

    const response = await axiosClient.patch(
      `/posts/update/sell/${encodeURIComponent(normalizedPostId)}`,
      createSellFormData(postData),
    );
    const post = ensureCreatedPost(response, "Không thể cập nhật tin đăng bán.");

    notifyPostCatalogChanged({ postId: post.postId, reason: "updated" });
    return post;
  },

  updateBuy: async (postId, postData) => {
    const normalizedPostId = normalizeRequiredIdentifier(
      postId,
      "Không tìm thấy mã tin thu mua.",
    );

    if (!postData || typeof postData !== "object") {
      throw new Error("Dữ liệu cập nhật tin thu mua không hợp lệ.");
    }

    const response = await axiosClient.patch(
      `/posts/update/buy/${encodeURIComponent(normalizedPostId)}`,
      createBuyPayload(postData),
    );
    const post = ensureCreatedPost(response, "Không thể cập nhật tin thu mua.");

    notifyPostCatalogChanged({ postId: post.postId, reason: "updated" });
    return post;
  },

  getSellerCandidatesByUser: async (
    userId,
    {
      pageNumber = DEFAULT_PAGE_NUMBER,
      pageSize = 100,
      signal,
    } = {},
  ) => {
    const normalizedUserId =
      normalizeRequiredIdentifier(
        userId,
        "Không tìm thấy mã người dùng.",
      );

    const normalizedPageNumber =
      normalizePageNumber(pageNumber);

    const normalizedPageSize =
      normalizePageSize(pageSize);

    const response = await axiosClient.get(
      "/posts/get-all/by-user/" +
        encodeURIComponent(normalizedUserId),
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
      "Không thể tải các tin đăng bán của bạn.",
    );

    return normalizePagination(
      data,
      normalizedPageNumber,
      normalizedPageSize,
    );
  },

  getBuyMatches: async (
    buyPostId,
    {
      pageNumber = DEFAULT_PAGE_NUMBER,
      pageSize = DEFAULT_PAGE_SIZE,
      signal,
    } = {},
  ) => {
    const normalizedBuyPostId =
      normalizeRequiredIdentifier(
        buyPostId,
        "Không tìm thấy mã tin thu mua.",
      );

    const normalizedPageNumber =
      normalizePageNumber(pageNumber);

    const normalizedPageSize =
      normalizePageSize(pageSize);

    const response = await axiosClient.get(
      "/posts/buy/" +
        encodeURIComponent(normalizedBuyPostId) +
        "/matches",
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
      "Không thể tải các sản phẩm phù hợp.",
    );

    const items = Array.isArray(data?.items)
      ? data.items
          .map((item) => {
            if (!item?.sellPost) {
              return null;
            }

            return {
              sellPost:
                normalizePostListItem(
                  item.sellPost,
                ),
              matchSummary:
                item.matchSummary || {},
            };
          })
          .filter(Boolean)
      : [];

    const totalCount =
      data?.totalCount ?? items.length;

    return {
      items,
      pageNumber:
        data?.pageNumber ??
        normalizedPageNumber,
      pageSize:
        data?.pageSize ??
        normalizedPageSize,
      totalCount,
      totalPages:
        data?.totalPages ??
        Math.ceil(
          totalCount /
            (data?.pageSize ||
              normalizedPageSize),
        ),
      hasPreviousPage:
        Boolean(data?.hasPreviousPage),
      hasNextPage:
        Boolean(data?.hasNextPage),
    };
  },

  createSellerRequest: async (
    buyPostId,
    {
      sellPostId,
      offerPrice,
      offerQuantity,
    },
  ) => {
    const normalizedBuyPostId =
      normalizeRequiredIdentifier(
        buyPostId,
        "Không tìm thấy mã tin thu mua.",
      );

    const normalizedSellPostId =
      normalizeRequiredIdentifier(
        sellPostId,
        "Vui lòng chọn sản phẩm muốn chào bán.",
      );

    const normalizedPrice =
      Number(offerPrice);

    const normalizedQuantity =
      Number(offerQuantity);

    if (
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice <= 0
    ) {
      throw new Error(
        "Giá chào bán phải lớn hơn 0.",
      );
    }

    if (
      !Number.isInteger(normalizedQuantity) ||
      normalizedQuantity <= 0
    ) {
      throw new Error(
        "Số lượng chào bán phải là số nguyên lớn hơn 0.",
      );
    }

    const response = await axiosClient.post(
      "/posts/buy/" +
        encodeURIComponent(normalizedBuyPostId) +
        "/seller-requests",
      {
        sellPostId: normalizedSellPostId,
        offerPrice: normalizedPrice,
        offerQuantity: normalizedQuantity,
      },
    );

    const offer = unwrapResponse(
      response,
      "Không thể gửi chào bán.",
    );

    if (!offer?.offerId) {
      throw new Error(
        "Response chào bán không hợp lệ.",
      );
    }

    return offer;
  },

  close: async (postId) => {
    const normalizedPostId = normalizeRequiredIdentifier(
      postId,
      "Không tìm thấy mã bài đăng.",
    );

    await axiosClient.patch(
      `/posts/${encodeURIComponent(normalizedPostId)}/close`,
    );

    notifyPostCatalogChanged({ postId: normalizedPostId, reason: "closed" });
    return true;
  },

  reactivate: async (postId) => {
    const normalizedPostId = normalizeRequiredIdentifier(
      postId,
      "Không tìm thấy mã bài đăng.",
    );

    await axiosClient.patch(
      `/posts/${encodeURIComponent(normalizedPostId)}/reactivate`,
    );

    notifyPostCatalogChanged({
      postId: normalizedPostId,
      reason: "reactivated",
    });
    return true;
  },

  /*
   * Xóa mềm tin thu mua của chính Business hiện tại
   * (Backend: DELETE /posts/buy/{postId}, chỉ áp dụng PostType.Buy).
   */
  deleteBuy: async (postId) => {
    const normalizedPostId = normalizeRequiredIdentifier(
      postId,
      "Không tìm thấy mã bài đăng.",
    );

    await axiosClient.delete(
      `/posts/buy/${encodeURIComponent(normalizedPostId)}`,
    );

    notifyPostCatalogChanged({
      postId: normalizedPostId,
      reason: "deleted",
    });
    return true;
  },

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

  /*
   * "/posts/get-all" chỉ dành cho Moderator/Admin (403 với người dùng
   * thường/khách). Trang chủ công khai phải dùng "/posts/get-all-active"
   * (AllowAnonymous, chỉ trả bài Active) - đúng endpoint Backend đã ghi
   * chú "cho trang chủ người dùng".
   */
  getAllActive: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const normalizedPageNumber = normalizePageNumber(pageNumber);
    const normalizedPageSize = normalizePageSize(pageSize);

    const response = await axiosClient.get("/posts/get-all-active", {
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

  searchAll: async ({
    pageSize = DEFAULT_SEARCH_ALL_PAGE_SIZE,
    signal,
    ...searchCriteria
  } = {}) => {
    const normalizedPageSize = normalizePageSize(pageSize);
    const firstPage = await postApi.search({
      ...searchCriteria,
      pageNumber: 1,
      pageSize: normalizedPageSize,
      signal,
    });
    const pages = [firstPage];

    for (
      let pageNumber = 2;
      pageNumber <= firstPage.totalPages;
      pageNumber += 1
    ) {
      pages.push(
        await postApi.search({
          ...searchCriteria,
          pageNumber,
          pageSize: normalizedPageSize,
          signal,
        }),
      );
    }

    const uniquePosts = new Map();

    pages.forEach((page) => {
      page.items.forEach((post) => {
        if (post?.postId) {
          uniquePosts.set(post.postId, post);
        }
      });
    });

    const items = [...uniquePosts.values()];

    return {
      items,
      pageNumber: 1,
      pageSize: items.length,
      totalCount: items.length,
      totalPages: items.length > 0 ? 1 : 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
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

    return normalizePagination(data, normalizedPageNumber, normalizedPageSize);
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

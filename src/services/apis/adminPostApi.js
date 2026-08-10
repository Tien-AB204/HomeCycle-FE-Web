import axiosClient from "./axiosClient";

const DEFAULT_PAGE_SIZE = 10;
const MANAGEMENT_PAGE_SIZE = 100;
const PAGE_REQUEST_BATCH_SIZE = 4;
const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

const normalizeRequiredId = (value, message) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
};

const unwrapResult = (result, fallbackMessage) => {
  if (result?.success === false || result?.isSuccess === false) {
    throw new Error(
      result?.error?.message || result?.message || fallbackMessage,
    );
  }

  return result?.data ?? result ?? {};
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

const normalizeListItem = (post) => ({
  ...post,
  avatarUrl: post?.avatarUrl || post?.avataUrl || "",
  medias: normalizeMedias(post?.medias),
});

const normalizePagedPosts = (result, fallback) => {
  const data = unwrapResult(result, "Không thể tải danh sách bài đăng.");

  return {
    items: Array.isArray(data?.items)
      ? data.items.map(normalizeListItem)
      : [],
    pageNumber: Number(data?.pageNumber) || fallback.pageNumber,
    pageSize: Number(data?.pageSize) || fallback.pageSize,
    totalCount: Number(data?.totalCount) || 0,
    totalPages: Number(data?.totalPages) || 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  };
};

const normalizePostDetail = (result) => {
  const post = unwrapResult(result, "Không thể tải chi tiết bài đăng.");

  if (!post?.postId) {
    throw new Error("Response chi tiết bài đăng không hợp lệ.");
  }

  const product = post.product || {};

  return {
    ...normalizeListItem(post),
    productId:
      product.productId ||
      (post.productId && post.productId !== ZERO_GUID ? post.productId : ""),
    productName: product.productName || post.productName || "",
    productTypeName:
      product.productTypeName || post.productTypeName || "",
    categoryName: product.categoryName || post.categoryName || "",
    brandName: product.brandName || post.brandName || "",
    product: {
      ...product,
      attributeValues: Array.isArray(product.attributeValues)
        ? product.attributeValues
        : [],
    },
  };
};

const fetchPostPage = async ({ pageNumber, pageSize, signal }) => {
  const normalizedPageNumber = Math.max(1, Number(pageNumber) || 1);
  const normalizedPageSize = Math.max(
    1,
    Number(pageSize) || DEFAULT_PAGE_SIZE,
  );

  const result = await axiosClient.get("/posts/get-all", {
    params: {
      PageNumber: normalizedPageNumber,
      PageSize: normalizedPageSize,
    },
    signal,
  });

  return normalizePagedPosts(result, {
    pageNumber: normalizedPageNumber,
    pageSize: normalizedPageSize,
  });
};

const mergeUniquePosts = (pages) => {
  const postsById = new Map();

  pages.forEach((page) => {
    page.items.forEach((post) => {
      if (post?.postId) {
        postsById.set(post.postId, post);
      }
    });
  });

  return Array.from(postsById.values()).sort((firstPost, secondPost) => {
    return new Date(secondPost.createdAt || 0).getTime() -
      new Date(firstPost.createdAt || 0).getTime();
  });
};

const adminPostApi = {
  getAll: async ({
    pageNumber = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    return fetchPostPage({
      pageNumber,
      pageSize,
      signal,
    });
  },

  getAllForManagement: async ({ signal } = {}) => {
    const firstPage = await fetchPostPage({
      pageNumber: 1,
      pageSize: MANAGEMENT_PAGE_SIZE,
      signal,
    });

    if (firstPage.totalPages <= 1) {
      return {
        items: firstPage.items,
        totalCount: firstPage.totalCount,
      };
    }

    const remainingPageNumbers = Array.from(
      { length: firstPage.totalPages - 1 },
      (_, index) => index + 2,
    );
    const pages = [firstPage];

    for (
      let startIndex = 0;
      startIndex < remainingPageNumbers.length;
      startIndex += PAGE_REQUEST_BATCH_SIZE
    ) {
      const pageNumberBatch = remainingPageNumbers.slice(
        startIndex,
        startIndex + PAGE_REQUEST_BATCH_SIZE,
      );
      const pageBatch = await Promise.all(
        pageNumberBatch.map((currentPageNumber) =>
          fetchPostPage({
            pageNumber: currentPageNumber,
            pageSize: MANAGEMENT_PAGE_SIZE,
            signal,
          }),
        ),
      );

      pages.push(...pageBatch);
    }

    const items = mergeUniquePosts(pages);

    return {
      items,
      totalCount: firstPage.totalCount,
    };
  },

  getById: async (postId, { signal } = {}) => {
    const normalizedPostId = normalizeRequiredId(
      postId,
      "Không tìm thấy mã bài đăng.",
    );

    const result = await axiosClient.get(
      `/posts/get-by-id/${encodeURIComponent(normalizedPostId)}`,
      { signal },
    );

    return normalizePostDetail(result);
  },

  delete: async (postId) => {
    const normalizedPostId = normalizeRequiredId(
      postId,
      "Không tìm thấy mã bài đăng cần xóa.",
    );

    await axiosClient.delete(
      `/posts/delete/${encodeURIComponent(normalizedPostId)}`,
    );

    return true;
  },
};

export default adminPostApi;

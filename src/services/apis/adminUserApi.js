import axiosClient from "./axiosClient";

const DEFAULT_PAGE_SIZE = 10;
const MANAGEMENT_PAGE_SIZE = 100;
const PAGE_REQUEST_BATCH_SIZE = 4;

const normalizeRequiredId = (value, message) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
};

const unwrapResult = (result) => {
  if (result?.success === false || result?.isSuccess === false) {
    throw new Error(
      result?.error?.message ||
        result?.message ||
        "Yêu cầu quản lý người dùng thất bại.",
    );
  }

  return result?.data ?? result ?? {};
};

const normalizePagedUsers = (result, fallback) => {
  const data = unwrapResult(result);
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    items,
    pageNumber: Number(data?.pageNumber) || fallback.pageNumber,
    pageSize: Number(data?.pageSize) || fallback.pageSize,
    totalCount: Number(data?.totalCount) || 0,
    totalPages: Number(data?.totalPages) || 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  };
};

const adminUserApi = {
  getAll: async ({
    role,
    status,
    keyword,
    pageNumber = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const normalizedPageNumber = Math.max(1, Number(pageNumber) || 1);
    const normalizedPageSize = Math.max(
      1,
      Number(pageSize) || DEFAULT_PAGE_SIZE,
    );

    const params = {
      PageNumber: normalizedPageNumber,
      PageSize: normalizedPageSize,
    };

    if (role) {
      params.Role = role;
    }

    if (status) {
      params.Status = status;
    }

    if (keyword?.trim()) {
      params.Keyword = keyword.trim();
    }

    const result = await axiosClient.get("/auth/admin/users", {
      params,
      signal,
    });

    return normalizePagedUsers(result, {
      pageNumber: normalizedPageNumber,
      pageSize: normalizedPageSize,
    });
  },

  getAllForManagement: async ({ signal } = {}) => {
    const firstPage = await adminUserApi.getAll({
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
          adminUserApi.getAll({
            pageNumber: currentPageNumber,
            pageSize: MANAGEMENT_PAGE_SIZE,
            signal,
          }),
        ),
      );

      pages.push(...pageBatch);
    }

    const usersById = new Map();

    pages.forEach((page) => {
      page.items.forEach((user) => {
        if (user?.userId) {
          usersById.set(user.userId, user);
        }
      });
    });

    return {
      items: Array.from(usersById.values()),
      totalCount: firstPage.totalCount,
    };
  },

  lock: async (userId) => {
    const normalizedUserId = normalizeRequiredId(
      userId,
      "Không tìm thấy mã người dùng cần khóa.",
    );

    const result = await axiosClient.post(
      `/auth/admin/users/${encodeURIComponent(normalizedUserId)}/lock`,
    );

    return unwrapResult(result);
  },

  unlock: async (userId) => {
    const normalizedUserId = normalizeRequiredId(
      userId,
      "Không tìm thấy mã người dùng cần mở khóa.",
    );

    const result = await axiosClient.post(
      `/auth/admin/users/${encodeURIComponent(normalizedUserId)}/unlock`,
    );

    return unwrapResult(result);
  },
};

export default adminUserApi;

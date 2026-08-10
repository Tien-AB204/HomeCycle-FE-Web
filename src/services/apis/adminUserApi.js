import axiosClient from "./axiosClient";

const DEFAULT_PAGE_SIZE = 10;

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

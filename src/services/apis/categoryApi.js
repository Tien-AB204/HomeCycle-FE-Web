import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 5;

const createApiError = (response, fallbackMessage) => {
  const message =
    response?.error?.message || response?.message || fallbackMessage;

  return new Error(message);
};

const ensureSuccessfulResponse = (response, fallbackMessage) => {
  if (response?.isSuccess === false) {
    throw createApiError(response, fallbackMessage);
  }

  return response?.data;
};

const normalizePagination = (data, fallbackPageNumber, fallbackPageSize) => {
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    pageNumber: data?.pageNumber ?? fallbackPageNumber,
    pageSize: data?.pageSize ?? fallbackPageSize,
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(data?.hasPreviousPage),
    hasNextPage: Boolean(data?.hasNextPage),
  };
};

export const categoryApi = {
  getAll: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const response = await axiosClient.get("/categories/get-all", {
      params: {
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
      signal,
    });

    const data = ensureSuccessfulResponse(
      response,
      "Không thể tải danh sách danh mục.",
    );

    return normalizePagination(data, pageNumber, pageSize);
  },

  search: async ({
    keyword = "",
    isActive,
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const searchParams = new URLSearchParams();

    searchParams.set("Keyword", keyword.trim());

    searchParams.set("PageNumber", String(pageNumber));

    searchParams.set("PageSize", String(pageSize));

    if (typeof isActive === "boolean") {
      searchParams.set("IsActive", String(isActive));
    }

    const response = await axiosClient.get(
      `/categories/search?${searchParams.toString()}`,
      {
        signal,
      },
    );

    const data = ensureSuccessfulResponse(
      response,
      "Không thể tìm kiếm danh mục.",
    );

    return normalizePagination(data, pageNumber, pageSize);
  },

  create: async ({ categoryName, description }) => {
    const response = await axiosClient.post("/categories/create", {
      categoryName: categoryName.trim(),
      description: description.trim(),
    });

    const createdCategory = ensureSuccessfulResponse(
      response,
      "Không thể tạo danh mục.",
    );

    if (!createdCategory?.categoryId) {
      throw new Error("Response tạo danh mục không hợp lệ.");
    }

    return createdCategory;
  },

  update: async (categoryId, { categoryName, description, isActive }) => {
    if (!categoryId) {
      throw new Error("Không tìm thấy mã danh mục.");
    }

    const response = await axiosClient.put(
      `/categories/update/${encodeURIComponent(categoryId)}`,
      {
        categoryName: categoryName.trim(),
        description: description.trim(),
        isActive: Boolean(isActive),
      },
    );

    const updatedCategory = ensureSuccessfulResponse(
      response,
      "Không thể cập nhật danh mục.",
    );

    if (!updatedCategory?.categoryId) {
      throw new Error("Response cập nhật danh mục không hợp lệ.");
    }

    return updatedCategory;
  },

  remove: async (categoryId) => {
    if (!categoryId) {
      throw new Error("Không tìm thấy mã danh mục.");
    }

    const response = await axiosClient.delete(
      `/categories/delete/${encodeURIComponent(categoryId)}`,
    );

    const deleteResult = ensureSuccessfulResponse(
      response,
      "Không thể ẩn danh mục.",
    );

    if (deleteResult !== true) {
      throw new Error("Response ẩn danh mục không hợp lệ.");
    }

    return true;
  },
};

export default categoryApi;

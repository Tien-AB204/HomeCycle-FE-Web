import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 10;

const createApiError = (
  response,
  fallbackMessage,
) => {
  const message =
    response?.error?.message ||
    response?.message ||
    fallbackMessage;

  return new Error(message);
};

const ensureSuccessfulResponse = (
  response,
  fallbackMessage,
) => {
  if (response?.isSuccess === false) {
    throw createApiError(
      response,
      fallbackMessage,
    );
  }

  return response?.data;
};

const normalizePagination = (
  data,
  fallbackPageNumber,
  fallbackPageSize,
) => {
  return {
    items: Array.isArray(data?.items)
      ? data.items
      : [],
    pageNumber:
      data?.pageNumber ??
      fallbackPageNumber,
    pageSize:
      data?.pageSize ??
      fallbackPageSize,
    totalCount:
      data?.totalCount ?? 0,
    totalPages:
      data?.totalPages ?? 0,
    hasPreviousPage: Boolean(
      data?.hasPreviousPage,
    ),
    hasNextPage: Boolean(
      data?.hasNextPage,
    ),
  };
};

export const brandApi = {
  getAll: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const response =
      await axiosClient.get(
        "/brands",
        {
          params: {
            PageNumber: pageNumber,
            PageSize: pageSize,
          },
          signal,
        },
      );

    const data =
      ensureSuccessfulResponse(
        response,
        "Không thể tải danh sách thương hiệu.",
      );

    return normalizePagination(
      data,
      pageNumber,
      pageSize,
    );
  },

  search: async ({
    keyword,
    isActive,
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const normalizedKeyword =
      typeof keyword === "string"
        ? keyword.trim()
        : "";

    const response =
      await axiosClient.get(
        "/brands/search",
        {
          params: {
            Keyword:
              normalizedKeyword ||
              undefined,
            IsActive:
              typeof isActive ===
              "boolean"
                ? isActive
                : undefined,
            PageNumber: pageNumber,
            PageSize: pageSize,
          },
          signal,
        },
      );

    const data =
      ensureSuccessfulResponse(
        response,
        "Không thể tìm kiếm thương hiệu.",
      );

    return normalizePagination(
      data,
      pageNumber,
      pageSize,
    );
  },

  create: async ({
    brandName,
    description,
  }) => {
    const response =
      await axiosClient.post(
        "/brands",
        {
          brandName: brandName.trim(),
          description:
            description.trim(),
        },
      );

    const createdBrand =
      ensureSuccessfulResponse(
        response,
        "Không thể tạo thương hiệu.",
      );

    if (!createdBrand?.brandId) {
      throw new Error(
        "Response tạo thương hiệu không hợp lệ.",
      );
    }

    return createdBrand;
  },

  update: async (
    brandId,
    {
      brandName,
      description,
      isActive,
    },
  ) => {
    if (!brandId) {
      throw new Error(
        "Không tìm thấy mã thương hiệu.",
      );
    }

    const response =
      await axiosClient.put(
        `/brands/${encodeURIComponent(
          brandId,
        )}`,
        {
          brandName: brandName.trim(),
          description:
            description.trim(),
          isActive: Boolean(isActive),
        },
      );

    const updatedBrand =
      ensureSuccessfulResponse(
        response,
        "Không thể cập nhật thương hiệu.",
      );

    if (!updatedBrand?.brandId) {
      throw new Error(
        "Response cập nhật thương hiệu không hợp lệ.",
      );
    }

    return updatedBrand;
  },

  remove: async (brandId) => {
    if (!brandId) {
      throw new Error(
        "Không tìm thấy mã thương hiệu.",
      );
    }

    const response =
      await axiosClient.delete(
        `/brands/${encodeURIComponent(
          brandId,
        )}`,
      );

    const deleteResult =
      ensureSuccessfulResponse(
        response,
        "Không thể ẩn thương hiệu.",
      );

    if (deleteResult !== true) {
      throw new Error(
        "Response ẩn thương hiệu không hợp lệ.",
      );
    }

    return true;
  },
};

export default brandApi;
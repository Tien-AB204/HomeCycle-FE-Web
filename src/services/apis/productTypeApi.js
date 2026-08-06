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
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasPreviousPage: Boolean(
      data?.hasPreviousPage,
    ),
    hasNextPage: Boolean(
      data?.hasNextPage,
    ),
  };
};

const normalizeAttributes = (
  attributes,
) => {
  if (!Array.isArray(attributes)) {
    return [];
  }

  return attributes.map(
    (attribute, attributeIndex) => ({
      attributeName:
        attribute.attributeName.trim(),
      dataType:
        attribute.dataType || "Text",
      unit: attribute.unit?.trim() || "",
      displayOrder:
        attributeIndex + 1,
      isFilterable: Boolean(
        attribute.isFilterable,
      ),
      isRequired: Boolean(
        attribute.isRequired,
      ),
      inputMode:
        attribute.inputMode ||
        "OptionOnly",
      options: Array.isArray(
        attribute.options,
      )
        ? attribute.options.map(
            (option, optionIndex) => ({
              optionValue:
                option.optionValue.trim(),
              displayOrder:
                optionIndex + 1,
            }),
          )
        : [],
    }),
  );
};

export const productTypeApi = {
  getAll: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const response =
      await axiosClient.get(
        "/product-types/get-all",
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
        "Không thể tải danh sách loại sản phẩm.",
      );

    return normalizePagination(
      data,
      pageNumber,
      pageSize,
    );
  },

  search: async ({
    categoryId,
    keyword,
    isActive,
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const params = {
      PageNumber: pageNumber,
      PageSize: pageSize,
    };

    if (categoryId?.trim()) {
      params.CategoryId =
        categoryId.trim();
    }

    if (keyword?.trim()) {
      params.Keyword = keyword.trim();
    }

    if (typeof isActive === "boolean") {
      params.IsActive = isActive;
    }

    const response =
      await axiosClient.get(
        "/product-types/search",
        {
          params,
          signal,
        },
      );

    const data =
      ensureSuccessfulResponse(
        response,
        "Không thể tìm kiếm loại sản phẩm.",
      );

    return normalizePagination(
      data,
      pageNumber,
      pageSize,
    );
  },

  create: async ({
    categoryId,
    productTypeName,
    description,
    attributes,
  }) => {
    if (!categoryId) {
      throw new Error(
        "Vui lòng chọn danh mục.",
      );
    }

    if (!productTypeName?.trim()) {
      throw new Error(
        "Vui lòng nhập tên loại sản phẩm.",
      );
    }

    const response =
      await axiosClient.post(
        "/product-types/create",
        {
          categoryId:
            categoryId.trim(),
          productTypeName:
            productTypeName.trim(),
          description:
            description?.trim() || "",
          attributes:
            normalizeAttributes(
              attributes,
            ),
        },
      );

    const createdProductType =
      ensureSuccessfulResponse(
        response,
        "Không thể tạo loại sản phẩm.",
      );

    if (
      !createdProductType?.productTypeId
    ) {
      throw new Error(
        "Response tạo loại sản phẩm không hợp lệ.",
      );
    }

    return createdProductType;
  },

  update: async (
    productTypeId,
    {
      productTypeName,
      description,
      isActive,
    },
  ) => {
    if (!productTypeId) {
      throw new Error(
        "Không tìm thấy mã loại sản phẩm.",
      );
    }

    if (!productTypeName?.trim()) {
      throw new Error(
        "Vui lòng nhập tên loại sản phẩm.",
      );
    }

    const response =
      await axiosClient.put(
        `/product-types/update/${encodeURIComponent(
          productTypeId,
        )}`,
        {
          productTypeName:
            productTypeName.trim(),
          description:
            description?.trim() || "",
          isActive: Boolean(isActive),
        },
      );

    const updatedProductType =
      ensureSuccessfulResponse(
        response,
        "Không thể cập nhật loại sản phẩm.",
      );

    if (
      !updatedProductType?.productTypeId
    ) {
      throw new Error(
        "Response cập nhật loại sản phẩm không hợp lệ.",
      );
    }

    return updatedProductType;
  },

  remove: async (productTypeId) => {
    if (!productTypeId) {
      throw new Error(
        "Không tìm thấy mã loại sản phẩm.",
      );
    }

    const response =
      await axiosClient.delete(
        `/product-types/delete/${encodeURIComponent(
          productTypeId,
        )}`,
      );

    const deletedSuccessfully =
      ensureSuccessfulResponse(
        response,
        "Không thể xóa hoặc ẩn loại sản phẩm.",
      );

    if (deletedSuccessfully !== true) {
      throw new Error(
        "Response xóa loại sản phẩm không hợp lệ.",
      );
    }

    return true;
  },
};

export default productTypeApi;
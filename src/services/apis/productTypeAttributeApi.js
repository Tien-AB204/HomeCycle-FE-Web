import axiosClient from "./axiosClient";

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

const normalizeIdentifier = (value, errorMessage) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(errorMessage);
  }

  return value.trim();
};

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi");
};

const getDisplayOrder = (item) => {
  return Number.isFinite(item?.displayOrder)
    ? item.displayOrder
    : Number.MAX_SAFE_INTEGER;
};

const sortByDisplayOrder = (firstItem, secondItem) => {
  return getDisplayOrder(firstItem) - getDisplayOrder(secondItem);
};

const normalizeOption = (option) => {
  return {
    ...option,
    optionId: option?.optionId || "",
    optionValue: option?.optionValue || "",
    displayOrder: option?.displayOrder ?? null,
  };
};

const normalizeAttribute = (attribute) => {
  const options = Array.isArray(attribute?.options)
    ? attribute.options.map(normalizeOption).sort(sortByDisplayOrder)
    : [];

  return {
    ...attribute,
    attributeId: attribute?.attributeId || "",
    attributeName: attribute?.attributeName || "",
    dataType: attribute?.dataType || "Text",
    unit: attribute?.unit || "",
    displayOrder: attribute?.displayOrder ?? null,
    isFilterable: Boolean(attribute?.isFilterable),
    isRequired: Boolean(attribute?.isRequired),
    inputMode: attribute?.inputMode ?? null,
    options,
  };
};

const ensureValidAttribute = (attribute) => {
  if (!attribute || typeof attribute !== "object") {
    throw new Error("Response chi tiết thuộc tính không hợp lệ.");
  }

  const normalizedAttribute = normalizeAttribute(attribute);

  if (!normalizedAttribute.attributeId) {
    throw new Error("Thuộc tính không chứa mã định danh hợp lệ.");
  }

  return normalizedAttribute;
};

const ensureMatchingAttributeId = (attribute, expectedAttributeId) => {
  const normalizedAttribute = ensureValidAttribute(attribute);

  if (
    normalizedAttribute.attributeId.toLocaleLowerCase() !==
    expectedAttributeId.toLocaleLowerCase()
  ) {
    throw new Error("Response thuộc tính không khớp với mã yêu cầu.");
  }

  return normalizedAttribute;
};

const normalizeAttributeList = (attributes) => {
  if (!Array.isArray(attributes)) {
    throw new Error("Response danh sách thuộc tính không hợp lệ.");
  }

  return attributes.map(ensureValidAttribute).sort(sortByDisplayOrder);
};

const normalizeCreateOptions = (options) => {
  if (!Array.isArray(options)) {
    return [];
  }

  const normalizedOptions = options.map((option, optionIndex) => {
    const optionValue = String(option?.optionValue || "").trim();

    if (!optionValue) {
      throw new Error(`Vui lòng nhập giá trị cho lựa chọn ${optionIndex + 1}.`);
    }

    return {
      optionValue,
      displayOrder:
        Number.isInteger(option?.displayOrder) && option.displayOrder >= 0
          ? option.displayOrder
          : optionIndex + 1,
    };
  });

  const normalizedValues = normalizedOptions.map((option) =>
    normalizeText(option.optionValue),
  );

  if (new Set(normalizedValues).size !== normalizedValues.length) {
    throw new Error("Các lựa chọn của thuộc tính không được trùng nhau.");
  }

  return normalizedOptions;
};

const createAttributeConfigurationPayload = ({
  attributeName,
  dataType,
  unit,
  displayOrder,
  isFilterable,
  isRequired,
  inputMode,
}) => {
  const normalizedAttributeName = String(attributeName || "").trim();

  if (!normalizedAttributeName) {
    throw new Error("Vui lòng nhập tên thuộc tính.");
  }

  const normalizedDataType = String(dataType || "Text").trim();

  const normalizedInputMode = String(inputMode || "OptionOnly").trim();

  return {
    attributeName: normalizedAttributeName,
    dataType: normalizedDataType || "Text",
    unit: String(unit || "").trim(),
    displayOrder:
      Number.isInteger(displayOrder) && displayOrder >= 0 ? displayOrder : 0,
    isFilterable: Boolean(isFilterable),
    isRequired: Boolean(isRequired),
    inputMode: normalizedInputMode || "OptionOnly",
  };
};

const createAttributePayload = (attributeData) => {
  const configuration = createAttributeConfigurationPayload(attributeData);

  const options = normalizeCreateOptions(attributeData?.options);

  if (
    configuration.inputMode.toLocaleLowerCase() === "optiononly" &&
    options.length === 0
  ) {
    throw new Error("Thuộc tính dạng OptionOnly phải có ít nhất một lựa chọn.");
  }

  return {
    ...configuration,
    options,
  };
};

export const productTypeAttributeApi = {
  getAll: async (productTypeId, { signal } = {}) => {
    const normalizedProductTypeId = normalizeIdentifier(
      productTypeId,
      "Không tìm thấy mã loại sản phẩm.",
    );

    const response = await axiosClient.get(
      `/product-types/${encodeURIComponent(
        normalizedProductTypeId,
      )}/attributes`,
      {
        signal,
      },
    );

    const attributes = ensureSuccessfulResponse(
      response,
      "Không thể tải danh sách thuộc tính sản phẩm.",
    );

    return normalizeAttributeList(attributes);
  },

  getById: async (attributeId, { signal } = {}) => {
    const normalizedAttributeId = normalizeIdentifier(
      attributeId,
      "Không tìm thấy mã thuộc tính.",
    );

    const response = await axiosClient.get(
      `/product-types/attributes/get-by-id/${encodeURIComponent(
        normalizedAttributeId,
      )}`,
      {
        signal,
      },
    );

    const attribute = ensureSuccessfulResponse(
      response,
      "Không thể tải chi tiết thuộc tính sản phẩm.",
    );

    return ensureMatchingAttributeId(attribute, normalizedAttributeId);
  },

  create: async (productTypeId, attributeData) => {
    const normalizedProductTypeId = normalizeIdentifier(
      productTypeId,
      "Không tìm thấy mã loại sản phẩm.",
    );

    if (!attributeData || typeof attributeData !== "object") {
      throw new Error("Dữ liệu thuộc tính không hợp lệ.");
    }

    const payload = createAttributePayload(attributeData);

    const response = await axiosClient.post(
      `/product-types/${encodeURIComponent(
        normalizedProductTypeId,
      )}/attributes/create`,
      payload,
    );

    const createdAttribute = ensureSuccessfulResponse(
      response,
      "Không thể tạo thuộc tính sản phẩm.",
    );

    return ensureValidAttribute(createdAttribute);
  },

  update: async (attributeId, attributeData) => {
    const normalizedAttributeId = normalizeIdentifier(
      attributeId,
      "Không tìm thấy mã thuộc tính.",
    );

    if (!attributeData || typeof attributeData !== "object") {
      throw new Error("Dữ liệu cập nhật thuộc tính không hợp lệ.");
    }

    const payload = createAttributeConfigurationPayload(attributeData);

    const response = await axiosClient.put(
      `/product-types/attributes/update/${encodeURIComponent(
        normalizedAttributeId,
      )}`,
      payload,
    );

    const updatedAttribute = ensureSuccessfulResponse(
      response,
      "Không thể cập nhật thuộc tính sản phẩm.",
    );

    return ensureMatchingAttributeId(updatedAttribute, normalizedAttributeId);
  },

  remove: async (attributeId) => {
    const normalizedAttributeId = normalizeIdentifier(
      attributeId,
      "Không tìm thấy mã thuộc tính.",
    );

    try {
      const response = await axiosClient.delete(
        `/product-types/attributes/delete/${encodeURIComponent(
          normalizedAttributeId,
        )}`,
      );

      const deletedSuccessfully = ensureSuccessfulResponse(
        response,
        "Không thể xóa thuộc tính sản phẩm.",
      );

      if (deletedSuccessfully !== true) {
        throw new Error("Response xóa thuộc tính không hợp lệ.");
      }

      return true;
    } catch (error) {
      if (error?.response?.status === 500) {
        throw new Error(
          "Không thể xóa thuộc tính khi vẫn còn tùy chọn. Vui lòng xóa toàn bộ tùy chọn trước.",
          {
            cause: error,
          },
        );
      }

      throw error;
    }
  },
};

export default productTypeAttributeApi;

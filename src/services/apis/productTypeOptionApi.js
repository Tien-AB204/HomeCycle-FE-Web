import axiosClient from "./axiosClient";

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

const normalizeIdentifier = (
  value,
  errorMessage,
) => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(errorMessage);
  }

  return value.trim();
};

const getDisplayOrder = (option) => {
  return Number.isFinite(
    option?.displayOrder,
  )
    ? option.displayOrder
    : Number.MAX_SAFE_INTEGER;
};

const sortByDisplayOrder = (
  firstOption,
  secondOption,
) => {
  return (
    getDisplayOrder(firstOption) -
    getDisplayOrder(secondOption)
  );
};

const normalizeOption = (option) => {
  return {
    ...option,
    optionId: option?.optionId || "",
    optionValue:
      option?.optionValue || "",
    displayOrder:
      option?.displayOrder ?? null,
  };
};

const ensureValidOption = (option) => {
  if (
    !option ||
    typeof option !== "object"
  ) {
    throw new Error(
      "Response tùy chọn thuộc tính không hợp lệ.",
    );
  }

  const normalizedOption =
    normalizeOption(option);

  if (!normalizedOption.optionId) {
    throw new Error(
      "Tùy chọn không chứa mã định danh hợp lệ.",
    );
  }

  return normalizedOption;
};

const ensureMatchingOptionId = (
  option,
  expectedOptionId,
) => {
  const normalizedOption =
    ensureValidOption(option);

  if (
    normalizedOption.optionId
      .toLocaleLowerCase() !==
    expectedOptionId
      .toLocaleLowerCase()
  ) {
    throw new Error(
      "Response tùy chọn không khớp với mã yêu cầu.",
    );
  }

  return normalizedOption;
};

const normalizeOptionList = (
  options,
) => {
  if (!Array.isArray(options)) {
    throw new Error(
      "Response danh sách tùy chọn không hợp lệ.",
    );
  }

  return options
    .map(ensureValidOption)
    .sort(sortByDisplayOrder);
};

const createOptionConfiguration = ({
  optionValue,
  displayOrder,
}) => {
  const normalizedOptionValue =
    String(optionValue || "").trim();

  if (!normalizedOptionValue) {
    throw new Error(
      "Vui lòng nhập giá trị tùy chọn.",
    );
  }

  return {
    optionValue:
      normalizedOptionValue,
    displayOrder:
      Number.isInteger(displayOrder) &&
      displayOrder >= 0
        ? displayOrder
        : 0,
  };
};

export const productTypeOptionApi = {
  getAll: async (
    attributeId,
    { signal } = {},
  ) => {
    const normalizedAttributeId =
      normalizeIdentifier(
        attributeId,
        "Không tìm thấy mã thuộc tính.",
      );

    const response =
      await axiosClient.get(
        `/product-types/attributes/${encodeURIComponent(
          normalizedAttributeId,
        )}/options`,
        {
          signal,
        },
      );

    const options =
      ensureSuccessfulResponse(
        response,
        "Không thể tải danh sách tùy chọn của thuộc tính.",
      );

    return normalizeOptionList(options);
  },

  create: async (
    attributeId,
    optionData,
  ) => {
    const normalizedAttributeId =
      normalizeIdentifier(
        attributeId,
        "Không tìm thấy mã thuộc tính.",
      );

    if (
      !optionData ||
      typeof optionData !== "object"
    ) {
      throw new Error(
        "Dữ liệu tùy chọn không hợp lệ.",
      );
    }

    const payload =
      createOptionConfiguration(
        optionData,
      );

    const response =
      await axiosClient.post(
        `/product-types/attributes/${encodeURIComponent(
          normalizedAttributeId,
        )}/options/create`,
        payload,
      );

    const createdOption =
      ensureSuccessfulResponse(
        response,
        "Không thể tạo tùy chọn cho thuộc tính.",
      );

    return ensureValidOption(
      createdOption,
    );
  },

  update: async (
    optionId,
    optionData,
  ) => {
    const normalizedOptionId =
      normalizeIdentifier(
        optionId,
        "Không tìm thấy mã tùy chọn.",
      );

    if (
      !optionData ||
      typeof optionData !== "object"
    ) {
      throw new Error(
        "Dữ liệu cập nhật tùy chọn không hợp lệ.",
      );
    }

    const optionConfiguration =
      createOptionConfiguration(
        optionData,
      );

    const payload = {
      optionId: normalizedOptionId,
      ...optionConfiguration,
    };

    const response =
      await axiosClient.put(
        `/product-types/options/update/${encodeURIComponent(
          normalizedOptionId,
        )}`,
        payload,
      );

    const updatedOption =
      ensureSuccessfulResponse(
        response,
        "Không thể cập nhật tùy chọn của thuộc tính.",
      );

    return ensureMatchingOptionId(
      updatedOption,
      normalizedOptionId,
    );
  },

  remove: async (optionId) => {
    const normalizedOptionId =
      normalizeIdentifier(
        optionId,
        "Không tìm thấy mã tùy chọn.",
      );

    const response =
      await axiosClient.delete(
        `/product-types/options/delete/${encodeURIComponent(
          normalizedOptionId,
        )}`,
      );

    const deletedSuccessfully =
      ensureSuccessfulResponse(
        response,
        "Không thể xóa tùy chọn của thuộc tính.",
      );

    if (deletedSuccessfully !== true) {
      throw new Error(
        "Response xóa tùy chọn không hợp lệ.",
      );
    }

    return true;
  },
};

export default productTypeOptionApi;
import {
  getSafeValidationMessage,
  isVietnameseMessage,
} from "./safeErrorMessage";

const PRODUCT_TYPE_ERROR_MESSAGES = Object.freeze({
  CATEGORY_NOT_FOUND: "Không tìm thấy danh mục.",
  PRODUCT_TYPE_NOT_FOUND: "Không tìm thấy loại sản phẩm.",
  PRODUCT_TYPE_ALREADY_EXISTS:
    "Loại sản phẩm này đã tồn tại trong danh mục.",
  ATTRIBUTE_NOT_FOUND: "Không tìm thấy thuộc tính.",
  ATTRIBUTE_ALREADY_EXISTS: "Thuộc tính này đã tồn tại.",
  ATTRIBUTE_ALREADY_IN_USE:
    "Thuộc tính đã được sử dụng nên không thể xóa.",
  DATA_TYPE_CANNOT_CHANGE_IN_USE:
    "Không thể đổi kiểu dữ liệu vì thuộc tính đã được sử dụng.",
  INPUT_MODE_CANNOT_CHANGE_IN_USE:
    "Không thể đổi chế độ nhập vì thuộc tính đã được sử dụng.",
  ATTRIBUTE_REQUIRED_MISSING: "Thiếu thuộc tính bắt buộc.",
  ATTRIBUTE_OPTION_NOT_FOUND: "Không tìm thấy tùy chọn.",
  ATTRIBUTE_OPTION_ALREADY_EXISTS: "Tùy chọn này đã tồn tại.",
  ATTRIBUTE_OPTION_ALREADY_IN_USE:
    "Tùy chọn đã được sử dụng nên không thể xóa.",
});

const getResponseData = (error) =>
  error?.response?.data || error?.apiResponse || null;

export const getProductTypeErrorCode = (error) => {
  const responseData = getResponseData(error) || error;

  return String(
    error?.apiCode ||
      responseData?.error?.code ||
      responseData?.code ||
      "",
  ).trim();
};

export const getProductTypeErrorMessage = (
  error,
  fallbackMessage,
) => {
  const responseData = getResponseData(error);
  const mappedMessage =
    PRODUCT_TYPE_ERROR_MESSAGES[
      getProductTypeErrorCode(error)
    ];

  if (mappedMessage) {
    return mappedMessage;
  }

  return (
    getSafeValidationMessage(responseData?.errors) ||
    [
      responseData?.error?.message,
      responseData?.message,
      !responseData ? error?.message : "",
    ].find(isVietnameseMessage) ||
    fallbackMessage
  );
};

export const createProductTypeApiError = (
  response,
  fallbackMessage,
) => {
  const error = new Error(
    getProductTypeErrorMessage(
      { apiResponse: response },
      fallbackMessage,
    ),
  );

  error.apiCode = getProductTypeErrorCode(response);
  error.apiResponse = response;

  return error;
};

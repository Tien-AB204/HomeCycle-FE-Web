import {
  getSafeProblemDetail,
  getSafeValidationMessage,
} from "./safeErrorMessage.js";

export const isCanceledRequest = (error) =>
  error?.name === "CanceledError" ||
  error?.name === "AbortError" ||
  error?.code === "ERR_CANCELED";

export const getApiErrorCode = (error) =>
  String(
    error?.response?.data?.error?.code ??
      error?.response?.data?.code ??
      error?.code ??
      "",
  ).trim();

/*
 * Thông báo lỗi an toàn để hiển thị: chỉ lấy thông điệp tiếng Việt do Backend
 * soạn, nếu không có thì dùng câu dự phòng của màn hình.
 */
export const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  return (
    getSafeValidationMessage(responseData?.errors) ||
    getSafeProblemDetail(responseData?.error?.message) ||
    getSafeProblemDetail(responseData?.message) ||
    getSafeProblemDetail(responseData?.detail) ||
    getSafeProblemDetail(error?.message) ||
    fallbackMessage
  );
};

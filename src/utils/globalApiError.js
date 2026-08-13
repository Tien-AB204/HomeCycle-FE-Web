export const GLOBAL_API_ERROR_EVENT = "homecycle:api-error";

let lastErrorAt = 0;

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

export const shouldOpenErrorPage = (error) => {
  if (isCanceledRequest(error)) return false;

  const status = error?.response?.status;
  return !error?.response || Number(status) >= 500;
};

export const getGlobalErrorDetail = (error) => {
  const status = Number(error?.response?.status) || 0;
  const responseData = error?.response?.data;

  return {
    status,
    code: responseData?.code || responseData?.error?.code || "",
    message:
      responseData?.error?.message ||
      responseData?.message ||
      (status === 0
        ? "Không thể kết nối đến máy chủ."
        : "Máy chủ đang gặp sự cố khi xử lý yêu cầu."),
  };
};

export const notifyGlobalApiError = (error) => {
  if (!shouldOpenErrorPage(error) || typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastErrorAt < 800) return;

  lastErrorAt = now;
  window.dispatchEvent(
    new CustomEvent(GLOBAL_API_ERROR_EVENT, {
      detail: getGlobalErrorDetail(error),
    }),
  );
};

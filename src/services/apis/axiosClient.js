import axios from "axios";

const DEFAULT_API_BASE_URL =
  "https://homecycle-backend.onrender.com/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const PUBLIC_AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/google-login",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/Personal/Register",
  "/auth/refresh-token",
];

const isPublicAuthRequest = (url = "") => {
  return PUBLIC_AUTH_ENDPOINTS.some((endpoint) =>
    url.includes(endpoint),
  );
};

const clearStoredSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

let refreshPromise = null;

axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");

    /*
     * Không gắn access token vào các API authentication công khai.
     * Điều này tránh việc Login/Send OTP gặp 401 rồi kích hoạt refresh.
     */
    if (
      accessToken &&
      !isPublicAuthRequest(config.url)
    ) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },

  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    const shouldRefresh =
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest.url);

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    const storedRefreshToken =
      localStorage.getItem("refreshToken");

    if (!storedRefreshToken) {
      clearStoredSession();

      window.dispatchEvent(
        new Event("auth:session-expired"),
      );

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Chỉ cho phép một request refresh chạy tại một thời điểm.
       * Các request 401 đồng thời sẽ cùng chờ refreshPromise.
       */
      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${API_BASE_URL}/auth/refresh-token`,
            {
              refreshToken: storedRefreshToken,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 30000,
            },
          )
          .then((response) => {
            const {
              accessToken,
              refreshToken: newRefreshToken,
            } = response?.data || {};

            if (!accessToken || !newRefreshToken) {
              throw new Error(
                "Refresh token response không hợp lệ.",
              );
            }

            /*
             * Backend sử dụng refresh-token rotation,
             * vì vậy phải cập nhật cả hai token.
             */
            localStorage.setItem(
              "accessToken",
              accessToken,
            );

            localStorage.setItem(
              "refreshToken",
              newRefreshToken,
            );

            return accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      /*
       * Gửi lại request ban đầu một lần với access token mới.
       * Response tiếp tục đi qua interceptor và trả về response.data.
       */
      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearStoredSession();

      window.dispatchEvent(
        new Event("auth:session-expired"),
      );

      return Promise.reject(refreshError);
    }
  },
);

export default axiosClient;
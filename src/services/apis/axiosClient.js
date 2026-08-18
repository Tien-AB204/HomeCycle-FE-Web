import axios from "axios";
import { notifyGlobalApiError } from "../../utils/globalApiError";

const DEFAULT_API_BASE_URL = "https://homecycle-backend.onrender.com/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const PUBLIC_AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/google-login",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/Personal/Register",
  "/auth/business/register",
  "/auth/refresh-token",
];

const isPublicAuthRequest = (url = "") => {
  const normalizedUrl = url.toLowerCase();

  return PUBLIC_AUTH_ENDPOINTS.some((endpoint) =>
    normalizedUrl.includes(endpoint.toLowerCase()),
  );
};

const clearStoredSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

const notifySessionExpired = () => {
  window.dispatchEvent(new Event("auth:session-expired"));
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
     * Không gửi access token tới các API xác thực công khai.
     */
    if (accessToken && !isPublicAuthRequest(config.url)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosClient.interceptors.response.use(
  (response) => response.data,

  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    const shouldRefresh =
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest.url);

    if (!shouldRefresh) {
      if (!originalRequest?.skipGlobalErrorPage) {
        notifyGlobalApiError(error);
      }

      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem("refreshToken");

    if (!storedRefreshToken) {
      clearStoredSession();
      notifySessionExpired();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Chỉ cho phép một refresh request chạy cùng lúc.
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
            const responseData = response?.data || {};

            const accessToken = responseData.accessToken;

            const newRefreshToken = responseData.refreshToken;

            if (!accessToken || !newRefreshToken) {
              throw new Error("Refresh token response không hợp lệ.");
            }

            /*
             * Backend sử dụng refresh-token rotation.
             */
            localStorage.setItem("accessToken", accessToken);

            localStorage.setItem("refreshToken", newRefreshToken);

            return accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearStoredSession();
      notifySessionExpired();
      notifyGlobalApiError(refreshError);

      return Promise.reject(refreshError);
    }
  },
);

export default axiosClient;

import axios from "axios";
import { ROLES } from "../../constants/roles";
import { decodeJwtPayload, normalizeRole } from "../../utils/authUtils";

/*
 * Phiên đăng nhập riêng của GHN Webhook Test Console: lưu theo tab trong
 * sessionStorage, không dùng chung token/AuthContext và không tự refresh
 * như axiosClient của luồng chính.
 */
const DEFAULT_API_BASE_URL = "https://homecycle-backend.onrender.com/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const DEMO_SESSION_KEY = "ghnDemoSession";

const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

const readClaim = (value) => (Array.isArray(value) ? value[0] : value);

export const clearDemoSession = () => {
  try {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // sessionStorage có thể bị chặn; khi đó coi như không có phiên.
  }
};

export const getDemoSession = () => {
  try {
    const session = JSON.parse(
      sessionStorage.getItem(DEMO_SESSION_KEY) || "null",
    );

    if (!session?.accessToken) {
      return null;
    }

    if (session.expiresAt && session.expiresAt <= Date.now()) {
      clearDemoSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

const demoClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

demoClient.interceptors.request.use((config) => {
  const session = getDemoSession();

  if (session) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

demoClient.interceptors.response.use((response) => response.data);

const ghnDemoApi = {
  login: async ({ email, password }) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const response = await demoClient.post("/auth/login", {
      email: normalizedEmail,
      password,
    });

    const data = response?.data || response || {};
    const accessToken = data.accessToken || data.token || "";
    const payload = decodeJwtPayload(accessToken);

    if (!accessToken || !payload) {
      throw new Error("Không nhận được access token hợp lệ.");
    }

    const role = normalizeRole(
      data.role ||
        data.user?.role ||
        readClaim(payload.role) ||
        readClaim(payload[ROLE_CLAIM]),
    );

    if (role !== ROLES.ADMIN) {
      const error = new Error("Chỉ tài khoản Admin được dùng công cụ demo.");
      error.code = "DEMO_ADMIN_REQUIRED";
      throw error;
    }

    const session = {
      accessToken,
      email: data.email || data.user?.email || normalizedEmail,
      expiresAt: payload.exp ? payload.exp * 1000 : null,
    };

    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));

    return session;
  },

  lookupAdminOrder: async ({ orderCode, clientOrderCode, signal } = {}) => {
    const params = {};
    const trimmedOrderCode = String(orderCode || "").trim();
    const trimmedClientOrderCode = String(clientOrderCode || "").trim();

    if (trimmedOrderCode) {
      params.orderCode = trimmedOrderCode;
    }

    if (trimmedClientOrderCode) {
      params.clientOrderCode = trimmedClientOrderCode;
    }

    return demoClient.get("/GHN/admin/orders/lookup", { params, signal });
  },

  simulateWebhook: async (payload, { signal } = {}) =>
    demoClient.post("/GHN/webhook", payload, {
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-HomeCycle-Demo": "true",
      },
    }),
};

export default ghnDemoApi;

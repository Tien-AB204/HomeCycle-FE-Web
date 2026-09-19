import axiosClient from "./axiosClient";

const normalizeId = (value, message) => {
  const id = String(value || "").trim();
  if (!id) throw new Error(message);
  return id;
};

const unwrap = (response) => response?.data ?? response ?? null;

const subscriptionApi = {
  getPackages: async ({ signal } = {}) => {
    const response = await axiosClient.get("/subscription-packages", {
      signal,
      skipGlobalErrorPage: true,
    });

    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  getPackageById: async (packageId, { signal } = {}) => {
    const id = normalizeId(packageId, "Không tìm thấy mã gói đăng ký.");
    return unwrap(
      await axiosClient.get(
        `/subscription-packages/${encodeURIComponent(id)}`,
        { signal, skipGlobalErrorPage: true },
      ),
    );
  },

  getFreePlan: async (targetRole, { signal } = {}) => {
    const role = String(targetRole || "").trim();
    if (!role) throw new Error("Không xác định được vai trò để tải gói Free.");

    return unwrap(
      await axiosClient.get("/subscription-packages/free-plan", {
        params: { targetRole: role },
        signal,
        skipGlobalErrorPage: true,
      }),
    );
  },

  getMySubscription: async ({ signal } = {}) => {
    const response = await axiosClient.get(
      "/subscription-packages/me/subscription",
      { signal, skipGlobalErrorPage: true },
    );

    return unwrap(response);
  },

  getMyBenefits: async ({ signal } = {}) =>
    unwrap(
      await axiosClient.get("/subscription-packages/me/benefits", {
        signal,
        skipGlobalErrorPage: true,
      }),
    ),

  checkoutWithWallet: async (packageId) => {
    const id = normalizeId(packageId, "Không tìm thấy mã gói đăng ký.");
    return unwrap(
      await axiosClient.post(
        `/payments/subscriptions/${encodeURIComponent(id)}/wallet/checkout`,
        null,
        { skipGlobalErrorPage: true },
      ),
    );
  },

  createPayOsCheckout: async (packageId, { returnUrl, cancelUrl }) => {
    const id = normalizeId(packageId, "Không tìm thấy mã gói đăng ký.");

    const response = unwrap(
      await axiosClient.post(
        `/payments/subscriptions/${encodeURIComponent(id)}/payos/checkout`,
        {
          returnUrl: String(returnUrl || "").trim(),
          cancelUrl: String(cancelUrl || "").trim(),
        },
        { skipGlobalErrorPage: true },
      ),
    );

    if (!response?.checkoutUrl || !response?.subscriptionId) {
      throw new Error("Response checkout gói đăng ký không hợp lệ.");
    }

    return response;
  },

  getPaymentStatus: async (subscriptionId, { signal } = {}) => {
    const id = normalizeId(
      subscriptionId,
      "Không tìm thấy mã subscription để kiểm tra thanh toán.",
    );

    return unwrap(
      await axiosClient.get(
        `/payments/subscriptions/${encodeURIComponent(id)}/status`,
        { signal, skipGlobalErrorPage: true },
      ),
    );
  },

  cancel: async (subscriptionId) => {
    const id = normalizeId(subscriptionId, "Không tìm thấy mã subscription.");

    return unwrap(
      await axiosClient.post(
        `/subscription-packages/me/subscriptions/${encodeURIComponent(id)}/cancel`,
        null,
        { skipGlobalErrorPage: true },
      ),
    );
  },
};

export default subscriptionApi;

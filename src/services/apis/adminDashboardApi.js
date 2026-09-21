import axiosClient from "./axiosClient";

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "",
    ),
  );

const adminDashboardApi = {
  getUserOverview: async ({
    role,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/users/overview",
      {
        params: cleanParams({ role }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getUsers: async ({
    role,
    status,
    keyword,
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/users",
      {
        params: cleanParams({
          role,
          status,
          keyword:
            String(keyword || "").trim() ||
            undefined,
          pageNumber,
          pageSize,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getRegistrationTrend: async ({
    role,
    days = 30,
    forecastDays = 7,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/users/registration-trend",
      {
        params: cleanParams({
          role,
          days,
          forecastDays,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getOperationOverview: async ({
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/operations/overview",
      {
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getPayments: async ({
    from,
    to,
    groupBy = "Day",
    paymentStatus,
    paymentMethod,
    paymentType,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/payments",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
          paymentStatus,
          paymentMethod,
          paymentType,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getOrders: async ({
    from,
    to,
    groupBy = "Day",
    orderStatus,
    deliveryMethod,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/orders",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
          orderStatus,
          deliveryMethod,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getAppointments: async ({
    from,
    to,
    groupBy = "Day",
    appointmentStatus,
    appointmentType,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/appointments",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
          appointmentStatus,
          appointmentType,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getDisputes: async ({
    from,
    to,
    groupBy = "Day",
    status,
    targetType,
    disputeCategoryId,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/disputes",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
          status,
          targetType,
          disputeCategoryId,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getBusinessOverview: async ({
    from,
    to,
    groupBy = "Day",
    businessModel,
    profileStatus,
    userStatus,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/businesses/overview",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
          businessModel,
          profileStatus,
          userStatus,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getBusinessDemand: async ({
    businessModel,
    profileStatus,
    userStatus,
    targetCity,
    serviceCity,
    productTypeId,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/businesses/demand",
      {
        params: cleanParams({
          businessModel,
          profileStatus,
          userStatus,
          targetCity,
          serviceCity,
          productTypeId,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getBusinessPerformance: async ({
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/businesses/performance",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getFinanceOverview: async ({
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/finance/overview",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getFinanceCashFlow: async ({
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/finance/cash-flow",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getFinancePaymentStatus: async ({
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/finance/payment-status",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getFinanceHealth: async ({
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/finance/health",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getFinanceRevenue: async ({
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/finance/revenue",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getFinanceTransactions: async ({
    from,
    to,
    groupBy = "Day",
    pageNumber = 1,
    pageSize = 20,
    transactionType,
    status,
    referenceType,
    flowScope,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/finance/transactions",
      {
        params: cleanParams({
          from,
          to,
          groupBy,
          pageNumber,
          pageSize,
          transactionType,
          status,
          referenceType,
          flowScope,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),
  getListings: async ({
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get("/admin/dashboard/listings", {
      params: cleanParams({ from, to, groupBy }),
      signal,
      skipGlobalErrorPage: true,
    }),

  getSubscriptionDashboard: async ({
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get("/admin/dashboard/subscription-packages", {
      params: cleanParams({ from, to, groupBy }),
      signal,
      skipGlobalErrorPage: true,
    }),

  getUserActivity: async ({ signal } = {}) =>
    axiosClient.get("/admin/dashboard/users/activity", {
      signal,
      skipGlobalErrorPage: true,
    }),

  getUserDetail: async (userId, { signal } = {}) => {
    const id = String(userId || "").trim();

    if (!id) {
      throw new Error("Không tìm thấy mã người dùng.");
    }

    return axiosClient.get(
      `/admin/dashboard/users/${encodeURIComponent(id)}`,
      { signal, skipGlobalErrorPage: true },
    );
  },
};

export default adminDashboardApi;

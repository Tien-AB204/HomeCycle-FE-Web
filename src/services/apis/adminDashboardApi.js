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
    from,
    to,
    groupBy = "Day",
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/operations/overview",
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
    category,
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
          category,
        }),
        signal,
        skipGlobalErrorPage: true,
      },
    ),

  getBusinessOverview: async ({
    businessModel,
    profileStatus,
    userStatus,
    signal,
  } = {}) =>
    axiosClient.get(
      "/admin/dashboard/businesses/overview",
      {
        params: cleanParams({
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
};

export default adminDashboardApi;
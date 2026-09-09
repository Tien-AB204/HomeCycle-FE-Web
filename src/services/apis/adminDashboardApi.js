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
};

export default adminDashboardApi;
import axiosClient from "./axiosClient";
import { postApi } from "./postApi";

const unwrapResult = (
  response,
  fallbackMessage,
) => {
  if (
    response?.success === false ||
    response?.isSuccess === false
  ) {
    throw new Error(fallbackMessage);
  }

  return response?.data ?? response;
};

const countList = (
  response,
  fallbackMessage,
) => {
  const data = unwrapResult(
    response,
    fallbackMessage,
  );

  if (Array.isArray(data)) {
    return data.length;
  }

  if (Array.isArray(data?.items)) {
    return data.items.length;
  }

  throw new Error(fallbackMessage);
};

const getPagedTotal = (
  response,
  fallbackMessage,
) => {
  const data = unwrapResult(
    response,
    fallbackMessage,
  );

  if (
    Number.isFinite(Number(data?.totalCount))
  ) {
    return Number(data.totalCount);
  }

  if (Array.isArray(data?.items)) {
    return data.items.length;
  }

  if (Array.isArray(data)) {
    return data.length;
  }

  throw new Error(fallbackMessage);
};

export const modDashboardApi = {
  getPendingBusinessCount: async ({
    signal,
  } = {}) => {
    const response = await axiosClient.get(
      "/moderator/business-profiles/pending",
      { signal },
    );

    return countList(
      response,
      "Không thể tải hồ sơ doanh nghiệp chờ duyệt.",
    );
  },

  getPendingPersonalCount: async ({
    signal,
  } = {}) => {
    const response = await axiosClient.get(
      "/moderator/personal-profiles/pending",
      { signal },
    );

    return countList(
      response,
      "Không thể tải hồ sơ cá nhân chờ duyệt.",
    );
  },

  getTotalPostCount: async ({
    signal,
  } = {}) => {
    const page = await postApi.getAll({
      pageNumber: 1,
      pageSize: 1,
      signal,
    });

    if (
      !Number.isFinite(
        Number(page?.totalCount),
      )
    ) {
      throw new Error(
        "Không thể tải tổng số bài đăng.",
      );
    }

    return Number(page.totalCount);
  },

  getPendingDisputeCount: async ({
    signal,
  } = {}) => {
    const response = await axiosClient.get(
      "/moderator/disputes",
      {
        params: {
          pageNumber: 1,
          pageSize: 1,
          status: 0,
        },
        signal,
      },
    );

    return getPagedTotal(
      response,
      "Không thể tải tranh chấp chờ xử lý.",
    );
  },
};

export default modDashboardApi;
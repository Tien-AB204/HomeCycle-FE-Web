import axiosClient from "./axiosClient";

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

const normalizePositiveInteger = (value, fallback) => {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
};

const moderatorListingApi = {
  getListingDashboard: async ({ from, to, groupBy = "Day", signal } = {}) =>
    axiosClient.get("/moderator/dashboard/listings", {
      params: cleanParams({ from, to, groupBy }),
      signal,
      skipGlobalErrorPage: true,
    }),

  getReportedPosts: async ({
    openOnly = true,
    keyword,
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) => {
    const normalizedPage = normalizePositiveInteger(pageNumber, 1);
    const normalizedSize = Math.min(100, normalizePositiveInteger(pageSize, 10));
    const response = await axiosClient.get("/moderator/posts/reported", {
      params: cleanParams({
        OpenOnly: openOnly,
        Keyword: String(keyword || "").trim(),
        PageNumber: normalizedPage,
        PageSize: normalizedSize,
      }),
      signal,
      skipGlobalErrorPage: true,
    });
    const source = response?.data ?? response ?? {};
    const totalCount = Math.max(0, Number(source.totalCount) || 0);
    return {
      items: Array.isArray(source.items) ? source.items : [],
      pageNumber: normalizePositiveInteger(source.pageNumber, normalizedPage),
      pageSize: normalizePositiveInteger(source.pageSize, normalizedSize),
      totalCount,
      totalPages: Math.max(0, Number(source.totalPages) || Math.ceil(totalCount / normalizedSize)),
    };
  },

  suspendPost: async (postId) => {
    const id = String(postId || "").trim();
    if (!id) throw new Error("Không tìm thấy mã bài đăng.");
    return axiosClient.patch(`/moderator/posts/${encodeURIComponent(id)}/suspend`, null, {
      skipGlobalErrorPage: true,
    });
  },

  warnPostOwner: async (postId, message) => {
    const id = String(postId || "").trim();
    const trimmed = String(message || "").trim();
    if (!id) throw new Error("Không tìm thấy mã bài đăng.");
    if (!trimmed || trimmed.length > 1000) {
      throw new Error("Nội dung cảnh báo phải từ 1 đến 1000 ký tự.");
    }
    return axiosClient.post(
      `/moderator/posts/${encodeURIComponent(id)}/warn`,
      { message: trimmed },
      { skipGlobalErrorPage: true },
    );
  },
};

export default moderatorListingApi;

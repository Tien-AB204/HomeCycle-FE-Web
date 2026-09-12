import axiosClient from "./axiosClient";

const normalizePositiveInteger = (value, fallback) => {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0
    ? normalized
    : fallback;
};

const normalizePagedResponse = (
  response,
  fallbackPageNumber,
  fallbackPageSize,
) => {
  const source = response?.data ?? response ?? {};

  const pageNumber = normalizePositiveInteger(
    source.pageNumber ?? source.PageNumber,
    fallbackPageNumber,
  );

  const pageSize = normalizePositiveInteger(
    source.pageSize ?? source.PageSize,
    fallbackPageSize,
  );

  const totalCount = Math.max(
    0,
    Number(source.totalCount ?? source.TotalCount) || 0,
  );

  const totalPages = Math.max(
    0,
    Number(source.totalPages ?? source.TotalPages) ||
      Math.ceil(totalCount / pageSize),
  );

  return {
    items: Array.isArray(source.items ?? source.Items)
      ? source.items ?? source.Items
      : [],
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: Boolean(
      source.hasPreviousPage ?? source.HasPreviousPage ?? pageNumber > 1,
    ),
    hasNextPage: Boolean(
      source.hasNextPage ?? source.HasNextPage ?? pageNumber < totalPages,
    ),
  };
};

const moderatorWithdrawalApi = {
  getWithdrawals: async ({
    keyword,
    userId,
    status,
    fromDate,
    toDate,
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) => {
    const normalizedPage = normalizePositiveInteger(pageNumber, 1);

    const normalizedPageSize = Math.min(
      100,
      normalizePositiveInteger(pageSize, 10),
    );

    const params = {
      PageNumber: normalizedPage,
      PageSize: normalizedPageSize,
    };

    if (String(keyword || "").trim()) {
      params.Keyword = String(keyword).trim();
    }

    if (String(userId || "").trim()) {
      params.UserId = String(userId).trim();
    }

    if (status !== undefined && status !== null && status !== "") {
      params.Status = status;
    }

    if (fromDate) {
      params.FromDate = fromDate;
    }

    if (toDate) {
      params.ToDate = toDate;
    }

    const response = await axiosClient.get("/moderator/withdrawals", {
      params,
      signal,
    });

    return normalizePagedResponse(
      response,
      normalizedPage,
      normalizedPageSize,
    );
  },

  getWithdrawalById: async (
    withdrawalId,
    { signal } = {},
  ) => {
    const id = String(withdrawalId || "").trim();

    if (!id) {
      throw new Error(
        "Không tìm thấy mã yêu cầu rút tiền.",
      );
    }

    const response = await axiosClient.get(
      `/moderator/withdrawals/${encodeURIComponent(id)}`,
      { signal },
    );

    const source = response?.data ?? response ?? {};

    const responseWithdrawalId = String(
      source.withdrawalId ?? source.WithdrawalId ?? "",
    ).trim();

    if (!responseWithdrawalId) {
      throw new Error(
        "Response chi tiết yêu cầu rút tiền không hợp lệ.",
      );
    }

    return source;
  },
};

export default moderatorWithdrawalApi;

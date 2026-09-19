import axiosClient from "./axiosClient";

const normalizePositiveInteger = (value, fallback) => {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
};

const normalizePage = (response, pageNumber, pageSize) => {
  const source = response?.data ?? response ?? {};
  const items = Array.isArray(source.items ?? source.Items)
    ? source.items ?? source.Items
    : [];
  const totalCount = Math.max(0, Number(source.totalCount ?? source.TotalCount) || 0);
  const normalizedPage = normalizePositiveInteger(
    source.pageNumber ?? source.PageNumber,
    pageNumber,
  );
  const normalizedSize = normalizePositiveInteger(
    source.pageSize ?? source.PageSize,
    pageSize,
  );
  const totalPages = Math.max(
    0,
    Number(source.totalPages ?? source.TotalPages) ||
      Math.ceil(totalCount / normalizedSize),
  );

  return {
    items,
    pageNumber: normalizedPage,
    pageSize: normalizedSize,
    totalCount,
    totalPages,
    hasPreviousPage: Boolean(
      source.hasPreviousPage ?? source.HasPreviousPage ?? normalizedPage > 1,
    ),
    hasNextPage: Boolean(
      source.hasNextPage ?? source.HasNextPage ?? normalizedPage < totalPages,
    ),
  };
};

const financeOperationsApi = {
  getFunds: async ({ signal } = {}) =>
    axiosClient.get("/wallet/finance/funds", {
      signal,
      skipGlobalErrorPage: true,
    }),

  getHolds: async ({ signal } = {}) =>
    axiosClient.get("/wallet/finance/holds", {
      signal,
      skipGlobalErrorPage: true,
    }),

  getTransactions: async ({
    transactionType,
    referenceType,
    status,
    fromDate,
    toDate,
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) => {
    const normalizedPage = normalizePositiveInteger(pageNumber, 1);
    const normalizedSize = Math.min(100, normalizePositiveInteger(pageSize, 10));
    const params = {
      PageNumber: normalizedPage,
      PageSize: normalizedSize,
    };

    if (transactionType !== undefined && transactionType !== null && transactionType !== "") {
      params.TransactionType = transactionType;
    }
    if (referenceType !== undefined && referenceType !== null && referenceType !== "") {
      params.ReferenceType = referenceType;
    }
    if (status !== undefined && status !== null && status !== "") {
      params.Status = status;
    }
    if (fromDate) params.FromDate = fromDate;
    if (toDate) params.ToDate = toDate;

    const response = await axiosClient.get("/wallet/finance/transactions", {
      params,
      signal,
      skipGlobalErrorPage: true,
    });

    return normalizePage(response, normalizedPage, normalizedSize);
  },

  getTransactionById: async (walletTransactionId, { signal } = {}) => {
    const id = String(walletTransactionId || "").trim();
    if (!id) throw new Error("Không tìm thấy mã giao dịch.");

    const response = await axiosClient.get(
      `/wallet/finance/transactions/${encodeURIComponent(id)}`,
      { signal, skipGlobalErrorPage: true },
    );

    return response?.data ?? response ?? {};
  },
};

export default financeOperationsApi;

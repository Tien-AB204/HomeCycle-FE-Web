import axiosClient from "./axiosClient";

const unwrapResult = (result, fallbackMessage) => {
  if (result?.success === false || result?.isSuccess === false) {
    throw new Error(
      result?.error?.message ||
        result?.message ||
        fallbackMessage,
    );
  }

  return result?.data ?? result;
};

const appendIfPresent = (params, key, value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  params[key] = value;
};

const appendOrderGroupParams = (
  params,
  prefix,
  group = {},
) => {
  appendIfPresent(
    params,
    `${prefix}.PageNumber`,
    group.pageNumber,
  );
  appendIfPresent(
    params,
    `${prefix}.PageSize`,
    group.pageSize,
  );
  appendIfPresent(
    params,
    `${prefix}.Keyword`,
    group.keyword,
  );
  appendIfPresent(
    params,
    `${prefix}.Status`,
    group.status,
  );
};

const appendLedgerGroupParams = (
  params,
  group = {},
) => {
  appendIfPresent(
    params,
    "ledger.PageNumber",
    group.pageNumber,
  );
  appendIfPresent(
    params,
    "ledger.PageSize",
    group.pageSize,
  );
  appendIfPresent(
    params,
    "ledger.Direction",
    group.direction,
  );
  appendIfPresent(
    params,
    "ledger.BalanceType",
    group.balanceType,
  );
  appendIfPresent(
    params,
    "ledger.FromDate",
    group.fromDate,
  );
  appendIfPresent(
    params,
    "ledger.ToDate",
    group.toDate,
  );
};

const appendWithdrawalsGroupParams = (
  params,
  group = {},
) => {
  appendIfPresent(
    params,
    "withdrawals.PageNumber",
    group.pageNumber,
  );
  appendIfPresent(
    params,
    "withdrawals.PageSize",
    group.pageSize,
  );
  appendIfPresent(
    params,
    "withdrawals.Status",
    group.status,
  );
  appendIfPresent(
    params,
    "withdrawals.FromDate",
    group.fromDate,
  );
  appendIfPresent(
    params,
    "withdrawals.ToDate",
    group.toDate,
  );
};

const normalizePagedResult = (source) => ({
  items: Array.isArray(source?.items)
    ? source.items
    : [],

  pageNumber: Number(source?.pageNumber) || 1,
  pageSize: Number(source?.pageSize) || 10,
  totalCount: Number(source?.totalCount) || 0,
  totalPages: Number(source?.totalPages) || 0,

  hasPreviousPage: Boolean(
    source?.hasPreviousPage,
  ),

  hasNextPage: Boolean(source?.hasNextPage),
});

const normalizeWallet = (source) => ({
  walletId: source?.walletId ?? null,
  walletType: source?.walletType ?? null,

  availableBalance:
    Number(source?.availableBalance) || 0,

  holdBalance:
    Number(source?.holdBalance) || 0,

  purpose: source?.purpose ?? null,
});

const businessDashboardApi = {
  /*
   * GET /api/business/dashboard trả cả 5 nhóm dữ liệu (buyerOrders,
   * sellerOrders, wallet, ledger, withdrawals) trong MỘT request. Mỗi
   * danh sách phân trang độc lập qua các query group tiền tố
   * buyerOrders, sellerOrders, ledger, withdrawals theo model binding
   * của Backend - không có endpoint tách lẻ cho từng nhóm.
   */
  getDashboard: async ({
    buyerOrders,
    sellerOrders,
    ledger,
    withdrawals,
    signal,
  } = {}) => {
    const params = {};

    appendOrderGroupParams(
      params,
      "buyerOrders",
      buyerOrders,
    );

    appendOrderGroupParams(
      params,
      "sellerOrders",
      sellerOrders,
    );

    appendLedgerGroupParams(params, ledger);
    appendWithdrawalsGroupParams(
      params,
      withdrawals,
    );

    const result = await axiosClient.get(
      "/business/dashboard",
      {
        params,
        signal,
        skipGlobalErrorPage: true,
      },
    );

    const data = unwrapResult(
      result,
      "Không thể tải tổng quan doanh nghiệp.",
    );

    return {
      buyerOrders: normalizePagedResult(
        data?.buyerOrders,
      ),
      sellerOrders: normalizePagedResult(
        data?.sellerOrders,
      ),
      wallet: normalizeWallet(data?.wallet),
      ledger: normalizePagedResult(
        data?.ledger,
      ),
      withdrawals: normalizePagedResult(
        data?.withdrawals,
      ),
    };
  },
};

export default businessDashboardApi;

import axiosClient from "./axiosClient";

const normalizePositiveInteger = (
  value,
  fallback,
) => {
  const normalized =
    Number(value);

  return (
    Number.isInteger(normalized) &&
    normalized > 0
  )
    ? normalized
    : fallback;
};

const normalizePagedResponse = (
  response,
  fallbackPage,
  fallbackPageSize,
) => {
  const source =
    response?.data ??
    response ??
    {};

  const pageNumber =
    normalizePositiveInteger(
      source.pageNumber ??
        source.PageNumber,
      fallbackPage,
    );

  const pageSize =
    normalizePositiveInteger(
      source.pageSize ??
        source.PageSize,
      fallbackPageSize,
    );

  const totalCount =
    Math.max(
      0,
      Number(
        source.totalCount ??
          source.TotalCount,
      ) || 0,
    );

  const totalPages =
    Math.max(
      0,
      Number(
        source.totalPages ??
          source.TotalPages,
      ) ||
        Math.ceil(
          totalCount /
            pageSize,
        ),
    );

  return {
    items:
      Array.isArray(
        source.items ??
          source.Items,
      )
        ? (
            source.items ??
            source.Items
          )
        : [],

    pageNumber,
    pageSize,
    totalCount,
    totalPages,

    hasPreviousPage:
      Boolean(
        source.hasPreviousPage ??
          source.HasPreviousPage ??
          pageNumber > 1,
      ),

    hasNextPage:
      Boolean(
        source.hasNextPage ??
          source.HasNextPage ??
          pageNumber < totalPages,
      ),
  };
};

const normalizeWallet = (
  response,
) => {
  const source =
    response?.data ??
    response;

  if (
    !source ||
    typeof source !== "object"
  ) {
    return null;
  }

  return {
    walletId:
      source.walletId ??
      source.WalletId ??
      null,

    walletType:
      source.walletType ??
      source.WalletType ??
      null,

    availableBalance:
      Number(
        source.availableBalance ??
          source.AvailableBalance ??
          0,
      ) || 0,

    holdBalance:
      Number(
        source.holdBalance ??
          source.HoldBalance ??
          0,
      ) || 0,

    purpose:
      source.purpose ??
      source.Purpose ??
      null,
  };
};

const normalizeWithdrawalQuota = (
  response,
) => {
  const source =
    response?.data ??
    response ??
    {};

  return {
    minimumWithdrawalAmount:
      Number(
        source.minimumWithdrawalAmount ??
          source.MinimumWithdrawalAmount ??
          0,
      ) || 0,

    maximumWithdrawalAmount:
      Number(
        source.maximumWithdrawalAmount ??
          source.MaximumWithdrawalAmount ??
          0,
      ) || 0,

    dailyWithdrawalLimit:
      Number(
        source.dailyWithdrawalLimit ??
          source.DailyWithdrawalLimit ??
          0,
      ) || 0,

    completedTodayAmount:
      Number(
        source.completedTodayAmount ??
          source.CompletedTodayAmount ??
          0,
      ) || 0,

    activeReservedAmount:
      Number(
        source.activeReservedAmount ??
          source.ActiveReservedAmount ??
          0,
      ) || 0,

    usedDailyLimitAmount:
      Number(
        source.usedDailyLimitAmount ??
          source.UsedDailyLimitAmount ??
          0,
      ) || 0,

    remainingDailyLimitAmount:
      Number(
        source.remainingDailyLimitAmount ??
          source.RemainingDailyLimitAmount ??
          0,
      ) || 0,

    resetAt:
      source.resetAt ??
      source.ResetAt ??
      null,
  };
};
export const walletApi = {
  getMine: async ({
    signal,
    skipGlobalErrorPage = false,
  } = {}) => {
    const response =
      await axiosClient.get(
        "/wallet/me",
        { signal, skipGlobalErrorPage },
      );

    const wallet =
      normalizeWallet(
        response,
      );

    if (!wallet?.walletId) {
      throw new Error(
        "Response ví người dùng không hợp lệ.",
      );
    }

    return wallet;
  },

  getLedger: async ({
    pageNumber = 1,
    pageSize = 10,
    direction,
    balanceType,
    fromDate,
    toDate,
    signal,
  } = {}) => {
    const normalizedPage =
      normalizePositiveInteger(
        pageNumber,
        1,
      );

    const normalizedPageSize =
      Math.min(
        100,
        normalizePositiveInteger(
          pageSize,
          10,
        ),
      );

    const params = {
      PageNumber:
        normalizedPage,

      PageSize:
        normalizedPageSize,
    };

    if (
      direction !== undefined &&
      direction !== null &&
      direction !== ""
    ) {
      params.Direction =
        direction;
    }

    if (
      balanceType !== undefined &&
      balanceType !== null &&
      balanceType !== ""
    ) {
      params.BalanceType =
        balanceType;
    }

    if (fromDate) {
      params.FromDate =
        fromDate;
    }

    if (toDate) {
      params.ToDate =
        toDate;
    }

    const response =
      await axiosClient.get(
        "/wallet/me/ledger",
        {
          params,
          signal,
        },
      );

    return normalizePagedResponse(
      response,
      normalizedPage,
      normalizedPageSize,
    );
  },

  getWithdrawalQuota: async ({
    signal,
    skipGlobalErrorPage = false,
  } = {}) => {
    const response =
      await axiosClient.get(
        "/wallet/withdrawals/quota",
        {
          signal,
          skipGlobalErrorPage,
        },
      );

    return normalizeWithdrawalQuota(
      response,
    );
  },
  createWithdrawal:
    async (amount) => {
      const normalizedAmount =
        Number(amount);

      if (
        !Number.isInteger(
          normalizedAmount,
        ) ||
        normalizedAmount <= 0
      ) {
        throw new Error(
          "Số tiền rút phải là số nguyên lớn hơn 0.",
        );
      }

      const response =
        await axiosClient.post(
          "/wallet/withdrawals",
          {
            amount:
              normalizedAmount,
          },
        );

      const source =
        response?.data ??
        response ??
        {};

      const withdrawalId =
        String(
          source.withdrawalId ??
            source.WithdrawalId ??
            "",
        ).trim();

      if (!withdrawalId) {
        throw new Error(
          "Response tạo yêu cầu rút tiền không hợp lệ.",
        );
      }

      return {
        withdrawalId,
      };
    },

  getWithdrawals: async ({
    pageNumber = 1,
    pageSize = 10,
    status,
    fromDate,
    toDate,
    signal,
  } = {}) => {
    const normalizedPage =
      normalizePositiveInteger(
        pageNumber,
        1,
      );

    const normalizedPageSize =
      Math.min(
        100,
        normalizePositiveInteger(
          pageSize,
          10,
        ),
      );

    const params = {
      PageNumber:
        normalizedPage,

      PageSize:
        normalizedPageSize,
    };

    if (
      status !== undefined &&
      status !== null &&
      status !== ""
    ) {
      params.Status = status;
    }

    if (fromDate) {
      params.FromDate =
        fromDate;
    }

    if (toDate) {
      params.ToDate =
        toDate;
    }

    const response =
      await axiosClient.get(
        "/wallet/withdrawals",
        {
          params,
          signal,
        },
      );

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
    const id =
      String(
        withdrawalId || "",
      ).trim();

    if (!id) {
      throw new Error(
        "Không tìm thấy mã yêu cầu rút tiền.",
      );
    }

    const response =
      await axiosClient.get(
        `/wallet/withdrawals/${encodeURIComponent(
          id,
        )}`,
        { signal },
      );

    const source =
      response?.data ??
      response ??
      {};

    const responseWithdrawalId =
      String(
        source.withdrawalId ??
          source.WithdrawalId ??
          "",
      ).trim();

    if (!responseWithdrawalId) {
      throw new Error(
        "Response chi tiết yêu cầu rút tiền không hợp lệ.",
      );
    }

    return source;
  },

};

export default walletApi;
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import walletApi from "../../services/apis/walletApi";
import {
  getSafeProblemDetail,
  getSafeValidationMessage,
} from "../../utils/safeErrorMessage";

const PAGE_SIZE = 10;

const getErrorCode = (
  error,
) =>
  String(
    error?.response?.data
      ?.error?.code ??
      error?.response?.data
        ?.code ??
      error?.code ??
      "",
  ).trim();

const getErrorMessage = (
  error,
  fallback,
) => {
  const responseData =
    error?.response?.data;

  return (
    getSafeValidationMessage(
      responseData?.errors,
    ) ||
    getSafeProblemDetail(
      responseData?.error?.message,
    ) ||
    getSafeProblemDetail(
      responseData?.message,
    ) ||
    getSafeProblemDetail(
      responseData?.detail,
    ) ||
    getSafeProblemDetail(
      error?.message,
    ) ||
    fallback
  );
};

const isRequestCancelled = (
  error,
) =>
  error?.name ===
    "CanceledError" ||
  error?.code ===
    "ERR_CANCELED";

const normalizeEnum = (
  value,
) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

const isIncoming = (
  value,
) => {
  const normalized =
    normalizeEnum(value);

  return (
    normalized === "0" ||
    normalized === "in"
  );
};

const getBalanceLabel = (
  value,
) => {
  const normalized =
    normalizeEnum(value);

  return (
    normalized === "1" ||
    normalized === "hold"
  )
    ? "Tiền đang giữ"
    : "Số dư khả dụng";
};

const formatCurrency = (
  value,
) =>
  new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    },
  ).format(
    Number(value || 0),
  );

const formatDateTime = (
  value,
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
};

const WITHDRAWAL_STATUS_LABELS = {
  Pending: "Chờ xử lý",
  Approved: "Đã duyệt",
  Processing: "Đang xử lý",
  Completed: "Hoàn tất",
  Rejected: "Đã từ chối",
  Failed: "Thất bại",
};

const getWithdrawalStatusLabel = (
  value,
) => {
  const key =
    String(value ?? "").trim();

  return (
    WITHDRAWAL_STATUS_LABELS[key] ||
    "Không xác định"
  );
};

const WITHDRAWAL_EVENT_TYPE_LABELS = {
  Withdrawal_Lock:
    "Khóa tiền cho yêu cầu rút",
  Withdrawal_Success:
    "Rút tiền thành công",
  Withdrawal_Revert:
    "Hoàn tiền về số dư khả dụng",
};

const getWithdrawalEventTypeLabel = (
  value,
) => {
  const key =
    String(value ?? "").trim();

  return (
    WITHDRAWAL_EVENT_TYPE_LABELS[
      key
    ] || "Diễn biến giao dịch"
  );
};

const WALLET_TRANSACTION_STATUS_LABELS = {
  Pending: "Đang chờ",
  Completed: "Hoàn tất",
  Failed: "Thất bại",
  Cancelled: "Đã hủy",
};

const getWalletTransactionStatusLabel = (
  value,
) => {
  const key =
    String(value ?? "").trim();

  return (
    WALLET_TRANSACTION_STATUS_LABELS[
      key
    ] || "Không xác định"
  );
};

const BANK_VERIFY_STATUS_LABELS = {
  Verified: "Đã xác thực",
  Unverified: "Chưa xác thực",
  Pending: "Đang xác thực",
  Rejected: "Bị từ chối",
};

const getBankVerifyStatusLabel = (
  value,
) => {
  const key =
    String(value ?? "").trim();

  return (
    BANK_VERIFY_STATUS_LABELS[
      key
    ] || "Không xác định"
  );
};

const maskBankAccountNumber = (
  value,
) => {
  const digits = String(
    value ?? "",
  ).trim();

  if (!digits) {
    return "";
  }

  if (digits.length <= 6) {
    return "•".repeat(
      digits.length,
    );
  }

  const first = digits.slice(0, 3);
  const last = digits.slice(-3);

  return (
    first +
    "•".repeat(
      digits.length - 6,
    ) +
    last
  );
};

const WalletPage = () => {
  const location = useLocation();

  const [
    wallet,
    setWallet,
  ] = useState(null);
  const [
    withdrawalQuota,
    setWithdrawalQuota,
  ] = useState(null);

  const [
    ledgerState,
    setLedgerState,
  ] = useState({
    items: [],
    pageNumber: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    notice,
    setNotice,
  ] = useState("");

  const [
    withdrawalAmount,
    setWithdrawalAmount,
  ] = useState("");

  const [
    amountError,
    setAmountError,
  ] = useState("");

  const [
    withdrawing,
    setWithdrawing,
  ] = useState(false);



  const [
    withdrawalHistoryState,
    setWithdrawalHistoryState,
  ] = useState({
    items: [],
    pageNumber: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [
    withdrawalHistoryLoading,
    setWithdrawalHistoryLoading,
  ] = useState(true);

  const [
    withdrawalHistoryError,
    setWithdrawalHistoryError,
  ] = useState("");

  const [
    selectedWithdrawalId,
    setSelectedWithdrawalId,
  ] = useState("");

  const [
    withdrawalDetailState,
    setWithdrawalDetailState,
  ] = useState({
    withdrawalId: "",
    loading: false,
    data: null,
    error: "",
  });

  const [
    isBankAccountRevealed,
    setIsBankAccountRevealed,
  ] = useState(false);

  const detailRequestRef =
    useRef(0);

  const detailControllerRef =
    useRef(null);

  const handledNotificationLocationRef =
    useRef("");

  const availableBalance =
    Number(
      wallet?.availableBalance ??
        0,
    );

  const holdBalance =
    Number(
      wallet?.holdBalance ??
        0,
    );

  const parsedWithdrawalAmount =
    useMemo(
      () =>
        Number(
          String(
            withdrawalAmount,
          ).replace(
            /[^0-9]/g,
            "",
          ),
        ),
      [withdrawalAmount],
    );

  const loadPage =
    useCallback(
      async (
        pageNumber = 1,
        {
          signal,
          silent = false,
        } = {},
      ) => {
        if (!silent) {
          setLoading(true);
        }

        setError("");

        try {
          const [
            nextWallet,
            nextLedger,
            nextQuota,
          ] =
            await Promise.all([
              walletApi
                .getMine({
                  signal,
                }),

              walletApi
                .getLedger({
                  pageNumber,
                  pageSize:
                    PAGE_SIZE,
                  signal,
                }),
              walletApi
                .getWithdrawalQuota({
                  signal,
                  skipGlobalErrorPage: true,
                })
                .catch(() => null),
            ]);

          setWallet(
            nextWallet,
          );

          setLedgerState(
            nextLedger,
          );

          setWithdrawalQuota(
            nextQuota,
          );
        } catch (requestError) {
          if (
            !isRequestCancelled(
              requestError,
            )
          ) {
            setError(
              getErrorMessage(
                requestError,
                "Không thể tải thông tin ví lúc này.",
              ),
            );
          }
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        () => {
          void loadPage(
            1,
            {
              signal:
                controller.signal,
            },
          );
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );

      controller.abort();
    };
  }, [loadPage]);

  const loadWithdrawalHistory =
    useCallback(
      async (
        pageNumber = 1,
        {
          signal,
          silent = false,
        } = {},
      ) => {
        if (!silent) {
          setWithdrawalHistoryLoading(
            true,
          );
        }

        setWithdrawalHistoryError(
          "",
        );

        try {
          const nextHistory =
            await walletApi
              .getWithdrawals({
                pageNumber,
                pageSize:
                  PAGE_SIZE,
                signal,
              });

          setWithdrawalHistoryState(
            nextHistory,
          );
        } catch (requestError) {
          if (
            !isRequestCancelled(
              requestError,
            )
          ) {
            setWithdrawalHistoryError(
              "Không thể tải lịch sử rút tiền. Vui lòng thử lại.",
            );
          }
        } finally {
          if (!signal?.aborted) {
            setWithdrawalHistoryLoading(
              false,
            );
          }
        }
      },
      [],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        () => {
          void loadWithdrawalHistory(
            1,
            {
              signal:
                controller.signal,
            },
          );
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );

      controller.abort();
    };
  }, [loadWithdrawalHistory]);

  const loadWithdrawalDetail = useCallback((
    withdrawalId,
  ) => {
    detailControllerRef.current?.abort();

    const controller =
      new AbortController();

    detailControllerRef.current =
      controller;

    const requestId =
      detailRequestRef.current + 1;

    detailRequestRef.current =
      requestId;

    setWithdrawalDetailState({
      withdrawalId,
      loading: true,
      data: null,
      error: "",
    });

    walletApi
      .getWithdrawalById(
        withdrawalId,
        {
          signal:
            controller.signal,
        },
      )
      .then((data) => {
        if (
          detailRequestRef.current !==
          requestId
        ) {
          return;
        }

        setWithdrawalDetailState({
          withdrawalId,
          loading: false,
          data,
          error: "",
        });
      })
      .catch((requestError) => {
        if (
          detailRequestRef.current !==
          requestId
        ) {
          return;
        }

        if (
          isRequestCancelled(
            requestError,
          )
        ) {
          return;
        }

        setWithdrawalDetailState({
          withdrawalId,
          loading: false,
          data: null,
          error:
            "Không thể tải chi tiết yêu cầu rút tiền. Vui lòng thử lại.",
        });
      });
  }, []);

  const openWithdrawalDetail = useCallback((
    withdrawalId,
  ) => {
    const id = String(
      withdrawalId || "",
    ).trim();

    if (!id) {
      return;
    }

    if (
      selectedWithdrawalId === id &&
      withdrawalDetailState.loading
    ) {
      return;
    }

    setSelectedWithdrawalId(id);
    setIsBankAccountRevealed(false);
    loadWithdrawalDetail(id);
  }, [
    loadWithdrawalDetail,
    selectedWithdrawalId,
    withdrawalDetailState.loading,
  ]);

  useEffect(() => {
    const withdrawalId = String(
      location.state?.notificationWithdrawalId || "",
    ).trim();

    if (
      !withdrawalId ||
      handledNotificationLocationRef.current === location.key
    ) {
      return;
    }

    handledNotificationLocationRef.current = location.key;
    openWithdrawalDetail(withdrawalId);
  }, [location.key, location.state, openWithdrawalDetail]);

  const closeWithdrawalDetail = () => {
    detailControllerRef.current?.abort();

    setSelectedWithdrawalId("");
    setIsBankAccountRevealed(false);

    setWithdrawalDetailState({
      withdrawalId: "",
      loading: false,
      data: null,
      error: "",
    });
  };

  useEffect(() => {
    if (!selectedWithdrawalId) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event,
    ) => {
      if (event.key === "Escape") {
        closeWithdrawalDetail();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [selectedWithdrawalId]);

  const validateWithdrawal =
    () => {
      setAmountError("");
      setError("");
      setNotice("");

      if (
        !Number.isInteger(
          parsedWithdrawalAmount,
        ) ||
        parsedWithdrawalAmount <= 0
      ) {
        setAmountError(
          "Số tiền rút phải là số nguyên lớn hơn 0.",
        );

        return false;
      }

      if (
        parsedWithdrawalAmount >
        availableBalance
      ) {
        setAmountError(
          "Số tiền rút vượt quá số dư khả dụng.",
        );

        return false;
      }
      if (withdrawalQuota) {
        const minimum =
          Number(
            withdrawalQuota
              .minimumWithdrawalAmount ||
              0,
          );

        const maximum =
          Number(
            withdrawalQuota
              .maximumWithdrawalAmount ||
              0,
          );

        const dailyLimit =
          Number(
            withdrawalQuota
              .dailyWithdrawalLimit ||
              0,
          );

        const remainingDaily =
          Number(
            withdrawalQuota
              .remainingDailyLimitAmount ||
              0,
          );

        if (
          minimum > 0 &&
          parsedWithdrawalAmount <
            minimum
        ) {
          setAmountError(
            `Số tiền rút tối thiểu là ${formatCurrency(
              minimum,
            )}.`,
          );

          return false;
        }

        if (
          maximum > 0 &&
          parsedWithdrawalAmount >
            maximum
        ) {
          setAmountError(
            `Số tiền rút tối đa mỗi lần là ${formatCurrency(
              maximum,
            )}.`,
          );

          return false;
        }

        if (
          dailyLimit > 0 &&
          parsedWithdrawalAmount >
            remainingDaily
        ) {
          setAmountError(
            `Hạn mức rút còn lại hôm nay là ${formatCurrency(
              remainingDaily,
            )}.`,
          );

          return false;
        }

        const dailyCountLimit =
          withdrawalQuota.dailyWithdrawalCountLimit;

        const remainingDailyCount =
          withdrawalQuota.remainingDailyWithdrawalCount;

        if (
          dailyCountLimit != null &&
          dailyCountLimit > 0 &&
          remainingDailyCount != null &&
          remainingDailyCount <= 0
        ) {
          setAmountError(
            "Bạn đã sử dụng hết lượt rút tiền trong ngày.",
          );

          return false;
        }
      }

      return true;
    };

  const createWithdrawal =
    async () => {
      if (
        !validateWithdrawal()
      ) {
        return;
      }

      setWithdrawing(true);
      setError("");
      setNotice("");

      try {
        await walletApi
          .createWithdrawal(
            parsedWithdrawalAmount,
          );


        setWithdrawalAmount(
          "",
        );

        setNotice(
          "Đã tạo yêu cầu rút tiền. Số tiền đã được chuyển sang trạng thái đang giữ để chờ xử lý.",
        );

        await loadPage(
          1,
          {
            silent: true,
          },
        );

        await loadWithdrawalHistory(
          1,
          {
            silent: true,
          },
        );
      } catch (requestError) {
        const code =
          getErrorCode(
            requestError,
          );

        const messageByCode = {
          "Withdrawal.BankAccountNotVerified":
            "Tài khoản ngân hàng chưa được xác thực nên chưa thể rút tiền.",

          "Wallet.InsufficientBalance":
            "Số dư khả dụng không đủ để rút số tiền này.",

          "Withdrawal.InvalidRequest":
            "Số tiền rút chưa hợp lệ.",

          "Withdrawal.BelowMinimum":
            "Số tiền rút thấp hơn mức tối thiểu cho phép.",

          "Withdrawal.AboveMaximum":
            "Số tiền rút vượt quá mức tối đa cho mỗi yêu cầu.",

          "Withdrawal.DailyLimitExceeded":
            "Bạn đã vượt quá hạn mức rút tiền trong ngày.",

          "Withdrawal.DailyCountLimitExceeded":
            "Bạn đã sử dụng hết lượt rút tiền trong ngày.",
        };

        setError(
          messageByCode[
            code
          ] ||
            getErrorMessage(
              requestError,
              "Không thể tạo yêu cầu rút tiền.",
            ),
        );

        if (
          code ===
            "Withdrawal.DailyLimitExceeded" ||
          code ===
            "Withdrawal.DailyCountLimitExceeded"
        ) {
          try {
            const nextQuota =
              await walletApi
                .getWithdrawalQuota({
                  skipGlobalErrorPage: true,
                });

            setWithdrawalQuota(
              nextQuota,
            );
          } catch {
            // Giữ nguyên lỗi tạo yêu cầu rút tiền ở trên nếu làm mới hạn mức thất bại.
          }
        }
      } finally {
        setWithdrawing(false);
      }
    };


  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_50px_rgba(23,40,48,0.14)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">
          HomeCycle
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Ví HomeCycle
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
          Theo dõi số dư khả dụng, tiền đang giữ và các biến động của ví giao dịch.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          aria-live="polite"
          className="mt-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success"
        >
          {notice}
        </div>
      )}

      {loading && !wallet ? (
        <div className="mt-6 rounded-2xl border border-border bg-white px-5 py-14 text-center text-sm font-bold text-textLight">
          Đang tải thông tin ví...
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                Số dư khả dụng
              </p>

              <p className="mt-3 text-3xl font-black text-text">
                {formatCurrency(
                  availableBalance,
                )}
              </p>

              <p className="mt-2 text-sm leading-6 text-textLight">
                Khoản tiền hiện có thể sử dụng cho các giao dịch được hỗ trợ.
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-warning">
                Đang giữ
              </p>

              <p className="mt-3 text-3xl font-black text-text">
                {formatCurrency(
                  holdBalance,
                )}
              </p>

              <p className="mt-2 text-sm leading-6 text-textLight">
                Tiền đang được giữ trong quá trình xử lý giao dịch hoặc yêu cầu rút tiền.
              </p>
            </article>
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Rút tiền
            </p>

            <h2 className="mt-1 text-xl font-black text-text">
              Yêu cầu chuyển tiền về ngân hàng
            </h2>

            <p className="mt-2 text-sm leading-6 text-textLight">
              Khi tạo yêu cầu, số tiền tương ứng sẽ được khóa khỏi số dư khả dụng và chuyển sang phần đang giữ trong lúc chờ xử lý.
            </p>

            {withdrawalQuota && (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold text-textLight">
                      Tối thiểu
                    </p>
                    <p className="mt-1 font-black text-text">
                      {formatCurrency(
                        withdrawalQuota.minimumWithdrawalAmount,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-textLight">
                      Tối đa mỗi lần
                    </p>
                    <p className="mt-1 font-black text-text">
                      {formatCurrency(
                        withdrawalQuota.maximumWithdrawalAmount,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-textLight">
                      Còn lại hôm nay
                    </p>
                    <p className="mt-1 font-black text-primary">
                      {formatCurrency(
                        withdrawalQuota.remainingDailyLimitAmount,
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs font-semibold text-textLight">
                  Đã sử dụng hạn mức ngày:{" "}
                  {formatCurrency(
                    withdrawalQuota.usedDailyLimitAmount,
                  )}{" "}
                  /{" "}
                  {formatCurrency(
                    withdrawalQuota.dailyWithdrawalLimit,
                  )}
                </p>

                {withdrawalQuota.dailyWithdrawalCountLimit !=
                  null && (
                  <p className="mt-2 text-xs font-semibold text-textLight">
                    Số lượt rút hôm nay: đã dùng{" "}
                    {withdrawalQuota.usedDailyWithdrawalCount ??
                      "—"}{" "}
                    / {withdrawalQuota.dailyWithdrawalCountLimit}{" "}
                    lượt · còn lại{" "}
                    {withdrawalQuota.remainingDailyWithdrawalCount ??
                      "—"}{" "}
                    lượt
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="text-sm font-bold text-text">
                Số tiền muốn rút

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    withdrawalAmount
                  }
                  onChange={(
                    event,
                  ) => {
                    setWithdrawalAmount(
                      event.target.value
                        .replace(
                          /[^0-9]/g,
                          "",
                        ),
                    );

                    setAmountError(
                      "",
                    );

                    setError("");
                    setNotice("");
                  }}
                  placeholder="VD: 100000"
                  disabled={
                    withdrawing
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {amountError && (
                  <span className="mt-1.5 block text-xs font-semibold text-error">
                    {amountError}
                  </span>
                )}

                {withdrawalAmount && (
                  <span className="mt-1.5 block text-xs font-semibold text-textLight">
                    Sẽ yêu cầu rút:{" "}
                    {formatCurrency(
                      parsedWithdrawalAmount,
                    )}
                  </span>
                )}
              </label>

              <button
                type="button"
                onClick={() => {
                  void createWithdrawal();
                }}
                disabled={
                  withdrawing
                }
                className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {withdrawing
                  ? "Đang gửi..."
                  : "Gửi yêu cầu rút tiền"}
              </button>
            </div>

          </section>

          <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  Sao kê ví
                </p>

                <h2 className="mt-1 text-xl font-black text-text">
                  Biến động số dư
                </h2>

                <p className="mt-1 text-sm text-textLight">
                  {ledgerState.totalCount} biến động được ghi nhận.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadPage(
                    ledgerState.pageNumber,
                  );
                }}
                disabled={
                  loading
                }
                className="rounded-lg border border-primary bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-primary/10 disabled:opacity-50"
              >
                Làm mới
              </button>
            </div>

            {ledgerState.items.length === 0 ? (
              <div className="mt-5 rounded-xl border border-border bg-background px-4 py-10 text-center">
                <span className="material-symbols-outlined text-4xl text-textLight">
                  receipt_long
                </span>

                <p className="mt-2 text-sm font-black text-text">
                  Chưa có biến động ví
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-border">
                {ledgerState.items.map(
                  (item) => {
                    const incoming =
                      isIncoming(
                        item
                          ?.direction ??
                          item
                            ?.Direction,
                      );


                    const ledgerId =
                      item
                        ?.ledgerId ??
                      item
                        ?.LedgerId;

                    return (
                      <article
                        key={
                          ledgerId ||
                          `${item?.createdAt ?? item?.CreatedAt ?? "ledger"}-${item?.amount ?? item?.Amount ?? 0}-${item?.balanceAfter ?? item?.BalanceAfter ?? 0}`
                        }
                        className="border-b border-border bg-white p-4 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={[
                              "material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                              incoming
                                ? "bg-success/10 text-success"
                                : "bg-error/10 text-error",
                            ].join(
                              " ",
                            )}
                            aria-hidden="true"
                          >
                            {incoming
                              ? "south"
                              : "north"}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-text">
                                  {item
                                    ?.description ??
                                    item
                                      ?.Description ??
                                    "Biến động số dư"}
                                </p>

                                <p className="mt-1 text-xs text-textLight">
                                  {getBalanceLabel(
                                    item
                                      ?.balanceType ??
                                      item
                                        ?.BalanceType,
                                  )}{" "}
                                  ·{" "}
                                  {formatDateTime(
                                    item
                                      ?.createdAt ??
                                      item
                                        ?.CreatedAt,
                                  )}
                                </p>
                              </div>

                              <p
                                className={[
                                  "shrink-0 text-base font-black",
                                  incoming
                                    ? "text-success"
                                    : "text-error",
                                ].join(
                                  " ",
                                )}
                              >
                                {incoming
                                  ? "+"
                                  : "-"}
                                {formatCurrency(
                                  item
                                    ?.amount ??
                                    item
                                      ?.Amount,
                                )}
                              </p>
                            </div>

                            <p className="mt-2 text-xs font-semibold text-textLight">
                              {formatCurrency(
                                item
                                  ?.balanceBefore ??
                                  item
                                    ?.BalanceBefore,
                              )}{" "}
                              →{" "}
                              {formatCurrency(
                                item
                                  ?.balanceAfter ??
                                  item
                                    ?.BalanceAfter,
                              )}
                            </p>

                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}

            {ledgerState.totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void loadPage(
                      ledgerState.pageNumber -
                        1,
                    );
                  }}
                  disabled={
                    loading ||
                    !ledgerState
                      .hasPreviousPage
                  }
                  className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:opacity-40"
                >
                  ← Trước
                </button>

                <span className="text-xs font-bold text-textLight">
                  Trang{" "}
                  {
                    ledgerState.pageNumber
                  }
                  /
                  {
                    ledgerState.totalPages
                  }
                </span>

                <button
                  type="button"
                  onClick={() => {
                    void loadPage(
                      ledgerState.pageNumber +
                        1,
                    );
                  }}
                  disabled={
                    loading ||
                    !ledgerState
                      .hasNextPage
                  }
                  className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:opacity-40"
                >
                  Sau →
                </button>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  Yêu cầu rút tiền
                </p>

                <h2 className="mt-1 text-xl font-black text-text">
                  Lịch sử yêu cầu rút tiền
                </h2>

                <p className="mt-1 text-sm text-textLight">
                  {withdrawalHistoryState.totalCount} yêu cầu được ghi nhận.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadWithdrawalHistory(
                    withdrawalHistoryState.pageNumber,
                  );
                }}
                disabled={
                  withdrawalHistoryLoading
                }
                className="rounded-lg border border-primary bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-primary/10 disabled:opacity-50"
              >
                Làm mới
              </button>
            </div>

            {withdrawalHistoryError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
              >
                {withdrawalHistoryError}
              </div>
            )}

            {withdrawalHistoryLoading &&
            withdrawalHistoryState.items.length ===
              0 &&
            !withdrawalHistoryError ? (
              <div className="mt-5 rounded-xl border border-border bg-background px-4 py-10 text-center text-sm font-bold text-textLight">
                Đang tải lịch sử rút tiền...
              </div>
            ) : (
              <>
                {!withdrawalHistoryError &&
                  withdrawalHistoryState.items
                    .length === 0 && (
                    <div className="mt-5 rounded-xl border border-border bg-background px-4 py-10 text-center">
                      <span className="material-symbols-outlined text-4xl text-textLight">
                        account_balance_wallet
                      </span>

                      <p className="mt-2 text-sm font-black text-text">
                        Chưa có yêu cầu rút tiền.
                      </p>
                    </div>
                  )}

                {withdrawalHistoryState.items
                  .length > 0 && (
                  <div className="mt-5 overflow-hidden rounded-xl border border-border">
                    {withdrawalHistoryState.items.map(
                      (item) => {
                        const withdrawalId =
                          item
                            ?.withdrawalId ??
                          item
                            ?.WithdrawalId;

                        const status =
                          item?.status ??
                          item?.Status;

                        const rejectReason =
                          String(
                            item
                              ?.rejectReason ??
                              item
                                ?.RejectReason ??
                              "",
                          ).trim();

                        const processedAt =
                          item
                            ?.processedAt ??
                          item
                            ?.ProcessedAt;

                        return (
                          <article
                            key={
                              withdrawalId ||
                              `${item?.requestedAt}-${item?.amount}`
                            }
                            className="border-b border-border bg-white p-4 last:border-b-0"
                          >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-text">
                                  {formatCurrency(
                                    item
                                      ?.amount ??
                                      item
                                        ?.Amount,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-textLight">
                                  {item
                                    ?.bankName ??
                                    item
                                      ?.BankName ??
                                    "Ngân hàng chưa xác định"}
                                  {" · "}
                                  {item
                                    ?.maskedAccountNumber ??
                                    item
                                      ?.MaskedAccountNumber ??
                                    "—"}
                                </p>
                              </div>

                              <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-xs font-black text-text">
                                {getWithdrawalStatusLabel(
                                  status,
                                )}
                              </span>
                            </div>

                            <p className="mt-2 text-xs font-semibold text-textLight">
                              Yêu cầu lúc{" "}
                              {formatDateTime(
                                item
                                  ?.requestedAt ??
                                  item
                                    ?.RequestedAt,
                              )}

                              {processedAt && (
                                <>
                                  {" "}
                                  · Xử lý lúc{" "}
                                  {formatDateTime(
                                    processedAt,
                                  )}
                                </>
                              )}
                            </p>

                            {rejectReason && (
                              <p className="mt-2 text-xs font-semibold text-error">
                                Lý do: {rejectReason}
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                openWithdrawalDetail(
                                  withdrawalId,
                                );
                              }}
                              className="mt-3 rounded-lg border border-primary bg-white px-3 py-1.5 text-xs font-black text-primary transition hover:bg-primary/10"
                            >
                              Xem chi tiết
                            </button>
                          </article>
                        );
                      },
                    )}
                  </div>
                )}
              </>
            )}

            {withdrawalHistoryState.totalPages >
              1 && (
              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void loadWithdrawalHistory(
                      withdrawalHistoryState.pageNumber -
                        1,
                    );
                  }}
                  disabled={
                    withdrawalHistoryLoading ||
                    !withdrawalHistoryState.hasPreviousPage
                  }
                  className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:opacity-40"
                >
                  ← Trước
                </button>

                <span className="text-xs font-bold text-textLight">
                  Trang{" "}
                  {
                    withdrawalHistoryState.pageNumber
                  }
                  /
                  {
                    withdrawalHistoryState.totalPages
                  }
                </span>

                <button
                  type="button"
                  onClick={() => {
                    void loadWithdrawalHistory(
                      withdrawalHistoryState.pageNumber +
                        1,
                    );
                  }}
                  disabled={
                    withdrawalHistoryLoading ||
                    !withdrawalHistoryState.hasNextPage
                  }
                  className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:opacity-40"
                >
                  Sau →
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {selectedWithdrawalId && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeWithdrawalDetail();
            }
          }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/70 p-4 backdrop-blur-sm"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdrawal-detail-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-white shadow-[0_28px_80px_rgba(23,40,48,0.28)]"
          >
            <header className="relative overflow-hidden bg-primary px-6 py-5 text-white">
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                    Yêu cầu rút tiền
                  </p>

                  <h2
                    id="withdrawal-detail-title"
                    className="mt-1 text-xl font-black"
                  >
                    Chi tiết yêu cầu rút tiền
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeWithdrawalDetail
                  }
                  aria-label="Đóng cửa sổ"
                  className="rounded-lg px-2 py-1 text-2xl leading-none text-white/70 transition hover:bg-white/10"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="space-y-5 px-6 py-5">
              {withdrawalDetailState.loading && (
                <div
                  role="status"
                  className="rounded-xl border border-border bg-background p-5 text-center text-sm font-semibold text-textLight"
                >
                  Đang tải chi tiết yêu cầu rút tiền...
                </div>
              )}

              {!withdrawalDetailState.loading &&
                withdrawalDetailState.error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error"
                  >
                    {
                      withdrawalDetailState.error
                    }
                  </div>
                )}

              {!withdrawalDetailState.loading &&
                !withdrawalDetailState.error &&
                withdrawalDetailState.data &&
                (() => {
                  const detail =
                    withdrawalDetailState.data;

                  const bankAccount =
                    detail.bankAccount ??
                    detail.BankAccount ??
                    {};

                  const financialEvents =
                    Array.isArray(
                      detail.financialEvents ??
                        detail.FinancialEvents,
                    )
                      ? detail.financialEvents ??
                        detail.FinancialEvents
                      : [];

                  const rawAccountNumber =
                    String(
                      bankAccount.accountNumber ??
                        bankAccount.AccountNumber ??
                        "",
                    ).trim();

                  const isAccountNumberNumeric =
                    /^[0-9]+$/.test(
                      rawAccountNumber,
                    );

                  const canRevealAccountNumber =
                    isAccountNumberNumeric &&
                    rawAccountNumber.length >
                      6;

                  const maskedDisplay =
                    isAccountNumberNumeric
                      ? maskBankAccountNumber(
                          rawAccountNumber,
                        )
                      : rawAccountNumber;

                  const displayedAccountNumber =
                    canRevealAccountNumber &&
                    isBankAccountRevealed
                      ? rawAccountNumber
                      : maskedDisplay ||
                        "—";

                  const bankCode =
                    String(
                      bankAccount.bankCode ??
                        bankAccount.BankCode ??
                        "",
                    ).trim();

                  const rejectReason =
                    String(
                      detail.rejectReason ??
                        detail.RejectReason ??
                        "",
                    ).trim();

                  const processedAt =
                    detail.processedAt ??
                    detail.ProcessedAt;

                  return (
                    <>
                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-textLight">
                              Số tiền
                            </p>

                            <p className="mt-1 text-xl font-black text-text">
                              {formatCurrency(
                                detail.amount ??
                                  detail.Amount,
                              )}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-text">
                            {getWithdrawalStatusLabel(
                              detail.status ??
                                detail.Status,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-textLight">
                          <span>
                            Yêu cầu lúc{" "}
                            {formatDateTime(
                              detail.requestedAt ??
                                detail.RequestedAt,
                            )}
                          </span>

                          {processedAt && (
                            <span>
                              Xử lý lúc{" "}
                              {formatDateTime(
                                processedAt,
                              )}
                            </span>
                          )}
                        </div>

                        {rejectReason && (
                          <p className="mt-3 text-xs font-semibold text-error">
                            Lý do: {rejectReason}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-primary">
                          Thông tin tài khoản ngân hàng
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase text-textLight">
                              Ngân hàng
                            </p>

                            <p className="mt-1 font-bold text-text">
                              {bankAccount.bankName ??
                                bankAccount.BankName ??
                                "—"}
                              {bankCode
                                ? ` (${bankCode})`
                                : ""}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-textLight">
                              Chủ tài khoản
                            </p>

                            <p className="mt-1 font-bold text-text">
                              {bankAccount.accountName ??
                                bankAccount.AccountName ??
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-textLight">
                              Số tài khoản
                            </p>

                            <div className="mt-1 flex items-center gap-2">
                              <p className="font-mono font-bold tracking-wide text-text">
                                {
                                  displayedAccountNumber
                                }
                              </p>

                              {canRevealAccountNumber && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsBankAccountRevealed(
                                      (
                                        current,
                                      ) =>
                                        !current,
                                    );
                                  }}
                                  aria-label={
                                    isBankAccountRevealed
                                      ? "Ẩn số tài khoản"
                                      : "Hiện số tài khoản"
                                  }
                                  className="material-symbols-outlined text-[18px] text-textLight transition hover:text-primary"
                                >
                                  {isBankAccountRevealed
                                    ? "visibility_off"
                                    : "visibility"}
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-textLight">
                              Trạng thái xác thực
                            </p>

                            <p className="mt-1 font-bold text-text">
                              {getBankVerifyStatusLabel(
                                bankAccount.verifyStatus ??
                                  bankAccount.VerifyStatus,
                              )}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-textLight">
                          Thông tin tài khoản ngân hàng được lấy từ tài khoản ngân hàng đang liên kết với yêu cầu rút tiền này.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-primary">
                          Diễn biến tài chính
                        </p>

                        {financialEvents.length ===
                        0 ? (
                          <p className="mt-2 text-sm text-textLight">
                            Chưa có diễn biến tài chính.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {financialEvents.map(
                              (
                                event,
                                index,
                              ) => {
                                const eventKey =
                                  event.walletTransactionId ??
                                  event.WalletTransactionId ??
                                  index;

                                return (
                                  <div
                                    key={
                                      eventKey
                                    }
                                    className="rounded-xl border border-border bg-white p-3"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <p className="text-sm font-bold text-text">
                                        {getWithdrawalEventTypeLabel(
                                          event.transactionType ??
                                            event.TransactionType,
                                        )}
                                      </p>

                                      <span className="text-sm font-black text-text">
                                        {formatCurrency(
                                          event.amount ??
                                            event.Amount,
                                        )}
                                      </span>
                                    </div>

                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-textLight">
                                      <span>
                                        {getWalletTransactionStatusLabel(
                                          event.status ??
                                            event.Status,
                                        )}
                                      </span>

                                      <span>
                                        {formatDateTime(
                                          event.createdAt ??
                                            event.CreatedAt,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
            </div>

            <footer className="flex justify-end gap-3 border-t border-border bg-background px-6 py-4">
              <button
                type="button"
                onClick={
                  closeWithdrawalDetail
                }
                className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10"
              >
                Đóng
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
};

export default WalletPage;

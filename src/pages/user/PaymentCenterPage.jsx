import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Link,
} from "react-router-dom";
import agreementApi from "../../services/apis/agreementApi";
import paymentApi from "../../services/apis/paymentApi";

const PENDING_PAGE_SIZE = 8;
const HISTORY_PAGE_SIZE = 20;

const getErrorMessage = (
  error,
  fallback,
) =>
  error?.response?.data
    ?.error?.message ||
  error?.response?.data
    ?.message ||
  error?.response?.data
    ?.detail ||
  fallback;

const isRequestCancelled = (
  error,
) =>
  error?.name ===
    "CanceledError" ||
  error?.code ===
    "ERR_CANCELED";

const formatCurrency = (
  value,
) => {
  const amount =
    Number(value);

  return Number.isFinite(amount)
    ? new Intl.NumberFormat(
        "vi-VN",
        {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        },
      ).format(amount)
    : "—";
};

const formatDateTime = (
  value,
) => {
  if (!value) {
    return "Chưa có";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Chưa có";
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

const normalizeEnum = (
  value,
) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

const getMethodLabel = (
  value,
) => {
  const normalized =
    normalizeEnum(value);

  if (
    normalized === "1" ||
    normalized === "payos"
  ) {
    return "PayOS";
  }

  if (
    normalized === "2" ||
    normalized ===
      "internalwallet" ||
    normalized === "wallet"
  ) {
    return "Ví HomeCycle";
  }

  return "Không xác định";
};

const getStatusMeta = (
  value,
) => {
  const normalized =
    normalizeEnum(value);

  if (
    normalized === "0" ||
    normalized === "pending"
  ) {
    return {
      label: "Đang chờ",
      className:
        "border-warning/30 bg-warning/10 text-warning",
    };
  }

  if (
    normalized === "1" ||
    normalized === "completed"
  ) {
    return {
      label: "Thành công",
      className:
        "border-success/30 bg-success/10 text-success",
    };
  }

  if (
    normalized === "2" ||
    normalized === "failed"
  ) {
    return {
      label: "Thất bại",
      className:
        "border-error/30 bg-error/10 text-error",
    };
  }

  if (
    normalized === "3" ||
    normalized === "refunded"
  ) {
    return {
      label: "Đã hoàn tiền",
      className:
        "border-primary/30 bg-primary/10 text-primary",
    };
  }

  if (
    normalized === "4" ||
    normalized ===
      "partiallyrefunded"
  ) {
    return {
      label:
        "Hoàn tiền một phần",
      className:
        "border-primary/30 bg-primary/10 text-primary",
    };
  }

  if (
    normalized === "5" ||
    normalized === "expired"
  ) {
    return {
      label: "Hết hạn",
      className:
        "border-error/30 bg-error/10 text-error",
    };
  }

  if (
    normalized === "6" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return {
      label: "Đã hủy",
      className:
        "border-error/30 bg-error/10 text-error",
    };
  }

  return {
    label: "Chưa xác định",
    className:
      "border-border bg-background text-textLight",
  };
};

const PaginationControls = ({
  pageNumber,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  busy,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() =>
          onPageChange(
            pageNumber - 1,
          )
        }
        disabled={
          busy ||
          !hasPreviousPage
        }
        className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Trước
      </button>

      <span className="text-xs font-bold text-textLight">
        Trang {pageNumber}/
        {totalPages}
      </span>

      <button
        type="button"
        onClick={() =>
          onPageChange(
            pageNumber + 1,
          )
        }
        disabled={
          busy ||
          !hasNextPage
        }
        className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sau →
      </button>
    </div>
  );
};

const PaymentCenterPage = () => {
  const [
    pendingState,
    setPendingState,
  ] = useState({
    items: [],
    pageNumber: 1,
    pageSize:
      PENDING_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [
    historyState,
    setHistoryState,
  ] = useState({
    items: [],
    pageNumber: 1,
    pageSize:
      HISTORY_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [
    pendingLoading,
    setPendingLoading,
  ] = useState(true);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [
    pendingError,
    setPendingError,
  ] = useState("");

  const [
    historyError,
    setHistoryError,
  ] = useState("");

  const loadPending =
    useCallback(
      async (
        pageNumber,
        {
          signal,
          silent = false,
        } = {},
      ) => {
        if (!silent) {
          setPendingLoading(
            true,
          );
        }

        setPendingError("");

        try {
          const result =
            await agreementApi
              .getPendingPayment({
                pageNumber,
                pageSize:
                  PENDING_PAGE_SIZE,
                signal,
              });

          setPendingState(
            result,
          );
        } catch (error) {
          if (
            !isRequestCancelled(
              error,
            )
          ) {
            setPendingError(
              getErrorMessage(
                error,
                "Không thể tải các thỏa thuận đang chờ thanh toán.",
              ),
            );
          }
        } finally {
          if (!signal?.aborted) {
            setPendingLoading(
              false,
            );
          }
        }
      },
      [],
    );

  const loadHistory =
    useCallback(
      async (
        pageNumber,
        {
          signal,
          silent = false,
        } = {},
      ) => {
        if (!silent) {
          setHistoryLoading(
            true,
          );
        }

        setHistoryError("");

        try {
          const result =
            await paymentApi
              .getHistory({
                pageNumber,
                pageSize:
                  HISTORY_PAGE_SIZE,
                signal,
              });

          setHistoryState(
            result,
          );
        } catch (error) {
          if (
            !isRequestCancelled(
              error,
            )
          ) {
            setHistoryError(
              getErrorMessage(
                error,
                "Không thể tải lịch sử thanh toán.",
              ),
            );
          }
        } finally {
          if (!signal?.aborted) {
            setHistoryLoading(
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
          void loadPending(
            1,
            {
              signal:
                controller.signal,
            },
          );

          void loadHistory(
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
  }, [
    loadHistory,
    loadPending,
  ]);

  const refreshAll = () => {
    void loadPending(
      pendingState.pageNumber,
    );

    void loadHistory(
      historyState.pageNumber,
    );
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_50px_rgba(23,40,48,0.14)] sm:flex sm:items-end sm:justify-between sm:gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">
            HomeCycle
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Trung tâm thanh toán
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            Theo dõi các thỏa thuận đang chờ thanh toán và lịch sử những khoản bạn đã thanh toán.
          </p>
        </div>

        <button
          type="button"
          onClick={
            refreshAll
          }
          disabled={
            pendingLoading ||
            historyLoading
          }
          className="mt-5 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-50 sm:mt-0"
        >
          Làm mới
        </button>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-warning">
              Cần xử lý
            </p>

            <h2 className="mt-1 text-xl font-black text-text">
              Chờ thanh toán
            </h2>

            <p className="mt-1 text-sm text-textLight">
              {pendingState.totalCount} thỏa thuận của bạn đang ở trạng thái chờ thanh toán.
            </p>
          </div>
        </div>

        {pendingError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
          >
            {pendingError}
          </div>
        )}

        {pendingLoading ? (
          <p className="mt-5 rounded-xl bg-background px-4 py-8 text-center text-sm font-bold text-textLight">
            Đang tải thỏa thuận chờ thanh toán...
          </p>
        ) : !pendingError &&
          pendingState.items
            .length === 0 ? (
          <div className="mt-5 rounded-xl border border-border bg-background px-4 py-8 text-center">
            <span className="material-symbols-outlined text-4xl text-textLight">
              task_alt
            </span>

            <p className="mt-2 text-sm font-black text-text">
              Không có thỏa thuận nào đang chờ thanh toán
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {pendingState.items.map(
              (item) => {
                const agreementId =
                  String(
                    item
                      ?.agreementId ||
                      "",
                  ).trim();

                const price =
                  item
                    ?.finalPrice ??
                  item
                    ?.initialPrice;

                return (
                  <article
                    key={
                      agreementId ||
                      `${item?.createdAt}-${item?.productName}`
                    }
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start gap-3">
                      {item
                        ?.thumbnailUrl ? (
                        <img
                          src={
                            item.thumbnailUrl
                          }
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <span
                          className="material-symbols-outlined flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-2xl text-textLight"
                          aria-hidden="true"
                        >
                          inventory_2
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black text-text">
                          {item
                            ?.productName ||
                            "Thỏa thuận giao dịch"}
                        </p>

                        <p className="mt-1 text-xs text-textLight">
                          Người bán:{" "}
                          {item
                            ?.sellerName ||
                            "Chưa có thông tin"}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-textLight">
                          <span>
                            Số lượng:{" "}
                            {item
                              ?.quantity ??
                              "—"}
                          </span>

                          <span className="font-black text-error">
                            {formatCurrency(
                              price,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                      <span className="text-[11px] font-semibold text-textLight">
                        {formatDateTime(
                          item?.createdAt,
                        )}
                      </span>

                      {agreementId && (
                        <Link
                          to={`/thoa-thuan/${agreementId}`}
                          className="rounded-lg bg-primary px-3.5 py-2 text-xs font-black text-white transition hover:bg-primary/90"
                        >
                          Mở thỏa thuận
                        </Link>
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}

        <PaginationControls
          pageNumber={
            pendingState.pageNumber
          }
          totalPages={
            pendingState.totalPages
          }
          hasPreviousPage={
            pendingState.hasPreviousPage
          }
          hasNextPage={
            pendingState.hasNextPage
          }
          busy={
            pendingLoading
          }
          onPageChange={(
            page,
          ) => {
            void loadPending(
              page,
            );
          }}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Giao dịch của bạn
          </p>

          <h2 className="mt-1 text-xl font-black text-text">
            Lịch sử thanh toán
          </h2>

          <p className="mt-1 text-sm text-textLight">
            {historyState.totalCount} giao dịch thanh toán đã được ghi nhận cho tài khoản này.
          </p>
        </div>

        {historyError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
          >
            {historyError}
          </div>
        )}

        {historyLoading ? (
          <p className="mt-5 rounded-xl bg-background px-4 py-8 text-center text-sm font-bold text-textLight">
            Đang tải lịch sử thanh toán...
          </p>
        ) : !historyError &&
          historyState.items
            .length === 0 ? (
          <div className="mt-5 rounded-xl border border-border bg-background px-4 py-8 text-center">
            <span className="material-symbols-outlined text-4xl text-textLight">
              receipt_long
            </span>

            <p className="mt-2 text-sm font-black text-text">
              Chưa có giao dịch thanh toán
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            {historyState.items.map(
              (item) => {
                const status =
                  getStatusMeta(
                    item
                      ?.paymentStatus,
                  );

                const orderId =
                  String(
                    item
                      ?.orderId ||
                      "",
                  ).trim();

                return (
                  <article
                    key={
                      item
                        ?.paymentId
                    }
                    className="border-b border-border bg-white p-4 last:border-b-0"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-text">
                          {item
                            ?.description ||
                            "Thanh toán giao dịch"}
                        </p>

                        <p className="mt-1 text-xs text-textLight">
                          {formatDateTime(
                            item
                              ?.createdAt,
                          )}
                        </p>
                      </div>

                      <p className="shrink-0 text-base font-black text-primary">
                        {formatCurrency(
                          item
                            ?.amount,
                        )}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <span className="mr-auto text-xs font-bold text-textLight">
                        {getMethodLabel(
                          item
                            ?.paymentMethod,
                        )}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${status.className}`}
                      >
                        {status.label}
                      </span>

                      {orderId && (
                        <Link
                          to={`/don-hang/${orderId}`}
                          className="rounded-lg border border-primary bg-white px-3 py-1.5 text-xs font-black text-primary transition hover:bg-primary/10"
                        >
                          Xem đơn hàng
                        </Link>
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}

        <PaginationControls
          pageNumber={
            historyState.pageNumber
          }
          totalPages={
            historyState.totalPages
          }
          hasPreviousPage={
            historyState.hasPreviousPage
          }
          hasNextPage={
            historyState.hasNextPage
          }
          busy={
            historyLoading
          }
          onPageChange={(
            page,
          ) => {
            void loadHistory(
              page,
            );
          }}
        />
      </section>
    </section>
  );
};

export default PaymentCenterPage;
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PostThumbnail from "../../components/shared/PostThumbnail";
import {
  ORDER_STATUS,
  getOrderStatusMeta,
  getPaymentDisplayMeta,
} from "../../constants/orders";
import businessDashboardApi from "../../services/apis/businessDashboardApi";
import {
  getSafeProblemDetail,
  getSafeValidationMessage,
} from "../../utils/safeErrorMessage";

const ORDER_STATUS_OPTIONS = Object.freeze([
  { value: "", label: "Tất cả trạng thái" },
  { value: ORDER_STATUS.PENDING, label: "Chờ xử lý" },
  { value: ORDER_STATUS.PROCESSING, label: "Đang xử lý" },
  { value: ORDER_STATUS.COMPLETED, label: "Hoàn tất" },
  { value: ORDER_STATUS.CANCELLED, label: "Đã hủy" },
  { value: ORDER_STATUS.DISPUTING, label: "Đang tranh chấp" },
  { value: ORDER_STATUS.RETURNED, label: "Đã trả hàng" },
]);

const LEDGER_DIRECTION_OPTIONS = Object.freeze([
  { value: "", label: "Tất cả" },
  { value: "In", label: "Vào ví" },
  { value: "Out", label: "Ra khỏi ví" },
]);

const LEDGER_BALANCE_TYPE_OPTIONS = Object.freeze([
  { value: "", label: "Tất cả" },
  { value: "Available", label: "Khả dụng" },
  { value: "Hold", label: "Đang giữ" },
]);

const WITHDRAWAL_STATUS_OPTIONS = Object.freeze([
  { value: "", label: "Tất cả" },
  { value: "Pending", label: "Chờ xử lý" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Processing", label: "Đang xử lý" },
  { value: "Completed", label: "Hoàn tất" },
  { value: "Rejected", label: "Đã từ chối" },
  { value: "Failed", label: "Thất bại" },
]);

const WITHDRAWAL_STATUS_LABELS = Object.freeze({
  Pending: "Chờ xử lý",
  Approved: "Đã duyệt",
  Processing: "Đang xử lý",
  Completed: "Hoàn tất",
  Rejected: "Đã từ chối",
  Failed: "Thất bại",
});

const LEDGER_DIRECTION_LABELS = Object.freeze({
  In: "Vào ví",
  Out: "Ra khỏi ví",
});

const LEDGER_BALANCE_TYPE_LABELS = Object.freeze({
  Available: "Khả dụng",
  Hold: "Đang giữ",
});

const createOrderParams = () => ({
  pageNumber: 1,
  pageSize: 10,
  keyword: "",
  status: "",
});

const createLedgerParams = () => ({
  pageNumber: 1,
  pageSize: 10,
  direction: "",
  balanceType: "",
  fromDate: "",
  toDate: "",
});

const createWithdrawalParams = () => ({
  pageNumber: 1,
  pageSize: 10,
  status: "",
  fromDate: "",
  toDate: "",
});

const createEmptyPage = () => ({
  items: [],
  pageNumber: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
});

const isRequestCancelled = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

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
    getSafeProblemDetail(error?.message) ||
    "Không thể tải tổng quan doanh nghiệp. Vui lòng thử lại."
  );
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

const toIsoStartOfDay = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toISOString()
    : undefined;

const toIsoEndOfDay = (value) =>
  value
    ? new Date(`${value}T23:59:59`).toISOString()
    : undefined;

function PaginationControls({
  page,
  loading,
  onPageChange,
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs font-bold text-textLight">
        Trang {page.pageNumber}/
        {Math.max(1, page.totalPages)} · Tổng{" "}
        {page.totalCount} bản ghi
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={
            loading || !page.hasPreviousPage
          }
          onClick={() =>
            onPageChange(page.pageNumber - 1)
          }
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trước
        </button>

        <button
          type="button"
          disabled={
            loading || !page.hasNextPage
          }
          onClick={() =>
            onPageChange(page.pageNumber + 1)
          }
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function OrdersSection({
  title,
  description,
  emptyText,
  params,
  onChangeParams,
  page,
  loading,
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-text">
        {title}
      </h2>
      <p className="mt-1 text-sm text-textLight">
        {description}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_200px]">
        <input
          type="text"
          value={params.keyword}
          onChange={(event) =>
            onChangeParams({
              ...params,
              keyword: event.target.value,
              pageNumber: 1,
            })
          }
          placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />

        <select
          value={params.status}
          onChange={(event) =>
            onChangeParams({
              ...params,
              status: event.target.value,
              pageNumber: 1,
            })
          }
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option
              key={String(option.value)}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {page.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-center text-sm text-textLight">
            {emptyText}
          </p>
        ) : (
          page.items.map((item) => {
            const orderStatusMeta =
              getOrderStatusMeta(
                item.orderStatus,
              );
            const paymentStatusMeta =
              getPaymentDisplayMeta(item);

            return (
              <article
                key={item.orderId}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
              >
                <PostThumbnail
                  src={item.thumbnailUrl}
                  alt={
                    item.productName ||
                    "Sản phẩm"
                  }
                  className="h-14 w-14 shrink-0 rounded-lg"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-text">
                    {item.productName ||
                      "Sản phẩm trong đơn hàng"}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-textLight">
                    {item.orderCode ||
                      "Mã đơn chưa cập nhật"}{" "}
                    · SL {item.quantity ?? 0}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-text">
                    {formatCurrency(
                      item.finalTotalAmount,
                    )}
                  </p>
                  <p className="text-xs text-textLight">
                    Đã trả{" "}
                    {formatCurrency(
                      item.amountPaid,
                    )}{" "}
                    · Còn{" "}
                    {formatCurrency(
                      item.amountRemaining,
                    )}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${orderStatusMeta.className}`}
                >
                  {orderStatusMeta.label}
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${paymentStatusMeta.className}`}
                >
                  {paymentStatusMeta.label}
                </span>

                <Link
                  to={`/don-hang/${item.orderId}`}
                  className="rounded-lg border border-primary px-3 py-2 text-xs font-black text-primary transition hover:bg-primary hover:text-white"
                >
                  Chi tiết
                </Link>
              </article>
            );
          })
        )}
      </div>

      <PaginationControls
        page={page}
        loading={loading}
        onPageChange={(pageNumber) =>
          onChangeParams({
            ...params,
            pageNumber,
          })
        }
      />
    </section>
  );
}

function LedgerSection({
  params,
  onChangeParams,
  page,
  loading,
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-text">
        Sao kê ví
      </h2>
      <p className="mt-1 text-sm text-textLight">
        Lịch sử biến động số dư ví doanh nghiệp. Đây là sao kê giao dịch, không phải báo cáo doanh thu hay lợi nhuận.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={params.direction}
          onChange={(event) =>
            onChangeParams({
              ...params,
              direction: event.target.value,
              pageNumber: 1,
            })
          }
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          {LEDGER_DIRECTION_OPTIONS.map(
            (option) => (
              <option
                key={option.value || "all"}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <select
          value={params.balanceType}
          onChange={(event) =>
            onChangeParams({
              ...params,
              balanceType: event.target.value,
              pageNumber: 1,
            })
          }
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          {LEDGER_BALANCE_TYPE_OPTIONS.map(
            (option) => (
              <option
                key={option.value || "all"}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <input
          type="date"
          value={params.fromDate}
          onChange={(event) =>
            onChangeParams({
              ...params,
              fromDate: event.target.value,
              pageNumber: 1,
            })
          }
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />

        <input
          type="date"
          value={params.toDate}
          onChange={(event) =>
            onChangeParams({
              ...params,
              toDate: event.target.value,
              pageNumber: 1,
            })
          }
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-xs uppercase tracking-wide text-textLight">
              <th className="px-3 py-2.5 font-semibold">
                Thời gian
              </th>
              <th className="px-3 py-2.5 font-semibold">
                Loại
              </th>
              <th className="px-3 py-2.5 font-semibold">
                Số dư
              </th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Số tiền
              </th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Trước → Sau
              </th>
              <th className="px-3 py-2.5 font-semibold">
                Diễn giải
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {page.items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-textLight"
                >
                  Chưa có biến động ví phù hợp.
                </td>
              </tr>
            ) : (
              page.items.map((item) => (
                <tr key={item.ledgerId}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-textLight">
                    {formatDateTime(
                      item.createdAt,
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {LEDGER_DIRECTION_LABELS[
                      item.direction
                    ] || item.direction}
                  </td>
                  <td className="px-3 py-2.5">
                    {LEDGER_BALANCE_TYPE_LABELS[
                      item.balanceType
                    ] || item.balanceType}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-text">
                    {formatCurrency(
                      item.amount,
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs text-textLight">
                    {formatCurrency(
                      item.balanceBefore,
                    )}{" "}
                    →{" "}
                    {formatCurrency(
                      item.balanceAfter,
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-textLight">
                    {item.description || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        page={page}
        loading={loading}
        onPageChange={(pageNumber) =>
          onChangeParams({
            ...params,
            pageNumber,
          })
        }
      />
    </section>
  );
}

function WithdrawalsSection({
  params,
  onChangeParams,
  page,
  loading,
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-text">
            Lịch sử yêu cầu rút tiền
          </h2>
          <p className="mt-1 text-sm text-textLight">
            Các yêu cầu rút tiền đã gửi từ ví doanh nghiệp.
          </p>
        </div>

        <Link
          to="/vi"
          className="rounded-lg border border-primary px-3 py-2 text-xs font-black text-primary transition hover:bg-primary hover:text-white"
        >
          Tạo yêu cầu rút tiền
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <select
          value={params.status}
          onChange={(event) =>
            onChangeParams({
              ...params,
              status: event.target.value,
              pageNumber: 1,
            })
          }
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          {WITHDRAWAL_STATUS_OPTIONS.map(
            (option) => (
              <option
                key={option.value || "all"}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <input
          type="date"
          value={params.fromDate}
          onChange={(event) =>
            onChangeParams({
              ...params,
              fromDate: event.target.value,
              pageNumber: 1,
            })
          }
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />

        <input
          type="date"
          value={params.toDate}
          onChange={(event) =>
            onChangeParams({
              ...params,
              toDate: event.target.value,
              pageNumber: 1,
            })
          }
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="mt-4 space-y-3">
        {page.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-center text-sm text-textLight">
            Chưa có yêu cầu rút tiền phù hợp.
          </p>
        ) : (
          page.items.map((item) => (
            <article
              key={item.withdrawalId}
              className="rounded-xl border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-text">
                  {formatCurrency(
                    item.amount,
                  )}
                </p>
                <span className="rounded-full bg-background px-2.5 py-1 text-xs font-black text-text">
                  {WITHDRAWAL_STATUS_LABELS[
                    item.status
                  ] || "Không xác định"}
                </span>
              </div>

              <p className="mt-1 text-xs text-textLight">
                {item.bankName ||
                  "Ngân hàng chưa xác định"}
                {" · "}
                {item.maskedAccountNumber ||
                  "—"}
              </p>

              <p className="mt-2 text-xs font-semibold text-textLight">
                Yêu cầu lúc{" "}
                {formatDateTime(
                  item.requestedAt,
                )}
                {item.processedAt && (
                  <>
                    {" "}
                    · Xử lý lúc{" "}
                    {formatDateTime(
                      item.processedAt,
                    )}
                  </>
                )}
              </p>

              {item.rejectReason && (
                <p className="mt-2 text-xs font-semibold text-error">
                  Lý do: {item.rejectReason}
                </p>
              )}
            </article>
          ))
        )}
      </div>

      <PaginationControls
        page={page}
        loading={loading}
        onPageChange={(pageNumber) =>
          onChangeParams({
            ...params,
            pageNumber,
          })
        }
      />
    </section>
  );
}

export default function BusinessDashboardPage() {
  const [buyerOrdersParams, setBuyerOrdersParams] =
    useState(createOrderParams);

  const [
    sellerOrdersParams,
    setSellerOrdersParams,
  ] = useState(createOrderParams);

  const [ledgerParams, setLedgerParams] =
    useState(createLedgerParams);

  const [
    withdrawalsParams,
    setWithdrawalsParams,
  ] = useState(createWithdrawalParams);

  const [requestVersion, setRequestVersion] =
    useState(0);

  const requestKey = JSON.stringify({
    buyerOrdersParams,
    sellerOrdersParams,
    ledgerParams,
    withdrawalsParams,
    requestVersion,
  });

  const [dashboardState, setDashboardState] =
    useState({
      requestKey: "",
      data: null,
      error: "",
    });

  const loading =
    dashboardState.requestKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    businessDashboardApi
      .getDashboard({
        buyerOrders: {
          pageNumber:
            buyerOrdersParams.pageNumber,
          pageSize: buyerOrdersParams.pageSize,
          keyword:
            buyerOrdersParams.keyword.trim() ||
            undefined,
          status:
            buyerOrdersParams.status ||
            undefined,
        },
        sellerOrders: {
          pageNumber:
            sellerOrdersParams.pageNumber,
          pageSize:
            sellerOrdersParams.pageSize,
          keyword:
            sellerOrdersParams.keyword.trim() ||
            undefined,
          status:
            sellerOrdersParams.status ||
            undefined,
        },
        ledger: {
          pageNumber: ledgerParams.pageNumber,
          pageSize: ledgerParams.pageSize,
          direction:
            ledgerParams.direction ||
            undefined,
          balanceType:
            ledgerParams.balanceType ||
            undefined,
          fromDate: toIsoStartOfDay(
            ledgerParams.fromDate,
          ),
          toDate: toIsoEndOfDay(
            ledgerParams.toDate,
          ),
        },
        withdrawals: {
          pageNumber:
            withdrawalsParams.pageNumber,
          pageSize:
            withdrawalsParams.pageSize,
          status:
            withdrawalsParams.status ||
            undefined,
          fromDate: toIsoStartOfDay(
            withdrawalsParams.fromDate,
          ),
          toDate: toIsoEndOfDay(
            withdrawalsParams.toDate,
          ),
        },
        signal: controller.signal,
      })
      .then((data) => {
        setDashboardState({
          requestKey,
          data,
          error: "",
        });
      })
      .catch((error) => {
        if (isRequestCancelled(error)) {
          return;
        }

        setDashboardState((current) => ({
          ...current,
          requestKey,
          error: getErrorMessage(error),
        }));
      });

    return () => {
      controller.abort();
    };
  }, [
    buyerOrdersParams,
    sellerOrdersParams,
    ledgerParams,
    withdrawalsParams,
    requestKey,
  ]);

  const data = dashboardState.data;
  const wallet = data?.wallet || null;
  const buyerOrdersPage =
    data?.buyerOrders || createEmptyPage();
  const sellerOrdersPage =
    data?.sellerOrders || createEmptyPage();
  const ledgerPage =
    data?.ledger || createEmptyPage();
  const withdrawalsPage =
    data?.withdrawals || createEmptyPage();

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-7 sm:px-6">
      <header className="overflow-hidden rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_50px_rgba(23,40,48,0.14)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">
          Không gian doanh nghiệp
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Tổng quan doanh nghiệp
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
          Đơn mua, đơn bán và ví của tài khoản doanh nghiệp đang đăng nhập.
        </p>
      </header>

      {dashboardState.error && (
        <div
          role="alert"
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error sm:flex-row sm:items-center"
        >
          <span>{dashboardState.error}</span>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setRequestVersion((current) => current + 1)
            }
            className="rounded-lg bg-error px-4 py-2 text-xs font-black text-white transition hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Thử lại
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="rounded-2xl border border-border bg-white px-5 py-14 text-center text-sm font-bold text-textLight">
          Đang tải tổng quan doanh nghiệp...
        </div>
      )}

      {data && (
        <>
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-text">
                  Ví doanh nghiệp
                </h2>
                <p className="mt-1 text-sm text-textLight">
                  Số dư hiện tại của ví, không phụ thuộc bộ lọc thời gian của sao kê.
                </p>
              </div>

              <Link
                to="/vi"
                className="rounded-lg border border-primary px-3 py-2 text-xs font-black text-primary transition hover:bg-primary hover:text-white"
              >
                Đến trang ví
              </Link>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  Số dư khả dụng
                </p>
                <p className="mt-3 text-2xl font-black text-text">
                  {formatCurrency(
                    wallet?.availableBalance,
                  )}
                </p>
                <p className="mt-2 text-xs leading-5 text-textLight">
                  Có thể dùng để rút tiền hoặc thanh toán.
                </p>
              </article>

              <article className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-warning">
                  Đang giữ
                </p>
                <p className="mt-3 text-2xl font-black text-text">
                  {formatCurrency(
                    wallet?.holdBalance,
                  )}
                </p>
                <p className="mt-2 text-xs leading-5 text-textLight">
                  Đang được giữ cho giao dịch hoặc yêu cầu rút tiền đang xử lý.
                </p>
              </article>

              <article className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-textLight">
                  Tổng số dư
                </p>
                <p className="mt-3 text-2xl font-black text-text">
                  {formatCurrency(
                    (wallet?.availableBalance || 0) +
                      (wallet?.holdBalance || 0),
                  )}
                </p>
                <p className="mt-2 text-xs leading-5 text-textLight">
                  Khả dụng cộng đang giữ.
                </p>
              </article>
            </div>
          </section>

          <OrdersSection
            title="Đơn mua"
            description="Các đơn hàng doanh nghiệp đã đặt mua."
            emptyText="Chưa có đơn mua phù hợp."
            params={buyerOrdersParams}
            onChangeParams={setBuyerOrdersParams}
            page={buyerOrdersPage}
            loading={loading}
          />

          <OrdersSection
            title="Đơn bán"
            description="Các đơn hàng doanh nghiệp đã bán ra."
            emptyText="Chưa có đơn bán phù hợp."
            params={sellerOrdersParams}
            onChangeParams={setSellerOrdersParams}
            page={sellerOrdersPage}
            loading={loading}
          />

          <LedgerSection
            params={ledgerParams}
            onChangeParams={setLedgerParams}
            page={ledgerPage}
            loading={loading}
          />

          <WithdrawalsSection
            params={withdrawalsParams}
            onChangeParams={setWithdrawalsParams}
            page={withdrawalsPage}
            loading={loading}
          />
        </>
      )}
    </section>
  );
}

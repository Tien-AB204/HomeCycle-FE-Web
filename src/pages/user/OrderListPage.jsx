import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ORDER_PERSPECTIVE,
  ORDER_STATUS,
  getOrderStatusMeta,
  getPaymentDisplayMeta,
} from "../../constants/orders";
import orderApi from "../../services/apis/orderApi";

const PAGE_SIZE = 10;
const API_PAGE_SIZE = 100;

const ORDER_SOURCES = Object.freeze([
  { perspective: ORDER_PERSPECTIVE.BUYER, label: "Đơn mua" },
  { perspective: ORDER_PERSPECTIVE.SELLER, label: "Đơn bán" },
]);

const ORDER_STATUS_OPTIONS = Object.freeze([
  { value: "", label: "Tất cả trạng thái" },
  { value: ORDER_STATUS.PENDING, label: "Chờ xử lý" },
  { value: ORDER_STATUS.PROCESSING, label: "Đang xử lý" },
  { value: ORDER_STATUS.COMPLETED, label: "Hoàn tất" },
  { value: ORDER_STATUS.CANCELLED, label: "Đã hủy" },
  { value: ORDER_STATUS.DISPUTING, label: "Đang tranh chấp" },
]);

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải danh sách đơn hàng.";

const loadOrderSource = async ({ source, signal }) => {
  const requestPage = (pageNumber) =>
    orderApi.getAll({
      perspective: source.perspective,
      pageNumber,
      pageSize: API_PAGE_SIZE,
      signal,
    });

  const firstPage = await requestPage(1);
  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.totalPages - 1) },
    (_, index) => index + 2,
  );
  const remainingResults = await Promise.all(
    remainingPages.map((pageNumber) => requestPage(pageNumber)),
  );

  return [firstPage, ...remainingResults].flatMap((result) =>
    result.items.map((item) => ({
      ...item,
      viewPerspective: source.perspective,
      viewPerspectiveLabel: source.label,
    })),
  );
};

const ProductThumbnail = ({ item }) => {
  const [hasImageError, setHasImageError] = useState(false);

  if (!item.thumbnailUrl || hasImageError) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#EAF3F3] text-[#4F8588]">
        <span className="material-symbols-outlined text-2xl" aria-hidden="true">
          inventory_2
        </span>
      </div>
    );
  }

  return (
    <img
      src={item.thumbnailUrl}
      alt={item.productName || `Đơn hàng ${item.orderCode || "HomeCycle"}`}
      onError={() => setHasImageError(true)}
      className="h-14 w-14 shrink-0 rounded-lg object-cover"
    />
  );
};

const OrderListPage = () => {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], error: "" });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all(
      ORDER_SOURCES.map((source) =>
        loadOrderSource({ source, signal: controller.signal }),
      ),
    )
      .then((sourceItems) => {
        const uniqueItems = Array.from(
          new Map(
            sourceItems
              .flat()
              .map((item) => [
                `${item.orderId}-${item.viewPerspective}`,
                item,
              ]),
          ).values(),
        );
        setState({ loading: false, items: uniqueItems, error: "" });
      })
      .catch((error) => {
        if (
          error?.name !== "CanceledError" &&
          error?.code !== "ERR_CANCELED"
        ) {
          setState({ loading: false, items: [], error: getErrorMessage(error) });
        }
      });

    return () => controller.abort();
  }, [version]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi-VN");

    return state.items.filter((item) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [item.productName, item.orderCode]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLocaleLowerCase("vi-VN")
              .includes(normalizedKeyword),
          );
      const matchesStatus =
        status === "" || Number(item.orderStatus) === Number(status);
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, state.items, status]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, totalPages);
  const pageItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const buyerCount = state.items.filter(
    (item) => item.viewPerspective === ORDER_PERSPECTIVE.BUYER,
  ).length;
  const sellerCount = state.items.length - buyerCount;

  const updateFilter = (setter, value) => {
    setter(value);
    setPageNumber(1);
  };

  const refreshOrders = () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setVersion((value) => value + 1);
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl px-4 pb-14 pt-7 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-[#DCE8E5] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6F9F]">
            Quản lý giao dịch
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#183F41] sm:text-3xl">
            Đơn hàng của tôi
          </h1>
          <p className="mt-1.5 text-sm text-[#68807F]">
            Theo dõi tập trung đơn mua, đơn bán và tiến độ thanh toán.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#EAF3F8] px-3 py-1.5 text-xs font-black text-[#2F6F9F]">
            {buyerCount} đơn mua
          </span>
          <span className="rounded-full bg-[#EAF5F1] px-3 py-1.5 text-xs font-black text-[#356A70]">
            {sellerCount} đơn bán
          </span>
          <button
            type="button"
            onClick={refreshOrders}
            disabled={state.loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4F8588] bg-white px-3 py-1.5 text-xs font-black text-[#285E62] transition hover:bg-[#F1F7F5] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              refresh
            </span>
            Làm mới
          </button>
        </div>
      </header>

      <div className="mt-4 grid gap-2 rounded-xl border border-[#DCE8E5] bg-white p-3 shadow-[0_8px_24px_rgba(24,63,65,0.04)] md:grid-cols-[minmax(280px,1fr)_220px_auto]">
        <label className="relative min-w-0">
          <span className="sr-only">Tìm đơn hàng</span>
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#789092]"
            aria-hidden="true"
          >
            search
          </span>
          <input
            value={keyword}
            onChange={(event) => updateFilter(setKeyword, event.target.value)}
            placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
            className="w-full rounded-lg border border-[#CDDED9] bg-[#FBFDFC] py-2.5 pl-10 pr-3 text-sm text-[#183F41] outline-none focus:border-[#4F8588] focus:bg-white"
          />
        </label>

        <select
          value={status}
          onChange={(event) => updateFilter(setStatus, event.target.value)}
          className="rounded-lg border border-[#CDDED9] bg-white px-3 py-2 text-sm font-bold text-[#68807F] outline-none focus:border-[#4F8588]"
        >
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {(keyword || status !== "") && (
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setStatus("");
              setPageNumber(1);
            }}
            className="rounded-lg px-3 py-2 text-sm font-bold text-[#2F6F9F] transition hover:bg-[#F1F7F5]"
          >
            Đặt lại
          </button>
        )}
      </div>

      {state.loading && (
        <div className="mt-4 rounded-xl border border-[#DCE8E5] bg-white p-12 text-center font-semibold text-[#68807F]">
          Đang tải đơn hàng...
        </div>
      )}

      {state.error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {state.error}
        </div>
      )}

      {!state.loading && !state.error && filteredItems.length === 0 && (
        <div className="mt-4 rounded-xl border border-[#DCE8E5] bg-white p-12 text-center shadow-[0_8px_24px_rgba(24,63,65,0.04)]">
          <span className="material-symbols-outlined text-5xl text-[#4F8588]" aria-hidden="true">
            receipt_long
          </span>
          <h2 className="mt-3 font-black text-[#183F41]">Chưa có đơn hàng phù hợp</h2>
          <p className="mt-1 text-sm text-[#68807F]">
            Đơn hàng sẽ xuất hiện sau khi giao dịch được xác nhận và thanh toán.
          </p>
        </div>
      )}

      {!state.loading && !state.error && filteredItems.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-[#DCE8E5] bg-white shadow-[0_8px_24px_rgba(24,63,65,0.04)]">
          <div className="hidden grid-cols-[minmax(220px,1.25fr)_85px_140px_minmax(190px,0.95fr)_120px_125px_104px] items-center gap-3 bg-[#F3F7F6] px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#68807F] lg:grid">
            <span>Đơn hàng</span>
            <span>Vai trò</span>
            <span>Giá trị</span>
            <span>Thanh toán</span>
            <span>Đơn hàng</span>
            <span>Thanh toán</span>
            <span className="sr-only">Thao tác</span>
          </div>

          <div className="divide-y divide-[#E3ECE9]">
            {pageItems.map((item) => {
              const orderStatus = getOrderStatusMeta(item.orderStatus);
              const paymentStatus = getPaymentDisplayMeta(item);
              const productName = item.productName || "Sản phẩm trong đơn hàng";

              return (
                <article
                  key={`${item.orderId}-${item.viewPerspective}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-[#F8FBFA] lg:grid-cols-[minmax(220px,1.25fr)_85px_140px_minmax(190px,0.95fr)_120px_125px_104px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductThumbnail item={item} />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-[#183F41]">{productName}</h2>
                      <p className="mt-1 truncate text-xs font-bold text-[#789092]">
                        {item.orderCode || "Mã đơn chưa cập nhật"} · SL {item.quantity || 0}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase text-[#789092] lg:hidden">Vai trò</p>
                    <span className="text-xs font-black text-[#285E62]">{item.viewPerspectiveLabel}</span>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase text-[#789092] lg:hidden">Giá trị</p>
                    <p className="text-sm font-black text-[#B93832]">{formatCurrency(item.finalTotalAmount)}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase text-[#789092] lg:hidden">Tiến độ thanh toán</p>
                    <p className="text-xs font-bold text-[#356A70]">Đã trả {formatCurrency(item.amountPaid)}</p>
                    <p className="mt-1 text-xs text-[#789092]">Còn lại {formatCurrency(item.amountRemaining)}</p>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${orderStatus.className}`}>
                      {orderStatus.label}
                    </span>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${paymentStatus.className}`}>
                      {paymentStatus.label}
                    </span>
                  </div>

                  <div className="lg:text-right">
                    <Link
                      to={`/don-hang/${item.orderId}`}
                      className="inline-flex rounded-lg border border-[#4F8588] bg-white px-4 py-2 text-sm font-black text-[#285E62] transition hover:bg-[#4F8588] hover:text-white"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {!state.loading && !state.error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPageNumber(currentPage - 1)}
            className="rounded-lg border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-bold text-[#285E62] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm font-bold text-[#68807F]">Trang {currentPage}/{totalPages}</span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPageNumber(currentPage + 1)}
            className="rounded-lg border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-bold text-[#285E62] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </section>
  );
};

export default OrderListPage;
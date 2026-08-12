import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ORDER_PERSPECTIVE,
  getOrderStatusMeta,
  getPaymentDisplayMeta,
} from "../../constants/orders";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import orderApi from "../../services/apis/orderApi";

const PAGE_SIZE = 10;

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải danh sách đơn hàng.";

const ProductThumbnail = ({ item }) => {
  const [hasImageError, setHasImageError] = useState(false);

  if (!item.thumbnailUrl || hasImageError) {
    return (
      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-[#EAF3F3] text-3xl">
        📦
      </div>
    );
  }

  return (
    <img
      src={item.thumbnailUrl}
      alt={item.productName || `Đơn hàng ${item.orderCode || "HomeCycle"}`}
      onError={() => setHasImageError(true)}
      className="h-28 w-28 shrink-0 rounded-xl object-cover"
    />
  );
};

const OrderListPage = () => {
  const { user } = useAuth();
  const defaultPerspective =
    user?.role === ROLES.BUSINESS
      ? ORDER_PERSPECTIVE.BUYER
      : ORDER_PERSPECTIVE.SELLER;
  const [perspective, setPerspective] = useState(defaultPerspective);
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    loading: true,
    result: null,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    orderApi
      .getAll({
        perspective,
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) =>
        setState({ loading: false, result, error: "" }),
      )
      .catch((error) => {
        if (
          error?.name !== "CanceledError" &&
          error?.code !== "ERR_CANCELED"
        ) {
          setState({
            loading: false,
            result: null,
            error: getErrorMessage(error),
          });
        }
      });

    return () => controller.abort();
  }, [pageNumber, perspective, version]);

  const changePerspective = (nextPerspective) => {
    if (nextPerspective === perspective) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    setPerspective(nextPerspective);
    setPageNumber(1);
  };

  const changePage = (nextPage) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setPageNumber(nextPage);
  };

  const refreshOrders = () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setVersion((value) => value + 1);
  };

  const items = state.result?.items || [];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl bg-[#172830] px-6 py-6 text-white sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C1EAEC]">
            Giao dịch
          </p>
          <h1 className="mt-2 text-2xl font-black">Đơn hàng của tôi</h1>
          <p className="mt-2 text-sm text-[#B7C9D4]">
            Theo dõi đơn mua, đơn bán và tiến độ thanh toán của từng giao dịch.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshOrders}
          className="mt-4 rounded-xl bg-[#2B5659] px-4 py-2.5 text-sm font-bold hover:bg-[#547B7D] sm:mt-0"
        >
          Làm mới
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-[#BAC2C1]/40 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 rounded-xl bg-[#BAC2C1]/20 p-1">
          {[
            [ORDER_PERSPECTIVE.BUYER, "Đơn mua"],
            [ORDER_PERSPECTIVE.SELLER, "Đơn bán"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changePerspective(value)}
              className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${
                perspective === value
                  ? "bg-white text-[#2B5659] shadow-sm"
                  : "text-[#547B7D] hover:text-[#172830]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {state.loading && (
        <div className="mt-5 rounded-2xl bg-white p-12 text-center font-semibold text-[#547B7D]">
          Đang tải đơn hàng...
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {state.error}
        </div>
      )}

      {!state.loading && !state.error && items.length === 0 && (
        <div className="mt-5 rounded-2xl border border-[#BAC2C1]/40 bg-white p-12 text-center">
          <div className="text-4xl" aria-hidden="true">📋</div>
          <h2 className="mt-3 font-black text-[#172830]">
            Chưa có {perspective === ORDER_PERSPECTIVE.BUYER ? "đơn mua" : "đơn bán"}
          </h2>
          <p className="mt-2 text-sm text-[#547B7D]">
            Đơn hàng sẽ xuất hiện sau khi giao dịch được xác nhận và thanh toán thành công.
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {items.map((item) => {
          const orderStatus = getOrderStatusMeta(item.orderStatus);
          const paymentStatus = getPaymentDisplayMeta(item);
          const productName =
            item.productName || `Đơn hàng ${item.orderCode || "HomeCycle"}`;

          return (
            <article
              key={item.orderId}
              className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-4 shadow-sm"
            >
              <div className="flex gap-4">
                <ProductThumbnail item={item} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${orderStatus.className}`}>
                      {orderStatus.label}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${paymentStatus.className}`}>
                      {paymentStatus.label}
                    </span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 font-black text-[#172830]">
                    {productName}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[#789092]">
                    {item.orderCode || item.orderId} · Số lượng {item.quantity || 0}
                  </p>
                  <p className="mt-3 text-lg font-black text-[#7A1012]">
                    {formatCurrency(item.finalTotalAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F4F7F7] p-3 text-sm">
                <div>
                  <p className="text-xs font-bold text-[#789092]">Đã thanh toán</p>
                  <p className="mt-1 font-black text-[#2B5659]">
                    {formatCurrency(item.amountPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#789092]">Còn lại</p>
                  <p className="mt-1 font-black text-[#172830]">
                    {formatCurrency(item.amountRemaining)}
                  </p>
                </div>
              </div>

              {paymentStatus.description && (
                <p className="mt-3 text-xs font-semibold text-blue-700">
                  {paymentStatus.description}
                </p>
              )}

              <Link
                to={`/don-hang/${item.orderId}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#2B5659] px-5 py-2.5 text-sm font-black text-white hover:bg-[#172830]"
              >
                Xem chi tiết
              </Link>
            </article>
          );
        })}
      </div>

      {state.result?.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={!state.result.hasPreviousPage}
            onClick={() => changePage(pageNumber - 1)}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm font-bold text-[#547B7D]">
            Trang {state.result.pageNumber}/{state.result.totalPages}
          </span>
          <button
            type="button"
            disabled={!state.result.hasNextPage}
            onClick={() => changePage(pageNumber + 1)}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </section>
  );
};

export default OrderListPage;

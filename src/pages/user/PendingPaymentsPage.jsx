import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import agreementApi from "../../services/apis/agreementApi";

const PAGE_SIZE = 10;
const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const formatDate = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const getErrorMessage = (error) => error?.response?.data?.message || error?.message || "Không thể tải danh sách chờ thanh toán.";

const PendingPaymentsPage = () => {
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ loading: true, result: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    agreementApi.getPendingPayment({ pageNumber, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((result) => setState({ loading: false, result, error: "" }))
      .catch((error) => {
        if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") setState({ loading: false, result: null, error: getErrorMessage(error) });
      });
    return () => controller.abort();
  }, [pageNumber, version]);

  const items = state.result?.items || [];
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl bg-[#172830] px-6 py-6 text-white sm:flex sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C1EAEC]">Thanh toán</p><h1 className="mt-2 text-2xl font-black">Thỏa thuận chờ thanh toán</h1><p className="mt-2 text-sm text-[#B7C9D4]">Hoàn tất thanh toán để hệ thống tiếp tục tạo đơn hàng và lịch hẹn.</p></div>
        <button type="button" onClick={() => setVersion((value) => value + 1)} className="mt-4 rounded-xl bg-[#2B5659] px-4 py-2.5 text-sm font-bold hover:bg-[#547B7D] sm:mt-0">Làm mới</button>
      </div>
      {state.loading && <div className="mt-5 rounded-2xl bg-white p-12 text-center font-semibold text-[#547B7D]">Đang tải...</div>}
      {state.error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{state.error}</div>}
      {!state.loading && !state.error && items.length === 0 && <div className="mt-5 rounded-2xl border border-[#BAC2C1]/40 bg-white p-12 text-center"><div className="text-4xl">✅</div><h2 className="mt-3 font-black text-[#172830]">Không có khoản thanh toán đang chờ</h2></div>}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {items.map((item) => <article key={item.agreementId} className="flex gap-4 rounded-2xl border border-[#BAC2C1]/40 bg-white p-4 shadow-sm">
          <img src={item.thumbnailUrl || "https://placehold.co/144x144?text=HomeCycle"} alt={item.productName || "Sản phẩm"} className="h-28 w-28 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1"><h2 className="truncate font-black text-[#172830]">{item.productName || "Sản phẩm HomeCycle"}</h2><p className="mt-2 text-lg font-black text-[#7A1012]">{formatCurrency(item.finalPrice)}</p><p className="mt-1 text-xs text-[#547B7D]">Người bán: {item.sellerName || "—"} · SL {item.quantity}</p><p className="mt-1 text-xs text-[#789092]">{formatDate(item.createdAt)}</p><Link to={`/thoa-thuan/${item.agreementId}`} className="mt-3 inline-flex rounded-lg bg-[#2B5659] px-4 py-2 text-xs font-black text-white hover:bg-[#172830]">Xem và thanh toán</Link></div>
        </article>)}
      </div>
      {state.result?.totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button disabled={!state.result.hasPreviousPage} onClick={() => { setState((current) => ({ ...current, loading: true })); setPageNumber((value) => value - 1); }} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Trước</button><span className="text-sm font-bold text-[#547B7D]">Trang {state.result.pageNumber}/{state.result.totalPages}</span><button disabled={!state.result.hasNextPage} onClick={() => { setState((current) => ({ ...current, loading: true })); setPageNumber((value) => value + 1); }} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Sau</button></div>}
    </section>
  );
};

export default PendingPaymentsPage;

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import orderApi from "../../services/apis/orderApi";
import paymentApi from "../../services/apis/paymentApi";

const PENDING_AGREEMENT_KEY = "homecycle:pending-payment-agreement-id";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Hệ thống chưa thể xác nhận giao dịch.";

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const agreementId = localStorage.getItem(PENDING_AGREEMENT_KEY) || "";
  const payOsStatus = String(searchParams.get("status") || "").toUpperCase();
  const wasCancelled =
    String(searchParams.get("cancel") || "").toLowerCase() === "true";
  const [state, setState] = useState({
    loading: Boolean(agreementId) && !wasCancelled,
    status: wasCancelled ? "Cancelled" : "",
    order: null,
    error: "",
  });

  useEffect(() => {
    if (!agreementId || wasCancelled) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const status = await paymentApi.getStatus(agreementId, {
          signal: controller.signal,
        });
        let order = null;

        if (status.toLowerCase() === "completed") {
          order = await orderApi.getByAgreementId(agreementId, {
            signal: controller.signal,
          });
          localStorage.removeItem(PENDING_AGREEMENT_KEY);
        }

        setState({ loading: false, status, order, error: "" });
      } catch (error) {
        if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") {
          setState({
            loading: false,
            status: payOsStatus === "PAID" ? "Processing" : "",
            order: null,
            error: getErrorMessage(error),
          });
        }
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [agreementId, payOsStatus, wasCancelled]);

  const completed = state.status.toLowerCase() === "completed";
  const cancelled = wasCancelled || state.status.toLowerCase() === "cancelled";

  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <div className="w-full rounded-2xl border border-[#DCE8E5] bg-white p-7 text-center shadow-[0_16px_42px_rgba(24,63,65,0.09)] sm:p-10">
        <span
          className={`material-symbols-outlined text-5xl ${completed ? "text-green-600" : cancelled ? "text-[#B33A32]" : "text-[#2F6F9F]"}`}
          aria-hidden="true"
        >
          {completed
            ? "check_circle"
            : cancelled
              ? "cancel"
              : state.loading
                ? "progress_activity"
                : "sync"}
        </span>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#4F8588]">
          Kết quả thanh toán
        </p>
        <h1 className="mt-2 text-2xl font-black text-[#183F41]">
          {completed
            ? "Thanh toán thành công"
            : cancelled
              ? "Thanh toán đã được hủy"
              : state.loading
                ? "Đang xác nhận giao dịch"
                : "PayOS đã ghi nhận thanh toán"}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#68807F]">
          {completed
            ? "HomeCycle đã ghi nhận khoản thanh toán và cập nhật dữ liệu giao dịch."
            : cancelled
              ? "Bạn chưa bị ghi nhận thanh toán. Có thể quay lại thỏa thuận để tạo giao dịch mới."
              : payOsStatus === "PAID"
                ? "Ngân hàng đã báo PAID. HomeCycle đang chờ backend hoàn tất đơn hàng và lịch hẹn."
                : "HomeCycle đang đồng bộ trạng thái mới nhất từ PayOS."}
        </p>

        {state.error && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-800">
            <strong>
              Thanh toán đã được PayOS ghi nhận nhưng backend chưa đồng bộ xong.
            </strong>
            <br />
            {state.error} Bạn không cần chuyển khoản lần nữa; hãy quay lại kiểm
            tra trạng thái sau.
          </div>
        )}

        {state.order && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-left text-sm text-green-900">
            <p>
              <strong>Mã đơn hàng:</strong>{" "}
              {state.order.orderCode || state.order.orderId}
            </p>
            <p className="mt-1">
              <strong>Số lượng:</strong> {state.order.quantity}
            </p>
          </div>
        )}

        {!agreementId && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Không tìm thấy thông tin phiên thanh toán để đối chiếu. Bạn có thể vào danh sách đơn hàng để kiểm tra trạng thái giao dịch.
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {state.order?.orderId && (
            <Link
              to={`/don-hang/${state.order.orderId}`}
              className="rounded-lg bg-[#4F8588] px-5 py-3 text-sm font-black text-white transition hover:bg-[#356A70]"
            >
              Xem đơn hàng
            </Link>
          )}

          <Link
            to="/"
            className="rounded-lg border border-[#4F8588] bg-white px-5 py-3 text-sm font-black text-[#285E62] transition hover:bg-[#F1F7F5]"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PaymentResultPage;

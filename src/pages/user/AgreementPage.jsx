import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AGREEMENT_STATUS,
  AGREEMENT_TYPE,
} from "../../constants/agreements";
import AgreementForm from "../../features/agreements/AgreementForm";
import AgreementSummary from "../../features/agreements/AgreementSummary";
import agreementApi from "../../services/apis/agreementApi";
import orderApi from "../../services/apis/orderApi";
import paymentApi from "../../services/apis/paymentApi";

const PENDING_AGREEMENT_KEY = "homecycle:pending-payment-agreement-id";

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  fallbackMessage;

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString("vi-VN")} đ` : "—";
};

const AgreementPage = () => {
  const { negotiationId: negotiationIdParam, agreementId: agreementIdParam } = useParams();
  const [preview, setPreview] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const pollingRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const loadData = useCallback(async (signal) => {
    try {
      let nextAgreement = null;
      let nextPreview = null;
      if (agreementIdParam) {
        nextAgreement = await agreementApi.getById(agreementIdParam, { signal });
        nextPreview = await agreementApi.getPreview(nextAgreement.negotiationId, { signal });
      } else {
        nextPreview = await agreementApi.getPreview(negotiationIdParam, { signal });
        if (nextPreview?.hasAgreement && nextPreview?.agreementId) {
          nextAgreement = await agreementApi.getById(nextPreview.agreementId, { signal });
        }
      }
      setPreview(nextPreview);
      setAgreement(nextAgreement);

      if (nextAgreement?.agreementStatus === AGREEMENT_STATUS.CONFIRMED) {
        try {
          setOrder(await orderApi.getByAgreementId(nextAgreement.agreementId, { signal }));
        } catch {
          setOrder(null);
        }
      } else {
        setOrder(null);
      }
    } catch (requestError) {
      if (requestError?.name !== "CanceledError" && requestError?.code !== "ERR_CANCELED") {
        setError(getErrorMessage(requestError, "Không thể tải thông tin thỏa thuận."));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [agreementIdParam, negotiationIdParam]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void loadData(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      stopPolling();
    };
  }, [loadData, stopPolling]);

  const refresh = async () => {
    await loadData();
  };

  const runAction = async (key, action, successMessage) => {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      setEditing(false);
      await refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể xử lý thỏa thuận."));
    } finally {
      setBusy("");
    }
  };

  const handleSave = (payload) => {
    if (agreement) {
      return runAction(
        "save",
        () => agreementApi.update(agreement.agreementId, payload),
        "Đã cập nhật nội dung. Bên còn lại cần kiểm tra và xác nhận lại.",
      );
    }
    return runAction(
      "save",
      () => agreementApi.create(payload),
      "Đã tạo và gửi thỏa thuận cho người mua.",
    );
  };

  const checkPayment = useCallback(async ({ silent = false } = {}) => {
    if (!agreement?.agreementId) return "";
    try {
      const status = await paymentApi.getStatus(agreement.agreementId);
      setPaymentStatus(status);
      if (status.toLowerCase() === "completed") {
        stopPolling();
        setNotice("Thanh toán đã hoàn tất. Hệ thống đang cập nhật đơn hàng và lịch hẹn.");
        await loadData();
      }
      return status;
    } catch (requestError) {
      if (!silent) {
        setError(getErrorMessage(requestError, "Không thể kiểm tra trạng thái thanh toán."));
      }
      return "";
    }
  }, [agreement, loadData, stopPolling]);

  const handlePayOs = async () => {
    const checkoutWindow = window.open("about:blank", "_blank");
    if (checkoutWindow) checkoutWindow.opener = null;
    setBusy("payos");
    setError("");
    try {
      localStorage.setItem(PENDING_AGREEMENT_KEY, agreement.agreementId);
      const result = await paymentApi.createPayOsCheckout(agreement.agreementId);
      if (checkoutWindow) checkoutWindow.location.href = result.checkoutUrl;
      else window.location.assign(result.checkoutUrl);
      setNotice("Đã mở trang PayOS ở thẻ mới. Sau khi chuyển khoản, HomeCycle sẽ tự kiểm tra trạng thái.");
      stopPolling();
      let attempts = 0;
      pollingRef.current = window.setInterval(async () => {
        attempts += 1;
        await checkPayment({ silent: true });
        if (attempts >= 36) stopPolling();
      }, 5000);
    } catch (requestError) {
      if (checkoutWindow) checkoutWindow.close();
      setError(getErrorMessage(requestError, "Không thể tạo liên kết thanh toán PayOS."));
    } finally {
      setBusy("");
    }
  };

  const handleWalletPayment = () => runAction(
    "wallet",
    () => paymentApi.checkoutWithWallet(agreement.agreementId),
    "Thanh toán bằng ví thành công.",
  );

  const negotiationId = agreement?.negotiationId || preview?.negotiationId || negotiationIdParam;
  const isBuyer = String(preview?.userRole || "").toLowerCase() === "buyer";
  const canEdit = Boolean(preview?.canEdit) && agreement?.agreementStatus === AGREEMENT_STATUS.PENDING;
  const canRequestEdit = agreement?.agreementStatus === AGREEMENT_STATUS.AWAITING_PAYMENT;
  const canPay = isBuyer && agreement?.agreementStatus === AGREEMENT_STATUS.AWAITING_PAYMENT;

  if (loading) {
    return <div className="mx-auto max-w-5xl rounded-2xl border border-[#BAC2C1]/40 bg-white p-14 text-center font-semibold text-[#547B7D] shadow-sm">Đang tải thỏa thuận...</div>;
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 overflow-hidden rounded-2xl bg-[#172830] px-6 py-6 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C1EAEC]">Agreement Form</p>
          <h1 className="mt-2 text-2xl font-black">Thỏa thuận giao dịch</h1>
          <p className="mt-2 text-sm leading-6 text-[#B7C9D4]">Kiểm tra kỹ lịch hẹn, giao nhận và điều khoản trước khi xác nhận.</p>
        </div>
        {negotiationId && <Link to={`/thuong-luong/${negotiationId}`} className="mt-4 inline-flex rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20 sm:mt-0">← Quay lại phòng</Link>}
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{notice}</div>}

      {!agreement && preview?.canCreate && (
        <AgreementForm negotiationId={negotiationId} onSubmit={handleSave} busy={busy === "save"} />
      )}

      {!agreement && !preview?.canCreate && (
        <div className="rounded-2xl border border-amber-200 bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">⏳</div>
          <h2 className="mt-4 text-xl font-black text-[#172830]">Đang chờ người bán tạo thỏa thuận</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#547B7D]">Người bán sẽ điền các điều khoản hai bên đã thống nhất. Bạn có thể xem, chỉnh sửa hoặc xác nhận sau khi form được gửi.</p>
        </div>
      )}

      {agreement && editing && (
        <AgreementForm agreement={agreement} negotiationId={negotiationId} onSubmit={handleSave} onCancel={() => setEditing(false)} busy={busy === "save"} />
      )}

      {agreement && !editing && <>
        <AgreementSummary agreement={agreement} />

        {agreement.agreementType === AGREEMENT_TYPE.INSPECTION && agreement.agreementStatus === AGREEMENT_STATUS.CONFIRMED && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            Thỏa thuận có lịch kiểm định. Bạn có thể theo dõi lịch và check-in tại mục <Link to="/lich-hen" className="font-black underline">Lịch hẹn</Link>. Chức năng ghi nhận kết quả đạt/không đạt sẽ được bổ sung khi backend cung cấp API.
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3 rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm">
          {canEdit && <button type="button" onClick={() => setEditing(true)} className="rounded-xl border border-[#2B5659] px-5 py-3 text-sm font-black text-[#2B5659] hover:bg-[#EAF3F3]">Chỉnh sửa thỏa thuận</button>}
          {preview?.canConfirm && <button type="button" disabled={Boolean(busy)} onClick={() => runAction("accept", () => agreementApi.accept(agreement.agreementId), "Bạn đã xác nhận thỏa thuận.")} className="rounded-xl bg-[#2B5659] px-5 py-3 text-sm font-black text-white hover:bg-[#172830] disabled:opacity-50">{busy === "accept" ? "Đang xác nhận..." : "Xác nhận thỏa thuận"}</button>}
          {canRequestEdit && <button type="button" disabled={Boolean(busy)} onClick={() => runAction("request-edit", () => agreementApi.requestEdit(agreement.agreementId), "Đã mở lại thỏa thuận. Hai bên cần xác nhận lại sau khi chỉnh sửa.")} className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800 hover:bg-amber-100 disabled:opacity-50">Yêu cầu chỉnh sửa</button>}
        </div>

        {canPay && (
          <section className="mt-5 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-[#172830]">Thanh toán để tiếp tục</h2>
            <p className="mt-2 text-sm leading-6 text-[#547B7D]">Tổng giá trị thỏa thuận: <strong className="text-[#7A1012]">{formatCurrency(agreement.totalAmount)}</strong>. Số tiền cần thanh toán chính xác sẽ được hiển thị trên PayOS theo hình thức đặt cọc hoặc toàn phần đã chọn.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={handlePayOs} disabled={Boolean(busy)} className="rounded-xl bg-[#0AA679] px-5 py-3 text-sm font-black text-white hover:bg-[#088c66] disabled:opacity-50">{busy === "payos" ? "Đang tạo liên kết..." : "Thanh toán qua PayOS"}</button>
              <button type="button" onClick={handleWalletPayment} disabled={Boolean(busy)} className="rounded-xl border border-[#2B5659] px-5 py-3 text-sm font-black text-[#2B5659] hover:bg-[#EAF3F3] disabled:opacity-50">{busy === "wallet" ? "Đang thanh toán..." : "Thanh toán bằng ví"}</button>
              <button type="button" onClick={checkPayment} className="rounded-xl border border-[#BAC2C1] px-5 py-3 text-sm font-bold text-[#547B7D] hover:bg-[#BAC2C1]/20">Kiểm tra trạng thái</button>
            </div>
            {paymentStatus && <p className="mt-3 text-sm font-bold text-[#2B5659]">Trạng thái thanh toán: {paymentStatus}</p>}
          </section>
        )}

        {order && (
          <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Đơn hàng đã được tạo</p>
            <h2 className="mt-2 text-xl font-black text-emerald-900">{order.orderCode || order.orderId}</h2>
            <div className="mt-4 grid gap-3 text-sm text-emerald-900 sm:grid-cols-3">
              <p>Đã thanh toán: <strong>{formatCurrency(order.amountPaid)}</strong></p>
              <p>Còn lại: <strong>{formatCurrency(order.amountRemaining)}</strong></p>
              <p>Số lượng: <strong>{order.quantity}</strong></p>
            </div>
          </section>
        )}
      </>}
    </section>
  );
};

export default AgreementPage;

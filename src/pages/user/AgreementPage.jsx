import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AGREEMENT_STATUS,
  AGREEMENT_TYPE,
} from "../../constants/agreements";
import AgreementForm from "../../features/agreements/AgreementForm";
import AgreementSummary from "../../features/agreements/AgreementSummary";
import StaleDataWarningModal from "../../components/shared/StaleDataWarningModal";
import agreementApi from "../../services/apis/agreementApi";
import negotiationApi from "../../services/apis/negotiationApi";
import orderApi from "../../services/apis/orderApi";
import paymentApi from "../../services/apis/paymentApi";
import postApi from "../../services/apis/postApi";
import {
  AGREEMENT_CHANGED_WARNING,
  getAgreementChangedFields,
  getNegotiationChangedFields,
  getPostChangedFields,
  isConcurrencyConflict,
  VERIFICATION_FAILED_WARNING,
} from "../../utils/transactionFreshnessUtils";

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
  const [transactionContext, setTransactionContext] = useState({
    negotiation: null,
    post: null,
  });
  const [staleWarning, setStaleWarning] = useState(null);
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

      const nextNegotiationId =
        nextAgreement?.negotiationId ||
        nextPreview?.negotiationId ||
        negotiationIdParam;
      if (nextNegotiationId) {
        try {
          const nextNegotiation = await negotiationApi.getById(
            nextNegotiationId,
            { signal },
          );
          const nextPost = nextNegotiation.postId
            ? await postApi.getById(nextNegotiation.postId, { signal })
            : null;
          setTransactionContext({
            negotiation: nextNegotiation,
            post: nextPost,
          });
        } catch {
          setTransactionContext({ negotiation: null, post: null });
        }
      }

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

  const verifyAgreementContext = async () => {
    if (!agreement?.agreementId) {
      return null;
    }

    const latestAgreement = await agreementApi.getById(agreement.agreementId);
    const latestPreview = await agreementApi.getPreview(
      latestAgreement.negotiationId,
    );
    const latestNegotiation = await negotiationApi.getById(
      latestAgreement.negotiationId,
    );
    const latestPost = latestNegotiation.postId
      ? await postApi.getById(latestNegotiation.postId)
      : null;

    return {
      latestAgreement,
      latestPreview,
      latestNegotiation,
      latestPost,
      agreementChanges: getAgreementChangedFields(
        agreement,
        latestAgreement,
      ),
      negotiationChanges: transactionContext.negotiation
        ? getNegotiationChangedFields(
            transactionContext.negotiation,
            latestNegotiation,
          )
        : [],
      postChanges:
        transactionContext.post && latestPost
          ? getPostChangedFields(transactionContext.post, latestPost)
          : [],
    };
  };

  const stopForAgreementChange = (verification) => {
    setAgreement(verification.latestAgreement);
    setPreview(verification.latestPreview);
    setTransactionContext({
      negotiation: verification.latestNegotiation,
      post: verification.latestPost,
    });
    setEditing(false);
    setStaleWarning({
      message: AGREEMENT_CHANGED_WARNING,
      changedFields: [
        ...verification.agreementChanges,
        ...verification.negotiationChanges,
        ...verification.postChanges,
      ],
    });
  };

  const runAction = async (key, action, successMessage) => {
    setBusy(key);
    setError("");
    setNotice("");

    if (agreement?.agreementId) {
      let verification;
      try {
        verification = await verifyAgreementContext();
      } catch {
        setStaleWarning({ message: VERIFICATION_FAILED_WARNING });
        setBusy("");
        return;
      }

      if (
        verification.agreementChanges.length ||
        verification.negotiationChanges.length ||
        verification.postChanges.length
      ) {
        stopForAgreementChange(verification);
        setBusy("");
        return;
      }
    }

    try {
      await action();
      setNotice(successMessage);
      setEditing(false);
      await refresh();
    } catch (requestError) {
      if (isConcurrencyConflict(requestError)) {
        setStaleWarning({ message: AGREEMENT_CHANGED_WARNING });
        await refresh();
        return;
      }
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

    let verification;
    try {
      verification = await verifyAgreementContext();
    } catch {
      if (checkoutWindow) checkoutWindow.close();
      setStaleWarning({ message: VERIFICATION_FAILED_WARNING });
      setBusy("");
      return;
    }

    if (
      verification &&
      (verification.agreementChanges.length ||
        verification.negotiationChanges.length ||
        verification.postChanges.length)
    ) {
      if (checkoutWindow) checkoutWindow.close();
      stopForAgreementChange(verification);
      setBusy("");
      return;
    }

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
      if (isConcurrencyConflict(requestError)) {
        setStaleWarning({ message: AGREEMENT_CHANGED_WARNING });
        await refresh();
        return;
      }
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
    return <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-[#DCE8E5] bg-white p-14 text-center font-semibold text-[#68807F] shadow-[0_10px_30px_rgba(24,63,65,0.05)]">Đang tải thỏa thuận...</div>;
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#183F41] via-[#285E62] to-[#2F6F9F] px-6 py-6 text-white shadow-[0_16px_40px_rgba(24,63,65,0.14)] sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="pointer-events-none absolute -right-10 -top-20 h-44 w-44 rounded-full border-[30px] border-white/5" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C8ECE7]">Thỏa thuận giao dịch</p>
          <h1 className="mt-2 text-2xl font-black">Thỏa thuận giao dịch</h1>
          <p className="mt-2 text-sm leading-6 text-white/75">Kiểm tra lịch hẹn, giao nhận và điều khoản trước khi xác nhận.</p>
        </div>
        {negotiationId && <Link to={`/thuong-luong/${negotiationId}`} className="relative mt-4 inline-flex rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20 sm:mt-0">← Quay lại phòng</Link>}
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{notice}</div>}

      {!agreement && preview?.canCreate && (
        <AgreementForm negotiationId={negotiationId} onSubmit={handleSave} busy={busy === "save"} />
      )}

      {!agreement && !preview?.canCreate && (
        <div className="rounded-2xl border border-[#DCE8E5] bg-white p-10 text-center shadow-[0_10px_30px_rgba(24,63,65,0.05)]">
          <span className="material-symbols-outlined text-4xl text-[#4F8588]" aria-hidden="true">schedule</span>
          <h2 className="mt-4 text-xl font-black text-[#183F41]">Đang chờ người bán tạo thỏa thuận</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#68807F]">Người bán sẽ điền các điều khoản hai bên đã thống nhất. Bạn có thể xem, chỉnh sửa hoặc xác nhận sau khi form được gửi.</p>
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

        <div className="mt-5 flex flex-wrap justify-end gap-3 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)]">
          {canEdit && <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-[#4F8588] px-5 py-3 text-sm font-black text-[#285E62] hover:bg-[#F1F7F5]">Chỉnh sửa thỏa thuận</button>}
          {preview?.canConfirm && <button type="button" disabled={Boolean(busy)} onClick={() => runAction("accept", () => agreementApi.accept(agreement.agreementId), "Bạn đã xác nhận thỏa thuận.")} className="rounded-lg bg-[#4F8588] px-5 py-3 text-sm font-black text-white hover:bg-[#356A70] disabled:opacity-50">{busy === "accept" ? "Đang xác nhận..." : "Xác nhận thỏa thuận"}</button>}
          {canRequestEdit && <button type="button" disabled={Boolean(busy)} onClick={() => runAction("request-edit", () => agreementApi.requestEdit(agreement.agreementId), "Đã mở lại thỏa thuận. Hai bên cần xác nhận lại sau khi chỉnh sửa.")} className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800 hover:bg-amber-100 disabled:opacity-50">Yêu cầu chỉnh sửa</button>}
        </div>

        {canPay && (
          <section className="mt-5 rounded-2xl border border-[#C9DDED] bg-gradient-to-r from-white to-[#F1F7FC] p-5 shadow-[0_10px_30px_rgba(47,111,159,0.07)] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6F9F]">Bước tiếp theo</p>
            <h2 className="mt-1 text-lg font-black text-[#183F41]">Thanh toán để tiếp tục</h2>
            <p className="mt-2 text-sm leading-6 text-[#68807F]">Tổng giá trị thỏa thuận: <strong className="text-[#B33A32]">{formatCurrency(agreement.totalAmount)}</strong>. Số tiền cần thanh toán chính xác sẽ được hiển thị trên PayOS theo hình thức đặt cọc hoặc toàn phần đã chọn.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={handlePayOs} disabled={Boolean(busy)} className="rounded-lg bg-[#2F6F9F] px-5 py-3 text-sm font-black text-white hover:bg-[#245B84] disabled:opacity-50">{busy === "payos" ? "Đang tạo liên kết..." : "Thanh toán qua PayOS"}</button>
              <button type="button" onClick={handleWalletPayment} disabled={Boolean(busy)} className="rounded-lg border border-[#4F8588] bg-white px-5 py-3 text-sm font-black text-[#285E62] hover:bg-[#F1F7F5] disabled:opacity-50">{busy === "wallet" ? "Đang thanh toán..." : "Thanh toán bằng ví"}</button>
              <button type="button" onClick={checkPayment} className="rounded-lg border border-[#CDDED9] bg-white px-5 py-3 text-sm font-bold text-[#68807F] hover:bg-[#F7FAF9]">Kiểm tra trạng thái</button>
            </div>
            {paymentStatus && <p className="mt-3 text-sm font-bold text-[#285E62]">Trạng thái thanh toán: {paymentStatus}</p>}
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
            <Link
              to={`/don-hang/${order.orderId}`}
              className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800"
            >
              Xem chi tiết đơn hàng
            </Link>
          </section>
        )}
      </>}
      <StaleDataWarningModal
        open={Boolean(staleWarning)}
        message={staleWarning?.message}
        changedFields={staleWarning?.changedFields}
        onAcknowledge={() => setStaleWarning(null)}
      />
    </section>
  );
};

export default AgreementPage;

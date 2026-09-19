import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AGREEMENT_STATUS,
  AGREEMENT_TYPE,
  PAYMENT_TYPE,
} from "../../constants/agreements";
import AgreementForm from "../../features/agreements/AgreementForm";
import AgreementSummary from "../../features/agreements/AgreementSummary";
import StaleDataWarningModal from "../../components/shared/StaleDataWarningModal";
import agreementApi from "../../services/apis/agreementApi";
import negotiationApi from "../../services/apis/negotiationApi";
import orderApi from "../../services/apis/orderApi";
import paymentApi from "../../services/apis/paymentApi";
import postApi from "../../services/apis/postApi";
import walletApi from "../../services/apis/walletApi";
import {
  AGREEMENT_CHANGED_WARNING,
  getAgreementChangedFields,
  getNegotiationChangedFields,
  getPostChangedFields,
  isConcurrencyConflict,
  VERIFICATION_FAILED_WARNING,
} from "../../utils/transactionFreshnessUtils";
import {
  getSafeProblemDetail,
  getSafeValidationMessage,
} from "../../utils/safeErrorMessage";
import { getGhnErrorMessage } from "../../utils/ghnErrorMessages";

const PENDING_AGREEMENT_KEY = "homecycle:pending-payment-agreement-id";

/*
 * Mã lỗi nghiệp vụ GHN (Ghn.*) phải luôn được ánh xạ sang thông báo tiếng
 * Việt thân thiện trước, tránh lộ message kỹ thuật thô từ Backend (vd.
 * "Snapshot đã thay đổi..."). Nếu không phải lỗi GHN đã biết,
 * getGhnErrorMessage tự rơi về đúng hành vi cũ (fallbackMessage truyền vào).
 */
const getErrorMessage = (error, fallbackMessage) => {
  const responseData =
    error?.response?.data;

  const safeFallback =
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
    fallbackMessage;

  return getGhnErrorMessage(
    error,
    safeFallback,
  );
};

const getApiErrorCode = (error) =>
  String(
    error?.response?.data?.error?.code ||
      error?.response?.data?.code ||
      "",
  ).trim();

const isAgreementRevisionMismatch = (error) =>
  getApiErrorCode(error) === "Agreement.RevisionMismatch";

const isActiveCheckoutConflict = (error) =>
  getApiErrorCode(error) === "Payment.ActiveCheckoutExists";

const normalizePaymentTypeKey = (value) =>
  String(value ?? "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const hasSamePaymentQuote = (current, latest) =>
  Boolean(current && latest) &&
  normalizePaymentTypeKey(current.paymentType) ===
    normalizePaymentTypeKey(latest.paymentType) &&
  Number(current.depositRatePercent) ===
    Number(latest.depositRatePercent) &&
  Number(current.baseAmount) ===
    Number(latest.baseAmount) &&
  Number(current.shippingFee) ===
    Number(latest.shippingFee) &&
  Number(current.amountToPay) ===
    Number(latest.amountToPay);

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
  const [wallet, setWallet] = useState({
    loading: false,
    balance: null,
    error: "",
  });
  const [paymentQuote, setPaymentQuote] = useState({
    loading: false,
    data: null,
    error: "",
  });
  const [paymentAck, setPaymentAck] = useState(false);
  const paymentActionLockRef = useRef(false);

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
            ? await postApi.getTypedDetail(nextNegotiation.postId, { signal })
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
    };
  }, [loadData]);

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
      ? await postApi.getTypedDetail(latestNegotiation.postId)
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

  const runAction = async (
    key,
    action,
    successMessage,
    { beforeAction } = {},
  ) => {
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

    if (beforeAction) {
      const canContinue =
        await beforeAction();

      if (!canContinue) {
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
      if (isActiveCheckoutConflict(requestError)) {
        setError(
          "Đã có một phiên thanh toán đang được xử lý. Không tạo thêm thanh toán mới; hãy kiểm tra trạng thái hiện tại trước.",
        );
        return;
      }

      if (
        isConcurrencyConflict(requestError) ||
        isAgreementRevisionMismatch(requestError)
      ) {
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

  const loadWalletBalance = useCallback(async (signal) => {
    setWallet((current) => ({ ...current, loading: true, error: "" }));
    try {
      const info = await walletApi.getMine({ signal, skipGlobalErrorPage: true });
      setWallet({ loading: false, balance: info.availableBalance, error: "" });
    } catch (walletError) {
      if (
        walletError?.name === "CanceledError" ||
        walletError?.code === "ERR_CANCELED"
      ) {
        return;
      }
      setWallet({
        loading: false,
        balance: null,
        error: getErrorMessage(walletError, "Không thể tải số dư ví."),
      });
    }
  }, []);

  const loadPaymentQuote = useCallback(async (agreementId, signal) => {
    if (!agreementId) {
      return null;
    }

    // Một lần reload báo giá có thể trả về số tiền mới.
    // Consent cũ không được áp dụng cho báo giá mới.
    setPaymentAck(false);

    setPaymentQuote((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const quote = await paymentApi.getQuote(
        agreementId,
        { signal },
      );

      setPaymentQuote({
        loading: false,
        data: quote,
        error: "",
      });

      return quote;
    } catch (quoteError) {
      if (
        quoteError?.name === "CanceledError" ||
        quoteError?.code === "ERR_CANCELED"
      ) {
        return null;
      }

      const message = getErrorMessage(
        quoteError,
        "Không thể lấy số tiền thanh toán từ hệ thống.",
      );

      setPaymentQuote((current) => ({
        loading: false,
        data: current.data,
        error: message,
      }));

      return null;
    }
  }, []);

  const [walletContextKey, setWalletContextKey] = useState("");
  const buyerAwaitingPayment =
    String(preview?.userRole || "").toLowerCase() === "buyer" &&
    agreement?.agreementStatus === AGREEMENT_STATUS.AWAITING_PAYMENT;

  const paymentContextKey = `${agreement?.agreementId || ""}:${buyerAwaitingPayment}`;

  // Mỗi khi đổi thỏa thuận/bước thanh toán, bỏ mọi xác nhận và dữ liệu
  // tiền cũ. Quote từ Backend là authority cho số tiền phải trả.
  if (paymentContextKey !== walletContextKey) {
    setWalletContextKey(paymentContextKey);
    setPaymentAck(false);
    setWallet({
      loading: buyerAwaitingPayment,
      balance: null,
      error: "",
    });
    setPaymentQuote({
      loading: buyerAwaitingPayment,
      data: null,
      error: "",
    });
  }

  useEffect(() => {
    if (
      !buyerAwaitingPayment ||
      !agreement?.agreementId
    ) {
      return undefined;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void Promise.all([
        loadPaymentQuote(
          agreement.agreementId,
          controller.signal,
        ),
        loadWalletBalance(
          controller.signal,
        ),
      ]);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    agreement?.agreementId,
    buyerAwaitingPayment,
    loadPaymentQuote,
    loadWalletBalance,
    paymentContextKey,
  ]);

  const ensureFreshPaymentQuote = async () => {
    if (!agreement?.agreementId) {
      return null;
    }

    const currentQuote = paymentQuote.data;

    try {
      const latestQuote = await paymentApi.getQuote(
        agreement.agreementId,
      );

      setPaymentQuote({
        loading: false,
        data: latestQuote,
        error: "",
      });

      if (
        !currentQuote ||
        !hasSamePaymentQuote(
          currentQuote,
          latestQuote,
        )
      ) {
        setPaymentAck(false);
        setError(
          "Số tiền thanh toán vừa được hệ thống cập nhật. Vui lòng kiểm tra báo giá mới và xác nhận lại trước khi thanh toán.",
        );
        return null;
      }

      return latestQuote;
    } catch (quoteError) {
      const message = getErrorMessage(
        quoteError,
        "Không thể xác nhận lại số tiền thanh toán.",
      );

      setPaymentQuote((current) => ({
        loading: false,
        data: current.data,
        error: message,
      }));
      setError(message);

      return null;
    }
  };

  const checkPayment = useCallback(async ({ silent = false } = {}) => {
    if (!agreement?.agreementId) return "";
    try {
      const status = await paymentApi.getStatus(agreement.agreementId);
      setPaymentStatus(status);
      if (status.toLowerCase() === "completed") {
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
  }, [agreement, loadData]);

  const handlePayOs = async () => {
    if (paymentActionLockRef.current) return;
    paymentActionLockRef.current = true;
    try {
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

      const latestQuote =
        await ensureFreshPaymentQuote();

      if (!latestQuote) {
        if (checkoutWindow) checkoutWindow.close();
        setBusy("");
        return;
      }

      try {
        localStorage.setItem(PENDING_AGREEMENT_KEY, agreement.agreementId);
        const origin = window.location.origin;
        const agreementQuery = encodeURIComponent(
          agreement.agreementId,
        );
        const result = await paymentApi.createPayOsCheckout(
          agreement.agreementId,
          {
            returnUrl: `${origin}/payments/success?agreementId=${agreementQuery}`,
            cancelUrl: `${origin}/payments/cancel?agreementId=${agreementQuery}`,
          },
        );
        if (checkoutWindow) checkoutWindow.location.href = result.checkoutUrl;
        else window.location.assign(result.checkoutUrl);
        setNotice(
          "Đã mở trang PayOS ở thẻ mới. Khi PayOS chuyển bạn về HomeCycle, hệ thống sẽ kiểm tra lại trạng thái giao dịch.",
        );
      } catch (requestError) {
        if (checkoutWindow) checkoutWindow.close();
        if (isActiveCheckoutConflict(requestError)) {
          const currentStatus =
            await checkPayment({ silent: true });

          if (
            currentStatus.toLowerCase() !==
            "completed"
          ) {
            setError(
              "Đã có một phiên thanh toán PayOS đang được xử lý. Không tạo thêm phiên mới; hãy tiếp tục phiên hiện tại hoặc kiểm tra trạng thái.",
            );
          }

          return;
        }

        if (isConcurrencyConflict(requestError)) {
          setStaleWarning({ message: AGREEMENT_CHANGED_WARNING });
          await refresh();
          return;
        }
        setError(getErrorMessage(requestError, "Không thể tạo liên kết thanh toán PayOS."));
      } finally {
        setBusy("");
      }
    } finally {
      paymentActionLockRef.current = false;
    }
  };

  const handleWalletPayment = async () => {
    if (paymentActionLockRef.current) return;
    paymentActionLockRef.current = true;

    try {
      await runAction(
        "wallet",
        () => paymentApi.checkoutWithWallet(agreement.agreementId),
        "Thanh toán bằng ví thành công.",
        {
          // runAction kiểm tra agreement/negotiation/post trước.
          // Quote được xác nhận lại ngay sau đó, sát thời điểm trừ tiền nhất.
          beforeAction: async () =>
            Boolean(
              await ensureFreshPaymentQuote(),
            ),
        },
      );
      // Số dư có thể đã đổi (thanh toán thành công hoặc phát hiện không đủ) - làm mới để hiển thị đúng thực tế.
      await loadWalletBalance();
    } finally {
      paymentActionLockRef.current = false;
    }
  };

  const negotiationId = agreement?.negotiationId || preview?.negotiationId || negotiationIdParam;
  const canEdit = Boolean(preview?.canEdit) && agreement?.agreementStatus === AGREEMENT_STATUS.PENDING;
  const canRequestEdit = agreement?.agreementStatus === AGREEMENT_STATUS.AWAITING_PAYMENT;
  const canPay = buyerAwaitingPayment;

  const quotedAmount =
    Number(paymentQuote.data?.amountToPay);

  const hasPaymentQuote =
    Number.isFinite(quotedAmount) &&
    quotedAmount > 0;

  const totalAmount =
    hasPaymentQuote
      ? quotedAmount
      : 0;

  const isDepositPayment =
    normalizePaymentTypeKey(
      paymentQuote.data?.paymentType ||
        agreement?.paymentType,
    ) ===
    normalizePaymentTypeKey(
      PAYMENT_TYPE.DEPOSIT,
    );

  const hasSufficientBalance =
    hasPaymentQuote &&
    wallet.balance !== null &&
    wallet.balance >= totalAmount;

  const paymentReady =
    hasPaymentQuote &&
    !paymentQuote.loading &&
    !paymentQuote.error;

  const walletUnavailableReason =
    paymentQuote.loading
      ? "Đang xác nhận số tiền thanh toán từ hệ thống..."
      : paymentQuote.error
        ? paymentQuote.error
        : !hasPaymentQuote
          ? "Chưa xác định được số tiền cần thanh toán."
          : wallet.loading
            ? "Đang kiểm tra số dư ví..."
            : wallet.error
              ? wallet.error
              : wallet.balance === null
                ? "Chưa xác định được số dư ví."
                : !hasSufficientBalance
                  ? `Số dư ví thấp hơn số tiền cần thanh toán ${formatCurrency(totalAmount)}.`
                  : "";

  const walletDisabled =
    Boolean(walletUnavailableReason);

  if (loading) {
    return <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-border bg-white p-14 text-center font-semibold text-textLight shadow-[0_10px_30px_rgba(23,40,48,0.05)]">Đang tải thỏa thuận...</div>;
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-primary px-6 py-6 text-white shadow-[0_16px_40px_rgba(23,40,48,0.14)] sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="pointer-events-none absolute -right-10 -top-20 h-44 w-44 rounded-full border-[30px] border-white/5" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Thỏa thuận giao dịch</p>
          <h1 className="mt-2 text-2xl font-black">Thỏa thuận giao dịch</h1>
          <p className="mt-2 text-sm leading-6 text-white/75">Kiểm tra lịch hẹn, giao nhận và điều khoản trước khi xác nhận.</p>
        </div>
        {negotiationId && <Link to={`/thuong-luong/${negotiationId}`} className="relative mt-4 inline-flex rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20 sm:mt-0">← Quay lại phòng</Link>}
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</div>}
      {notice && <div className="mb-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{notice}</div>}

      {!agreement && preview?.canCreate && (
        <AgreementForm negotiationId={negotiationId} originalPost={transactionContext.post} onSubmit={handleSave} busy={busy === "save"} />
      )}

      {!agreement && !preview?.canCreate && (
        <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-[0_10px_30px_rgba(23,40,48,0.05)]">
          <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">schedule</span>
          <h2 className="mt-4 text-xl font-black text-text">Đang chờ người bán tạo thỏa thuận</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-textLight">Người bán sẽ điền các điều khoản hai bên đã thống nhất. Bạn có thể xem, chỉnh sửa hoặc xác nhận sau khi form được gửi.</p>
        </div>
      )}

      {agreement && editing && (
        <AgreementForm agreement={agreement} negotiationId={negotiationId} originalPost={transactionContext.post} onSubmit={handleSave} onCancel={() => setEditing(false)} busy={busy === "save"} />
      )}

      {agreement && !editing && <>
        <AgreementSummary agreement={agreement} />

        {agreement.agreementType === AGREEMENT_TYPE.INSPECTION && agreement.agreementStatus === AGREEMENT_STATUS.CONFIRMED && (
          <div className="mt-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-primary">
            Thỏa thuận có lịch kiểm định. Bạn có thể theo dõi lịch và check-in tại mục <Link to="/lich-hen" className="font-black underline">Lịch hẹn</Link>. Chức năng ghi nhận kết quả đạt/không đạt sẽ được bổ sung khi backend cung cấp API.
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)]">
          {canEdit && <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-primary px-5 py-3 text-sm font-black text-primary hover:bg-primary/10">Chỉnh sửa thỏa thuận</button>}
          {preview?.canConfirm && <button type="button" disabled={Boolean(busy)} onClick={() => runAction("accept", () => agreementApi.accept(agreement.agreementId, agreement?.agreementDetails?.revision), "Bạn đã xác nhận thỏa thuận.")} className="rounded-lg bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary/90 disabled:opacity-50">{busy === "accept" ? "Đang xác nhận..." : "Xác nhận thỏa thuận"}</button>}
          {canRequestEdit && <button type="button" disabled={Boolean(busy)} onClick={() => runAction("request-edit", () => agreementApi.requestEdit(agreement.agreementId), "Đã mở lại thỏa thuận. Hai bên cần xác nhận lại sau khi chỉnh sửa.")} className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-3 text-sm font-black text-warning hover:bg-warning/20 disabled:opacity-50">Yêu cầu chỉnh sửa</button>}
        </div>

        {canPay && (
          <section className="mt-5 rounded-2xl border border-border bg-gradient-to-r from-white to-background p-5 shadow-[0_10px_30px_rgba(23,40,48,0.07)] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Bước tiếp theo</p>
            <h2 className="mt-1 text-lg font-black text-text">Thanh toán để tiếp tục</h2>
            <p className="mt-2 text-sm leading-6 text-textLight">
              Tổng giá trị thỏa thuận: <strong>{formatCurrency(agreement.totalAmount)}</strong>.{" "}
              {paymentQuote.loading
                ? "Đang lấy báo giá thanh toán mới nhất từ hệ thống."
                : paymentQuote.error
                  ? "Chưa thể xác nhận báo giá thanh toán."
                  : hasPaymentQuote
                    ? <>
                        Số tiền cần thanh toán hiện tại:{" "}
                        <strong className="text-error">{formatCurrency(totalAmount)}</strong>
                        {isDepositPayment && Number(paymentQuote.data?.depositRatePercent) > 0
                          ? ` (${Number(paymentQuote.data.depositRatePercent)}% đặt cọc)`
                          : ""}.
                      </>
                    : "Chưa xác định được số tiền cần thanh toán."}
            </p>

            {paymentQuote.error && (
              <button
                type="button"
                onClick={() =>
                  loadPaymentQuote(
                    agreement.agreementId,
                  )
                }
                className="mt-2 text-sm font-bold text-primary underline"
              >
                Tải lại báo giá
              </button>
            )}

            <div className="mt-4 rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-textLight">Thanh toán bằng ví</p>
              {paymentQuote.loading ? (
                <p className="mt-1 text-sm text-textLight">
                  Đang xác nhận số tiền thanh toán...
                </p>
              ) : paymentQuote.error ? (
                <p className="mt-1 text-sm font-semibold text-error">
                  {paymentQuote.error}
                </p>
              ) : !hasPaymentQuote ? (
                <p className="mt-1 text-sm text-textLight">
                  Chưa xác định được số tiền cần thanh toán.
                </p>
              ) : wallet.loading ? (
                <p className="mt-1 text-sm text-textLight">Đang kiểm tra số dư ví...</p>
              ) : wallet.error ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-error">{wallet.error}</p>
                  <button type="button" onClick={loadWalletBalance} className="text-sm font-bold text-primary underline">Thử lại</button>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-lg font-black text-text">{formatCurrency(wallet.balance)}</p>
                  <p className={`mt-1 text-xs font-bold ${hasSufficientBalance ? "text-success" : "text-error"}`}>
                    {hasSufficientBalance
                      ? "Đủ số dư để thanh toán bằng ví."
                      : `Số dư ví hiện thấp hơn số tiền cần thanh toán ${formatCurrency(totalAmount)}. Vui lòng nạp thêm ví hoặc chọn thanh toán qua PayOS.`}
                  </p>
                </>
              )}
            </div>

            <label className="mt-4 flex items-start gap-2.5 text-sm leading-6 text-textLight">
              <input
                type="checkbox"
                checked={paymentAck}
                disabled={!paymentReady || Boolean(busy)}
                onChange={(event) => setPaymentAck(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {`Tôi đã kiểm tra thông tin thỏa thuận và số tiền cần thanh toán ${formatCurrency(totalAmount)}, và đồng ý tiếp tục thanh toán.`}
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={handlePayOs} disabled={Boolean(busy) || !paymentAck || !paymentReady} className="rounded-lg bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{busy === "payos" ? "Đang tạo liên kết..." : "Thanh toán qua PayOS"}</button>
              <button
                type="button"
                onClick={handleWalletPayment}
                disabled={Boolean(busy) || !paymentAck || walletDisabled}
                title={walletDisabled ? walletUnavailableReason : undefined}
                className="rounded-lg border border-primary bg-white px-5 py-3 text-sm font-black text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "wallet" ? "Đang thanh toán..." : "Thanh toán bằng ví"}
              </button>
              <button type="button" onClick={checkPayment} className="rounded-lg border border-border bg-white px-5 py-3 text-sm font-bold text-textLight hover:bg-background">Kiểm tra trạng thái</button>
            </div>
            {paymentStatus && <p className="mt-3 text-sm font-bold text-primary">Trạng thái thanh toán: {paymentStatus}</p>}
          </section>
        )}

        {order && (
          <section className="mt-5 rounded-2xl border border-success/30 bg-success/10 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-success">Đơn hàng đã được tạo</p>
            <h2 className="mt-2 text-xl font-black text-success">{order.orderCode || order.orderId}</h2>
            {(order.amountPaid !== undefined ||
              order.amountRemaining !== undefined ||
              order.quantity !== undefined) && (
              <div className="mt-4 grid gap-3 text-sm text-success sm:grid-cols-3">
                {order.amountPaid !== undefined && (
                  <p>Đã thanh toán: <strong>{formatCurrency(order.amountPaid)}</strong></p>
                )}
                {order.amountRemaining !== undefined && (
                  <p>Còn lại: <strong>{formatCurrency(order.amountRemaining)}</strong></p>
                )}
                {order.quantity !== undefined && (
                  <p>Số lượng: <strong>{order.quantity}</strong></p>
                )}
              </div>
            )}
            <Link
              to={`/don-hang/${order.orderId}`}
              className="mt-5 inline-flex rounded-xl bg-success px-5 py-2.5 text-sm font-black text-white hover:bg-success/90"
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

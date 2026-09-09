import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import orderApi from "../../services/apis/orderApi";
import paymentApi from "../../services/apis/paymentApi";

const PENDING_AGREEMENT_KEY =
  "homecycle:pending-payment-agreement-id";

const PENDING_SETTLEMENT_PAYMENT_KEY =
  "homecycle:pending-order-settlement-payment-id";

const PENDING_SETTLEMENT_ORDER_KEY =
  "homecycle:pending-order-settlement-order-id";

const PENDING_SETTLEMENT_AMOUNT_KEY =
  "homecycle:pending-order-settlement-amount";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  "Hệ thống chưa thể xác nhận giao dịch.";

const clearSettlementStorage = () => {
  localStorage.removeItem(
    PENDING_SETTLEMENT_PAYMENT_KEY,
  );

  localStorage.removeItem(
    PENDING_SETTLEMENT_ORDER_KEY,
  );

  localStorage.removeItem(
    PENDING_SETTLEMENT_AMOUNT_KEY,
  );
};

const PaymentResultPage = () => {
  const [searchParams] =
    useSearchParams();

  const location =
    useLocation();

  const flow =
    String(
      searchParams.get("flow") || "",
    )
      .trim()
      .toLowerCase();

  const isSettlement =
    flow === "settlement";

  const agreementId =
    localStorage.getItem(
      PENDING_AGREEMENT_KEY,
    ) || "";

  const settlementPaymentId =
    localStorage.getItem(
      PENDING_SETTLEMENT_PAYMENT_KEY,
    ) || "";

  const settlementOrderId =
    localStorage.getItem(
      PENDING_SETTLEMENT_ORDER_KEY,
    ) || "";

  const payOsStatus =
    String(
      searchParams.get("status") || "",
    ).toUpperCase();

  const cancelledByRoute =
    location.pathname.endsWith(
      "/cancel",
    ) ||
    String(
      searchParams.get("cancel") || "",
    ).toLowerCase() === "true";

  const [state, setState] =
    useState({
      loading:
        isSettlement
          ? Boolean(
              settlementPaymentId,
            )
          : Boolean(agreementId) &&
            !cancelledByRoute,

      status:
        cancelledByRoute
          ? "Cancelled"
          : "",

      order: null,

      orderId:
        isSettlement
          ? settlementOrderId
          : "",

      error: "",
    });

  const [retryBusy, setRetryBusy] =
    useState(false);

  useEffect(() => {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        async () => {
          if (isSettlement) {
            if (
              !settlementPaymentId
            ) {
              setState((current) => ({
                ...current,
                loading: false,
              }));

              return;
            }

            try {
              const result =
                await paymentApi
                  .getOrderSettlementStatus(
                    settlementPaymentId,
                    {
                      signal:
                        controller.signal,
                    },
                  );

              const status =
                String(
                  result?.paymentStatus ||
                    "",
                ).trim();

              const orderId =
                result?.orderId ||
                settlementOrderId ||
                "";

              let order = null;

              if (
                status.toLowerCase() ===
                  "completed" &&
                orderId
              ) {
                try {
                  const response =
                    await orderApi.getById(
                      orderId,
                      {
                        signal:
                          controller.signal,
                      },
                    );

                  order =
                    response?.order ||
                    response;
                } catch {
                  order = null;
                }

                clearSettlementStorage();
              }

              setState({
                loading: false,
                status:
                  status ||
                  (cancelledByRoute
                    ? "Cancelled"
                    : ""),
                order,
                orderId,
                error: "",
              });
            } catch (error) {
              if (
                error?.name !==
                  "CanceledError" &&
                error?.code !==
                  "ERR_CANCELED"
              ) {
                setState({
                  loading: false,
                  status:
                    cancelledByRoute
                      ? "Cancelled"
                      : payOsStatus ===
                          "PAID"
                        ? "Pending"
                        : "",
                  order: null,
                  orderId:
                    settlementOrderId,
                  error:
                    getErrorMessage(
                      error,
                    ),
                });
              }
            }

            return;
          }

          if (
            !agreementId ||
            cancelledByRoute
          ) {
            return;
          }

          try {
            const status =
              await paymentApi.getStatus(
                agreementId,
                {
                  signal:
                    controller.signal,
                },
              );

            let order = null;

            if (
              status.toLowerCase() ===
              "completed"
            ) {
              order =
                await orderApi
                  .getByAgreementId(
                    agreementId,
                    {
                      signal:
                        controller.signal,
                    },
                  );

              localStorage.removeItem(
                PENDING_AGREEMENT_KEY,
              );
            }

            setState({
              loading: false,
              status,
              order,
              orderId:
                order?.orderId || "",
              error: "",
            });
          } catch (error) {
            if (
              error?.name !==
                "CanceledError" &&
              error?.code !==
                "ERR_CANCELED"
            ) {
              setState({
                loading: false,
                status:
                  payOsStatus === "PAID"
                    ? "Processing"
                    : "",
                order: null,
                orderId: "",
                error:
                  getErrorMessage(
                    error,
                  ),
              });
            }
          }
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
    agreementId,
    cancelledByRoute,
    isSettlement,
    payOsStatus,
    settlementOrderId,
    settlementPaymentId,
  ]);

  const handleSettlementRetry =
    async () => {
      if (
        !settlementPaymentId
      ) {
        return;
      }

      const checkoutWindow =
        window.open(
          "about:blank",
          "_blank",
        );

      if (checkoutWindow) {
        checkoutWindow.opener =
          null;
      }

      setRetryBusy(true);

      try {
        const origin =
          window.location.origin;

        const result =
          await paymentApi
            .createOrderSettlementPayOsCheckout(
              settlementPaymentId,
              {
                returnUrl:
                  `${origin}/payments/success?flow=settlement`,

                cancelUrl:
                  `${origin}/payments/cancel?flow=settlement`,
              },
            );

        if (checkoutWindow) {
          checkoutWindow.location.href =
            result.checkoutUrl;

          setRetryBusy(false);
        } else {
          window.location.assign(
            result.checkoutUrl,
          );
        }
      } catch (error) {
        if (checkoutWindow) {
          checkoutWindow.close();
        }

        setState((current) => ({
          ...current,
          error:
            getErrorMessage(error),
        }));

        setRetryBusy(false);
      }
    };

  const normalizedStatus =
    String(state.status || "")
      .trim()
      .toLowerCase();

  const completed =
    normalizedStatus ===
    "completed";

  const cancelled =
    normalizedStatus ===
      "cancelled" ||
    (
      !normalizedStatus &&
      cancelledByRoute
    );

  const expired =
    normalizedStatus ===
    "expired";

  const failed =
    normalizedStatus ===
    "failed";

  const resultOrderId =
    state.order?.orderId ||
    state.orderId ||
    settlementOrderId;

  const title = (() => {
    if (completed) {
      return isSettlement
        ? "Thanh toán bổ sung thành công"
        : "Thanh toán thành công";
    }

    if (expired) {
      return "Liên kết thanh toán đã hết hạn";
    }

    if (cancelled) {
      return isSettlement
        ? "Thanh toán bổ sung đã được hủy"
        : "Thanh toán đã được hủy";
    }

    if (failed) {
      return "Thanh toán chưa thành công";
    }

    if (state.loading) {
      return isSettlement
        ? "Đang xác nhận khoản thanh toán bổ sung"
        : "Đang xác nhận giao dịch";
    }

    return isSettlement
      ? "Đang đồng bộ thanh toán bổ sung"
      : "PayOS đã ghi nhận thanh toán";
  })();

  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <div className="w-full rounded-2xl border border-border bg-white p-7 text-center shadow-[0_16px_42px_rgba(23,40,48,0.09)] sm:p-10">
        <span
          className={[
            "material-symbols-outlined text-5xl",
            completed
              ? "text-success"
              : cancelled ||
                  expired ||
                  failed
                ? "text-error"
                : "text-primary",
          ].join(" ")}
          aria-hidden="true"
        >
          {completed
            ? "check_circle"
            : cancelled ||
                expired ||
                failed
              ? "cancel"
              : state.loading
                ? "progress_activity"
                : "sync"}
        </span>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-primary">
          {isSettlement
            ? "Thanh toán phần còn lại"
            : "Kết quả thanh toán"}
        </p>

        <h1 className="mt-2 text-2xl font-black text-text">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-textLight">
          {completed
            ? isSettlement
              ? "HomeCycle đã ghi nhận phần tiền còn lại và cập nhật đơn hàng để tiếp tục giao nhận."
              : "HomeCycle đã ghi nhận khoản thanh toán và cập nhật dữ liệu giao dịch."
            : expired
              ? "Liên kết PayOS trước đã hết hiệu lực. Bạn có thể tạo lại một liên kết mới cho cùng khoản thanh toán."
              : cancelled
                ? isSettlement
                  ? "Khoản thanh toán bổ sung chưa hoàn tất. Bạn có thể tạo lại liên kết PayOS."
                  : "Bạn chưa bị ghi nhận thanh toán. Có thể quay lại thỏa thuận để kiểm tra."
                : "HomeCycle đang đồng bộ trạng thái mới nhất từ máy chủ."}
        </p>

        {state.error && (
          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-left text-sm leading-6 text-warning">
            {state.error}
          </div>
        )}

        {state.order && (
          <div className="mt-5 rounded-xl border border-success/30 bg-success/10 p-4 text-left text-sm text-success">
            <p>
              <strong>
                Mã đơn hàng:
              </strong>{" "}
              {state.order.orderCode ||
                state.order.orderId}
            </p>

            {state.order.quantity !==
              undefined && (
              <p className="mt-1">
                <strong>
                  Số lượng:
                </strong>{" "}
                {state.order.quantity}
              </p>
            )}
          </div>
        )}

        {isSettlement &&
          !settlementPaymentId &&
          !completed && (
            <p className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
              Không tìm thấy mã khoản thanh toán bổ sung để đối chiếu.
              Hãy quay lại đơn hàng để kiểm tra trạng thái.
            </p>
          )}

        {!isSettlement &&
          !agreementId && (
            <p className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
              Không tìm thấy thông tin phiên thanh toán để đối chiếu.
              Bạn có thể vào danh sách đơn hàng để kiểm tra trạng thái giao dịch.
            </p>
          )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {isSettlement &&
            !completed &&
            settlementPaymentId && (
              <button
                type="button"
                onClick={
                  handleSettlementRetry
                }
                disabled={
                  retryBusy ||
                  state.loading
                }
                className="rounded-lg bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {retryBusy
                  ? "Đang mở PayOS..."
                  : "Mở lại PayOS"}
              </button>
            )}

          {resultOrderId && (
            <Link
              to={`/don-hang/${resultOrderId}`}
              className="rounded-lg border border-primary bg-white px-5 py-3 text-sm font-black text-primary transition hover:bg-primary/10"
            >
              Xem đơn hàng
            </Link>
          )}

          <Link
            to="/"
            className="rounded-lg border border-border bg-white px-5 py-3 text-sm font-black text-text transition hover:bg-background"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PaymentResultPage;
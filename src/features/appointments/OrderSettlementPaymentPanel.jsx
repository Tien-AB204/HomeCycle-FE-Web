import { useState } from "react";
import paymentApi from "../../services/apis/paymentApi";

const PENDING_AGREEMENT_KEY =
  "homecycle:pending-payment-agreement-id";

const PENDING_SETTLEMENT_PAYMENT_KEY =
  "homecycle:pending-order-settlement-payment-id";

const PENDING_SETTLEMENT_ORDER_KEY =
  "homecycle:pending-order-settlement-order-id";

const PENDING_SETTLEMENT_AMOUNT_KEY =
  "homecycle:pending-order-settlement-amount";

const getErrorMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  fallback;

const formatCurrency = (value) => {
  const rawValue =
    String(value ?? "").trim();

  if (!rawValue) {
    return "Theo số tiền máy chủ xác nhận";
  }

  const amount = Number(rawValue);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "Theo số tiền máy chủ xác nhận";
};

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

const persistSettlement = (
  settlement,
) => {
  localStorage.setItem(
    PENDING_SETTLEMENT_PAYMENT_KEY,
    settlement.paymentId,
  );

  if (settlement.orderId) {
    localStorage.setItem(
      PENDING_SETTLEMENT_ORDER_KEY,
      settlement.orderId,
    );
  } else {
    localStorage.removeItem(
      PENDING_SETTLEMENT_ORDER_KEY,
    );
  }

  const rawAmount =
    String(
      settlement.amount ?? "",
    ).trim();

  if (
    rawAmount &&
    Number.isFinite(
      Number(rawAmount),
    )
  ) {
    localStorage.setItem(
      PENDING_SETTLEMENT_AMOUNT_KEY,
      rawAmount,
    );
  } else {
    localStorage.removeItem(
      PENDING_SETTLEMENT_AMOUNT_KEY,
    );
  }

  /*
   * Settlement PayOS phải thắng một
   * agreement checkout cũ còn sót.
   */
  localStorage.removeItem(
    PENDING_AGREEMENT_KEY,
  );
};

const OrderSettlementPaymentPanel = ({
  settlement,
  onCompleted,
}) => {
  const [busy, setBusy] =
    useState("");

  const [error, setError] =
    useState("");

  const paymentId =
    String(
      settlement?.paymentId || "",
    ).trim();

  const handleWallet = async () => {
    if (!paymentId) {
      return;
    }

    setBusy("wallet");
    setError("");

    try {
      const result =
        await paymentApi
          .checkoutOrderSettlementWithWallet(
            paymentId,
          );

      if (
        String(
          result?.paymentStatus || "",
        ).toLowerCase() !==
        "completed"
      ) {
        throw new Error(
          "Máy chủ chưa xác nhận khoản thanh toán đã hoàn tất.",
        );
      }

      clearSettlementStorage();

      await onCompleted?.(
        result,
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Không thể thanh toán phần còn lại bằng ví.",
        ),
      );
    } finally {
      setBusy("");
    }
  };

  const handlePayOs = async () => {
    if (!paymentId) {
      return;
    }

    const checkoutWindow =
      window.open(
        "about:blank",
        "_blank",
      );

    if (checkoutWindow) {
      checkoutWindow.opener = null;
    }

    setBusy("payos");
    setError("");

    persistSettlement(
      settlement,
    );

    try {
      const origin =
        window.location.origin;

      const result =
        await paymentApi
          .createOrderSettlementPayOsCheckout(
            paymentId,
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

        /*
         * Tab hiện tại vẫn còn mở, nên cho phép
         * người dùng thao tác lại nếu họ đóng PayOS.
         */
        setBusy("");
      } else {
        window.location.assign(
          result.checkoutUrl,
        );
      }
    } catch (requestError) {
      if (checkoutWindow) {
        checkoutWindow.close();
      }

      setError(
        getErrorMessage(
          requestError,
          "Không thể tạo liên kết PayOS cho khoản thanh toán bổ sung.",
        ),
      );

      setBusy("");
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4">
      <div className="flex items-start gap-3">
        <span
          className="material-symbols-outlined mt-0.5 text-warning"
          aria-hidden="true"
        >
          payments
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-text">
            Cần thanh toán phần còn lại
          </p>

          <p className="mt-1 text-xs leading-5 text-textLight">
            Lịch thu gom đã được tạo.
            Khoản tiền tiếp theo do máy chủ
            xác định và phải hoàn tất trước
            khi tiếp tục giao nhận.
          </p>

          <p className="mt-3 text-lg font-black text-warning">
            {formatCurrency(
              settlement?.amount,
            )}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-error/20 bg-error/10 px-3 py-2.5 text-xs font-semibold leading-5 text-error"
            >
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleWallet}
              disabled={
                Boolean(busy) ||
                !paymentId
              }
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "wallet"
                ? "Đang thanh toán..."
                : "Thanh toán bằng ví"}
            </button>

            <button
              type="button"
              onClick={handlePayOs}
              disabled={
                Boolean(busy) ||
                !paymentId
              }
              className="rounded-lg border border-primary bg-white px-4 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "payos"
                ? "Đang mở PayOS..."
                : "Thanh toán qua PayOS"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderSettlementPaymentPanel;
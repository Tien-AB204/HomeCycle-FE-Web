import { useState } from "react";
import { Link } from "react-router-dom";
import orderApi from "../../services/apis/orderApi";
import OrderDisputeModal from "../disputes/OrderDisputeModal";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  "Không thể thực hiện thao tác.";

const OrderTransactionActions = ({ order, detail, onRefresh }) => {
  const [busy, setBusy] =
    useState("");

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [
    disputeOpen,
    setDisputeOpen,
  ] = useState(false);

  const orderActions =
    detail?.actions ||
    order?.actions ||
    {};

  const normalizeConfirmAction = (
    value,
  ) =>
    String(value ?? "")
      .replace(/[\s_-]/g, "")
      .toLowerCase();

  const confirmAction =
    normalizeConfirmAction(
      orderActions.confirmAction,
    );

  const showSellerReady =
    orderActions.canConfirmSellerReady ===
    true;

  const showSellerConfirmation =
    orderActions.canConfirm === true &&
    (
      confirmAction === "1" ||
      confirmAction ===
        "confirmhandover"
    );

  const showBuyerConfirmation =
    orderActions.canConfirm === true &&
    (
      confirmAction === "2" ||
      confirmAction ===
        "confirmreceived"
    );

  const canCreateDispute =
    orderActions.canDispute === true &&
    !detail?.dispute?.hasActiveDispute;

  const canCancelOrder =
    orderActions.canCancel === true;

  const canConfirmReturn =
    orderActions.canConfirmReturn ===
    true;

  const canConfirmReturnReceived =
    orderActions
      .canConfirmReturnReceived ===
    true;

  const latestDisputeId =
    detail?.dispute?.latestDisputeId;

  const shipment =
    detail?.shipment ||
    order?.shipment ||
    {};

  const shipmentId =
    String(
      shipment?.shipmentId || "",
    ).trim();

  const normalizedDeliveryMethod =
    String(
      order?.deliveryMethod ?? "",
    )
      .replace(/[\s_-]/g, "")
      .toLowerCase();

  const isGhnDelivery =
    normalizedDeliveryMethod === "1" ||
    normalizedDeliveryMethod ===
      "ghndelivery";

  const sellerAlreadyConfirmed =
    Boolean(
      order?.sellerHandoverConfirmedAt,
    );

  const productName =
    order?.productName || detail?.postDescription || "Sản phẩm trong đơn hàng";

  const runAction = async ({ key, confirmation, action, successMessage }) => {
    if (busy) {
      return;
    }

    const accepted = window.confirm(confirmation);

    if (!accepted) {
      return;
    }

    setBusy(key);
    setError("");
    setNotice("");

    try {
      await action();

      setNotice(successMessage);

      onRefresh?.();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusy("");
    }
  };

  const confirmHandover = () =>
    runAction({
      key: "handover",
      confirmation:
        "Bạn xác nhận đã bàn giao sản phẩm cho người mua? Thao tác này sẽ được ghi nhận vào đơn hàng.",
      action: () => orderApi.confirmHandover(order.orderId),
      successMessage: "Đã xác nhận bàn giao sản phẩm thành công.",
    });

  const confirmReceived = () =>
    runAction({
      key: "received",
      confirmation:
        "Bạn xác nhận đã nhận được sản phẩm? Nếu các điều kiện giao nhận hợp lệ, đơn hàng sẽ được hoàn tất.",
      action: () => orderApi.confirmReceived(order.orderId),
      successMessage:
        "Đã xác nhận nhận sản phẩm thành công. Trạng thái đơn hàng đã được cập nhật.",
    });

  const confirmSellerReady = () => {
    if (!shipmentId) {
      setError(
        "Máy chủ cho phép xác nhận chuẩn bị hàng nhưng chưa trả về mã vận chuyển.",
      );

      return;
    }

    runAction({
      key: "seller-ready",
      confirmation:
        "Bạn xác nhận sản phẩm đã được chuẩn bị xong và sẵn sàng để giao nhận?",
      action: () =>
        orderApi.confirmSellerReady(
          shipmentId,
        ),
      successMessage:
        "Đã xác nhận hàng sẵn sàng để giao nhận.",
    });
  };

  const cancelAfterRejectedInspection = () =>
    runAction({
      key: "cancel-order",
      confirmation:
        "Hủy giao dịch này? Chỉ thực hiện khi kết quả kiểm định đã bị từ chối và máy chủ cho phép hủy.",
      action: () =>
        orderApi.cancelAfterRejectedInspection(
          order.orderId,
        ),
      successMessage:
        "Đã hủy giao dịch theo kết quả kiểm định.",
    });

  const confirmReturn = () =>
    runAction({
      key: "confirm-return",
      confirmation:
        "Bạn xác nhận đã trả lại sản phẩm cho người bán? Hệ thống sẽ bắt đầu thời hạn để người bán xác nhận đã nhận lại hàng.",
      action: () =>
        orderApi.confirmReturn(
          order.orderId,
        ),
      successMessage:
        "Đã xác nhận trả lại sản phẩm.",
    });

  const confirmReturnReceived = () =>
    runAction({
      key: "return-received",
      confirmation:
        "Bạn xác nhận đã nhận lại sản phẩm? Sau khi xác nhận, hệ thống sẽ tiếp tục xử lý hoàn tiền theo trạng thái giao dịch.",
      action: () =>
        orderApi.confirmReturnReceived(
          order.orderId,
        ),
      successMessage:
        "Đã xác nhận nhận lại sản phẩm.",
    });

  const handleDisputeCreated = async (result) => {
    setDisputeOpen(false);
    setError("");

    setNotice(
      "Đã tạo tranh chấp thành công. Giao dịch đang được chuyển sang trạng thái tranh chấp.",
    );

    onRefresh?.();

    return result;
  };

  const hasAnyConfirmationAction =
    showSellerReady ||
    showSellerConfirmation ||
    showBuyerConfirmation;

  const hasResolutionAction =
    canCancelOrder ||
    canConfirmReturn ||
    canConfirmReturnReceived;

  return (
    <>
      <section className="mt-5 rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
        <div className="border-b border-border pb-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            Thao tác giao dịch
          </p>

          <h2 className="mt-1 text-lg font-black text-text">
            Xác nhận giao nhận & tranh chấp
          </h2>
        </div>

        {notice && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-success"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
          >
            {error}
          </div>
        )}

        {hasAnyConfirmationAction && (
          <div className="mt-4 rounded-xl bg-background p-4">
            <h3 className="text-sm font-black text-text">
              Xác nhận giao nhận
            </h3>

            {showSellerReady && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-text">
                    Chuẩn bị giao hàng
                  </p>

                  <p className="mt-1 text-xs leading-5 text-textLight">
                    Xác nhận khi sản phẩm đã được chuẩn bị xong và sẵn sàng
                    để giao hoặc bàn giao.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    confirmSellerReady
                  }
                  disabled={
                    Boolean(busy) ||
                    !shipmentId
                  }
                  className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "seller-ready"
                    ? "Đang xác nhận..."
                    : "Hàng đã sẵn sàng"}
                </button>
              </div>
            )}

            {showSellerConfirmation && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-text">
                    Xác nhận đã bàn giao
                  </p>

                  <p className="mt-1 text-xs leading-5 text-textLight">
                    Chỉ xác nhận sau khi hai bên đã check-in tại lịch hẹn thu
                    gom.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={Boolean(busy) || sellerAlreadyConfirmed}
                  onClick={confirmHandover}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "handover"
                    ? "Đang xác nhận..."
                    : sellerAlreadyConfirmed
                      ? "Đã xác nhận bàn giao"
                      : "Xác nhận đã bàn giao"}
                </button>
              </div>
            )}

            {showBuyerConfirmation && (
              <div
                className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                  showSellerConfirmation
                    ? "mt-4 border-t border-border pt-4"
                    : "mt-3"
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-text">
                    Xác nhận đã nhận hàng
                  </p>

                  <p className="mt-1 text-xs leading-5 text-textLight">
                    {isGhnDelivery
                      ? "Với GHN, chỉ xác nhận sau khi hệ thống vận chuyển ghi nhận giao hàng thành công."
                      : "Hai bên phải hoàn thành check-in lịch hẹn trước khi xác nhận nhận sản phẩm."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={confirmReceived}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "received"
                    ? "Đang xác nhận..."
                    : "Xác nhận đã nhận hàng"}
                </button>
              </div>
            )}
          </div>
        )}

        {hasResolutionAction && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
                Xử lý giao dịch
              </p>

              <h3 className="mt-1 text-sm font-black text-text">
                Hủy hoặc hoàn trả sản phẩm
              </h3>

              <p className="mt-1 text-xs leading-5 text-textLight">
                Các thao tác bên dưới chỉ xuất hiện khi máy chủ xác nhận tài
                khoản hiện tại đủ điều kiện thực hiện.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {canCancelOrder && (
                <button
                  type="button"
                  onClick={
                    cancelAfterRejectedInspection
                  }
                  disabled={Boolean(busy)}
                  className="rounded-lg border border-error/30 bg-white px-4 py-2.5 text-sm font-black text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "cancel-order"
                    ? "Đang hủy..."
                    : "Hủy giao dịch"}
                </button>
              )}

              {canConfirmReturn && (
                <button
                  type="button"
                  onClick={confirmReturn}
                  disabled={Boolean(busy)}
                  className="rounded-lg border border-warning/40 bg-white px-4 py-2.5 text-sm font-black text-warning transition hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "confirm-return"
                    ? "Đang xác nhận..."
                    : "Xác nhận đã trả hàng"}
                </button>
              )}

              {canConfirmReturnReceived && (
                <button
                  type="button"
                  onClick={
                    confirmReturnReceived
                  }
                  disabled={Boolean(busy)}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "return-received"
                    ? "Đang xác nhận..."
                    : "Xác nhận đã nhận lại hàng"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-warning/20 bg-warning/10/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-text">
                Tranh chấp giao dịch
              </h3>

              <p className="mt-1 text-xs leading-5 text-textLight">
                {detail?.dispute?.hasActiveDispute
                  ? "Đơn hàng đang có một tranh chấp được xử lý."
                  : canCreateDispute
                    ? "Nếu có vấn đề với giao dịch, bạn có thể gửi bằng chứng để hệ thống xem xét."
                    : "Trạng thái hiện tại của đơn hàng không cho phép tạo tranh chấp."}
              </p>
            </div>

            {detail?.dispute?.hasActiveDispute && latestDisputeId && (
              <Link
                to={`/tranh-chap/${latestDisputeId}`}
                className="shrink-0 rounded-lg border border-warning/30 bg-white px-4 py-2.5 text-center text-sm font-black text-warning transition hover:bg-warning/10"
              >
                Xem tranh chấp
              </Link>
            )}

            {canCreateDispute && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  setError("");
                  setNotice("");
                  setDisputeOpen(true);
                }}
                className="shrink-0 rounded-lg border border-warning bg-white px-4 py-2.5 text-sm font-black text-warning transition hover:bg-warning/10 disabled:opacity-50"
              >
                Tạo tranh chấp
              </button>
            )}
          </div>

          {detail?.dispute?.hasActiveDispute && !latestDisputeId && (
            <p className="mt-3 text-xs font-semibold text-warning">
              Backend đã ghi nhận tranh chấp nhưng chưa trả mã tranh chấp để mở
              trang chi tiết.
            </p>
          )}
        </div>
      </section>

      {disputeOpen && (
        <OrderDisputeModal
          open
          orderId={order?.orderId}
          productName={productName}
          onClose={() => {
            if (!busy) {
              setDisputeOpen(false);
            }
          }}
          onCreated={handleDisputeCreated}
        />
      )}
    </>
  );
};

export default OrderTransactionActions;

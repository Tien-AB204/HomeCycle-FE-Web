import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DELIVERY_METHOD } from "../../constants/agreements";
import { ORDER_STATUS } from "../../constants/orders";
import { useAuth } from "../../hooks/useAuth";
import agreementApi from "../../services/apis/agreementApi";
import orderApi from "../../services/apis/orderApi";
import { getUserId } from "../../utils/authUtils";
import OrderDisputeModal from "../disputes/OrderDisputeModal";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  "Không thể thực hiện thao tác.";

const sameIdentifier = (left, right) => {
  const leftId = String(left || "")
    .trim()
    .toLowerCase();

  const rightId = String(right || "")
    .trim()
    .toLowerCase();

  return Boolean(leftId && rightId && leftId === rightId);
};

const OrderTransactionActions = ({ order, detail, onRefresh }) => {
  const { user } = useAuth();

  const [agreement, setAgreement] = useState(null);

  const [loadingAgreement, setLoadingAgreement] = useState(true);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadAgreement = async () => {
      if (!order?.agreementId) {
        setAgreement(null);
        setLoadingAgreement(false);
        return;
      }

      setLoadingAgreement(true);

      try {
        const result = await agreementApi.getById(order.agreementId, {
          signal: controller.signal,
        });

        setAgreement(result);
      } catch (requestError) {
        if (
          requestError?.name !== "CanceledError" &&
          requestError?.code !== "ERR_CANCELED"
        ) {
          setAgreement(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingAgreement(false);
        }
      }
    };

    void loadAgreement();

    return () => controller.abort();
  }, [order?.agreementId]);

  const currentUserId = getUserId(user);

  const isBuyer = sameIdentifier(currentUserId, agreement?.buyerId);

  const isSeller = sameIdentifier(currentUserId, agreement?.sellerId);

  const deliveryMethod = agreement?.agreementDetails?.deliveryMethod;

  const isDirectDelivery =
    deliveryMethod === DELIVERY_METHOD.BUYER_PICK_UP ||
    deliveryMethod === DELIVERY_METHOD.SELLER_DELIVERS;

  const isGhnDelivery = deliveryMethod === DELIVERY_METHOD.GHN;

  const orderStatus = Number(order?.orderStatus);

  const isProcessing = orderStatus === ORDER_STATUS.PROCESSING;

  const canCreateDispute =
    (orderStatus === ORDER_STATUS.PROCESSING ||
      orderStatus === ORDER_STATUS.COMPLETED) &&
    !detail?.dispute?.hasActiveDispute;

  const latestDisputeId = detail?.dispute?.latestDisputeId;

  const sellerAlreadyConfirmed = Boolean(order?.sellerHandoverConfirmedAt);

  const showSellerConfirmation = isProcessing && isSeller && isDirectDelivery;

  const showBuyerConfirmation =
    isProcessing && isBuyer && (isDirectDelivery || isGhnDelivery);

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
    showSellerConfirmation || showBuyerConfirmation;

  return (
    <>
      <section className="mt-5 rounded-xl border border-[#DCE8E5] bg-white p-5 shadow-[0_8px_24px_rgba(24,63,65,0.04)]">
        <div className="border-b border-[#E3ECE9] pb-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6F9F]">
            Thao tác giao dịch
          </p>

          <h2 className="mt-1 text-lg font-black text-[#183F41]">
            Xác nhận giao nhận & tranh chấp
          </h2>
        </div>

        {notice && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        {loadingAgreement && (
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#68807F]">
            <span
              className="material-symbols-outlined animate-spin text-lg"
              aria-hidden="true"
            >
              progress_activity
            </span>
            Đang kiểm tra vai trò trong giao dịch...
          </div>
        )}

        {!loadingAgreement && hasAnyConfirmationAction && (
          <div className="mt-4 rounded-xl bg-[#F8FBFA] p-4">
            <h3 className="text-sm font-black text-[#183F41]">
              Xác nhận giao nhận
            </h3>

            {showSellerConfirmation && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#183F41]">
                    Xác nhận đã bàn giao
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#68807F]">
                    Chỉ xác nhận sau khi hai bên đã check-in tại lịch hẹn thu
                    gom.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={Boolean(busy) || sellerAlreadyConfirmed}
                  onClick={confirmHandover}
                  className="shrink-0 rounded-lg bg-[#4F8588] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-50"
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
                    ? "mt-4 border-t border-[#DCE8E5] pt-4"
                    : "mt-3"
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-[#183F41]">
                    Xác nhận đã nhận hàng
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#68807F]">
                    {isGhnDelivery
                      ? "Với GHN, chỉ xác nhận sau khi hệ thống vận chuyển ghi nhận giao hàng thành công."
                      : "Hai bên phải hoàn thành check-in lịch hẹn trước khi xác nhận nhận sản phẩm."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={confirmReceived}
                  className="shrink-0 rounded-lg bg-[#2F6F9F] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#245A82] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "received"
                    ? "Đang xác nhận..."
                    : "Xác nhận đã nhận hàng"}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-[#183F41]">
                Tranh chấp giao dịch
              </h3>

              <p className="mt-1 text-xs leading-5 text-[#68807F]">
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
                className="shrink-0 rounded-lg border border-orange-300 bg-white px-4 py-2.5 text-center text-sm font-black text-orange-700 transition hover:bg-orange-50"
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
                className="shrink-0 rounded-lg border border-orange-500 bg-white px-4 py-2.5 text-sm font-black text-orange-700 transition hover:bg-orange-50 disabled:opacity-50"
              >
                Tạo tranh chấp
              </button>
            )}
          </div>

          {detail?.dispute?.hasActiveDispute && !latestDisputeId && (
            <p className="mt-3 text-xs font-semibold text-orange-700">
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

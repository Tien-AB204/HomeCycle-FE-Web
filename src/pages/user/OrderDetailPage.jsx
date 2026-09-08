import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  getOrderStatusMeta,
  getPaymentDisplayMeta,
} from "../../constants/orders";
import OrderTransactionActions from "../../features/orders/OrderTransactionActions";
import OrderReviewSection from "../../features/reviews/OrderReviewSection";
import orderApi from "../../services/apis/orderApi";
import postApi from "../../services/apis/postApi";
import { getUserId } from "../../utils/authUtils";
import { useAuth } from "../../hooks/useAuth";

const OWN_POST_REVIEW_MESSAGE =
  "Chủ bài đăng không thể tự đánh giá đơn hàng của tin đăng.";

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const formatDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "—";
};

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải chi tiết đơn hàng.";

const DetailRow = ({ label, children }) => (
  <div className="grid gap-1 py-3 sm:grid-cols-[170px_1fr] sm:items-center">
    <dt className="text-xs font-bold uppercase tracking-wide text-textLight">
      {label}
    </dt>
    <dd className="break-words text-sm font-bold text-text">
      {children || "—"}
    </dd>
  </div>
);

const ServiceRow = ({ icon, title, description, tone = "default" }) => (
  <div className="grid gap-3 py-4 sm:grid-cols-[42px_150px_1fr] sm:items-center">
    <span
      className={`material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-lg ${
        tone === "warning"
          ? "bg-warning/10 text-warning"
          : "bg-primary/10 text-primary"
      }`}
      aria-hidden="true"
    >
      {icon}
    </span>
    <h3 className="text-sm font-black text-text">{title}</h3>
    <p className="text-sm leading-6 text-textLight">{description}</p>
  </div>
);

const OrderProductImage = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:w-40">
        <span className="material-symbols-outlined text-5xl" aria-hidden="true">
          inventory_2
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className="h-36 w-full shrink-0 rounded-xl object-cover sm:w-40"
    />
  );
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  const [state, setState] = useState({
    loading: true,
    detail: null,
    post: null,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadDetail = async () => {
      try {
        const detail = await orderApi.getById(orderId, {
          signal: controller.signal,
        });
        let post = null;

        if (detail.order.postId) {
          try {
            post = await postApi.getById(detail.order.postId, {
              signal: controller.signal,
            });
          } catch (postError) {
            if (
              postError?.name === "CanceledError" ||
              postError?.code === "ERR_CANCELED"
            ) {
              return;
            }
          }
        }

        setState({ loading: false, detail, post, error: "" });
      } catch (error) {
        if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") {
          setState({
            loading: false,
            detail: null,
            post: null,
            error: getErrorMessage(error),
          });
        }
      }
    };

    void loadDetail();
    return () => controller.abort();
  }, [orderId, version]);

  if (state.loading) {
    return (
      <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-border bg-white p-14 text-center font-semibold text-textLight">
          <span
            className="material-symbols-outlined animate-spin text-3xl"
            aria-hidden="true"
          >
            progress_activity
          </span>
          <p className="mt-2">Đang tải chi tiết đơn hàng...</p>
        </div>
      </section>
    );
  }

  if (state.error || !state.detail?.order) {
    return (
      <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-error/30 bg-error/10 p-8 text-center">
          <span
            className="material-symbols-outlined text-4xl text-error"
            aria-hidden="true"
          >
            error
          </span>
          <h1 className="mt-3 text-xl font-black text-error">
            Không thể mở đơn hàng
          </h1>
          <p className="mt-2 text-sm text-error">{state.error}</p>
          <Link
            to="/don-hang"
            className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-black text-white"
          >
            Quay lại danh sách
          </Link>
        </div>
      </section>
    );
  }

  const detail = state.detail;
  const order = detail.order;
  const orderStatus = getOrderStatusMeta(order.orderStatus);
  const paymentStatus = getPaymentDisplayMeta(order);
  const productName =
    order.productName ||
    state.post?.productName ||
    detail.postDescription ||
    "Sản phẩm trong đơn hàng";
  const displayCode = order.orderCode || "Đơn hàng HomeCycle";
  const finalTotalAmount = Number(order.finalTotalAmount || 0);
  const amountPaid = Number(order.amountPaid || 0);
  const amountRemaining = Number(order.amountRemaining || 0);
  const isFullyPaid =
    Number(order.paymentStatus) === PAYMENT_STATUS.COMPLETED ||
    (finalTotalAmount > 0 &&
      amountPaid >= finalTotalAmount &&
      amountRemaining === 0);
  const paymentPercent = Math.min(
    100,
    Math.max(
      0,
      finalTotalAmount > 0 ? (amountPaid / finalTotalAmount) * 100 : 0,
    ),
  );
  const isOrderCompleted = Number(order.orderStatus) === ORDER_STATUS.COMPLETED;

  const currentUserId = getUserId(user).toLowerCase();

  const postOwnerId = String(
    state.post?.ownerId || detail.postOwnerId || order.postOwnerId || "",
  )
    .trim()
    .toLowerCase();

  const isPostOwner = Boolean(
    currentUserId && postOwnerId && currentUserId === postOwnerId,
  );

  const reviewEligibility = isPostOwner
    ? {
        ...(detail.review || {}),
        canReview: false,
        blockedReason: OWN_POST_REVIEW_MESSAGE,
      }
    : detail.review;

  const reviewDescription = isPostOwner
    ? OWN_POST_REVIEW_MESSAGE
    : detail.review?.hasReviewed
      ? `Bạn đã đánh giá ${detail.review.rating || 0}/5 sao.`
      : (detail.review?.canReview ?? isOrderCompleted)
        ? "Đơn hàng đã đủ điều kiện để đánh giá."
        : "Bạn có thể đánh giá sau khi đơn hàng hoàn tất.";
  const disputeDescription = detail.dispute?.hasActiveDispute
    ? "Đơn hàng đang có tranh chấp cần được xử lý."
    : "Đơn hàng hiện không có tranh chấp.";
  const counterpartyUserId =
    detail.counterpartyUserId ||
    detail.counterpartyId ||
    detail.counterparty?.userId ||
    order.counterpartyUserId ||
    order.counterpartyId ||
    "";

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-6xl px-4 pb-14 pt-7 sm:px-6">
      <Link
        to="/don-hang"
        className="inline-flex items-center gap-1 text-sm font-bold text-primary transition hover:text-text"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          arrow_back
        </span>
        Danh sách đơn hàng
      </Link>

      <header className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Chi tiết đơn hàng
          </p>
          <h1 className="mt-1 truncate text-2xl font-black text-text sm:text-3xl">
            {displayCode}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${orderStatus.className}`}
          >
            {orderStatus.label}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${paymentStatus.className}`}
          >
            {paymentStatus.label}
          </span>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
            <div className="flex flex-col gap-5 sm:flex-row">
              <OrderProductImage src={detail.thumbnailUrl} alt={productName} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                  Sản phẩm giao dịch
                </p>
                <h2 className="mt-1.5 text-xl font-black text-text">
                  {productName}
                </h2>
                {detail.postDescription &&
                  detail.postDescription !== productName && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-textLight">
                      {detail.postDescription}
                    </p>
                  )}
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <p className="text-textLight">
                    Số lượng:{" "}
                    <strong className="text-text">
                      {order.quantity || 0}
                    </strong>
                  </p>
                  <p className="text-textLight">
                    Đối tác:{" "}
                    <strong className="text-text">
                      {detail.counterpartyName || "Người dùng HomeCycle"}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white px-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
            <div className="border-b border-border py-4">
              <h2 className="font-black text-text">Thông tin giao dịch</h2>
            </div>
            <dl className="divide-y divide-border">
              <DetailRow label="Ngày tạo">
                {formatDate(order.createdAt)}
              </DetailRow>
              <DetailRow label="Cập nhật gần nhất">
                {formatDate(order.updatedAt)}
              </DetailRow>
              <DetailRow label="Ngày hoàn tất">
                {formatDate(order.completedAt)}
              </DetailRow>
              <DetailRow label="Phương thức thanh toán">
                {detail.paymentMethod || "Chưa có thông tin"}
              </DetailRow>
              <DetailRow label="Thanh toán lúc">
                {formatDate(detail.paidAt)}
              </DetailRow>
            </dl>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)] lg:sticky lg:top-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            Tổng thanh toán
          </p>
          <p className="mt-2 text-3xl font-black text-error">
            {formatCurrency(order.finalTotalAmount)}
          </p>
          {Number(order.originalTotalAmount) !==
            Number(order.finalTotalAmount) && (
            <p className="mt-1 text-sm text-textLight line-through">
              {formatCurrency(order.originalTotalAmount)}
            </p>
          )}

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-border/30">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${paymentPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-textLight">
            <span>
              {isFullyPaid
                ? "Đã thanh toán đủ"
                : paymentStatus.description || "Tiến độ thanh toán"}
            </span>
            <span>{Math.round(paymentPercent)}%</span>
          </div>

          <dl className="mt-5 divide-y divide-border border-y border-border">
            <div className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt className="text-textLight">Đã thanh toán</dt>
              <dd className="font-black text-success">
                {formatCurrency(order.amountPaid)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt className="text-textLight">Còn lại</dt>
              <dd className="font-black text-text">
                {formatCurrency(order.amountRemaining)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 grid gap-2">
            {order.postId && (
              <Link
                to={`/posts/${order.postId}`}
                className="rounded-lg border border-primary px-4 py-2.5 text-center text-sm font-black text-primary transition hover:bg-primary/10"
              >
                Xem bài đăng
              </Link>
            )}
            {order.agreementId && (
              <Link
                to={`/thoa-thuan/${order.agreementId}`}
                className="rounded-lg border border-primary px-4 py-2.5 text-center text-sm font-black text-primary transition hover:bg-primary/10"
              >
                Xem thỏa thuận
              </Link>
            )}
            {detail.negotiationId && (
              <Link
                to={`/thuong-luong/${detail.negotiationId}`}
                className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-primary/90"
              >
                Mở phòng thương lượng
              </Link>
            )}
          </div>
        </aside>
      </div>

      <OrderTransactionActions
        order={order}
        detail={detail}
        onRefresh={() => setVersion((current) => current + 1)}
      />

      <section className="mt-5 rounded-xl border border-border bg-white px-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
        <div className="border-b border-border py-4">
          <h2 className="font-black text-text">Theo dõi sau giao dịch</h2>
        </div>
        <div className="divide-y divide-border">
          <ServiceRow
            icon="local_shipping"
            title="Giao nhận"
            description={
              detail.shipment
                ? "Thông tin giao nhận đã được ghi nhận trong đơn hàng."
                : "Chưa có thông tin vận chuyển từ hệ thống."
            }
          />
          <ServiceRow
            icon="star"
            title="Đánh giá đơn hàng"
            description={reviewDescription}
          />
          <ServiceRow
            icon={
              detail.dispute?.hasActiveDispute ? "warning" : "verified_user"
            }
            title="Tranh chấp"
            description={disputeDescription}
            tone={detail.dispute?.hasActiveDispute ? "warning" : "default"}
          />
        </div>
      </section>

      <OrderReviewSection
        orderId={order.orderId || orderId}
        orderStatus={order.orderStatus}
        eligibility={reviewEligibility}
        counterpartyUserId={counterpartyUserId}
      />
    </section>
  );
};

export default OrderDetailPage;

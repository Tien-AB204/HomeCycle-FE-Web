import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getOrderStatusMeta,
  getPaymentDisplayMeta,
  isOrderStatus,
  isPaymentStatus,
} from "../../constants/orders";
import OrderTransactionActions from "../../features/orders/OrderTransactionActions";
import OrderReviewSection from "../../features/reviews/OrderReviewSection";
import orderApi from "../../services/apis/orderApi";
import postApi from "../../services/apis/postApi";
import { getUserId } from "../../utils/authUtils";
import { useAuth } from "../../hooks/useAuth";
import { useChatRealtime } from "../../hooks/useChatRealtime";

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

const normalizeTimelineValue = (
  value,
) =>
  String(value ?? "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();

const HIDDEN_TIMELINE_CODES =
  new Set([
    "collectionschedule",
    "inspectionscheduled",
  ]);

const filterTimelineSteps = (
  steps,
) =>
  (Array.isArray(steps)
    ? steps
    : [])
    .filter(
      (step) =>
        !HIDDEN_TIMELINE_CODES.has(
          normalizeTimelineValue(
            step?.code,
          ),
        ),
    )
    .map((step) => ({
      ...step,

      subSteps:
        filterTimelineSteps(
          step?.subSteps,
        ),
    }));

const sanitizeTimelineText = (
  value,
) =>
  String(value ?? "")
    .replace(/\bBuyer\b/gi, "Người mua")
    .replace(/\bSeller\b/gi, "Người bán");

const getTimelineVisual = (
  status,
) => {
  const value =
    normalizeTimelineValue(status);

  if (
    value === "2" ||
    value === "completed"
  ) {
    return {
      icon: "check_circle",
      dot:
        "border-success bg-success text-white",
      text:
        "text-success",
    };
  }

  if (
    value === "1" ||
    value === "inprogress"
  ) {
    return {
      icon: "schedule",
      dot:
        "border-primary bg-primary text-white",
      text:
        "text-primary",
    };
  }

  if (
    value === "3" ||
    value === "failed"
  ) {
    return {
      icon: "error",
      dot:
        "border-error bg-error text-white",
      text:
        "text-error",
    };
  }

  if (
    value === "4" ||
    value === "cancelled" ||
    value === "canceled"
  ) {
    return {
      icon: "cancel",
      dot:
        "border-error bg-error text-white",
      text:
        "text-error",
    };
  }

  return {
    icon: "radio_button_unchecked",
    dot:
      "border-border bg-white text-textLight",
    text:
      "text-textLight",
  };
};

const OrderTimelineStep = ({
  step,
  isLast = false,
  nested = false,
}) => {
  const visual =
    getTimelineVisual(
      step?.status,
    );

  const title =
    sanitizeTimelineText(
      step?.title,
    ) ||
    "Cập nhật đơn hàng";

  const description =
    sanitizeTimelineText(
      step?.description,
    );

  const subSteps =
    filterTimelineSteps(
      step?.subSteps,
    );

  return (
    <div
      className={[
        "relative flex gap-3",
        nested ? "ml-3" : "",
      ].join(" ")}
    >
      <div className="flex w-7 shrink-0 flex-col items-center">
        <span
          className={[
            "material-symbols-outlined z-[1] flex h-7 w-7 items-center justify-center rounded-full border text-[17px]",
            visual.dot,
          ].join(" ")}
          aria-hidden="true"
        >
          {visual.icon}
        </span>

        {!isLast && (
          <span className="min-h-5 w-px flex-1 bg-border" />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <p
          className={[
            "text-sm font-black",
            visual.text,
          ].join(" ")}
        >
          {title}
        </p>

        {description && (
          <p className="mt-1 text-xs leading-5 text-textLight">
            {description}
          </p>
        )}

        {step?.occurredAt && (
          <p className="mt-1 text-[11px] font-semibold text-textLight">
            {formatDate(
              step.occurredAt,
            )}
          </p>
        )}

        {subSteps.length > 0 && (
          <div className="mt-3 rounded-xl bg-background px-3 pt-3">
            {subSteps.map(
              (
                subStep,
                index,
              ) => (
                <OrderTimelineStep
                  key={
                    String(
                      subStep?.code ||
                        "sub-step",
                    ) +
                    "-" +
                    index
                  }
                  step={subStep}
                  isLast={
                    index ===
                    subSteps.length - 1
                  }
                  nested
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const OrderTimelinePanel = ({
  timeline,
}) => {
  const steps =
    filterTimelineSteps(
      timeline,
    );

  return (
    <section className="mt-5 rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
      <div className="border-b border-border pb-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
          Tiến trình đơn hàng
        </p>

        <h2 className="mt-1 text-lg font-black text-text">
          Trạng thái giao dịch
        </h2>
      </div>

      {steps.length > 0 ? (
        <div className="mt-5">
          {steps.map(
            (step, index) => (
              <OrderTimelineStep
                key={
                  String(
                    step?.code ||
                      "timeline-step",
                  ) +
                  "-" +
                  index
                }
                step={step}
                isLast={
                  index ===
                  steps.length - 1
                }
              />
            ),
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-background p-4 text-sm font-semibold text-textLight">
          Tiến trình đơn hàng đang được máy chủ cập nhật.
        </p>
      )}
    </section>
  );
};

const GhnShipmentTrackingCard = ({
  orderId,
}) => {
  const [requestVersion, setRequestVersion] =
    useState(0);

  const [state, setState] =
    useState({
      loading: true,
      tracking: null,
      error: "",
    });

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    orderApi
      .getShipmentTracking(
        orderId,
        {
          signal: controller.signal,
        },
      )
      .then((tracking) => {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          tracking,
          error: "",
        });
      })
      .catch((error) => {
        if (
          !active ||
          error?.name === "CanceledError" ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }

        setState({
          loading: false,
          tracking: null,
          error: getErrorMessage(error),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [orderId, requestVersion]);

  const refresh = () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    setRequestVersion(
      (current) => current + 1,
    );
  };

  if (state.loading) {
    return (
      <section className="mt-5 rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
        <div
          role="status"
          className="flex items-center gap-3 text-sm font-semibold text-textLight"
        >
          <span
            className="material-symbols-outlined animate-spin text-xl text-primary"
            aria-hidden="true"
          >
            progress_activity
          </span>

          Đang đồng bộ trạng thái GHN...
        </div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-text">
              Chưa thể đồng bộ vận chuyển
            </p>

            <p className="mt-1 text-sm leading-6 text-textLight">
              {state.error}
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            className="shrink-0 rounded-lg border border-warning/40 bg-white px-4 py-2 text-sm font-black text-warning transition hover:bg-warning/10"
          >
            Thử lại
          </button>
        </div>
      </section>
    );
  }

  const tracking =
    state.tracking;

  if (!tracking) {
    return null;
  }

  return (
    <section className="mt-5 rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            Vận chuyển GHN
          </p>

          <h2 className="mt-1 text-lg font-black text-text">
            Theo dõi vận đơn
          </h2>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-black text-primary transition hover:bg-primary/10"
        >
          <span
            className="material-symbols-outlined text-base"
            aria-hidden="true"
          >
            refresh
          </span>

          Cập nhật
        </button>
      </div>

      {tracking.isStale && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs font-semibold leading-5 text-warning">
          GHN tạm thời chưa phản hồi. Đây là trạng thái gần nhất HomeCycle đã lưu.
        </div>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-primary/5 p-4">
        <span
          className="material-symbols-outlined mt-0.5 text-primary"
          aria-hidden="true"
        >
          local_shipping
        </span>

        <p className="text-sm font-semibold leading-6 text-text">
          {tracking.message ||
            "Trạng thái vận chuyển đang được cập nhật."}
        </p>
      </div>

      <dl className="mt-4 divide-y divide-border border-y border-border">
        <DetailRow label="Mã vận đơn">
          {tracking.trackingCode ||
            "Đang chờ GHN cấp mã"}
        </DetailRow>

        <DetailRow label="Dự kiến giao">
          {formatDate(
            tracking.expectedDeliveryAt,
          )}
        </DetailRow>

        <DetailRow label="Đã giao lúc">
          {formatDate(
            tracking.deliveredAt,
          )}
        </DetailRow>

        <DetailRow label="Đồng bộ gần nhất">
          {formatDate(
            tracking.lastSyncedAt,
          )}
        </DetailRow>
      </dl>
    </section>
  );
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const { user } = useAuth();

  const {
    connection,
    reconnectVersion,
    joinOrder,
    leaveOrder,
  } = useChatRealtime();

  const [version, setVersion] =
    useState(0);

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
  }, [
    orderId,
    reconnectVersion,
    version,
  ]);

  useEffect(() => {
    if (!connection || !orderId) {
      return undefined;
    }

    const normalizedOrderId =
      String(orderId)
        .trim()
        .toLowerCase();

    const handleOrderTrackingUpdated = (
      payload,
    ) => {
      const eventOrderId =
        String(
          payload?.orderId ??
            payload?.OrderId ??
            "",
        )
          .trim()
          .toLowerCase();

      if (
        !eventOrderId ||
        eventOrderId !== normalizedOrderId
      ) {
        return;
      }

      /*
       * BE event chỉ chứa OrderId + UpdatedAt.
       * Không merge event vào OrderDetail state.
       * Tăng version để refetch DTO authoritative từ REST.
       */
      setVersion(
        (current) => current + 1,
      );
    };

    connection.on(
      "OrderTrackingUpdated",
      handleOrderTrackingUpdated,
    );

    void joinOrder(
      String(orderId),
    ).catch(() => {
      /*
       * REST detail vẫn dùng được nếu SignalR
       * tạm thời chưa join được.
       */
    });

    return () => {
      connection.off(
        "OrderTrackingUpdated",
        handleOrderTrackingUpdated,
      );

      void leaveOrder(
        String(orderId),
      );
    };
  }, [
    connection,
    joinOrder,
    leaveOrder,
    orderId,
  ]);

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
    isPaymentStatus(order.paymentStatus, "Completed") ||
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
  const isOrderCompleted = isOrderStatus(
    order.orderStatus,
    "Completed",
  );

  const normalizedDeliveryMethod =
    String(
      order.deliveryMethod ?? "",
    )
      .trim()
      .toLowerCase();

  const isGhnDelivery =
    Number(order.deliveryMethod) === 1 ||
    normalizedDeliveryMethod ===
      "ghndelivery";

  const currentUserId =
    getUserId(user).toLowerCase();

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

      <OrderTimelinePanel
        timeline={
          detail?.timeline ||
          order?.timeline ||
          []
        }
      />

      {isGhnDelivery && (
        <GhnShipmentTrackingCard
          orderId={
            order.orderId || orderId
          }
        />
      )}

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

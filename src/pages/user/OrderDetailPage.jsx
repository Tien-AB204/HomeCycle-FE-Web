import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  PAYMENT_STATUS,
  getOrderStatusMeta,
  getPaymentDisplayMeta,
} from "../../constants/orders";
import orderApi from "../../services/apis/orderApi";
import postApi from "../../services/apis/postApi";

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

const DetailItem = ({ label, children }) => (
  <div>
    <dt className="text-xs font-bold uppercase tracking-wide text-[#789092]">
      {label}
    </dt>
    <dd className="mt-1 break-words font-bold text-[#172830]">{children || "—"}</dd>
  </div>
);

const OrderDetailPage = () => {
  const { orderId } = useParams();
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

        if (!detail.order.productName && detail.order.postId) {
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
        if (
          error?.name !== "CanceledError" &&
          error?.code !== "ERR_CANCELED"
        ) {
          setState({
            loading: false,
            detail: null,
            post: null,
            error: getErrorMessage(error),
          });
        }
      }
    };

    loadDetail();
    return () => controller.abort();
  }, [orderId]);

  if (state.loading) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-[#BAC2C1]/40 bg-white p-14 text-center font-semibold text-[#547B7D] shadow-sm">
        Đang tải chi tiết đơn hàng...
      </div>
    );
  }

  if (state.error || !state.detail?.order) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-4xl" aria-hidden="true">⚠️</div>
          <h1 className="mt-3 text-xl font-black text-red-800">
            Không thể mở đơn hàng
          </h1>
          <p className="mt-2 text-sm text-red-700">{state.error}</p>
          <Link
            to="/don-hang"
            className="mt-5 inline-flex rounded-xl bg-[#2B5659] px-5 py-2.5 text-sm font-black text-white"
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
    `Đơn hàng ${order.orderCode || order.orderId}`;
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
      finalTotalAmount > 0
        ? (amountPaid / finalTotalAmount) * 100
        : 0,
    ),
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl bg-[#172830] px-6 py-6 text-white sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C1EAEC]">
            Chi tiết đơn hàng
          </p>
          <h1 className="mt-2 truncate text-2xl font-black">
            {order.orderCode || order.orderId}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${orderStatus.className}`}>
              {orderStatus.label}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${paymentStatus.className}`}>
              {paymentStatus.label}
            </span>
          </div>
        </div>
        <Link
          to="/don-hang"
          className="mt-4 inline-flex rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20 sm:mt-0"
        >
          ← Danh sách đơn hàng
        </Link>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            {detail.thumbnailUrl ? (
              <img
                src={detail.thumbnailUrl}
                alt={productName}
                className="h-44 w-full rounded-2xl object-cover sm:w-44"
              />
            ) : (
              <div className="flex h-44 w-full shrink-0 items-center justify-center rounded-2xl bg-[#EAF3F3] text-5xl sm:w-44">
                📦
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-[#547B7D]">
                Sản phẩm
              </p>
              <h2 className="mt-2 text-xl font-black text-[#172830]">
                {productName}
              </h2>
              {detail.postDescription &&
                detail.postDescription !== productName && (
                  <p className="mt-2 text-sm leading-6 text-[#547B7D]">
                    {detail.postDescription}
                  </p>
                )}
              <p className="mt-3 text-sm font-bold text-[#789092]">
                Số lượng: {order.quantity || 0}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-5 border-t border-[#BAC2C1]/40 pt-6 sm:grid-cols-2">
            <DetailItem label="Đối tác">
              {detail.counterpartyName || "Người dùng HomeCycle"}
            </DetailItem>
            <DetailItem label="Ngày tạo">{formatDate(order.createdAt)}</DetailItem>
            <DetailItem label="Cập nhật gần nhất">
              {formatDate(order.updatedAt)}
            </DetailItem>
            <DetailItem label="Ngày hoàn tất">
              {formatDate(order.completedAt)}
            </DetailItem>
          </dl>
        </section>

        <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-[#547B7D]">
            Thanh toán
          </p>
          <p className="mt-2 text-2xl font-black text-[#7A1012]">
            {formatCurrency(order.finalTotalAmount)}
          </p>
          {Number(order.originalTotalAmount) !==
            Number(order.finalTotalAmount) && (
            <p className="mt-1 text-xs text-[#789092] line-through">
              {formatCurrency(order.originalTotalAmount)}
            </p>
          )}

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#BAC2C1]/30">
            <div
              className="h-full rounded-full bg-[#0AA679] transition-all"
              style={{ width: `${paymentPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-[#547B7D]">
            {isFullyPaid
              ? "Đã hoàn tất thanh toán"
              : paymentStatus.description || "Đang chờ thanh toán"}
          </p>

          <dl className="mt-5 space-y-4">
            <DetailItem label="Đã thanh toán">
              {formatCurrency(order.amountPaid)}
            </DetailItem>
            <DetailItem label="Còn phải thanh toán">
              {formatCurrency(order.amountRemaining)}
            </DetailItem>
            <DetailItem label="Phương thức thanh toán">
              {detail.paymentMethod || "Chưa có thông tin"}
            </DetailItem>
            <DetailItem label="Thanh toán lúc">
              {formatDate(detail.paidAt)}
            </DetailItem>
          </dl>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm">
          <h2 className="font-black text-[#172830]">Giao nhận</h2>
          {detail.shipment ? (
            <p className="mt-3 text-sm leading-6 text-[#547B7D]">
              Thông tin vận chuyển đã được ghi nhận trong đơn hàng.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#547B7D]">
              Chưa có thông tin vận chuyển từ hệ thống.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm">
          <h2 className="font-black text-[#172830]">Đánh giá</h2>
          <p className="mt-3 text-sm leading-6 text-[#547B7D]">
            {detail.review?.hasReviewed
              ? `Bạn đã đánh giá ${detail.review.rating || 0}/5.`
              : detail.review?.canReview
                ? "Đơn hàng đã đủ điều kiện để đánh giá."
                : "Bạn có thể đánh giá sau khi đơn hàng hoàn tất."}
          </p>
        </section>

        <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm">
          <h2 className="font-black text-[#172830]">Tranh chấp</h2>
          <p className="mt-3 text-sm leading-6 text-[#547B7D]">
            {detail.dispute?.hasActiveDispute
              ? "Đơn hàng đang có tranh chấp cần xử lý."
              : "Đơn hàng hiện không có tranh chấp."}
          </p>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm">
        {order.postId && (
          <Link
            to={`/posts/${order.postId}`}
            className="rounded-xl border border-[#2B5659] px-4 py-2.5 text-sm font-black text-[#2B5659] hover:bg-[#EAF3F3]"
          >
            Xem bài đăng
          </Link>
        )}
        {order.agreementId && (
          <Link
            to={`/thoa-thuan/${order.agreementId}`}
            className="rounded-xl border border-[#2B5659] px-4 py-2.5 text-sm font-black text-[#2B5659] hover:bg-[#EAF3F3]"
          >
            Xem thỏa thuận
          </Link>
        )}
        {detail.negotiationId && (
          <Link
            to={`/thuong-luong/${detail.negotiationId}`}
            className="rounded-xl bg-[#2B5659] px-4 py-2.5 text-sm font-black text-white hover:bg-[#172830]"
          >
            Mở phòng thương lượng
          </Link>
        )}
      </div>
    </section>
  );
};

export default OrderDetailPage;

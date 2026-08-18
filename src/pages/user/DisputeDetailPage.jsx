import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  getDisputeCategoryLabel,
  getDisputeStatusMeta,
} from "../../constants/disputes";
import {
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from "../../constants/orders";
import disputeApi from "../../services/apis/disputeApi";

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
};

const formatCurrency = (value) => {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} ₫`
    : "—";
};

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  "Không thể tải chi tiết tranh chấp.";

const DetailRow = ({
  label,
  children,
}) => (
  <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:items-start">
    <dt className="text-xs font-bold uppercase tracking-wide text-[#789092]">
      {label}
    </dt>

    <dd className="break-words text-sm font-bold text-[#183F41]">
      {children || "—"}
    </dd>
  </div>
);

const DisputeDetailPage = () => {
  const { disputeId } = useParams();

  const [state, setState] = useState({
    loading: true,
    detail: null,
    error: "",
  });

  useEffect(() => {
    const controller =
      new AbortController();

    const loadDetail = async () => {
      try {
        const detail =
          await disputeApi.getById(
            disputeId,
            {
              signal:
                controller.signal,
            },
          );

        setState({
          loading: false,
          detail,
          error: "",
        });
      } catch (error) {
        if (
          error?.name !==
            "CanceledError" &&
          error?.code !== "ERR_CANCELED"
        ) {
          setState({
            loading: false,
            detail: null,
            error:
              getErrorMessage(error),
          });
        }
      }
    };

    void loadDetail();

    return () => controller.abort();
  }, [disputeId]);

  if (state.loading) {
    return (
      <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-[#DCE8E5] bg-white p-14 text-center text-[#68807F]">
          <span
            className="material-symbols-outlined animate-spin text-3xl"
            aria-hidden="true"
          >
            progress_activity
          </span>

          <p className="mt-2 font-semibold">
            Đang tải tranh chấp...
          </p>
        </div>
      </section>
    );
  }

  if (
    state.error ||
    !state.detail
  ) {
    return (
      <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <span
            className="material-symbols-outlined text-4xl text-red-700"
            aria-hidden="true"
          >
            error
          </span>

          <h1 className="mt-3 text-xl font-black text-red-800">
            Không thể mở tranh chấp
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {state.error}
          </p>

          <Link
            to="/don-hang"
            className="mt-5 inline-flex rounded-lg bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white"
          >
            Quay lại đơn hàng
          </Link>
        </div>
      </section>
    );
  }

  const dispute = state.detail;

  const order =
    dispute.target?.order || null;

  const disputeStatus =
    getDisputeStatusMeta(
      dispute.status,
    );

  const orderStatus = order
    ? getOrderStatusMeta(
        order.orderStatus,
      )
    : null;

  const paymentStatus = order
    ? getPaymentStatusMeta(
        order.paymentStatus,
      )
    : null;

  const evidenceImages =
    Array.isArray(
      dispute.evidenceImages,
    )
      ? dispute.evidenceImages
      : [];

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-6xl px-4 pb-14 pt-7 sm:px-6">
      <Link
        to={
          order?.orderId
            ? `/don-hang/${order.orderId}`
            : "/don-hang"
        }
        className="inline-flex items-center gap-1 text-sm font-bold text-[#2F6F9F] transition hover:text-[#183F41]"
      >
        <span
          className="material-symbols-outlined text-lg"
          aria-hidden="true"
        >
          arrow_back
        </span>

        Quay lại đơn hàng
      </Link>

      <header className="mt-4 flex flex-col gap-4 border-b border-[#DCE8E5] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">
            Chi tiết tranh chấp
          </p>

          <h1 className="mt-1 text-2xl font-black text-[#183F41] sm:text-3xl">
            {order?.orderCode
              ? `Đơn ${order.orderCode}`
              : "Tranh chấp HomeCycle"}
          </h1>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${disputeStatus.className}`}
        >
          {disputeStatus.label}
        </span>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-[#DCE8E5] bg-white px-5 shadow-[0_8px_24px_rgba(24,63,65,0.04)]">
            <div className="border-b border-[#E3ECE9] py-4">
              <h2 className="font-black text-[#183F41]">
                Nội dung khiếu nại
              </h2>
            </div>

            <dl className="divide-y divide-[#E3ECE9]">
              <DetailRow label="Lý do">
                {getDisputeCategoryLabel(
                  dispute.category,
                )}
              </DetailRow>

              <DetailRow label="Người gửi">
                {dispute.sender?.username ||
                  "Người dùng HomeCycle"}
              </DetailRow>

              <DetailRow label="Người bị khiếu nại">
                {dispute.targetUser
                  ?.username ||
                  "Người dùng HomeCycle"}
              </DetailRow>

              <DetailRow label="Ngày gửi">
                {formatDate(
                  dispute.createdAt,
                )}
              </DetailRow>

              <DetailRow label="Cập nhật">
                {formatDate(
                  dispute.updatedAt,
                )}
              </DetailRow>

              <DetailRow label="Ngày xử lý">
                {formatDate(
                  dispute.resolvedAt,
                )}
              </DetailRow>
            </dl>

            <div className="border-t border-[#E3ECE9] py-5">
              <p className="text-xs font-black uppercase tracking-wide text-[#789092]">
                Mô tả
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#183F41]">
                {dispute.description ||
                  "Không có mô tả."}
              </p>
            </div>

            {dispute.moderatorNote && (
              <div className="border-t border-[#E3ECE9] py-5">
                <p className="text-xs font-black uppercase tracking-wide text-[#789092]">
                  Phản hồi từ Moderator
                </p>

                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#F3F7F6] px-4 py-3 text-sm leading-6 text-[#183F41]">
                  {
                    dispute.moderatorNote
                  }
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#DCE8E5] bg-white p-5 shadow-[0_8px_24px_rgba(24,63,65,0.04)]">
            <h2 className="font-black text-[#183F41]">
              Ảnh bằng chứng
            </h2>

            {evidenceImages.length ===
              0 && (
              <p className="mt-4 text-sm text-[#68807F]">
                Không có ảnh bằng chứng.
              </p>
            )}

            {evidenceImages.length >
              0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {evidenceImages.map(
                  (image, index) => (
                    <a
                      key={
                        image.mediaId ||
                        `${image.url}-${index}`
                      }
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-xl border border-[#DCE8E5] bg-[#F8FBFA]"
                    >
                      <img
                        src={image.url}
                        alt={
                          image.fileName ||
                          `Bằng chứng ${index + 1}`
                        }
                        loading="lazy"
                        className="h-44 w-full object-cover transition hover:scale-[1.02]"
                      />

                      <p className="truncate px-3 py-2 text-xs font-bold text-[#68807F]">
                        {image.fileName ||
                          `Ảnh ${index + 1}`}
                      </p>
                    </a>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-[#DCE8E5] bg-white p-5 shadow-[0_8px_24px_rgba(24,63,65,0.04)] lg:sticky lg:top-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4F8588]">
            Đơn hàng liên quan
          </p>

          {!order && (
            <p className="mt-3 text-sm text-[#68807F]">
              Backend chưa trả thông tin
              đơn hàng liên quan.
            </p>
          )}

          {order && (
            <>
              <h2 className="mt-2 text-xl font-black text-[#183F41]">
                {order.productName ||
                  "Sản phẩm giao dịch"}
              </h2>

              <p className="mt-2 text-2xl font-black text-[#B93832]">
                {formatCurrency(
                  order.finalTotalAmount,
                )}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${orderStatus.className}`}
                >
                  {orderStatus.label}
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${paymentStatus.className}`}
                >
                  {paymentStatus.label}
                </span>
              </div>

              <dl className="mt-5 divide-y divide-[#E3ECE9] border-y border-[#E3ECE9]">
                <DetailRow label="Số lượng">
                  {order.quantity}
                </DetailRow>

                <DetailRow label="Hoàn tất">
                  {formatDate(
                    order.completedAt,
                  )}
                </DetailRow>

                <DetailRow label="Giao thành công">
                  {formatDate(
                    order.deliveredAt,
                  )}
                </DetailRow>

                <DetailRow label="Hạn tranh chấp">
                  {formatDate(
                    order.disputeDeadlineUtc,
                  )}
                </DetailRow>
              </dl>

              <Link
                to={`/don-hang/${order.orderId}`}
                className="mt-5 block rounded-lg bg-[#4F8588] px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-[#356A70]"
              >
                Xem đơn hàng
              </Link>
            </>
          )}
        </aside>
      </div>
    </section>
  );
};

export default DisputeDetailPage;
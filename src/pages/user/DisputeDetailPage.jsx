import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  DISPUTE_TARGET_TYPE,
  getDisputeCategoryLabel,
  getDisputeStatusMeta,
  getDisputeTargetTypeLabel,
  normalizeDisputeTargetType,
} from "../../constants/disputes";
import {
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from "../../constants/orders";
import {
  MARKETPLACE_POST_TYPES,
  normalizePostType,
} from "../../constants/marketplace";
import disputeApi from "../../services/apis/disputeApi";
import EvidenceImage from "../../components/shared/EvidenceImage";

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

const normalizeMediaItems = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          key: `${item}-${index}`,
          url: item,
          fileName: `Ảnh ${index + 1}`,
        };
      }

      const url =
        item?.url ||
        item?.imageUrl ||
        item?.mediaUrl ||
        item?.fileUrl;

      return url
        ? {
            key:
              item.mediaId ||
              item.imageId ||
              `${url}-${index}`,
            url,
            fileName:
              item.fileName || `Ảnh ${index + 1}`,
          }
        : null;
    })
    .filter(Boolean);

const POST_STATUS_LABELS = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  active: "Đang hoạt động",
  suspended: "Đã đình chỉ",
  closed: "Đã đóng",
  rejected: "Bị từ chối",
  expired: "Hết hạn",
  completed: "Đã hoàn tất",
  deleted: "Đã xóa",
};

const REVIEW_STATUS_LABELS = {
  1: "Đang hiển thị",
  2: "Đã chỉnh sửa",
  3: "Đã ẩn",
  4: "Đã gỡ",
  visible: "Đang hiển thị",
  active: "Đang hiển thị",
  edited: "Đã chỉnh sửa",
  hidden: "Đã ẩn",
  removed: "Đã gỡ",
  deleted: "Đã xóa",
};

const getContentStatusLabel = (labels, status) =>
  labels[String(status || "").toLowerCase()] ||
  "Chưa xác định";

const getPostTypeLabel = (postType) => {
  const normalizedPostType =
    normalizePostType(postType);

  if (
    normalizedPostType ===
    MARKETPLACE_POST_TYPES.BUY
  ) {
    return "Tin thu mua";
  }

  if (
    normalizedPostType ===
    MARKETPLACE_POST_TYPES.SELL
  ) {
    return "Tin đăng bán";
  }

  return "Chưa xác định";
};

const MediaGallery = ({ title, description, items }) => (
  <section className="rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
    <h2 className="font-black text-text">{title}</h2>
    <p className="mt-1 text-xs leading-5 text-textLight">
      {description}
    </p>

    {items.length === 0 ? (
      <p className="mt-4 text-sm text-textLight">Không có ảnh.</p>
    ) : (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((image) => (
          <a
            key={image.key}
            href={image.url}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-xl border border-border bg-background"
          >
            <EvidenceImage
              src={image.url}
              alt={image.fileName}
              bordered={false}
              className="h-44 w-full transition hover:scale-[1.02]"
            />
            <p className="truncate px-3 py-2 text-xs font-bold text-textLight">
              {image.fileName}
            </p>
          </a>
        ))}
      </div>
    )}
  </section>
);

/*
 * Chỉ dùng HTTP status / mã lỗi ổn định của Backend để chọn thông báo.
 * Không hiển thị message thô từ Backend/Axios ra giao diện.
 * Backend GET /disputes/{id} trả 400 kèm code DISPUTE_NOT_FOUND / DISPUTE_FORBIDDEN.
 */
const getErrorMessage = (error) => {
  const httpStatus = error?.response?.status;
  const code = String(
    error?.response?.data?.code ??
      error?.response?.data?.error?.code ??
      "",
  ).trim();

  if (httpStatus === 404 || code === "DISPUTE_NOT_FOUND") {
    return "Không tìm thấy tranh chấp.";
  }

  if (httpStatus === 403 || code === "DISPUTE_FORBIDDEN") {
    return "Bạn không có quyền xem tranh chấp này.";
  }

  if (httpStatus === 401) {
    return "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.";
  }

  return "Không thể tải chi tiết tranh chấp. Vui lòng thử lại.";
};

const DetailRow = ({
  label,
  children,
}) => (
  <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:items-start">
    <dt className="text-xs font-bold uppercase tracking-wide text-textLight">
      {label}
    </dt>

    <dd className="break-words text-sm font-bold text-text">
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

  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

  const loadDetail = useCallback(
    async (signal) => {
      try {
        const detail = await disputeApi.getById(disputeId, { signal });

        setState({
          loading: false,
          detail,
          error: "",
        });
      } catch (error) {
        if (
          error?.name !== "CanceledError" &&
          error?.code !== "ERR_CANCELED"
        ) {
          setState({
            loading: false,
            detail: null,
            error: getErrorMessage(error),
          });
        }
      }
    },
    [disputeId],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    const timeoutId = window.setTimeout(() => {
      void loadDetail(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadDetail]);

  const handleClose = async () => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn đóng tranh chấp này?",
    );

    if (!confirmed) {
      return;
    }

    setIsClosing(true);
    setCloseError("");

    try {
      await disputeApi.close(disputeId);
      await loadDetail();
    } catch (error) {
      setCloseError(getErrorMessage(error));
    } finally {
      setIsClosing(false);
    }
  };

  if (state.loading) {
    return (
      <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-border bg-white p-14 text-center text-textLight">
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
        <div className="rounded-xl border border-error/30 bg-error/10 p-8 text-center">
          <span
            className="material-symbols-outlined text-4xl text-error"
            aria-hidden="true"
          >
            error
          </span>

          <h1 className="mt-3 text-xl font-black text-error">
            Không thể mở tranh chấp
          </h1>

          <p className="mt-2 text-sm text-error">
            {state.error}
          </p>

          <Link
            to="/tranh-chap"
            className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-black text-white"
          >
            Quay lại danh sách tranh chấp
          </Link>
        </div>
      </section>
    );
  }

  const dispute = state.detail;

  const order =
    dispute.target?.order || null;

  const post =
    dispute.target?.post || null;

  const review =
    dispute.target?.review || null;

  const targetType = normalizeDisputeTargetType(
    dispute.target?.targetType ?? dispute.targetType,
  );

  const targetTypeLabel = getDisputeTargetTypeLabel(
    targetType,
  );

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

  const evidenceImages = normalizeMediaItems(
    dispute.evidenceImages,
  );
  const postImages = normalizeMediaItems(post?.images);
  const reviewImages = normalizeMediaItems(review?.images);
  const timestamps = dispute.timestamps || {};
  const postTargetId = String(
    post?.postId || dispute.target?.targetId || "",
  ).trim();
  const canOpenPost = Boolean(
    postTargetId &&
      post &&
      ![
        "draft",
        "pending",
        "suspended",
        "deleted",
        "rejected",
      ].includes(
        String(post.status || "").trim().toLowerCase(),
      ),
  );

  const canClose = Boolean(
    dispute.actions?.canCloseDispute,
  );

  const backTarget =
    targetType === DISPUTE_TARGET_TYPE.ORDER && order?.orderId
      ? {
          to: `/don-hang/${encodeURIComponent(order.orderId)}`,
          label: "Quay lại đơn hàng",
        }
      : targetType === DISPUTE_TARGET_TYPE.POST && canOpenPost
        ? {
            to: `/posts/${encodeURIComponent(postTargetId)}`,
            label: "Quay lại bài đăng",
          }
        : targetType === DISPUTE_TARGET_TYPE.REVIEW &&
            review?.revieweeId
          ? {
              to: `/danh-gia/nguoi-dung/${encodeURIComponent(review.revieweeId)}`,
              label: "Quay lại danh sách đánh giá",
            }
          : {
              to: "/tranh-chap",
              label: "Quay lại danh sách tranh chấp",
            };

  const pageTitle =
    targetType === DISPUTE_TARGET_TYPE.ORDER && order?.orderCode
      ? `Đơn ${order.orderCode}`
      : targetType === DISPUTE_TARGET_TYPE.POST
        ? post?.productName || "Báo cáo bài đăng"
        : targetType === DISPUTE_TARGET_TYPE.REVIEW
          ? `Đánh giá ${String(
              review?.reviewId || dispute.target?.targetId || "",
            ).slice(0, 8)}`
          : `Tranh chấp ${targetTypeLabel.toLowerCase()}`;

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-6xl px-4 pb-14 pt-7 sm:px-6">
      <Link
        to={backTarget.to}
        className="inline-flex items-center gap-1 text-sm font-bold text-primary transition hover:text-text"
      >
        <span
          className="material-symbols-outlined text-lg"
          aria-hidden="true"
        >
          arrow_back
        </span>

        {backTarget.label}
      </Link>

      <header className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-warning">
            Chi tiết tranh chấp
          </p>

          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
            {pageTitle}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${disputeStatus.className}`}
          >
            {disputeStatus.label}
          </span>

          {canClose && (
            <button
              type="button"
              onClick={handleClose}
              disabled={isClosing}
              className="rounded-full border border-primary bg-white px-4 py-1.5 text-xs font-black text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isClosing ? "Đang đóng..." : "Đóng tranh chấp"}
            </button>
          )}
        </div>
      </header>

      {closeError && (
        <div className="mt-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm font-semibold text-error">
          {closeError}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-white px-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
            <div className="border-b border-border py-4">
              <h2 className="font-black text-text">
                Nội dung khiếu nại
              </h2>
            </div>

            <dl className="divide-y divide-border">
              <DetailRow label="Đối tượng">
                {targetTypeLabel}
              </DetailRow>

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
                  dispute.createdAt ?? timestamps.createdAt,
                )}
              </DetailRow>

              <DetailRow label="Cập nhật">
                {formatDate(
                  dispute.updatedAt ?? timestamps.updatedAt,
                )}
              </DetailRow>

              <DetailRow label="Ngày xử lý">
                {formatDate(
                  dispute.resolvedAt ?? timestamps.resolvedAt,
                )}
              </DetailRow>
            </dl>

            <div className="border-t border-border py-5">
              <p className="text-xs font-black uppercase tracking-wide text-textLight">
                Mô tả bạn đã gửi
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text">
                {dispute.description ||
                  "Không có mô tả."}
              </p>
            </div>

            {dispute.moderatorNote && (
              <div className="border-t border-border py-5">
                <p className="text-xs font-black uppercase tracking-wide text-textLight">
                  Phản hồi từ Moderator
                </p>

                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-background px-4 py-3 text-sm leading-6 text-text">
                  {
                    dispute.moderatorNote
                  }
                </p>
              </div>
            )}
          </section>

          {post && (
            <>
              <section className="rounded-xl border border-border bg-white px-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
                <div className="border-b border-border py-4">
                  <h2 className="font-black text-text">
                    Bài đăng gốc
                  </h2>
                </div>

                <dl className="divide-y divide-border">
                  <DetailRow label="Tên sản phẩm">
                    {post.productName || "—"}
                  </DetailRow>
                  <DetailRow label="Loại tin">
                    {getPostTypeLabel(post.postType)}
                  </DetailRow>
                  <DetailRow label="Giá cơ bản">
                    {formatCurrency(post.basePrice)}
                  </DetailRow>
                  <DetailRow label="Trạng thái">
                    {getContentStatusLabel(
                      POST_STATUS_LABELS,
                      post.status,
                    )}
                  </DetailRow>
                  <DetailRow label="Chủ bài đăng">
                    {dispute.targetUser?.username ||
                      post.ownerId ||
                      "Người dùng HomeCycle"}
                  </DetailRow>
                </dl>

                <div className="border-t border-border py-5">
                  <p className="text-xs font-black uppercase tracking-wide text-textLight">
                    Mô tả bài đăng
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text">
                    {post.description || "Không có mô tả."}
                  </p>
                </div>
              </section>

              <MediaGallery
                title="Ảnh nội dung gốc"
                description="Hình ảnh thuộc bài đăng được báo cáo."
                items={postImages}
              />
            </>
          )}

          {review && (
            <>
              <section className="rounded-xl border border-border bg-white px-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
                <div className="border-b border-border py-4">
                  <h2 className="font-black text-text">
                    Đánh giá gốc
                  </h2>
                </div>

                <dl className="divide-y divide-border">
                  <DetailRow label="Số sao">
                    {review.rating === null ||
                    review.rating === undefined
                      ? "—"
                      : `${review.rating} / 5 sao`}
                  </DetailRow>
                  <DetailRow label="Người đánh giá">
                    {review.reviewerUsername ||
                      review.reviewerId ||
                      "Người dùng HomeCycle"}
                  </DetailRow>
                  <DetailRow label="Người được đánh giá">
                    {review.revieweeUsername ||
                      review.revieweeId ||
                      "Người dùng HomeCycle"}
                  </DetailRow>
                  <DetailRow label="Đơn hàng liên quan">
                    {review.orderId || "—"}
                  </DetailRow>
                  <DetailRow label="Trạng thái">
                    {getContentStatusLabel(
                      REVIEW_STATUS_LABELS,
                      review.status,
                    )}
                  </DetailRow>
                </dl>

                <div className="border-t border-border py-5">
                  <p className="text-xs font-black uppercase tracking-wide text-textLight">
                    Nội dung đánh giá
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text">
                    {review.comment || "Không có nội dung."}
                  </p>
                </div>
              </section>

              <MediaGallery
                title="Ảnh nội dung gốc"
                description="Hình ảnh thuộc đánh giá được báo cáo."
                items={reviewImages}
              />
            </>
          )}

          <MediaGallery
            title="Ảnh bằng chứng bạn đã gửi"
            description="Hình ảnh bạn cung cấp khi tạo tranh chấp hoặc báo cáo, tách biệt với nội dung gốc."
            items={evidenceImages}
          />
        </div>

        <aside className="h-fit rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)] lg:sticky lg:top-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            {order
              ? "Đơn hàng liên quan"
              : post
                ? "Bài đăng được báo cáo"
                : review
                  ? "Đánh giá được báo cáo"
                  : "Đối tượng liên quan"}
          </p>

          {order && (
            <>
              <h2 className="mt-2 text-xl font-black text-text">
                {order.productName ||
                  "Sản phẩm giao dịch"}
              </h2>

              <p className="mt-2 text-2xl font-black text-error">
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

              <dl className="mt-5 divide-y divide-border border-y border-border">
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
                className="mt-5 block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-primary/90"
              >
                Xem đơn hàng
              </Link>
            </>
          )}

          {post && (
            <>
              <h2 className="mt-2 text-xl font-black text-text">
                {post.productName || "Bài đăng HomeCycle"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-textLight">
                Báo cáo không tự động thay đổi trạng thái bài đăng. Nội dung chỉ thay đổi sau quyết định của Kiểm duyệt viên.
              </p>
              {canOpenPost && (
                <Link
                  to={`/posts/${encodeURIComponent(postTargetId)}`}
                  className="mt-5 block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-primary/90"
                >
                  Xem bài đăng
                </Link>
              )}
            </>
          )}

          {review && (
            <>
              <h2 className="mt-2 text-xl font-black text-text">
                {review.rating === null || review.rating === undefined
                  ? "Đánh giá HomeCycle"
                  : `${review.rating} / 5 sao`}
              </h2>
              <p className="mt-2 text-sm leading-6 text-textLight">
                Nội dung đánh giá và quyết định xử lý được lấy từ hồ sơ tranh chấp trên máy chủ.
              </p>
              {review.revieweeId && (
                <Link
                  to={`/danh-gia/nguoi-dung/${encodeURIComponent(review.revieweeId)}`}
                  className="mt-5 block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-primary/90"
                >
                  Xem đánh giá người dùng
                </Link>
              )}
            </>
          )}

          {!order && !post && !review && (
            <>
              <p className="mt-3 text-sm text-textLight">
                Nội dung chi tiết của đối tượng hiện không còn khả dụng.
              </p>
              <Link
                to="/tranh-chap"
                className="mt-5 block rounded-lg border border-primary px-4 py-2.5 text-center text-sm font-black text-primary"
              >
                Về danh sách tranh chấp
              </Link>
            </>
          )}
        </aside>
      </div>
    </section>
  );
};

export default DisputeDetailPage;

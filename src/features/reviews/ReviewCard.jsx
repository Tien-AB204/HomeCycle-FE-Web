import ReviewStars from "./ReviewStars";

const formatDate = (value) => {
  const date = new Date(value);

  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Chưa có thời gian";
};

const ReviewCard = ({ review, ownReview = false, onEdit, editing = false }) => (
  <article className="rounded-xl border border-[#DCE8E5] bg-white p-4 shadow-[0_6px_18px_rgba(24,63,65,0.035)] sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {review.reviewerAvatarUrl ? (
          <img
            src={review.reviewerAvatarUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF3F3] text-[#4F8588]" aria-hidden="true">
            person
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-black text-[#183F41]">
              {review.reviewerName}
            </h3>
            {ownReview && (
              <span className="rounded-full bg-[#EAF3F8] px-2 py-0.5 text-[10px] font-black uppercase text-[#2F6F9F]">
                Đánh giá của bạn
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#789092]">
            {formatDate(review.updatedAt || review.createdAt)}
            {review.updatedAt ? " · Đã chỉnh sửa" : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <ReviewStars value={review.rating} size="text-xl" />
        {onEdit && review.canEdit !== false && (
          <button
            type="button"
            onClick={() => onEdit(review)}
            disabled={editing}
            className="inline-flex items-center gap-1 rounded-lg border border-[#9FBFBA] px-3 py-1.5 text-xs font-black text-[#285E62] transition hover:bg-[#F1F7F5] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              edit
            </span>
            {editing ? "Đang mở..." : "Chỉnh sửa"}
          </button>
        )}
      </div>
    </div>

    {review.comment ? (
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#526D6E]">
        {review.comment}
      </p>
    ) : (
      <p className="mt-3 text-sm italic text-[#789092]">Người dùng không để lại bình luận.</p>
    )}

    {review.images.length > 0 && (
      <div className="mt-4 grid max-w-xl grid-cols-3 gap-2">
        {review.images.map((imageUrl, index) => (
          <a
            key={`${imageUrl}-${index}`}
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-lg border border-[#DCE8E5]"
            aria-label={`Mở ảnh đánh giá ${index + 1}`}
          >
            <img
              src={imageUrl}
              alt={`Ảnh đánh giá ${index + 1}`}
              className="aspect-square w-full object-cover transition hover:scale-105"
            />
          </a>
        ))}
      </div>
    )}

    {review.editableUntil && ownReview && review.canEdit !== false && (
      <p className="mt-3 text-xs font-semibold text-[#789092]">
        Có thể chỉnh sửa đến {formatDate(review.editableUntil)}.
      </p>
    )}
  </article>
);

export default ReviewCard;
import { useEffect, useMemo, useState } from "react";
import ReviewStars from "./ReviewStars";

const MAX_IMAGES = 3;

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Không thể lưu đánh giá. Vui lòng thử lại.";

const ReviewFormModal = ({ mode = "create", review, onClose, onSubmit }) => {
  const [rating, setRating] = useState(() => Number(review?.rating || 0));
  const [comment, setComment] = useState(() => review?.comment || "");
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );

  const handleImagesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.some((file) => !file.type.startsWith("image/"))) {
      setError("Chỉ được chọn tệp hình ảnh.");
      return;
    }

    if (images.length + selectedFiles.length > MAX_IMAGES) {
      setError(`Mỗi đánh giá chỉ được đính kèm tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    setImages((current) => [...current, ...selectedFiles]);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setError("Vui lòng chọn số sao từ 1 đến 5.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSubmit({ rating, comment: comment.trim(), images });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              Giao dịch HomeCycle
            </p>
            <h2 id="review-modal-title" className="mt-1 text-xl font-black text-text">
              {mode === "edit" ? "Chỉnh sửa đánh giá" : "Đánh giá đơn hàng"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="material-symbols-outlined rounded-lg p-1.5 text-textLight transition hover:bg-primary/10 disabled:opacity-50"
            aria-label="Đóng"
          >
            close
          </button>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <fieldset>
            <legend className="text-sm font-black text-text">
              Mức độ hài lòng <span className="text-error">*</span>
            </legend>
            <div className="mt-2 flex items-center gap-3">
              <ReviewStars value={rating} onChange={setRating} size="text-4xl" />
              <span className="text-sm font-bold text-textLight">
                {rating ? `${rating}/5 sao` : "Chưa chọn"}
              </span>
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-black text-text">Chia sẻ trải nghiệm</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={5}
              placeholder="Sản phẩm, giao tiếp và quá trình giao nhận của đơn hàng như thế nào?"
              className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-text outline-none transition focus:border-primary focus:bg-white"
            />
          </label>

          {mode === "create" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-text">Ảnh đính kèm</span>
                <span className="text-xs font-bold text-textLight">Tối đa 3 ảnh</span>
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm font-black text-primary transition hover:bg-primary/10">
                <span className="material-symbols-outlined" aria-hidden="true">add_photo_alternate</span>
                Chọn ảnh
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  disabled={images.length >= MAX_IMAGES}
                  className="sr-only"
                />
              </label>

              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {previews.map((preview, index) => (
                    <div key={`${preview.file.name}-${preview.file.lastModified}`} className="relative">
                      <img
                        src={preview.url}
                        alt={`Ảnh đánh giá ${index + 1}`}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
                        }
                        className="material-symbols-outlined absolute right-1 top-1 rounded-full bg-primary/80 p-1 text-base text-white"
                        aria-label={`Xóa ảnh ${index + 1}`}
                      >
                        close
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === "edit" && review?.images?.length > 0 && (
            <p className="rounded-lg bg-primary/10 p-3 text-xs font-semibold leading-5 text-textLight">
              Chỉ được chỉnh sửa số sao và bình luận. Ảnh đã gửi sẽ được giữ nguyên.
            </p>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
              {error}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <span className="material-symbols-outlined animate-spin text-lg" aria-hidden="true">
                progress_activity
              </span>
            )}
            {submitting
              ? "Đang lưu..."
              : mode === "edit"
                ? "Lưu thay đổi"
                : "Gửi đánh giá"}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default ReviewFormModal;
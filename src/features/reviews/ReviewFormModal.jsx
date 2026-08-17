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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0D292B]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#DCE8E5] bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#E3ECE9] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6F9F]">
              Giao dịch HomeCycle
            </p>
            <h2 id="review-modal-title" className="mt-1 text-xl font-black text-[#183F41]">
              {mode === "edit" ? "Chỉnh sửa đánh giá" : "Đánh giá đối tác"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="material-symbols-outlined rounded-lg p-1.5 text-[#68807F] transition hover:bg-[#F1F7F5] disabled:opacity-50"
            aria-label="Đóng"
          >
            close
          </button>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <fieldset>
            <legend className="text-sm font-black text-[#183F41]">
              Mức độ hài lòng <span className="text-red-600">*</span>
            </legend>
            <div className="mt-2 flex items-center gap-3">
              <ReviewStars value={rating} onChange={setRating} size="text-4xl" />
              <span className="text-sm font-bold text-[#68807F]">
                {rating ? `${rating}/5 sao` : "Chưa chọn"}
              </span>
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-black text-[#183F41]">Chia sẻ trải nghiệm</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={5}
              placeholder="Giao tiếp, mức độ hợp tác và quá trình giao nhận với đối tác như thế nào?"
              className="mt-2 w-full resize-y rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-4 py-3 text-sm leading-6 text-[#183F41] outline-none transition focus:border-[#4F8588] focus:bg-white"
            />
          </label>

          {mode === "create" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-[#183F41]">Ảnh đính kèm</span>
                <span className="text-xs font-bold text-[#789092]">Tối đa 3 ảnh</span>
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#9FBFBA] bg-[#F8FBFA] px-4 py-4 text-sm font-black text-[#285E62] transition hover:bg-[#EEF6F3]">
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
                        className="material-symbols-outlined absolute right-1 top-1 rounded-full bg-[#183F41]/80 p-1 text-base text-white"
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
            <p className="rounded-lg bg-[#F1F7F5] p-3 text-xs font-semibold leading-5 text-[#68807F]">
              Chỉ được chỉnh sửa số sao và bình luận. Ảnh đã gửi sẽ được giữ nguyên.
            </p>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#E3ECE9] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-[#9FBFBA] px-5 py-2.5 text-sm font-black text-[#285E62] transition hover:bg-[#F1F7F5] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-60"
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
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ORDER_DISPUTE_CATEGORY_OPTIONS,
} from "../../constants/disputes";
import disputeApi from "../../services/apis/disputeApi";

const MIN_IMAGES = 3;
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  "Không thể tạo tranh chấp.";

const getExtension = (fileName) => {
  const normalized = String(fileName || "")
    .trim()
    .toLowerCase();

  const dotIndex = normalized.lastIndexOf(".");

  return dotIndex >= 0
    ? normalized.slice(dotIndex)
    : "";
};

const formatFileSize = (size) => {
  const bytes = Number(size || 0);

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const OrderDisputeModal = ({
  open,
  orderId,
  productName,
  onClose,
  onCreated,
}) => {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceImages, setEvidenceImages] =
    useState([]);
  const [fieldError, setFieldError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const previewItems = useMemo(
    () =>
      evidenceImages.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [evidenceImages],
  );

  useEffect(() => {
    return () => {
      previewItems.forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, [previewItems]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose, submitting]);

  

  if (!open) {
    return null;
  }

  const validateFiles = (files) => {
    if (files.length > MAX_IMAGES) {
      return `Chỉ được tải tối đa ${MAX_IMAGES} ảnh bằng chứng.`;
    }

    for (const file of files) {
      if (file.size <= 0) {
        return `Ảnh "${file.name}" không có dữ liệu.`;
      }

      if (file.size > MAX_FILE_SIZE) {
        return `Ảnh "${file.name}" vượt quá dung lượng tối đa 5MB.`;
      }

      if (
        !ALLOWED_EXTENSIONS.includes(
          getExtension(file.name),
        )
      ) {
        return `Ảnh "${file.name}" không đúng định dạng. Chỉ chấp nhận JPG, JPEG, PNG hoặc WEBP.`;
      }
    }

    return "";
  };

  const handleFilesChange = (event) => {
    setFieldError("");
    setSubmitError("");

    const selectedFiles = Array.from(
      event.target.files || [],
    );

    const mergedFiles = [
      ...evidenceImages,
      ...selectedFiles,
    ];

    const uniqueFiles = Array.from(
      new Map(
        mergedFiles.map((file) => [
          `${file.name}-${file.size}-${file.lastModified}`,
          file,
        ]),
      ).values(),
    );

    const validationError =
      validateFiles(uniqueFiles);

    if (validationError) {
      setFieldError(validationError);
      event.target.value = "";
      return;
    }

    setEvidenceImages(uniqueFiles);
    event.target.value = "";
  };

  const removeFile = (index) => {
    setEvidenceImages((current) =>
      current.filter(
        (_, fileIndex) => fileIndex !== index,
      ),
    );

    setFieldError("");
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFieldError("");
    setSubmitError("");

    const normalizedDescription =
      description.trim();

    if (!category) {
      setFieldError(
        "Vui lòng chọn lý do tranh chấp.",
      );
      return;
    }

    if (normalizedDescription.length < 10) {
      setFieldError(
        "Mô tả tranh chấp phải có ít nhất 10 ký tự.",
      );
      return;
    }

    if (normalizedDescription.length > 2000) {
      setFieldError(
        "Mô tả tranh chấp không được vượt quá 2000 ký tự.",
      );
      return;
    }

    if (
      evidenceImages.length < MIN_IMAGES ||
      evidenceImages.length > MAX_IMAGES
    ) {
      setFieldError(
        `Vui lòng cung cấp từ ${MIN_IMAGES} đến ${MAX_IMAGES} ảnh bằng chứng.`,
      );
      return;
    }

    const fileValidation =
      validateFiles(evidenceImages);

    if (fileValidation) {
      setFieldError(fileValidation);
      return;
    }

    setSubmitting(true);

    try {
      const result =
        await disputeApi.createForOrder({
          orderId,
          category: Number(category),
          description: normalizedDescription,
          evidenceImages,
        });

      await onCreated?.(result);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-dispute-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#DCE8E5] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">
              Báo cáo vấn đề giao dịch
            </p>

            <h2
              id="order-dispute-title"
              className="mt-1 text-xl font-black text-[#183F41]"
            >
              Tạo tranh chấp
            </h2>

            <p className="mt-1 text-sm text-[#68807F]">
              {productName ||
                "Sản phẩm trong đơn hàng"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#68807F] transition hover:bg-[#F1F7F5] disabled:opacity-50"
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              close
            </span>
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-5 sm:p-6"
        >
          <div>
            <label
              htmlFor="dispute-category"
              className="text-sm font-black text-[#183F41]"
            >
              Lý do tranh chấp
            </label>

            <select
              id="dispute-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setFieldError("");
                setSubmitError("");
              }}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-[#CDDED9] bg-white px-3 py-3 text-sm font-semibold text-[#183F41] outline-none focus:border-[#4F8588]"
            >
              <option value="">
                Chọn lý do tranh chấp
              </option>

              {ORDER_DISPUTE_CATEGORY_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="dispute-description"
                className="text-sm font-black text-[#183F41]"
              >
                Mô tả sự việc
              </label>

              <span className="text-xs font-semibold text-[#789092]">
                {description.length}/2000
              </span>
            </div>

            <textarea
              id="dispute-description"
              rows={6}
              maxLength={2000}
              value={description}
              disabled={submitting}
              onChange={(event) => {
                setDescription(event.target.value);
                setFieldError("");
                setSubmitError("");
              }}
              placeholder="Mô tả rõ vấn đề, thời điểm xảy ra và nội dung bạn muốn hệ thống xem xét..."
              className="mt-2 w-full resize-y rounded-xl border border-[#CDDED9] bg-white px-3 py-3 text-sm leading-6 text-[#183F41] outline-none focus:border-[#4F8588]"
            />
          </div>

          <div>
            <p className="text-sm font-black text-[#183F41]">
              Ảnh bằng chứng
            </p>

            <p className="mt-1 text-xs leading-5 text-[#68807F]">
              Bắt buộc từ 3 đến 5 ảnh. Mỗi ảnh
              tối đa 5MB, định dạng JPG, JPEG,
              PNG hoặc WEBP.
            </p>

            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#9FBFBA] bg-[#F8FBFA] px-4 py-5 text-sm font-black text-[#285E62] transition hover:bg-[#F1F7F5]">
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                add_photo_alternate
              </span>

              Chọn ảnh bằng chứng

              <input
                type="file"
                multiple
                disabled={
                  submitting ||
                  evidenceImages.length >= MAX_IMAGES
                }
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFilesChange}
                className="sr-only"
              />
            </label>

            {previewItems.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {previewItems.map(
                  ({ file, url }, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}`}
                      className="overflow-hidden rounded-xl border border-[#DCE8E5] bg-white"
                    >
                      <img
                        src={url}
                        alt={`Bằng chứng ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />

                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#183F41]">
                            {file.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-[#789092]">
                            {formatFileSize(
                              file.size,
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            removeFile(index)
                          }
                          className="shrink-0 rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          aria-label={`Xóa ảnh ${file.name}`}
                        >
                          <span
                            className="material-symbols-outlined text-lg"
                            aria-hidden="true"
                          >
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            <p className="mt-2 text-xs font-bold text-[#68807F]">
              Đã chọn {evidenceImages.length}/
              {MAX_IMAGES} ảnh
            </p>
          </div>

          {fieldError && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
            >
              {fieldError}
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {submitError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-[#E3ECE9] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-[#9FBFBA] bg-white px-5 py-2.5 text-sm font-black text-[#285E62] disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span
                  className="material-symbols-outlined animate-spin text-lg"
                  aria-hidden="true"
                >
                  progress_activity
                </span>
              )}

              {submitting
                ? "Đang gửi tranh chấp..."
                : "Gửi tranh chấp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderDisputeModal;
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ORDER_DISPUTE_CATEGORY_OPTIONS,
} from "../../constants/disputes";
import disputeApi from "../../services/apis/disputeApi";
import publicPlatformPolicyApi from "../../services/apis/publicPlatformPolicyApi";

const MIN_IMAGES = 2;
const MAX_IMAGES = 5;
const DISPUTE_EVIDENCE_CONTEXT = "DisputeEvidence";

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

const normalizeExtensions = (extensions) =>
  Array.from(
    new Set(
      (Array.isArray(extensions) ? extensions : [])
        .map((value) => {
          const normalized = String(value || "")
            .trim()
            .toLowerCase();

          if (!normalized) {
            return "";
          }

          return normalized.startsWith(".")
            ? normalized
            : `.${normalized}`;
        })
        .filter(Boolean),
    ),
  );

const getDisputeEvidenceRule = (policy) =>
  policy?.config?.rules?.find(
    (rule) =>
      String(rule?.context || "")
        .trim()
        .toLowerCase() ===
      DISPUTE_EVIDENCE_CONTEXT.toLowerCase(),
  ) || null;

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

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

  const [policyState, setPolicyState] = useState({
    loading: true,
    error: "",
    rule: null,
  });

  const [policyRequestVersion, setPolicyRequestVersion] =
    useState(0);

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

    const controller = new AbortController();

    const loadUploadRule = async () => {
      try {
        const policy =
          await publicPlatformPolicyApi.getFileUpload({
            signal: controller.signal,
          });

        const sourceRule =
          getDisputeEvidenceRule(policy);

        const maxFileSizeBytes =
          Number(sourceRule?.maxFileSizeBytes);

        const allowedExtensions =
          normalizeExtensions(
            sourceRule?.allowedExtensions,
          );

        if (
          !sourceRule ||
          !Number.isFinite(maxFileSizeBytes) ||
          maxFileSizeBytes <= 0 ||
          allowedExtensions.length === 0
        ) {
          throw new Error(
            "Máy chủ chưa trả quy định bằng chứng tranh chấp hợp lệ.",
          );
        }

        setPolicyState({
          loading: false,
          error: "",
          rule: {
            ...sourceRule,
            maxFileSizeBytes,
            allowedExtensions,
          },
        });
      } catch (error) {
        if (!isCanceledRequest(error)) {
          setPolicyState({
            loading: false,
            error:
              error?.response?.data?.error?.message ||
              error?.response?.data?.message ||
              error?.message ||
              "Không thể tải quy định bằng chứng tranh chấp.",
            rule: null,
          });
        }
      }
    };

    void loadUploadRule();

    return () => controller.abort();
  }, [open, policyRequestVersion]);

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
    if (!policyState.rule) {
      return "Chưa tải được quy định bằng chứng tranh chấp. Vui lòng thử lại.";
    }

    if (files.length > MAX_IMAGES) {
      return `Chỉ được tải tối đa ${MAX_IMAGES} ảnh bằng chứng.`;
    }

    const allowedExtensions =
      policyState.rule.allowedExtensions;

    for (const file of files) {
      if (file.size <= 0) {
        return `Ảnh "${file.name}" không có dữ liệu.`;
      }

      if (
        file.size >
        policyState.rule.maxFileSizeBytes
      ) {
        return `Ảnh "${file.name}" vượt quá dung lượng tối đa ${formatFileSize(
          policyState.rule.maxFileSizeBytes,
        )}.`;
      }

      if (
        !allowedExtensions.includes(
          getExtension(file.name),
        )
      ) {
        return `Ảnh "${file.name}" không đúng định dạng. Chỉ chấp nhận ${allowedExtensions
          .map((extension) =>
            extension
              .replace(/^\./, "")
              .toUpperCase(),
          )
          .join(", ")}.`;
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
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-warning">
              Báo cáo vấn đề giao dịch
            </p>

            <h2
              id="order-dispute-title"
              className="mt-1 text-xl font-black text-text"
            >
              Tạo tranh chấp
            </h2>

            <p className="mt-1 text-sm text-textLight">
              {productName ||
                "Sản phẩm trong đơn hàng"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full text-textLight transition hover:bg-primary/10 disabled:opacity-50"
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
              className="text-sm font-black text-text"
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
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm font-semibold text-text outline-none focus:border-primary"
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
                className="text-sm font-black text-text"
              >
                Mô tả sự việc
              </label>

              <span className="text-xs font-semibold text-textLight">
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
              className="mt-2 w-full resize-y rounded-xl border border-border bg-white px-3 py-3 text-sm leading-6 text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="text-sm font-black text-text">
              Ảnh bằng chứng
            </p>

            <p className="mt-1 text-xs leading-5 text-textLight">
              Bắt buộc từ {MIN_IMAGES} đến {MAX_IMAGES} ảnh.
              {policyState.loading &&
                " Đang tải quy định dung lượng và định dạng từ máy chủ..."}

              {!policyState.loading &&
                policyState.rule &&
                ` Mỗi ảnh tối đa ${formatFileSize(
                  policyState.rule.maxFileSizeBytes,
                )}, định dạng ${policyState.rule.allowedExtensions
                  .map((extension) =>
                    extension
                      .replace(/^\./, "")
                      .toUpperCase(),
                  )
                  .join(", ")}.`}
            </p>

            {policyState.error && (
              <div
                role="alert"
                className="mt-3 flex flex-col gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm font-semibold text-error">
                  {policyState.error}
                </p>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setFieldError("");
                    setPolicyState({
                      loading: true,
                      error: "",
                      rule: null,
                    });
                    setPolicyRequestVersion(
                      (current) => current + 1,
                    );
                  }}
                  className="shrink-0 rounded-lg border border-error/30 bg-white px-3 py-2 text-xs font-black text-error"
                >
                  Thử lại
                </button>
              </div>
            )}

            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm font-black text-primary transition hover:bg-primary/10">
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
                  policyState.loading ||
                  !policyState.rule ||
                  evidenceImages.length >= MAX_IMAGES
                }
                accept={
                  policyState.rule?.allowedExtensions.join(",") ||
                  undefined
                }
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
                      className="overflow-hidden rounded-xl border border-border bg-white"
                    >
                      <img
                        src={url}
                        alt={`Bằng chứng ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />

                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-text">
                            {file.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-textLight">
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
                          className="shrink-0 rounded-lg p-1.5 text-error transition hover:bg-error/10 disabled:opacity-50"
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

            <p className="mt-2 text-xs font-bold text-textLight">
              Đã chọn {evidenceImages.length}/
              {MAX_IMAGES} ảnh
            </p>
          </div>

          {fieldError && (
            <div
              role="alert"
              className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning"
            >
              {fieldError}
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
            >
              {submitError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-black text-primary disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                policyState.loading ||
                !policyState.rule
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-warning px-5 py-2.5 text-sm font-black text-white transition hover:bg-warning disabled:cursor-not-allowed disabled:opacity-60"
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
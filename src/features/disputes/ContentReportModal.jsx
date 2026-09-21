import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DISPUTE_TARGET_TYPE,
  getDisputeTargetTypeLabel,
} from "../../constants/disputes";
import disputeApi, {
  normalizeDisputeCategories,
} from "../../services/apis/disputeApi";
import publicPlatformPolicyApi from "../../services/apis/publicPlatformPolicyApi";
import {
  getSafeProblemDetail,
  getSafeValidationMessage,
} from "../../utils/safeErrorMessage";

const DISPUTE_EVIDENCE_CONTEXT = "DisputeEvidence";

const REPORT_ERROR_MESSAGES = {
  DISPUTE_SELF_REPORT_NOT_ALLOWED:
    "Bạn không thể báo cáo nội dung do chính mình tạo.",
  DISPUTE_DUPLICATE_OPEN_REPORT:
    "Bạn đã có một báo cáo đang chờ xử lý hoặc đang được xem xét cho nội dung này.",
  DISPUTE_CONTENT_UNAVAILABLE:
    "Nội dung đã bị xóa, ẩn hoặc đình chỉ và hiện không thể báo cáo.",
  DISPUTE_INVALID_CONTENT_CATEGORY:
    "Lý do báo cáo không còn phù hợp. Danh sách đã được làm mới, vui lòng chọn lại.",
  DISPUTE_TARGET_NOT_SUPPORTED:
    "Loại nội dung này hiện chưa hỗ trợ báo cáo.",
  POST_NOT_FOUND: "Không tìm thấy bài đăng cần báo cáo.",
  "Review.NotFound": "Không tìm thấy đánh giá cần báo cáo.",
  "Review.NotVisible":
    "Đánh giá này hiện không còn hiển thị để báo cáo.",
};

const getErrorCode = (error) =>
  String(
    error?.response?.data?.code ??
      error?.response?.data?.error?.code ??
      "",
  ).trim();

const getReportErrorMessage = (error) => {
  const code = getErrorCode(error);

  return (
    REPORT_ERROR_MESSAGES[code] ||
    getSafeValidationMessage(error?.response?.data?.errors) ||
    getSafeProblemDetail(error?.response?.data?.error?.message) ||
    getSafeProblemDetail(error?.response?.data?.message) ||
    "Không thể gửi báo cáo lúc này. Vui lòng kiểm tra thông tin và thử lại."
  );
};

const normalizeExtensions = (extensions) =>
  Array.from(
    new Set(
      (Array.isArray(extensions) ? extensions : [])
        .map((extension) => {
          const value = String(extension || "")
            .trim()
            .toLowerCase();

          if (!value) {
            return "";
          }

          return value.startsWith(".") ? value : `.${value}`;
        })
        .filter(Boolean),
    ),
  );

const getDisputeEvidenceRule = (policy) => {
  const rule = policy?.config?.rules?.find(
    (item) =>
      String(item?.context || "").toLowerCase() ===
      DISPUTE_EVIDENCE_CONTEXT.toLowerCase(),
  );
  const maxFileSizeBytes = Number(rule?.maxFileSizeBytes);
  const allowedExtensions = normalizeExtensions(
    rule?.allowedExtensions,
  );

  if (
    !rule ||
    !Number.isFinite(maxFileSizeBytes) ||
    maxFileSizeBytes <= 0 ||
    allowedExtensions.length === 0
  ) {
    throw new Error(
      "Máy chủ chưa trả quy định ảnh bằng chứng hợp lệ.",
    );
  }

  return {
    maxFileSizeBytes,
    allowedExtensions,
  };
};

const getFileExtension = (fileName) => {
  const value = String(fileName || "").trim().toLowerCase();
  const dotIndex = value.lastIndexOf(".");

  return dotIndex >= 0 ? value.slice(dotIndex) : "";
};

const formatFileSize = (bytes) => {
  const size = Number(bytes);

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/*
 * allowedCategories (tùy chọn): bộ lý do do Backend cung cấp cho đối tượng
 * này (ví dụ OrderDetailDto.actions.allowedDisputeCategories). Khi được
 * truyền, modal chỉ hiển thị đúng bộ này và không gọi /dispute-categories;
 * nếu rỗng thì không tự bịa lý do và chặn gửi.
 */
export default function ContentReportModal({
  open,
  targetType,
  targetId,
  targetLabel,
  allowedCategories,
  onSuccess,
  onClose,
}) {
  const [disputeCategoryId, setDisputeCategoryId] =
    useState("");
  const [description, setDescription] = useState("");
  const [evidenceImages, setEvidenceImages] = useState([]);
  const [fieldError, setFieldError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);
  const previousOpenRef = useRef(false);
  const previousTargetKeyRef = useRef("");
  const [metadataVersion, setMetadataVersion] = useState(0);
  const [metadata, setMetadata] = useState({
    loading: true,
    error: "",
    categories: [],
    limits: null,
    uploadRule: null,
  });

  const normalizedTargetType = Number(targetType);
  const targetKey = `${normalizedTargetType}:${String(
    targetId || "",
  ).trim()}`;
  const isOrder =
    normalizedTargetType === DISPUTE_TARGET_TYPE.ORDER;
  const targetTypeLabel = getDisputeTargetTypeLabel(
    normalizedTargetType,
  );

  useEffect(() => {
    const isNewSession = open && !previousOpenRef.current;
    const targetChanged =
      targetKey !== previousTargetKeyRef.current;

    if (submitting) {
      if (!open) {
        previousOpenRef.current = false;
      }

      return;
    }

    previousOpenRef.current = open;

    if (isNewSession || targetChanged) {
      setDisputeCategoryId("");
      setDescription("");
      setEvidenceImages([]);
      setFieldError("");
      setSubmitError("");
    }

    previousTargetKeyRef.current = targetKey;
  }, [open, submitting, targetKey]);

  const previews = useMemo(
    () =>
      evidenceImages.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [evidenceImages],
  );

  useEffect(
    () => () => {
      previews.forEach((preview) =>
        URL.revokeObjectURL(preview.url),
      );
    },
    [previews],
  );

  const loadMetadata = useCallback(() => {
    setMetadata((current) => ({
      ...current,
      loading: true,
      error: "",
    }));
    setMetadataVersion((current) => current + 1);
  }, []);

  const hasAuthoritativeCategories = Array.isArray(allowedCategories);
  const authoritativeCategoryKey = hasAuthoritativeCategories
    ? allowedCategories
        .map((item) => String(item?.disputeCategoryId ?? ""))
        .join(",")
    : "";

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    const loadCategories = hasAuthoritativeCategories
      ? Promise.resolve(normalizeDisputeCategories(allowedCategories))
      : disputeApi.getCategories({
          targetType: normalizedTargetType,
          signal: controller.signal,
        });

    Promise.all([
      loadCategories,
      disputeApi.getOptions({
        targetType: normalizedTargetType,
        signal: controller.signal,
      }),
      publicPlatformPolicyApi.getFileUpload({
        signal: controller.signal,
      }),
    ])
      .then(([categories, limits, uploadPolicy]) => {
        if (!active) {
          return;
        }

        if (categories.length === 0) {
          throw new Error(
            hasAuthoritativeCategories
              ? "Hiện chưa có lý do tranh chấp phù hợp cho giao dịch này. Vui lòng làm mới đơn hàng hoặc thử lại sau."
              : "Không có lý do báo cáo phù hợp.",
          );
        }

        setMetadata({
          loading: false,
          error: "",
          categories: [...categories].sort((left, right) =>
            left.name.localeCompare(right.name, "vi"),
          ),
          limits,
          uploadRule: getDisputeEvidenceRule(uploadPolicy),
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

        setMetadata({
          loading: false,
          error:
            getSafeProblemDetail(error?.message) ||
            "Không thể tải quy định báo cáo. Vui lòng thử lại.",
          categories: [],
          limits: null,
          uploadRule: null,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // allowedCategories được theo dõi qua khóa id để tránh tải lại khi mảng đổi tham chiếu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    normalizedTargetType,
    metadataVersion,
    hasAuthoritativeCategories,
    authoritativeCategoryKey,
  ]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, submitting]);

  if (!open) {
    return null;
  }

  const validateFiles = (files) => {
    const { limits, uploadRule } = metadata;

    if (!limits || !uploadRule) {
      return "Chưa tải được quy định ảnh bằng chứng.";
    }

    if (files.length > limits.maximumEvidenceImages) {
      return `Chỉ được chọn tối đa ${limits.maximumEvidenceImages} ảnh bằng chứng.`;
    }

    for (const file of files) {
      if (file.size <= 0) {
        return `Ảnh "${file.name}" không có dữ liệu.`;
      }

      if (file.size > uploadRule.maxFileSizeBytes) {
        return `Ảnh "${file.name}" vượt quá dung lượng tối đa ${formatFileSize(
          uploadRule.maxFileSizeBytes,
        )}.`;
      }

      if (
        !uploadRule.allowedExtensions.includes(
          getFileExtension(file.name),
        )
      ) {
        return `Ảnh "${file.name}" không đúng định dạng. Chỉ chấp nhận ${uploadRule.allowedExtensions
          .map((extension) =>
            extension.replace(/^\./, "").toUpperCase(),
          )
          .join(", ")}.`;
      }
    }

    return "";
  };

  const handleFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const uniqueFiles = Array.from(
      new Map(
        [...evidenceImages, ...selectedFiles].map((file) => [
          `${file.name}-${file.size}-${file.lastModified}`,
          file,
        ]),
      ).values(),
    );
    const validationError = validateFiles(uniqueFiles);

    setFieldError(validationError);
    setSubmitError("");

    if (!validationError) {
      setEvidenceImages(uniqueFiles);
    }

    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || submitInFlightRef.current) {
      return;
    }

    setFieldError("");
    setSubmitError("");

    const { limits } = metadata;
    const trimmedDescription = description.trim();

    if (!limits || !metadata.uploadRule) {
      setFieldError(
        "Chưa tải được quy định báo cáo. Vui lòng thử lại.",
      );
      return;
    }

    if (!disputeCategoryId) {
      setFieldError("Vui lòng chọn lý do báo cáo.");
      return;
    }

    if (
      trimmedDescription.length <
      limits.minimumDescriptionLength
    ) {
      setFieldError(
        `Mô tả phải có ít nhất ${limits.minimumDescriptionLength} ký tự.`,
      );
      return;
    }

    if (
      trimmedDescription.length >
      limits.maximumDescriptionLength
    ) {
      setFieldError(
        `Mô tả không được vượt quá ${limits.maximumDescriptionLength} ký tự.`,
      );
      return;
    }

    if (
      evidenceImages.length < limits.minimumEvidenceImages ||
      evidenceImages.length > limits.maximumEvidenceImages
    ) {
      setFieldError(
        `Vui lòng cung cấp từ ${limits.minimumEvidenceImages} đến ${limits.maximumEvidenceImages} ảnh bằng chứng.`,
      );
      return;
    }

    const fileError = validateFiles(evidenceImages);

    if (fileError) {
      setFieldError(fileError);
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);

    try {
      const payload = {
        targetType: normalizedTargetType,
        targetId,
        disputeCategoryId,
        description: trimmedDescription,
        evidenceImages,
      };
      const result = isOrder
        ? await disputeApi.createForOrder({
            orderId: targetId,
            disputeCategoryId,
            description: trimmedDescription,
            evidenceImages,
          })
        : await disputeApi.createContentReport(payload);

      onSuccess?.(result);
    } catch (error) {
      const code = getErrorCode(error);

      if (code === "DISPUTE_INVALID_CONTENT_CATEGORY") {
        setDisputeCategoryId("");
        loadMetadata();
      }

      setSubmitError(getReportErrorMessage(error));
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const limits = metadata.limits;
  const uploadRule = metadata.uploadRule;
  const selectedCategory = metadata.categories.find(
    (category) =>
      String(category.disputeCategoryId) ===
      String(disputeCategoryId),
  );

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
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-report-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-warning">
              {isOrder
                ? "Báo cáo vấn đề giao dịch"
                : `Báo cáo ${targetTypeLabel.toLowerCase()}`}
            </p>

            <h2
              id="content-report-title"
              className="mt-1 text-xl font-black text-text"
            >
              {isOrder
                ? "Tạo tranh chấp"
                : `Báo cáo ${targetTypeLabel.toLowerCase()}`}
            </h2>

            <p className="mt-1 text-sm text-textLight">
              {targetLabel || targetTypeLabel}
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

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          {metadata.loading && (
            <div
              role="status"
              className="rounded-xl border border-border bg-background p-4 text-sm font-semibold text-textLight"
            >
              Đang tải lý do và quy định báo cáo...
            </div>
          )}

          {metadata.error && (
            <div
              role="alert"
              className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error"
            >
              <p>{metadata.error}</p>
              <button
                type="button"
                onClick={loadMetadata}
                disabled={submitting}
                className="mt-3 rounded-lg border border-error/30 bg-white px-3 py-2 text-xs font-black"
              >
                Thử lại
              </button>
            </div>
          )}

          <div>
            <label
              htmlFor="content-report-category"
              className="text-sm font-black text-text"
            >
              {isOrder ? "Lý do tranh chấp" : "Lý do báo cáo"}
            </label>

            <select
              id="content-report-category"
              value={disputeCategoryId}
              disabled={metadata.loading || submitting || Boolean(metadata.error)}
              onChange={(event) => {
                setDisputeCategoryId(event.target.value);
                setFieldError("");
                setSubmitError("");
              }}
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm font-semibold text-text outline-none focus:border-primary disabled:bg-background"
            >
              <option value="">Chọn lý do phù hợp</option>
              {metadata.categories.map((category) => (
                <option
                  key={category.disputeCategoryId}
                  value={category.disputeCategoryId}
                >
                  {category.name}
                </option>
              ))}
            </select>

            {selectedCategory?.description && (
              <p className="mt-1 text-xs leading-5 text-textLight">
                {selectedCategory.description}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="content-report-description"
                className="text-sm font-black text-text"
              >
                Mô tả sự việc
              </label>

              <span className="text-xs font-semibold text-textLight">
                {description.length}
                {limits
                  ? `/${limits.maximumDescriptionLength}`
                  : ""}
              </span>
            </div>

            <textarea
              id="content-report-description"
              rows={6}
              maxLength={limits?.maximumDescriptionLength}
              value={description}
              disabled={metadata.loading || submitting || Boolean(metadata.error)}
              onChange={(event) => {
                setDescription(event.target.value);
                setFieldError("");
                setSubmitError("");
              }}
              placeholder="Mô tả rõ nội dung cần được xem xét và lý do bạn cho rằng nội dung này vi phạm..."
              className="mt-2 w-full resize-y rounded-xl border border-border bg-white px-3 py-3 text-sm leading-6 text-text outline-none focus:border-primary disabled:bg-background"
            />

            {limits && (
              <p className="mt-1 text-xs text-textLight">
                Từ {limits.minimumDescriptionLength} đến{" "}
                {limits.maximumDescriptionLength} ký tự.
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-black text-text">Ảnh bằng chứng</p>

            {limits && uploadRule && (
              <p className="mt-1 text-xs leading-5 text-textLight">
                Chọn từ {limits.minimumEvidenceImages} đến{" "}
                {limits.maximumEvidenceImages} ảnh. Mỗi ảnh tối đa{" "}
                {formatFileSize(uploadRule.maxFileSizeBytes)}, định dạng{" "}
                {uploadRule.allowedExtensions
                  .map((extension) =>
                    extension.replace(/^\./, "").toUpperCase(),
                  )
                  .join(", ")}.
              </p>
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
                accept={uploadRule?.allowedExtensions.join(",")}
                disabled={
                  metadata.loading ||
                  submitting ||
                  Boolean(metadata.error) ||
                  !limits ||
                  !uploadRule ||
                  evidenceImages.length >= limits.maximumEvidenceImages
                }
                onChange={handleFilesChange}
                className="sr-only"
              />
            </label>

            {previews.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {previews.map(({ file, url }, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
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
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setEvidenceImages((current) =>
                            current.filter(
                              (_, fileIndex) => fileIndex !== index,
                            ),
                          );
                          setFieldError("");
                          setSubmitError("");
                        }}
                        aria-label={`Xóa ảnh ${file.name}`}
                        className="rounded-lg p-1.5 text-error transition hover:bg-error/10 disabled:opacity-50"
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
                ))}
              </div>
            )}

            {limits && (
              <p className="mt-2 text-xs font-bold text-textLight">
                Đã chọn {evidenceImages.length}/
                {limits.maximumEvidenceImages} ảnh
              </p>
            )}
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
              className="whitespace-pre-line rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
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
                metadata.loading ||
                Boolean(metadata.error) ||
                !limits ||
                !uploadRule
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
                ? "Đang gửi..."
                : isOrder
                  ? "Gửi tranh chấp"
                  : "Gửi báo cáo"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

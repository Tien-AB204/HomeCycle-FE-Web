import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APPEARANCE_STATUS_OPTIONS,
  CONCLUSION_OPTIONS,
  MATCH_STATUS_OPTIONS,
  OPERATING_STATUS_OPTIONS,
  PARTS_STATUS_OPTIONS,
  getAppearanceStatusLabel,
  getCollectActionLabel,
  getInspectionConclusionLabel,
  getInspectionStatusLabel,
  getMatchStatusLabel,
  getOperatingStatusLabel,
  getPartsStatusLabel,
  getSafeInspectionErrorMessage,
} from "../../constants/inspections";
import inspectionFormApi from "../../services/apis/inspectionFormApi";
import publicPlatformPolicyApi from "../../services/apis/publicPlatformPolicyApi";
import CollectionSchedulePanel from "./CollectionSchedulePanel";

const INSPECTION_EVIDENCE_CONTEXT = "InspectionEvidence";
const MAX_IMAGES = 5;

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = (value) => {
  if (typeof value !== "number" && typeof value !== "string") {
    return "—";
  }

  const raw = typeof value === "string" ? value.trim() : value;

  if (raw === "") {
    return "—";
  }

  const amount = Number(raw);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "—";
};

const getExtension = (fileName) => {
  const normalized = String(fileName || "").trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
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
      (Array.isArray(extensions) ? extensions : []).map((value) => {
        const normalized = String(value || "").trim().toLowerCase();

        if (!normalized) {
          return "";
        }

        return normalized.startsWith(".") ? normalized : `.${normalized}`;
      }).filter(Boolean),
    ),
  );

const getInspectionEvidenceRule = (policy) =>
  policy?.config?.rules?.find(
    (rule) =>
      String(rule?.context || "").trim().toLowerCase() ===
      INSPECTION_EVIDENCE_CONTEXT.toLowerCase(),
  ) || null;

const emptyDraft = () => ({
  operatingStatus: "",
  appearanceStatus: "",
  partsStatus: "",
  matchStatus: "",
  inspectorNotes: "",
  conclusion: "",
  suggestedPrice: "",
});

const draftFromForm = (form) => ({
  operatingStatus: form?.operatingStatus || "",
  appearanceStatus: form?.appearanceStatus || "",
  partsStatus: form?.partsStatus || "",
  matchStatus: form?.matchStatus || "",
  inspectorNotes: form?.inspectorNotes || "",
  conclusion: form?.conclusion || "",
  suggestedPrice:
    form?.conclusion === "PriceAdjustment" && form?.suggestedPrice != null
      ? String(form.suggestedPrice)
      : "",
});

const isDraftComplete = (draft) =>
  Boolean(
    draft.operatingStatus &&
      draft.appearanceStatus &&
      draft.partsStatus &&
      draft.matchStatus &&
      draft.conclusion &&
      (draft.conclusion !== "PriceAdjustment" ||
        (Number(draft.suggestedPrice) > 0)),
  );

/*
 * Upload evidence: dùng chung 1 select cho từng chỉ tiêu, không tự suy diễn
 * quyền Buyer/Seller - mọi quyền thao tác lấy trực tiếp từ form.actions do
 * Backend trả (đã tính sẵn theo vai trò + trạng thái thực tế).
 */
const StatusSelect = ({ label, value, options, onChange, disabled }) => (
  <label className="block">
    <span className="text-xs font-black uppercase tracking-wide text-textLight">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-text outline-none focus:border-primary disabled:bg-background disabled:text-textLight"
    >
      <option value="">Chọn...</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const ImagePreviewGrid = ({ images }) => {
  if (!images.length) {
    return (
      <p className="mt-2 text-xs text-textLight">Chưa có ảnh minh chứng.</p>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((image, index) => (
        <a
          key={image.mediaId || image.url || index}
          href={image.url}
          target="_blank"
          rel="noreferrer"
          className="overflow-hidden rounded-lg border border-border bg-background"
        >
          <img
            src={image.url}
            alt={image.fileName || `Ảnh ${index + 1}`}
            loading="lazy"
            className="h-24 w-full object-cover"
          />
        </a>
      ))}
    </div>
  );
};

const InspectionFormPanel = ({
  appointmentId,
  canCreateInspectionForm,
  onAppointmentChanged,
}) => {
  const [state, setState] = useState({
    loading: true,
    form: null,
    notFound: false,
    error: "",
  });

  const [mode, setMode] = useState("view");
  const [draft, setDraft] = useState(emptyDraft());
  const [newImages, setNewImages] = useState([]);
  const [imagesTouched, setImagesTouched] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const [policyState, setPolicyState] = useState({
    loading: true,
    error: "",
    rule: null,
  });

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const previewItems = useMemo(
    () =>
      newImages.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [newImages],
  );

  useEffect(() => {
    return () => {
      previewItems.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewItems]);

  const loadForm = useCallback(
    async (signal) => {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const form = await inspectionFormApi.getByAppointment(appointmentId, {
          signal,
        });

        setState({ loading: false, form, notFound: false, error: "" });
      } catch (error) {
        if (isCanceledRequest(error)) {
          return;
        }

        const code = String(
          error?.response?.data?.error?.code ??
            error?.response?.data?.code ??
            "",
        ).trim();

        if (code === "Inspection.NotFound") {
          setState({ loading: false, form: null, notFound: true, error: "" });
          return;
        }

        setState({
          loading: false,
          form: null,
          notFound: false,
          error: getSafeInspectionErrorMessage(
            error,
            "Không thể tải biên bản kiểm định.",
          ),
        });
      }
    },
    [appointmentId],
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void loadForm(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadForm]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPolicy = async () => {
      try {
        const policy = await publicPlatformPolicyApi.getFileUpload({
          signal: controller.signal,
        });

        const sourceRule = getInspectionEvidenceRule(policy);
        const maxFileSizeBytes = Number(sourceRule?.maxFileSizeBytes);
        const allowedExtensions = normalizeExtensions(
          sourceRule?.allowedExtensions,
        );

        if (
          !sourceRule ||
          !Number.isFinite(maxFileSizeBytes) ||
          maxFileSizeBytes <= 0 ||
          allowedExtensions.length === 0
        ) {
          throw new Error(
            "Máy chủ chưa trả quy định ảnh minh chứng kiểm định hợp lệ.",
          );
        }

        setPolicyState({
          loading: false,
          error: "",
          rule: { ...sourceRule, maxFileSizeBytes, allowedExtensions },
        });
      } catch (error) {
        if (!isCanceledRequest(error)) {
          setPolicyState({
            loading: false,
            error:
              "Không thể tải quy định ảnh minh chứng kiểm định.",
            rule: null,
          });
        }
      }
    };

    void loadPolicy();

    return () => controller.abort();
  }, []);

  const startCreate = () => {
    setDraft(emptyDraft());
    setNewImages([]);
    setImagesTouched(false);
    setFieldError("");
    setNotice("");
    setMode("create");
  };

  const startEdit = () => {
    setDraft(draftFromForm(state.form));
    setNewImages([]);
    setImagesTouched(false);
    setFieldError("");
    setNotice("");
    setMode("edit");
  };

  const cancelEdit = () => {
    setMode("view");
    setFieldError("");
  };

  const validateImages = (files) => {
    if (!policyState.rule) {
      return "Chưa tải được quy định ảnh minh chứng. Vui lòng thử lại.";
    }

    if (files.length > MAX_IMAGES) {
      return `Chỉ được tải tối đa ${MAX_IMAGES} ảnh minh chứng.`;
    }

    for (const file of files) {
      if (file.size <= 0) {
        return `Ảnh "${file.name}" không có dữ liệu.`;
      }

      if (file.size > policyState.rule.maxFileSizeBytes) {
        return `Ảnh "${file.name}" vượt quá dung lượng tối đa ${formatFileSize(
          policyState.rule.maxFileSizeBytes,
        )}.`;
      }

      if (!policyState.rule.allowedExtensions.includes(getExtension(file.name))) {
        return `Ảnh "${file.name}" không đúng định dạng. Chỉ chấp nhận ${policyState.rule.allowedExtensions
          .map((extension) => extension.replace(/^\./, "").toUpperCase())
          .join(", ")}.`;
      }
    }

    return "";
  };

  const handleFilesChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const merged = [...newImages, ...selected];

    const validationError = validateImages(merged);

    if (validationError) {
      setFieldError(validationError);
      event.target.value = "";
      return;
    }

    setFieldError("");
    setImagesTouched(true);
    setNewImages(merged);
    event.target.value = "";
  };

  const removeNewImage = (index) => {
    setNewImages((current) => current.filter((_, i) => i !== index));
    setImagesTouched(true);
  };

  const clearExistingImages = () => {
    setImagesTouched(true);
    setNewImages([]);
  };

  const buildPayload = () => ({
    operatingStatus: draft.operatingStatus,
    appearanceStatus: draft.appearanceStatus,
    partsStatus: draft.partsStatus,
    matchStatus: draft.matchStatus,
    inspectorNotes: draft.inspectorNotes,
    conclusion: draft.conclusion,
    suggestedPrice: draft.suggestedPrice,
    images: newImages,
  });

  const handleSaveDraft = async () => {
    setBusy(mode === "create" ? "create" : "save");
    setFieldError("");
    setNotice("");

    try {
      const payload = buildPayload();

      if (mode === "create") {
        const created = await inspectionFormApi.createDraft(
          appointmentId,
          payload,
        );

        setState({ loading: false, form: created, notFound: false, error: "" });
        setNotice("Đã tạo bản nháp biên bản kiểm định.");
      } else {
        const updated = await inspectionFormApi.updateDraft(
          state.form.inspectionFormId,
          state.form.revision,
          payload,
          { replaceImages: imagesTouched },
        );

        setState((current) => ({ ...current, form: updated }));
        setNotice("Đã lưu bản nháp.");
      }

      setMode("view");
      setNewImages([]);
      setImagesTouched(false);
      onAppointmentChanged?.();
    } catch (error) {
      const code = String(
        error?.response?.data?.error?.code ??
          error?.response?.data?.code ??
          "",
      ).trim();

      if (code === "Inspection.RevisionMismatch") {
        setFieldError(getSafeInspectionErrorMessage(error));
        await loadForm();
      } else {
        setFieldError(
          getSafeInspectionErrorMessage(
            error,
            "Không thể lưu bản nháp biên bản kiểm định.",
          ),
        );
      }
    } finally {
      setBusy("");
    }
  };

  const handleSubmit = async () => {
    if (!state.form || !isDraftComplete(draftFromForm(state.form))) {
      setFieldError(
        "Vui lòng hoàn thành đầy đủ các mục đánh giá và kết luận trước khi gửi.",
      );
      return;
    }

    setBusy("submit");
    setFieldError("");
    setNotice("");

    try {
      const submitted = await inspectionFormApi.submit(
        state.form.inspectionFormId,
        state.form.revision,
      );

      setState((current) => ({ ...current, form: submitted }));
      setNotice("Đã gửi kết quả kiểm định cho người bán xác nhận.");
      onAppointmentChanged?.();
    } catch (error) {
      const code = String(
        error?.response?.data?.error?.code ??
          error?.response?.data?.code ??
          "",
      ).trim();

      if (code === "Inspection.RevisionMismatch") {
        setFieldError(getSafeInspectionErrorMessage(error));
        await loadForm();
      } else {
        setFieldError(
          getSafeInspectionErrorMessage(
            error,
            "Không thể gửi kết quả kiểm định.",
          ),
        );
      }
    } finally {
      setBusy("");
    }
  };

  const handleSellerConfirm = async () => {
    setBusy("confirm");
    setNotice("");

    try {
      const confirmed = await inspectionFormApi.sellerConfirm(
        state.form.inspectionFormId,
        state.form.revision,
      );

      setState((current) => ({ ...current, form: confirmed }));
      setConfirmModalOpen(false);
      setNotice("Đã xác nhận kết quả kiểm định.");
      onAppointmentChanged?.();
    } catch (error) {
      const code = String(
        error?.response?.data?.error?.code ??
          error?.response?.data?.code ??
          "",
      ).trim();

      setConfirmModalOpen(false);

      if (code === "Inspection.RevisionMismatch") {
        setState((current) => ({
          ...current,
          error: getSafeInspectionErrorMessage(error),
        }));
        await loadForm();
      } else {
        setState((current) => ({
          ...current,
          error: getSafeInspectionErrorMessage(
            error,
            "Không thể xác nhận kết quả kiểm định.",
          ),
        }));
      }
    } finally {
      setBusy("");
    }
  };

  const handleSellerReject = async () => {
    if (!rejectReason.trim()) {
      setFieldError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setBusy("reject");
    setFieldError("");

    try {
      const rejected = await inspectionFormApi.sellerReject(
        state.form.inspectionFormId,
        state.form.revision,
        rejectReason,
      );

      setState((current) => ({ ...current, form: rejected }));
      setRejectModalOpen(false);
      setRejectReason("");
      setNotice("Đã từ chối kết quả kiểm định.");
      onAppointmentChanged?.();
    } catch (error) {
      const code = String(
        error?.response?.data?.error?.code ??
          error?.response?.data?.code ??
          "",
      ).trim();

      if (code === "Inspection.RevisionMismatch") {
        setFieldError(getSafeInspectionErrorMessage(error));
        setRejectModalOpen(false);
        await loadForm();
      } else {
        setFieldError(
          getSafeInspectionErrorMessage(
            error,
            "Không thể từ chối kết quả kiểm định.",
          ),
        );
      }
    } finally {
      setBusy("");
    }
  };

  const handleCollectNow = async () => {
    if (!state.form?.actions?.canCollectNow) {
      return;
    }

    const accepted = window.confirm(
      "Thu gom ngay sẽ tiếp tục giao dịch mà không tạo một lịch thu gom mới. Bạn có chắc muốn tiếp tục?",
    );

    if (!accepted) {
      return;
    }

    setBusy("collect-now");
    setNotice("");

    try {
      const updated = await inspectionFormApi.collectNow(
        state.form.inspectionFormId,
        state.form.revision,
      );

      setState((current) => ({ ...current, form: updated }));
      setNotice("Đã xác nhận thu gom ngay.");
      onAppointmentChanged?.();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getSafeInspectionErrorMessage(
          error,
          "Không thể thực hiện thu gom ngay.",
        ),
      }));
      await loadForm();
    } finally {
      setBusy("");
    }
  };

  if (state.loading) {
    return (
      <section className="mt-4 rounded-xl border border-border bg-background p-4 text-center text-sm font-semibold text-textLight">
        Đang tải biên bản kiểm định...
      </section>
    );
  }

  if (state.notFound) {
    if (!canCreateInspectionForm) {
      return (
        <section className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-textLight">
          Chưa có biên bản kiểm định cho lịch hẹn này.
        </section>
      );
    }

    if (mode !== "create") {
      return (
        <section className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm leading-6 text-primary">
            Bạn có thể tạo biên bản kiểm định để ghi nhận kết quả cho lịch hẹn này.
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-3 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90"
          >
            Tạo biên bản kiểm định
          </button>
        </section>
      );
    }
  }

  const form = state.form;
  const actions = form?.actions || {};

  return (
    <section className="mt-4 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            Biên bản kiểm định
          </p>
          {form && (
            <p className="mt-1 text-xs leading-5 text-textLight">
              Trạng thái: {getInspectionStatusLabel(form.inspectionStatus)}
            </p>
          )}
        </div>

        {form && (
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-black text-text">
            Phiên bản {form.revision}
          </span>
        )}
      </div>

      {state.error && (
        <div className="mt-3 rounded-lg border border-error/20 bg-error/10 px-3 py-2.5 text-xs font-semibold leading-5 text-error">
          {state.error}
        </div>
      )}

      {notice && (
        <div className="mt-3 rounded-lg border border-success/20 bg-success/10 px-3 py-2.5 text-xs font-semibold leading-5 text-success">
          {notice}
        </div>
      )}

      {fieldError && (
        <div className="mt-3 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5 text-xs font-semibold leading-5 text-warning">
          {fieldError}
        </div>
      )}

      {(mode === "create" || mode === "edit") && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-white p-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusSelect
              label="Tình trạng hoạt động"
              value={draft.operatingStatus}
              options={OPERATING_STATUS_OPTIONS}
              onChange={(value) =>
                setDraft((current) => ({ ...current, operatingStatus: value }))
              }
              disabled={Boolean(busy)}
            />
            <StatusSelect
              label="Tình trạng ngoại hình"
              value={draft.appearanceStatus}
              options={APPEARANCE_STATUS_OPTIONS}
              onChange={(value) =>
                setDraft((current) => ({ ...current, appearanceStatus: value }))
              }
              disabled={Boolean(busy)}
            />
            <StatusSelect
              label="Tình trạng linh kiện"
              value={draft.partsStatus}
              options={PARTS_STATUS_OPTIONS}
              onChange={(value) =>
                setDraft((current) => ({ ...current, partsStatus: value }))
              }
              disabled={Boolean(busy)}
            />
            <StatusSelect
              label="Mức độ khớp mô tả"
              value={draft.matchStatus}
              options={MATCH_STATUS_OPTIONS}
              onChange={(value) =>
                setDraft((current) => ({ ...current, matchStatus: value }))
              }
              disabled={Boolean(busy)}
            />
          </div>

          <StatusSelect
            label="Kết luận"
            value={draft.conclusion}
            options={CONCLUSION_OPTIONS}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                conclusion: value,
                suggestedPrice: value === "PriceAdjustment" ? current.suggestedPrice : "",
              }))
            }
            disabled={Boolean(busy)}
          />

          {draft.conclusion === "PriceAdjustment" && (
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-textLight">
                Giá đề xuất
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={draft.suggestedPrice}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    suggestedPrice: event.target.value,
                  }))
                }
                disabled={Boolean(busy)}
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-text outline-none focus:border-primary"
              />
              {form?.originalPrice != null && (
                <span className="mt-1 block text-xs text-textLight">
                  Giá gốc: {formatCurrency(form.originalPrice)}
                </span>
              )}
            </label>
          )}

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-textLight">
              Ghi chú kiểm định
            </span>
            <textarea
              rows={3}
              maxLength={2000}
              value={draft.inspectorNotes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  inspectorNotes: event.target.value,
                }))
              }
              disabled={Boolean(busy)}
              className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
            />
          </label>

          <div>
            <span className="text-xs font-black uppercase tracking-wide text-textLight">
              Ảnh minh chứng
            </span>

            {mode === "edit" && !imagesTouched && (
              <>
                <ImagePreviewGrid images={form?.images || []} />
                <button
                  type="button"
                  onClick={clearExistingImages}
                  disabled={Boolean(busy)}
                  className="mt-2 text-xs font-bold text-primary underline"
                >
                  Thay đổi ảnh minh chứng
                </button>
              </>
            )}

            {(mode === "create" || imagesTouched) && (
              <>
                {mode === "edit" && (
                  <p className="mt-1 text-xs font-semibold text-warning">
                    Lưu sẽ thay thế toàn bộ ảnh hiện có bằng ảnh bạn chọn dưới đây
                    (chọn 0 ảnh nghĩa là xóa hết ảnh minh chứng).
                  </p>
                )}

                {policyState.error && (
                  <p className="mt-1 text-xs font-semibold text-error">
                    {policyState.error}
                  </p>
                )}

                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm font-black text-primary transition hover:bg-primary/10">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    add_photo_alternate
                  </span>
                  Chọn ảnh
                  <input
                    type="file"
                    multiple
                    disabled={
                      Boolean(busy) ||
                      policyState.loading ||
                      !policyState.rule ||
                      newImages.length >= MAX_IMAGES
                    }
                    accept={policyState.rule?.allowedExtensions.join(",") || undefined}
                    onChange={handleFilesChange}
                    className="sr-only"
                  />
                </label>

                {previewItems.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {previewItems.map(({ file, url }, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}`}
                        className="overflow-hidden rounded-lg border border-border bg-white"
                      >
                        <img src={url} alt="" className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          disabled={Boolean(busy)}
                          className="w-full py-1 text-xs font-bold text-error"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={Boolean(busy)}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "create" || busy === "save" ? "Đang lưu..." : "Lưu bản nháp"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={Boolean(busy)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-black text-textLight transition hover:bg-white"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {form && mode === "view" && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-white p-3.5 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <p>
              <span className="font-bold text-textLight">Tình trạng hoạt động: </span>
              {getOperatingStatusLabel(form.operatingStatus)}
            </p>
            <p>
              <span className="font-bold text-textLight">Tình trạng ngoại hình: </span>
              {getAppearanceStatusLabel(form.appearanceStatus)}
            </p>
            <p>
              <span className="font-bold text-textLight">Tình trạng linh kiện: </span>
              {getPartsStatusLabel(form.partsStatus)}
            </p>
            <p>
              <span className="font-bold text-textLight">Mức độ khớp mô tả: </span>
              {getMatchStatusLabel(form.matchStatus)}
            </p>
          </div>

          <p>
            <span className="font-bold text-textLight">Kết luận: </span>
            {getInspectionConclusionLabel(form.conclusion) || "Chưa có"}
          </p>

          {form.conclusion === "PriceAdjustment" && (
            <p>
              <span className="font-bold text-textLight">Giá đề xuất: </span>
              {formatCurrency(form.suggestedPrice)}
              <span className="ml-2 text-xs text-textLight">
                (giá gốc {formatCurrency(form.originalPrice)})
              </span>
            </p>
          )}

          {form.inspectorNotes && (
            <p className="whitespace-pre-wrap">
              <span className="font-bold text-textLight">Ghi chú: </span>
              {form.inspectorNotes}
            </p>
          )}

          <div>
            <span className="font-bold text-textLight">Ảnh minh chứng:</span>
            <ImagePreviewGrid images={form.images || []} />
          </div>

          <p className="text-xs text-textLight">
            Gửi lúc: {formatDateTime(form.submittedAt)}
          </p>

          {form.sellerDecisionAt && (
            <p className="text-xs text-textLight">
              Người bán phản hồi lúc: {formatDateTime(form.sellerDecisionAt)}
            </p>
          )}

          {form.inspectionStatus === "Rejected" && form.sellerDecisionReason && (
            <div className="rounded-lg border border-error/20 bg-error/10 px-3 py-2.5 text-xs font-semibold leading-5 text-error">
              Lý do người bán từ chối: {form.sellerDecisionReason}
            </div>
          )}

          {form.collectAction && (
            <p className="text-xs text-textLight">
              Phương án thu gom: {getCollectActionLabel(form.collectAction)}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {actions.canEdit && (
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg border border-primary px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10"
              >
                Chỉnh sửa bản nháp
              </button>
            )}

            {actions.canSubmit && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={Boolean(busy)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "submit" ? "Đang gửi..." : "Gửi kết quả cho người bán"}
              </button>
            )}

            {actions.canSellerConfirm && (
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                disabled={Boolean(busy)}
                className="rounded-lg bg-success px-4 py-2 text-sm font-black text-white transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Xác nhận kết quả
              </button>
            )}

            {actions.canSellerReject && (
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                disabled={Boolean(busy)}
                className="rounded-lg border border-error px-4 py-2 text-sm font-black text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Từ chối kết quả
              </button>
            )}

            {actions.canCollectNow && (
              <button
                type="button"
                onClick={handleCollectNow}
                disabled={Boolean(busy)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "collect-now" ? "Đang xử lý..." : "Thu gom ngay"}
              </button>
            )}

            {actions.canScheduleCollection && (
              <button
                type="button"
                onClick={() => setScheduleOpen((current) => !current)}
                disabled={Boolean(busy)}
                className="rounded-lg border border-primary px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scheduleOpen ? "Ẩn tạo lịch" : "Tạo lịch thu gom"}
              </button>
            )}
          </div>

          {actions.canCancelTransaction && (
            <p className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5 text-xs font-semibold leading-5 text-warning">
              Kết quả kiểm định đã bị từ chối. Bạn có thể hủy giao dịch từ màn
              hình chi tiết đơn hàng.
            </p>
          )}

          {scheduleOpen && actions.canScheduleCollection && (
            <CollectionSchedulePanel
              inspectionForm={form}
              onClose={() => setScheduleOpen(false)}
              onRefreshRequired={async () => {
                setScheduleOpen(false);
                await loadForm();
              }}
              onScheduled={async () => {
                setScheduleOpen(false);
                setNotice("Đã tạo lịch thu gom thành công.");
                await loadForm();
                onAppointmentChanged?.();
              }}
            />
          )}
        </div>
      )}

      {confirmModalOpen && form && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-primary/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setConfirmModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl"
          >
            <h3 className="text-lg font-black text-text">
              Xác nhận kết quả kiểm định
            </h3>

            {form.conclusion === "Passed" && (
              <p className="mt-3 text-sm leading-6 text-textLight">
                Bạn xác nhận sản phẩm đạt yêu cầu kiểm định. Giao dịch sẽ tiếp
                tục theo mức giá hiện tại.
              </p>
            )}

            {form.conclusion === "PriceAdjustment" && (
              <div className="mt-3 space-y-2 text-sm leading-6 text-textLight">
                <p>
                  Người mua đề xuất điều chỉnh giá giao dịch. Xác nhận nghĩa là
                  bạn đồng ý với mức giá mới; hệ thống sẽ tự động đối soát lại
                  khoản tiền đã giữ.
                </p>
                <p className="font-bold text-text">
                  Giá gốc: {formatCurrency(form.originalPrice)} → Giá đề xuất:{" "}
                  {formatCurrency(form.suggestedPrice)}
                </p>
              </div>
            )}

            {form.conclusion === "Failed" && (
              <p className="mt-3 rounded-lg border border-error/20 bg-error/10 p-3 text-sm font-semibold leading-6 text-error">
                Kết luận là sản phẩm KHÔNG đạt yêu cầu kiểm định. Xác nhận sẽ
                HỦY đơn hàng và hoàn lại khoản tiền nền tảng đang giữ cho người
                mua. Thao tác này không thể hoàn tác.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={Boolean(busy)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-textLight"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSellerConfirm}
                disabled={Boolean(busy)}
                className="rounded-lg bg-success px-4 py-2 text-sm font-black text-white transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "confirm" ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-primary/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setRejectModalOpen(false);
              setRejectReason("");
              setFieldError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl"
          >
            <h3 className="text-lg font-black text-text">
              Từ chối kết quả kiểm định
            </h3>
            <p className="mt-2 text-sm leading-6 text-textLight">
              Vui lòng nêu rõ lý do bạn không đồng ý với kết quả kiểm định này.
            </p>

            <textarea
              rows={4}
              maxLength={500}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              disabled={Boolean(busy)}
              placeholder="Nhập lý do từ chối..."
              className="mt-3 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
            />

            {fieldError && (
              <p className="mt-2 text-xs font-semibold text-error">{fieldError}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason("");
                  setFieldError("");
                }}
                disabled={Boolean(busy)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-textLight"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSellerReject}
                disabled={Boolean(busy) || !rejectReason.trim()}
                className="rounded-lg bg-error px-4 py-2 text-sm font-black text-white transition hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "reject" ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default InspectionFormPanel;

import { useEffect, useMemo, useState } from "react";
import ConfirmActionModal from "../../components/shared/ConfirmActionModal";
import platformPolicyApi, {
  PLATFORM_POLICY_TYPES,
} from "../../services/apis/platformPolicyApi";

const POLICY_TABS = [
  {
    key: PLATFORM_POLICY_TYPES.DISPUTE,
    label: "Tranh chấp",
    description:
      "Quy tắc thời hạn và điểm uy tín khi xử lý tranh chấp.",
    icon: "gavel",
  },
  {
    key: PLATFORM_POLICY_TYPES.APPOINTMENT,
    label: "Lịch hẹn",
    description:
      "Mốc check-in, trễ hẹn, đổi lịch và hủy lịch.",
    icon: "calendar_month",
  },
  {
    key: PLATFORM_POLICY_TYPES.FILE_UPLOAD,
    label: "Tải tệp",
    description:
      "Giới hạn dung lượng và định dạng tệp theo từng ngữ cảnh.",
    icon: "upload_file",
  },
];

const DISPUTE_EDITABLE_FIELDS = [
  {
    name: "normalDisputeWindowDays",
    label: "Thời hạn mở tranh chấp thông thường",
    unit: "ngày",
    min: 1,
    max: 365,
  },
  {
    name: "lowReputationDisputeWindowDays",
    label: "Thời hạn khi uy tín thấp",
    unit: "ngày",
    min: 1,
    max: 365,
  },
  {
    name: "lowReputationThreshold",
    label: "Ngưỡng uy tín thấp",
    unit: "điểm",
    min: 0,
    max: 100,
  },
];

const DISPUTE_READONLY_FIELDS = [
  {
    name: "returnWindowDays",
    label: "Thời hạn hoàn trả",
    unit: "ngày",
    min: 1,
    max: 30,
  },
  {
    name: "disputeLossPenaltyPoints",
    label: "Điểm phạt khi thua tranh chấp",
    unit: "điểm",
    min: 1,
    max: 100,
  },
];

const DISPUTE_FIELDS = [
  ...DISPUTE_EDITABLE_FIELDS,
  ...DISPUTE_READONLY_FIELDS,
];

const APPOINTMENT_FIELDS = [
  {
    name: "checkInOpenBeforeMinutes",
    label: "Mở check-in trước lịch hẹn",
    unit: "phút",
    min: 0,
    max: 1440,
  },
  {
    name: "lateThresholdMinutes",
    label: "Ngưỡng xác định trễ hẹn",
    unit: "phút",
    min: 1,
    max: 10080,
  },
  {
    name: "rescheduleCutoffHours",
    label: "Hạn cuối đổi lịch",
    unit: "giờ",
    min: 1,
    max: 720,
  },
  {
    name: "cancellationCutoffHours",
    label: "Hạn cuối hủy lịch",
    unit: "giờ",
    min: 1,
    max: 720,
  },
];

const FILE_UPLOAD_CONTEXTS = [
  { value: "Avatar", label: "Ảnh đại diện" },
  { value: "IdentityDocument", label: "Giấy tờ định danh" },
  { value: "BusinessDocument", label: "Giấy tờ doanh nghiệp" },
  { value: "PostMedia", label: "Tệp bài đăng" },
  { value: "ReviewMedia", label: "Tệp đánh giá" },
  {
    value: "InspectionEvidence",
    label: "Bằng chứng kiểm định",
  },
  {
    value: "DisputeEvidence",
    label: "Bằng chứng tranh chấp",
  },
];

const FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
];

const MB_IN_BYTES = 1024 * 1024;

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

const getValidationMessage = (errors) => {
  if (!errors) {
    return "";
  }

  return Object.values(errors)
    .flat()
    .filter(Boolean)
    .join("\n");
};

const getErrorMessage = (
  error,
  fallback = "Đã xảy ra lỗi. Vui lòng thử lại.",
) => {
  const responseData = error?.response?.data;

  return (
    getValidationMessage(responseData?.errors) ||
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    fallback
  );
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
  ).sort();

const sameExtensions = (left, right) =>
  JSON.stringify(normalizeExtensions(left)) ===
  JSON.stringify(normalizeExtensions(right));

const getDraftInteger = (value) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : null;
};

const getRelationshipError = (policyType, draft) => {
  if (policyType === PLATFORM_POLICY_TYPES.DISPUTE) {
    const normalWindow = getDraftInteger(
      draft.normalDisputeWindowDays,
    );

    const lowReputationWindow = getDraftInteger(
      draft.lowReputationDisputeWindowDays,
    );

    if (
      normalWindow !== null &&
      lowReputationWindow !== null &&
      lowReputationWindow < normalWindow
    ) {
      return "Thời hạn cho tài khoản uy tín thấp không được nhỏ hơn thời hạn tranh chấp thông thường.";
    }
  }

  if (policyType === PLATFORM_POLICY_TYPES.APPOINTMENT) {
    const rescheduleCutoff = getDraftInteger(
      draft.rescheduleCutoffHours,
    );

    const cancellationCutoff = getDraftInteger(
      draft.cancellationCutoffHours,
    );

    if (
      rescheduleCutoff !== null &&
      cancellationCutoff !== null &&
      rescheduleCutoff < cancellationCutoff
    ) {
      return "Hạn cuối đổi lịch phải lớn hơn hoặc bằng hạn cuối hủy lịch.";
    }
  }

  return "";
};

const findFileRule = (policy, context) =>
  policy?.config?.rules?.find(
    (rule) =>
      String(rule?.context || "").toLowerCase() ===
      String(context || "").toLowerCase(),
  ) || null;

const createStandardDraft = (policy, fields) => {
  const draft = {};

  fields.forEach((field) => {
    const value = policy?.config?.[field.name];

    draft[field.name] =
      value === null || value === undefined
        ? ""
        : String(value);
  });

  return draft;
};

const createFileDraft = (policy, context) => {
  const rule = findFileRule(policy, context);

  return {
    maxFileSizeMb:
      rule?.maxFileSizeBytes > 0
        ? String(
            Number(
              rule.maxFileSizeBytes / MB_IN_BYTES,
            ).toFixed(2),
          ).replace(/\.?0+$/, "")
        : "",
    allowedExtensions: normalizeExtensions(
      rule?.allowedExtensions,
    ),
  };
};

const getContextLabel = (context) =>
  FILE_UPLOAD_CONTEXTS.find(
    (item) =>
      item.value.toLowerCase() ===
      String(context || "").toLowerCase(),
  )?.label ||
  context ||
  "Không xác định";

function NumberPolicyField({
  field,
  value,
  disabled,
  onChange,
}) {
  return (
    <label className="block rounded-2xl border border-border bg-background/60 p-4">
      <span className="text-sm font-black text-text">
        {field.label}
      </span>

      <span className="mt-1 block text-xs leading-5 text-textLight">
        Từ{" "}
        {new Intl.NumberFormat("vi-VN").format(field.min)} đến{" "}
        {new Intl.NumberFormat("vi-VN").format(field.max)}{" "}
        {field.unit}.
      </span>

      <div className="mt-3 flex overflow-hidden rounded-xl border border-border bg-white focus-within:border-primary">
        <input
          type="number"
          min={field.min}
          max={field.max}
          step="1"
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange(field.name, event.target.value)
          }
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-text outline-none disabled:cursor-not-allowed disabled:bg-background/70"
        />

        <span className="flex min-w-20 items-center justify-center border-l border-border bg-background px-3 text-xs font-black text-textLight">
          {field.unit}
        </span>
      </div>
    </label>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-2xl bg-background" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-background" />
        <div className="h-36 animate-pulse rounded-2xl bg-background" />
      </div>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 px-6 py-10 text-center">
      <span
        className="material-symbols-outlined flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[28px] text-primary shadow-sm"
        aria-hidden="true"
      >
        history
      </span>

      <h4 className="mt-4 font-black text-text">
        Chưa có lịch sử phiên bản
      </h4>

      <p className="mt-2 text-sm text-textLight">
        Máy chủ chưa trả về phiên bản nào cho chính sách này.
      </p>
    </div>
  );
}

function PolicyMeta({ policy }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-background px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-textLight">
          Phiên bản
        </p>

        <p className="mt-1 text-sm font-black text-text">
          {policy?.version ? `v${policy.version}` : "—"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-textLight">
          Trạng thái
        </p>

        <p
          className={[
            "mt-1 text-sm font-black",
            policy?.isActive
              ? "text-success"
              : "text-textLight",
          ].join(" ")}
        >
          {policy?.isActive ? "Đang áp dụng" : "Không hoạt động"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-textLight">
          Cập nhật gần nhất
        </p>

        <p className="mt-1 text-sm font-black text-text">
          {formatDateTime(policy?.updatedAt)}
        </p>
      </div>
    </div>
  );
}

function VersionDetail({ detail, policyType }) {
  if (!detail) {
    return null;
  }

  const fields =
    policyType === PLATFORM_POLICY_TYPES.DISPUTE
      ? DISPUTE_FIELDS
      : APPOINTMENT_FIELDS;

  return (
    <div className="mt-5 rounded-2xl border border-primary/20 bg-background/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            Chi tiết phiên bản
          </p>

          <h4 className="mt-1 text-lg font-black text-text">
            Phiên bản v{detail.version}
          </h4>
        </div>

        {detail.isActive && (
          <span className="rounded-full bg-success/10 px-3 py-1.5 text-xs font-black text-success">
            Đang áp dụng
          </span>
        )}
      </div>

      {policyType === PLATFORM_POLICY_TYPES.FILE_UPLOAD ? (
        <div className="mt-4 space-y-3">
          {(detail?.config?.rules || []).map((rule) => (
            <div
              key={rule.context}
              className="rounded-xl border border-border bg-white p-4"
            >
              <p className="font-black text-text">
                {getContextLabel(rule.context)}
              </p>

              <p className="mt-2 text-sm text-textLight">
                Dung lượng tối đa:{" "}
                <strong className="text-text">
                  {Number(
                    rule.maxFileSizeBytes / MB_IN_BYTES,
                  ).toFixed(2)}{" "}
                  MB
                </strong>
              </p>

              <p className="mt-1 text-sm text-textLight">
                Định dạng:{" "}
                <strong className="text-text">
                  {normalizeExtensions(
                    rule.allowedExtensions,
                  ).join(", ") || "—"}
                </strong>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.name}
              className="rounded-xl border border-border bg-white px-4 py-3"
            >
              <p className="text-xs font-bold text-textLight">
                {field.label}
              </p>

              <p className="mt-1 font-black text-text">
                {detail?.config?.[field.name] ?? "—"}{" "}
                {field.unit}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlatformPolicyPage() {
  const [activeTab, setActiveTab] = useState(
    PLATFORM_POLICY_TYPES.DISPUTE,
  );

  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [versions, setVersions] = useState([]);
  const [draft, setDraft] = useState({});
  const [fileContext, setFileContext] = useState("Avatar");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [requestVersion, setRequestVersion] = useState(0);
  const [versionDetail, setVersionDetail] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const activeTabInfo =
    POLICY_TABS.find((tab) => tab.key === activeTab) ||
    POLICY_TABS[0];

  const activeFields = useMemo(() => {
    if (activeTab === PLATFORM_POLICY_TYPES.DISPUTE) {
      return DISPUTE_EDITABLE_FIELDS;
    }

    if (activeTab === PLATFORM_POLICY_TYPES.APPOINTMENT) {
      return APPOINTMENT_FIELDS;
    }

    return [];
  }, [activeTab]);

  const relationshipError = useMemo(
    () => getRelationshipError(activeTab, draft),
    [activeTab, draft],
  );

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    Promise.all([
      platformPolicyApi.getCurrent(activeTab, {
        signal: controller.signal,
      }),
      platformPolicyApi.getVersions(activeTab, {
        signal: controller.signal,
      }),
    ])
      .then(([policy, versionItems]) => {
        if (!isActive) {
          return;
        }

        setCurrentPolicy(policy);
        setVersions(
          [...versionItems].sort(
            (left, right) =>
              Number(right.version) - Number(left.version),
          ),
        );

        if (
          activeTab === PLATFORM_POLICY_TYPES.FILE_UPLOAD
        ) {
          const firstContext =
            policy?.config?.rules?.[0]?.context || "Avatar";

          setFileContext(firstContext);
          setDraft(
            createFileDraft(policy, firstContext),
          );
        } else {
          setDraft(
            createStandardDraft(policy, activeFields),
          );
        }
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setCurrentPolicy(null);
        setVersions([]);
        setDraft({});

        setError(
          getErrorMessage(
            requestError,
            "Không thể tải chính sách hệ thống.",
          ),
        );
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [activeTab, activeFields, requestVersion]);

  const refresh = () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setActionError("");
    setVersionDetail(null);
    setRequestVersion(
      (currentVersion) => currentVersion + 1,
    );
  };

  const handleStandardChange = (name, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
    }));

    setActionError("");
    setSuccessMessage("");
  };

  const handleFileContextChange = (context) => {
    setFileContext(context);
    setDraft(createFileDraft(currentPolicy, context));
    setActionError("");
    setSuccessMessage("");
  };

  const handleExtensionChange = (
    extension,
    checked,
  ) => {
    setDraft((currentDraft) => {
      const currentExtensions = normalizeExtensions(
        currentDraft.allowedExtensions,
      );

      const nextExtensions = checked
        ? normalizeExtensions([
            ...currentExtensions,
            extension,
          ])
        : currentExtensions.filter(
            (item) => item !== extension,
          );

      return {
        ...currentDraft,
        allowedExtensions: nextExtensions,
      };
    });

    setActionError("");
    setSuccessMessage("");
  };

  const buildStandardPayload = () => {
    const relationshipMessage =
      getRelationshipError(activeTab, draft);

    if (relationshipMessage) {
      throw new Error(relationshipMessage);
    }

    const payload = {};

    for (const field of activeFields) {
      const rawValue = draft[field.name];

      if (
        rawValue === "" ||
        rawValue === null ||
        rawValue === undefined
      ) {
        throw new Error(
          `Vui lòng nhập "${field.label}".`,
        );
      }

      const value = Number(rawValue);

      if (!Number.isInteger(value)) {
        throw new Error(
          `"${field.label}" phải là số nguyên.`,
        );
      }

      if (
        value < field.min ||
        value > field.max
      ) {
        throw new Error(
          `"${field.label}" phải từ ${field.min} đến ${field.max} ${field.unit}.`,
        );
      }

      const currentValue =
        currentPolicy?.config?.[field.name];

      if (Number(currentValue) !== value) {
        payload[field.name] = value;
      }
    }

    return payload;
  };

  const buildFilePayload = () => {
    if (!fileContext) {
      throw new Error(
        "Vui lòng chọn ngữ cảnh tải tệp.",
      );
    }

    const maxFileSizeMb = Number(
      draft.maxFileSizeMb,
    );

    if (
      !Number.isFinite(maxFileSizeMb) ||
      maxFileSizeMb <= 0 ||
      maxFileSizeMb > 25
    ) {
      throw new Error(
        "Dung lượng tối đa phải lớn hơn 0 và không vượt quá 25 MB.",
      );
    }

    const extensions = normalizeExtensions(
      draft.allowedExtensions,
    );

    if (extensions.length === 0) {
      throw new Error(
        "Phải chọn ít nhất một định dạng file.",
      );
    }

    const invalidExtension = extensions.find(
      (extension) =>
        !FILE_EXTENSIONS.includes(extension),
    );

    if (invalidExtension) {
      throw new Error(
        `Định dạng ${invalidExtension} không được máy chủ hỗ trợ.`,
      );
    }

    const maxFileSizeBytes = Math.round(
      maxFileSizeMb * MB_IN_BYTES,
    );

    const currentRule = findFileRule(
      currentPolicy,
      fileContext,
    );

    const payload = {
      context: fileContext,
    };

    if (!currentRule) {
      payload.maxFileSizeBytes = maxFileSizeBytes;
      payload.allowedExtensions = extensions;

      return payload;
    }

    if (
      Number(currentRule.maxFileSizeBytes) !==
      maxFileSizeBytes
    ) {
      payload.maxFileSizeBytes = maxFileSizeBytes;
    }

    if (
      !sameExtensions(
        currentRule.allowedExtensions,
        extensions,
      )
    ) {
      payload.allowedExtensions = extensions;
    }

    return payload;
  };

  const handleSave = async () => {
    if (!currentPolicy) {
      setActionError(
        "Chưa tải được chính sách hiện hành nên không thể cập nhật.",
      );

      return;
    }

    setActionError("");
    setSuccessMessage("");

    try {
      const payload =
        activeTab ===
        PLATFORM_POLICY_TYPES.FILE_UPLOAD
          ? buildFilePayload()
          : buildStandardPayload();

      const changedFields = Object.keys(payload).filter(
        (key) => key !== "context",
      );

      if (changedFields.length === 0) {
        setActionError(
          "Không có thay đổi nào cần lưu.",
        );

        return;
      }

      setActionLoading(true);

      await platformPolicyApi.updateCurrent(
        activeTab,
        payload,
      );

      setSuccessMessage(
        "Đã cập nhật chính sách hệ thống.",
      );

      setLoading(true);
      setError("");
      setVersionDetail(null);

      setRequestVersion(
        (currentVersion) => currentVersion + 1,
      );
    } catch (saveError) {
      setActionError(
        getErrorMessage(
          saveError,
          "Không thể cập nhật chính sách.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewVersion = async (version) => {
    setVersionLoading(true);
    setActionError("");
    setVersionDetail(null);

    try {
      const detail =
        await platformPolicyApi.getVersion(
          activeTab,
          version,
        );

      setVersionDetail(detail);
    } catch (detailError) {
      setActionError(
        getErrorMessage(
          detailError,
          "Không thể tải chi tiết phiên bản.",
        ),
      );
    } finally {
      setVersionLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget?.canRestore) {
      setRestoreTarget(null);

      return;
    }

    setActionLoading(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await platformPolicyApi.restoreVersion(
        activeTab,
        restoreTarget.version,
      );

      setRestoreTarget(null);
      setVersionDetail(null);

      setSuccessMessage(
        `Đã khôi phục nội dung từ phiên bản v${restoreTarget.version}.`,
      );

      setLoading(true);
      setError("");

      setRequestVersion(
        (currentVersion) => currentVersion + 1,
      );
    } catch (restoreError) {
      setActionError(
        getErrorMessage(
          restoreError,
          "Không thể khôi phục phiên bản.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const disabled =
    loading || actionLoading || !currentPolicy;

  return (
    <>
      <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
            Cấu hình nền tảng
          </p>

          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Chính sách hệ thống
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
            Quản lý chính sách tranh chấp, lịch hẹn,
            tải tệp và lịch sử phiên bản theo
            máy chủ HomeCycle.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-col justify-between gap-3 rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm text-error sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-black">
                Không thể tải chính sách
              </p>

              <p className="mt-1 whitespace-pre-line">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="rounded-xl border border-error/30 bg-white px-4 py-2.5 font-black text-error"
            >
              Thử lại
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="rounded-2xl border border-success/20 bg-success/10 px-5 py-4 text-sm font-bold text-success"
          >
            {successMessage}
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="whitespace-pre-line rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm font-bold text-error"
          >
            {actionError}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
              <div className="border-b border-border px-5 pt-5 sm:px-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  Nhóm chính sách
                </p>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-4">
                  {POLICY_TABS.map((tab) => {
                    const isActive =
                      tab.key === activeTab;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        disabled={actionLoading}
                        onClick={() => {
                          if (tab.key === activeTab) {
                            return;
                          }

                          setLoading(true);
                          setError("");
                          setActionError("");
                          setSuccessMessage("");
                          setVersionDetail(null);
                          setActiveTab(tab.key);
                        }}
                        className={[
                          "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                          isActive
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-white text-textLight hover:border-primary/40 hover:text-primary",
                        ].join(" ")}
                      >
                        <span
                          className="material-symbols-outlined text-[19px]"
                          aria-hidden="true"
                        >
                          {tab.icon}
                        </span>

                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                {loading ? (
                  <LoadingBlock />
                ) : (
                  <>
                    <div>
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-textLight">
                            Chính sách hiện tại
                          </p>

                          <h3 className="mt-1 text-xl font-black text-text">
                            {activeTabInfo.label}
                          </h3>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-textLight">
                            {activeTabInfo.description}
                          </p>
                        </div>

                        {currentPolicy && (
                          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-black text-success">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            Đã kết nối máy chủ
                          </span>
                        )}
                      </div>

                      <div className="mt-5">
                        <PolicyMeta
                          policy={currentPolicy}
                        />
                      </div>
                    </div>

                    <div className="border-t border-border pt-6">
                      {activeTab !==
                      PLATFORM_POLICY_TYPES.FILE_UPLOAD ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {activeFields.map((field) => (
                              <NumberPolicyField
                                key={field.name}
                                field={field}
                                value={draft[field.name]}
                                disabled={disabled}
                                onChange={
                                  handleStandardChange
                                }
                              />
                            ))}
                          </div>

                          {relationshipError && (
                            <div
                              role="alert"
                              className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-bold text-error"
                            >
                              {relationshipError}
                            </div>
                          )}

                          {activeTab ===
                            PLATFORM_POLICY_TYPES.DISPUTE && (
                            <div className="rounded-2xl border border-border bg-background/60 p-4">
                              <p className="text-sm font-black text-text">
                                Thông tin chỉ đọc
                              </p>

                              <p className="mt-1 text-xs leading-5 text-textLight">
                                Hai giá trị dưới đây đang được
                                máy chủ sử dụng nhưng tài liệu
                                bàn giao hiện chưa mở quyền cập
                                nhật cho giao diện quản trị.
                              </p>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {DISPUTE_READONLY_FIELDS.map(
                                  (field) => (
                                    <div
                                      key={field.name}
                                      className="rounded-xl border border-border bg-white px-4 py-3"
                                    >
                                      <p className="text-xs font-bold text-textLight">
                                        {field.label}
                                      </p>

                                      <p className="mt-1 font-black text-text">
                                        {currentPolicy?.config?.[
                                          field.name
                                        ] ?? "—"}{" "}
                                        {field.unit}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="block rounded-2xl border border-border bg-background/60 p-4">
                              <span className="text-sm font-black text-text">
                                Ngữ cảnh tải tệp
                              </span>

                              <span className="mt-1 block text-xs leading-5 text-textLight">
                                Mỗi ngữ cảnh có quy định riêng.
                              </span>

                              <select
                                value={fileContext}
                                disabled={disabled}
                                onChange={(event) =>
                                  handleFileContextChange(
                                    event.target.value,
                                  )
                                }
                                className="mt-3 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-text outline-none focus:border-primary disabled:cursor-not-allowed"
                              >
                                {FILE_UPLOAD_CONTEXTS.map(
                                  (context) => (
                                    <option
                                      key={
                                        context.value
                                      }
                                      value={
                                        context.value
                                      }
                                    >
                                      {context.label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>

                            <label className="block rounded-2xl border border-border bg-background/60 p-4">
                              <span className="text-sm font-black text-text">
                                Dung lượng tối đa
                              </span>

                              <span className="mt-1 block text-xs leading-5 text-textLight">
                                Tối đa 25 MB cho mỗi tệp.
                              </span>

                              <div className="mt-3 flex overflow-hidden rounded-xl border border-border bg-white focus-within:border-primary">
                                <input
                                  type="number"
                                  min="0.01"
                                  max="25"
                                  step="0.01"
                                  value={
                                    draft.maxFileSizeMb ??
                                    ""
                                  }
                                  disabled={disabled}
                                  onChange={(event) => {
                                    setDraft(
                                      (currentDraft) => ({
                                        ...currentDraft,
                                        maxFileSizeMb:
                                          event.target
                                            .value,
                                      }),
                                    );
                                    setActionError("");
                                    setSuccessMessage("");
                                  }}
                                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-text outline-none disabled:cursor-not-allowed"
                                />

                                <span className="flex min-w-20 items-center justify-center border-l border-border bg-background px-3 text-xs font-black text-textLight">
                                  MB
                                </span>
                              </div>
                            </label>
                          </div>

                          <div className="rounded-2xl border border-border bg-background/60 p-4">
                            <p className="text-sm font-black text-text">
                              Định dạng được phép
                            </p>

                            <p className="mt-1 text-xs leading-5 text-textLight">
                              Chỉ sử dụng các phần mở rộng
                              máy chủ hiện hỗ trợ.
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {FILE_EXTENSIONS.map(
                                (extension) => (
                                  <label
                                    key={extension}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text"
                                  >
                                    <input
                                      type="checkbox"
                                      value={extension}
                                      disabled={disabled}
                                      checked={normalizeExtensions(
                                        draft.allowedExtensions,
                                      ).includes(
                                        extension,
                                      )}
                                      onChange={(
                                        event,
                                      ) =>
                                        handleExtensionChange(
                                          extension,
                                          event.target
                                            .checked,
                                        )
                                      }
                                      className="h-4 w-4 accent-primary"
                                    />

                                    {extension}
                                  </label>
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                      <p className="max-w-2xl text-xs leading-5 text-textLight">
                        Chỉ những trường thực sự thay đổi
                        mới được gửi lên máy chủ. Sau khi lưu
                        thành công, chính sách hiện tại và lịch sử
                        phiên bản sẽ được tải lại.
                      </p>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={
                          disabled ||
                          Boolean(relationshipError)
                        }
                        className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <span
                            className="material-symbols-outlined animate-spin text-[19px]"
                            aria-hidden="true"
                          >
                            progress_activity
                          </span>
                        ) : (
                          <span
                            className="material-symbols-outlined text-[19px]"
                            aria-hidden="true"
                          >
                            save
                          </span>
                        )}

                        {actionLoading
                          ? "Đang lưu..."
                          : "Lưu thay đổi"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
              <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                    Kiểm soát phiên bản
                  </p>

                  <h3 className="mt-1 text-xl font-black text-text">
                    Lịch sử chính sách
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-textLight">
                    Chỉ hiển thị nút khôi phục khi
                    máy chủ cho phép khôi phục phiên bản đó.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading || actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-black text-textLight transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className="material-symbols-outlined text-[19px]"
                    aria-hidden="true"
                  >
                    refresh
                  </span>

                  Làm mới
                </button>
              </div>

              <div className="mt-5">
                {!loading && versions.length === 0 ? (
                  <EmptyHistory />
                ) : (
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <article
                        key={
                          version.policyId ||
                          version.version
                        }
                        className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background/50 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-text">
                              Phiên bản v
                              {version.version}
                            </p>

                            {version.isActive && (
                              <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-black text-success">
                                Đang áp dụng
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-textLight">
                            Tạo lúc{" "}
                            {formatDateTime(
                              version.createdAt,
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={
                              versionLoading ||
                              actionLoading
                            }
                            onClick={() =>
                              handleViewVersion(
                                version.version,
                              )
                            }
                            className="rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-black text-textLight transition hover:border-primary/30 hover:text-primary disabled:opacity-50"
                          >
                            Xem cấu hình
                          </button>

                          {version.canRestore && (
                            <button
                              type="button"
                              disabled={
                                actionLoading
                              }
                              onClick={() =>
                                setRestoreTarget(
                                  version,
                                )
                              }
                              className="rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-black text-primary transition hover:bg-primary hover:text-white disabled:opacity-50"
                            >
                              Khôi phục
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {versionLoading && (
                  <p className="mt-4 text-sm font-bold text-textLight">
                    Đang tải chi tiết phiên bản...
                  </p>
                )}

                <VersionDetail
                  detail={versionDetail}
                  policyType={activeTab}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-background p-5 shadow-[0_10px_28px_rgba(24,63,65,0.04)]">
              <span
                className="material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary shadow-sm"
                aria-hidden="true"
              >
                verified_user
              </span>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-textLight">
                Quyền truy cập
              </p>

              <h3 className="mt-2 text-lg font-black text-text">
                Chỉ dành cho Quản trị viên
              </h3>

              <p className="mt-2 text-sm leading-6 text-textLight">
                Màn hình chỉ dành cho Quản trị viên.
                Kiểm duyệt viên, Doanh nghiệp và Cá nhân không có
                quyền truy cập.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.04)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                Quy tắc cập nhật
              </p>

              <div className="mt-4 space-y-4">
                {[
                  "Không gửi thông tin hệ thống của chính sách trong dữ liệu cập nhật.",
                  "Chỉ gửi những trường Quản trị viên thực sự thay đổi.",
                  "Không cập nhật giao diện trước khi máy chủ xác nhận.",
                  "Chỉ cho khôi phục khi máy chủ xác nhận phiên bản đó có thể khôi phục.",
                  "Sau khi lưu hoặc khôi phục phải tải lại chính sách hiện tại và lịch sử phiên bản.",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background text-xs font-black text-primary">
                      {index + 1}
                    </span>

                    <p className="pt-1 text-sm leading-5 text-textLight">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <ConfirmActionModal
        open={Boolean(restoreTarget)}
        title="Khôi phục phiên bản chính sách?"
        description={
          restoreTarget
            ? `Hệ thống sẽ tạo một phiên bản đang áp dụng mới từ nội dung của v${restoreTarget.version}. Phiên bản cũ không bị xóa.`
            : ""
        }
        confirmLabel="Khôi phục"
        tone="safe"
        icon="restore"
        busy={actionLoading}
        onCancel={() => {
          if (!actionLoading) {
            setRestoreTarget(null);
          }
        }}
        onConfirm={handleConfirmRestore}
      />
    </>
  );
}
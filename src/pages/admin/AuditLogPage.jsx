import { useEffect, useState } from "react";
import adminAuditLogApi from "../../services/apis/adminAuditLogApi";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const AUDIT_LOG_ERROR_MESSAGES = {
  "AuditLog.NotFound":
    "Không tìm thấy nhật ký hệ thống.",
  "AuditLog.InvalidDateRange":
    "Khoảng thời gian lọc không hợp lệ.",
  "AuditLog.InvalidFilter":
    "Một bộ lọc không hợp lệ. Vui lòng kiểm tra lại.",
  "AuditLog.FilterTooLong":
    "Một giá trị bộ lọc vượt quá độ dài cho phép.",
};

const buildEnumLookup = (options) => {
  const lookup = {};

  options.forEach((option) => {
    lookup[option.value] = option.label;
    lookup[option.name.toLowerCase()] = option.label;
  });

  return lookup;
};

const CATEGORY_OPTIONS = [
  { value: "1", name: "Security", label: "Bảo mật" },
  { value: "2", name: "Administration", label: "Quản trị" },
  {
    value: "3",
    name: "BusinessOperation",
    label: "Vận hành nghiệp vụ",
  },
];

const OUTCOME_OPTIONS = [
  { value: "1", name: "Success", label: "Thành công" },
  { value: "2", name: "Failed", label: "Thất bại" },
  { value: "3", name: "Denied", label: "Bị từ chối" },
];

const ACTOR_TYPE_OPTIONS = [
  { value: "1", name: "User", label: "Người dùng" },
  { value: "2", name: "Anonymous", label: "Ẩn danh" },
  { value: "3", name: "System", label: "Hệ thống" },
  {
    value: "4",
    name: "ExternalSystem",
    label: "Hệ thống bên ngoài",
  },
];

const SOURCE_OPTIONS = [
  { value: "1", name: "HttpApi", label: "API" },
  { value: "2", name: "Webhook", label: "Webhook" },
  {
    value: "3",
    name: "BackgroundJob",
    label: "Tác vụ nền",
  },
  { value: "4", name: "Internal", label: "Nội bộ" },
];

const USER_ROLE_OPTIONS = [
  { value: "1", name: "Personal", label: "Cá nhân" },
  { value: "2", name: "Business", label: "Doanh nghiệp" },
  {
    value: "3",
    name: "Moderator",
    label: "Kiểm duyệt viên",
  },
  { value: "4", name: "Admin", label: "Quản trị viên" },
];

const CATEGORY_LOOKUP = buildEnumLookup(
  CATEGORY_OPTIONS,
);

const OUTCOME_LOOKUP = buildEnumLookup(
  OUTCOME_OPTIONS,
);

const ACTOR_TYPE_LOOKUP = buildEnumLookup(
  ACTOR_TYPE_OPTIONS,
);

const SOURCE_LOOKUP = buildEnumLookup(
  SOURCE_OPTIONS,
);

const USER_ROLE_LOOKUP = buildEnumLookup(
  USER_ROLE_OPTIONS,
);

const getEnumLabel = (lookup, value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const raw = String(value).trim();

  return (
    lookup[raw] ||
    lookup[raw.toLowerCase()] ||
    null
  );
};

const getOutcomeBadgeClass = (label) => {
  if (label === "Thành công") {
    return "border-success/30 bg-success/10 text-success";
  }

  if (label === "Thất bại") {
    return "border-error/30 bg-error/10 text-error";
  }

  if (label === "Bị từ chối") {
    return "border-warning/30 bg-warning/10 text-warning";
  }

  return "border-border bg-background text-textLight";
};

const isRequestCancelled = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

const getErrorCode = (error) =>
  String(
    error?.response?.data?.error?.code ??
      error?.response?.data?.code ??
      error?.code ??
      "",
  ).trim();

const getAuditLogErrorMessage = (
  error,
  fallback,
) =>
  AUDIT_LOG_ERROR_MESSAGES[
    getErrorCode(error)
  ] || fallback;

const shortenId = (value) => {
  const id = String(value || "").trim();

  if (!id) {
    return "";
  }

  return id.length > 8
    ? `${id.slice(0, 8)}…`
    : id;
};

const formatVnDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

const formatJsonPayload = (value) => {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "—";
  }

  try {
    const parsed = JSON.parse(raw);

    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
};

const createEmptyDraftFilters = () => ({
  fromLocal: "",
  toLocal: "",
  category: "",
  outcome: "",
  actorType: "",
  userRole: "",
  source: "",
  action: "",
  targetType: "",
  userId: "",
  targetId: "",
  correlationId: "",
});

const createEmptyAppliedFilters = () => ({
  fromUtc: "",
  toUtc: "",
  category: "",
  outcome: "",
  actorType: "",
  userRole: "",
  source: "",
  action: "",
  targetType: "",
  userId: "",
  targetId: "",
  correlationId: "",
});

const validateDraftFilters = (draft) => {
  if (draft.fromLocal && draft.toLocal) {
    const fromDate = new Date(draft.fromLocal);
    const toDate = new Date(draft.toLocal);

    if (
      !Number.isNaN(fromDate.getTime()) &&
      !Number.isNaN(toDate.getTime()) &&
      fromDate > toDate
    ) {
      return "\"Từ thời điểm\" phải trước hoặc bằng \"Đến thời điểm\".";
    }
  }

  if (draft.action.trim().length > 100) {
    return "\"Hành động\" không được vượt quá 100 ký tự.";
  }

  if (draft.targetType.trim().length > 100) {
    return "\"Loại đối tượng\" không được vượt quá 100 ký tự.";
  }

  if (draft.correlationId.trim().length > 100) {
    return "\"Mã liên kết\" không được vượt quá 100 ký tự.";
  }

  if (
    draft.userId.trim() &&
    !UUID_PATTERN.test(draft.userId.trim())
  ) {
    return "\"Mã người dùng\" phải là UUID hợp lệ.";
  }

  if (
    draft.targetId.trim() &&
    !UUID_PATTERN.test(draft.targetId.trim())
  ) {
    return "\"Mã đối tượng\" phải là UUID hợp lệ.";
  }

  return "";
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label className="block text-xs font-bold text-textLight">
      {label}
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      >
        <option value="">Tất cả</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-textLight">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-bold text-text">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : String(value)}
      </p>
    </div>
  );
}

export default function AuditLogPage() {
  const [
    draftFilters,
    setDraftFilters,
  ] = useState(createEmptyDraftFilters);

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(createEmptyAppliedFilters);

  const [filterError, setFilterError] =
    useState("");

  const [
    advancedOpen,
    setAdvancedOpen,
  ] = useState(false);

  const [pageNumber, setPageNumber] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(PAGE_SIZE_OPTIONS[0]);

  const [
    requestVersion,
    setRequestVersion,
  ] = useState(0);

  const [listLoading, setListLoading] =
    useState(true);

  const [listError, setListError] =
    useState("");

  const [listResult, setListResult] =
    useState(null);

  const [
    selectedAuditId,
    setSelectedAuditId,
  ] = useState("");

  const [detailState, setDetailState] =
    useState({
      auditId: "",
      loading: false,
      data: null,
      error: "",
    });

  useEffect(() => {
    const controller = new AbortController();

    const loadAuditLogs = async () => {
      setListLoading(true);
      setListError("");

      try {
        const result =
          await adminAuditLogApi.getAuditLogs({
            pageNumber,
            pageSize,
            fromUtc:
              appliedFilters.fromUtc ||
              undefined,
            toUtc:
              appliedFilters.toUtc ||
              undefined,
            category:
              appliedFilters.category ||
              undefined,
            action:
              appliedFilters.action ||
              undefined,
            outcome:
              appliedFilters.outcome ||
              undefined,
            actorType:
              appliedFilters.actorType ||
              undefined,
            userId:
              appliedFilters.userId ||
              undefined,
            userRole:
              appliedFilters.userRole ||
              undefined,
            targetType:
              appliedFilters.targetType ||
              undefined,
            targetId:
              appliedFilters.targetId ||
              undefined,
            source:
              appliedFilters.source ||
              undefined,
            correlationId:
              appliedFilters.correlationId ||
              undefined,
            signal: controller.signal,
          });

        setListResult(result);
      } catch (error) {
        if (isRequestCancelled(error)) {
          return;
        }

        setListError(
          getAuditLogErrorMessage(
            error,
            "Dữ liệu nhật ký hệ thống hiện không thể tải. Vui lòng thử lại.",
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setListLoading(false);
        }
      }
    };

    void loadAuditLogs();

    return () => {
      controller.abort();
    };
  }, [
    pageNumber,
    pageSize,
    appliedFilters,
    requestVersion,
  ]);

  useEffect(() => {
    if (!selectedAuditId) {
      return undefined;
    }

    const controller = new AbortController();

    adminAuditLogApi
      .getAuditLogById(selectedAuditId, {
        signal: controller.signal,
      })
      .then((data) => {
        setDetailState({
          auditId: selectedAuditId,
          loading: false,
          data,
          error: "",
        });
      })
      .catch((error) => {
        if (isRequestCancelled(error)) {
          return;
        }

        setDetailState({
          auditId: selectedAuditId,
          loading: false,
          data: null,
          error: getAuditLogErrorMessage(
            error,
            "Không thể tải chi tiết nhật ký hệ thống.",
          ),
        });
      });

    return () => {
      controller.abort();
    };
  }, [selectedAuditId]);

  useEffect(() => {
    if (!selectedAuditId) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDetail();
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
  }, [selectedAuditId]);

  const updateDraftFilter = (name, value) => {
    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));

    setFilterError("");
  };

  const applyFilters = () => {
    const validationMessage =
      validateDraftFilters(draftFilters);

    if (validationMessage) {
      setFilterError(validationMessage);
      return;
    }

    setFilterError("");

    setAppliedFilters({
      fromUtc: draftFilters.fromLocal
        ? new Date(
            draftFilters.fromLocal,
          ).toISOString()
        : "",

      toUtc: draftFilters.toLocal
        ? new Date(
            draftFilters.toLocal,
          ).toISOString()
        : "",

      category: draftFilters.category,
      outcome: draftFilters.outcome,
      actorType: draftFilters.actorType,
      userRole: draftFilters.userRole,
      source: draftFilters.source,
      action: draftFilters.action.trim(),
      targetType:
        draftFilters.targetType.trim(),
      userId: draftFilters.userId.trim(),
      targetId: draftFilters.targetId.trim(),
      correlationId:
        draftFilters.correlationId.trim(),
    });

    setPageNumber(1);
  };

  const resetFilters = () => {
    setDraftFilters(
      createEmptyDraftFilters(),
    );

    setAppliedFilters(
      createEmptyAppliedFilters(),
    );

    setFilterError("");
    setPageNumber(1);
  };

  const refresh = () => {
    setRequestVersion(
      (currentVersion) => currentVersion + 1,
    );
  };

  const openDetail = (auditId) => {
    const id = String(auditId || "").trim();

    if (!id) {
      return;
    }

    setSelectedAuditId(id);

    setDetailState({
      auditId: id,
      loading: true,
      data: null,
      error: "",
    });
  };

  function closeDetail() {
    setSelectedAuditId("");

    setDetailState({
      auditId: "",
      loading: false,
      data: null,
      error: "",
    });
  }

  const items = Array.isArray(
    listResult?.items,
  )
    ? listResult.items
    : [];

  const detail = detailState.data;

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Vận hành hệ thống
        </p>

        <h1 className="mt-1 text-2xl font-bold text-text">
          Nhật ký hệ thống
        </h1>

        <p className="mt-1 text-sm text-textLight">
          Theo dõi các sự kiện bảo mật, quản trị và vận hành đã được hệ thống ghi nhận.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-bold text-textLight">
            Từ thời điểm
            <input
              type="datetime-local"
              value={draftFilters.fromLocal}
              onChange={(event) =>
                updateDraftFilter(
                  "fromLocal",
                  event.target.value,
                )
              }
              className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </label>

          <label className="block text-xs font-bold text-textLight">
            Đến thời điểm
            <input
              type="datetime-local"
              value={draftFilters.toLocal}
              onChange={(event) =>
                updateDraftFilter(
                  "toLocal",
                  event.target.value,
                )
              }
              className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </label>

          <FilterSelect
            label="Nhóm sự kiện"
            value={draftFilters.category}
            options={CATEGORY_OPTIONS}
            onChange={(value) =>
              updateDraftFilter(
                "category",
                value,
              )
            }
          />

          <FilterSelect
            label="Kết quả"
            value={draftFilters.outcome}
            options={OUTCOME_OPTIONS}
            onChange={(value) =>
              updateDraftFilter(
                "outcome",
                value,
              )
            }
          />

          <FilterSelect
            label="Loại tác nhân"
            value={draftFilters.actorType}
            options={ACTOR_TYPE_OPTIONS}
            onChange={(value) =>
              updateDraftFilter(
                "actorType",
                value,
              )
            }
          />

          <FilterSelect
            label="Vai trò"
            value={draftFilters.userRole}
            options={USER_ROLE_OPTIONS}
            onChange={(value) =>
              updateDraftFilter(
                "userRole",
                value,
              )
            }
          />

          <FilterSelect
            label="Nguồn"
            value={draftFilters.source}
            options={SOURCE_OPTIONS}
            onChange={(value) =>
              updateDraftFilter(
                "source",
                value,
              )
            }
          />

          <label className="block text-xs font-bold text-textLight">
            Hành động
            <input
              type="text"
              value={draftFilters.action}
              onChange={(event) =>
                updateDraftFilter(
                  "action",
                  event.target.value,
                )
              }
              maxLength={100}
              placeholder="VD: User.Login"
              className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </label>

          <label className="block text-xs font-bold text-textLight">
            Loại đối tượng
            <input
              type="text"
              value={draftFilters.targetType}
              onChange={(event) =>
                updateDraftFilter(
                  "targetType",
                  event.target.value,
                )
              }
              maxLength={100}
              placeholder="VD: Order"
              className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() =>
            setAdvancedOpen(
              (current) => !current,
            )
          }
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary"
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden="true"
          >
            {advancedOpen
              ? "expand_less"
              : "expand_more"}
          </span>
          Bộ lọc nâng cao
        </button>

        {advancedOpen && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-bold text-textLight">
              Mã người dùng (UUID)
              <input
                type="text"
                value={draftFilters.userId}
                onChange={(event) =>
                  updateDraftFilter(
                    "userId",
                    event.target.value,
                  )
                }
                placeholder="00000000-0000-0000-0000-000000000000"
                className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </label>

            <label className="block text-xs font-bold text-textLight">
              Mã đối tượng (UUID)
              <input
                type="text"
                value={draftFilters.targetId}
                onChange={(event) =>
                  updateDraftFilter(
                    "targetId",
                    event.target.value,
                  )
                }
                placeholder="00000000-0000-0000-0000-000000000000"
                className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </label>

            <label className="block text-xs font-bold text-textLight">
              Mã liên kết (CorrelationId)
              <input
                type="text"
                value={
                  draftFilters.correlationId
                }
                onChange={(event) =>
                  updateDraftFilter(
                    "correlationId",
                    event.target.value,
                  )
                }
                maxLength={100}
                className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </label>
          </div>
        )}

        {filterError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-error/20 bg-error/10 px-3 py-2.5 text-xs font-semibold text-error"
          >
            {filterError}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90"
          >
            Áp dụng
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-textLight transition hover:bg-background"
          >
            Xóa bộ lọc / Mặc định
          </button>

          <button
            type="button"
            onClick={refresh}
            disabled={listLoading}
            className="rounded-lg border border-primary px-4 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Làm mới
          </button>
        </div>
      </div>

      {listLoading && (
        <div
          role="status"
          className="flex min-h-48 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-sm"
        >
          <span className="material-symbols-outlined animate-spin text-3xl">
            refresh
          </span>
          <span className="ml-3 text-sm font-semibold">
            Đang tải nhật ký hệ thống...
          </span>
        </div>
      )}

      {!listLoading && listError && (
        <div
          role="alert"
          className="rounded-xl border border-error/20 bg-error/10 p-8 text-center"
        >
          <h2 className="font-bold text-error">
            Không thể tải nhật ký hệ thống
          </h2>
          <p className="mt-2 text-sm text-error">
            {listError}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition hover:bg-error"
          >
            Thử lại
          </button>
        </div>
      )}

      {!listLoading &&
        !listError &&
        items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-textLight">
              history_toggle_off
            </span>
            <h2 className="mt-3 font-bold text-text">
              Không tìm thấy nhật ký
            </h2>
            <p className="mt-1 text-sm text-textLight">
              Hãy thay đổi điều kiện lọc hiện tại.
            </p>
          </div>
        )}

      {!listLoading &&
        !listError &&
        items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background text-xs uppercase tracking-wide text-textLight">
                    <th className="px-4 py-3 font-semibold">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Tác nhân
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Hành động
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Đối tượng
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Kết quả
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Nguồn
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Lý do
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {items.map((item) => {
                    const actorTypeLabel =
                      getEnumLabel(
                        ACTOR_TYPE_LOOKUP,
                        item.actorType,
                      ) || "Không xác định";

                    const roleLabel =
                      getEnumLabel(
                        USER_ROLE_LOOKUP,
                        item.userRole,
                      );

                    const userId = String(
                      item.userId || "",
                    ).trim();

                    const targetType = String(
                      item.targetType || "",
                    ).trim();

                    const targetId = String(
                      item.targetId || "",
                    ).trim();

                    const outcomeLabel =
                      getEnumLabel(
                        OUTCOME_LOOKUP,
                        item.outcome,
                      ) || "Không xác định";

                    const sourceLabel =
                      getEnumLabel(
                        SOURCE_LOOKUP,
                        item.source,
                      ) || "—";

                    const reasonCode = String(
                      item.reasonCode || "",
                    ).trim();

                    return (
                      <tr
                        key={
                          item.auditId ||
                          item.eventId
                        }
                        className="transition hover:bg-background/70"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-textLight">
                          {formatVnDateTime(
                            item.occurredAtUtc,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-text">
                            {actorTypeLabel}
                          </p>

                          {(roleLabel ||
                            userId) && (
                            <p
                              className="mt-0.5 text-xs text-textLight"
                              title={
                                userId ||
                                undefined
                              }
                            >
                              {[
                                roleLabel,
                                userId
                                  ? shortenId(
                                      userId,
                                    )
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-xs font-semibold text-text">
                            {item.action ||
                              "—"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold text-text">
                            {targetType ||
                              "—"}
                          </p>

                          {targetId && (
                            <p
                              className="mt-0.5 text-xs text-textLight"
                              title={targetId}
                            >
                              {shortenId(
                                targetId,
                              )}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getOutcomeBadgeClass(
                              outcomeLabel,
                            )}`}
                          >
                            {outcomeLabel}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-textLight">
                          {sourceLabel}
                        </td>

                        <td className="px-4 py-4 text-textLight">
                          {reasonCode || "—"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              openDetail(
                                item.auditId,
                              )
                            }
                            className="whitespace-nowrap rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm sm:flex-row">
              <p className="text-sm text-textLight">
                Trang{" "}
                {listResult?.pageNumber ||
                  pageNumber}{" "}
                /{" "}
                {Math.max(
                  1,
                  listResult?.totalPages || 1,
                )}{" "}
                · Tổng{" "}
                {listResult?.totalCount || 0}{" "}
                sự kiện
              </p>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-textLight">
                  Số dòng/trang
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(
                        Number(
                          event.target.value,
                        ),
                      );
                      setPageNumber(1);
                    }}
                    className="rounded-lg border border-border px-2.5 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    {PAGE_SIZE_OPTIONS.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPageNumber(
                        (currentPage) =>
                          currentPage - 1,
                      )
                    }
                    disabled={
                      !listResult?.hasPreviousPage
                    }
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPageNumber(
                        (currentPage) =>
                          currentPage + 1,
                      )
                    }
                    disabled={
                      !listResult?.hasNextPage
                    }
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      {selectedAuditId && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetail();
            }
          }}
          className="fixed inset-0 z-[80] flex justify-end bg-black/50"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-log-detail-title"
            className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 bg-primary px-6 py-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                  Nhật ký hệ thống
                </p>

                <h2
                  id="audit-log-detail-title"
                  className="mt-1 text-xl font-black"
                >
                  Chi tiết sự kiện
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                aria-label="Đóng"
                className="rounded-lg px-2 py-1 text-2xl leading-none text-white/80 transition hover:bg-white/10"
              >
                ×
              </button>
            </header>

            <div className="flex-1 space-y-5 px-6 py-5">
              {detailState.loading && (
                <div
                  role="status"
                  className="rounded-xl border border-border bg-background p-5 text-center text-sm font-semibold text-textLight"
                >
                  Đang tải chi tiết nhật ký hệ thống...
                </div>
              )}

              {!detailState.loading &&
                detailState.error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error"
                  >
                    {detailState.error}
                  </div>
                )}

              {!detailState.loading &&
                !detailState.error &&
                detail && (
                  <>
                    <div className="rounded-2xl border border-border bg-background/60 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-primary">
                        Tổng quan
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <DetailField
                          label="Thời gian xảy ra"
                          value={formatVnDateTime(
                            detail.occurredAtUtc,
                          )}
                        />
                        <DetailField
                          label="Thời gian ghi nhận"
                          value={formatVnDateTime(
                            detail.recordedAtUtc,
                          )}
                        />
                        <DetailField
                          label="Nhóm sự kiện"
                          value={
                            getEnumLabel(
                              CATEGORY_LOOKUP,
                              detail.category,
                            ) ||
                            "Không xác định"
                          }
                        />
                        <DetailField
                          label="Hành động"
                          value={detail.action}
                        />
                        <DetailField
                          label="Kết quả"
                          value={
                            getEnumLabel(
                              OUTCOME_LOOKUP,
                              detail.outcome,
                            ) ||
                            "Không xác định"
                          }
                        />
                        <DetailField
                          label="Mã lý do"
                          value={
                            detail.reasonCode
                          }
                        />
                        <DetailField
                          label="Loại tác nhân"
                          value={
                            getEnumLabel(
                              ACTOR_TYPE_LOOKUP,
                              detail.actorType,
                            ) ||
                            "Không xác định"
                          }
                        />
                        <DetailField
                          label="Vai trò"
                          value={getEnumLabel(
                            USER_ROLE_LOOKUP,
                            detail.userRole,
                          )}
                        />
                        <DetailField
                          label="Mã người dùng"
                          value={
                            detail.userId
                          }
                        />
                        <DetailField
                          label="Loại đối tượng"
                          value={
                            detail.targetType
                          }
                        />
                        <DetailField
                          label="Mã đối tượng"
                          value={
                            detail.targetId
                          }
                        />
                        <DetailField
                          label="Nguồn"
                          value={
                            getEnumLabel(
                              SOURCE_LOOKUP,
                              detail.source,
                            ) || "—"
                          }
                        />
                        <DetailField
                          label="Mã sự kiện"
                          value={
                            detail.eventId
                          }
                        />
                        <DetailField
                          label="Mã nhật ký"
                          value={
                            detail.auditId
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background/60 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-primary">
                        Bối cảnh
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <DetailField
                          label="Mã liên kết"
                          value={
                            detail.correlationId
                          }
                        />
                        <DetailField
                          label="Địa chỉ IP"
                          value={
                            detail.ipAddress
                          }
                        />
                        <div className="sm:col-span-2">
                          <DetailField
                            label="Trình duyệt / thiết bị"
                            value={
                              detail.userAgent
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-primary">
                          Giá trị trước thay đổi
                        </p>
                        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs text-text">
                          {formatJsonPayload(
                            detail.oldValues,
                          )}
                        </pre>
                      </div>

                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-primary">
                          Giá trị sau thay đổi
                        </p>
                        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs text-text">
                          {formatJsonPayload(
                            detail.newValues,
                          )}
                        </pre>
                      </div>

                      <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-primary">
                          Dữ liệu bổ sung
                        </p>
                        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs text-text">
                          {formatJsonPayload(
                            detail.metadata,
                          )}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

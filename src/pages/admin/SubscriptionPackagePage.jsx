import { useEffect, useMemo, useState } from "react";
import ConfirmActionModal from "../../components/shared/ConfirmActionModal";
import adminSubscriptionPackageApi from "../../services/apis/adminSubscriptionPackageApi";

const TARGET_ROLE_BUSINESS = 2;

const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

const SUBSCRIPTION_PACKAGE_ERROR_MESSAGES = {
  "SubscriptionPackage.NotFound":
    "Không tìm thấy gói đăng ký.",
  "SubscriptionPackage.CodeAlreadyExists":
    "Mã gói đăng ký đã tồn tại.",
  "SubscriptionPackage.NameAlreadyExists":
    "Tên gói đăng ký đã tồn tại.",
  "SubscriptionPackage.InvalidEntitlement":
    "Quyền lợi của gói chưa hợp lệ. Vui lòng kiểm tra lại.",
  VALIDATION_ERROR:
    "Dữ liệu gói đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.",
};

const FALLBACK_ERROR_MESSAGE =
  "Không thể xử lý gói đăng ký lúc này. Vui lòng thử lại.";

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

const getPackageErrorMessage = (
  error,
  fallback = FALLBACK_ERROR_MESSAGE,
) =>
  SUBSCRIPTION_PACKAGE_ERROR_MESSAGES[
    getErrorCode(error)
  ] || fallback;

const normalizeValueType = (valueType) => {
  const raw = String(valueType ?? "")
    .trim()
    .toLowerCase();

  if (raw === "1" || raw === "integer") {
    return "Integer";
  }

  if (raw === "2" || raw === "decimal") {
    return "Decimal";
  }

  if (raw === "3" || raw === "boolean") {
    return "Boolean";
  }

  return null;
};

const normalizeTargetRole = (role) => {
  const raw = String(role ?? "")
    .trim()
    .toLowerCase();

  if (raw === "1" || raw === "personal") {
    return "Personal";
  }

  if (raw === "2" || raw === "business") {
    return "Business";
  }

  if (raw === "3" || raw === "moderator") {
    return "Moderator";
  }

  if (raw === "4" || raw === "admin") {
    return "Admin";
  }

  return null;
};

const TARGET_ROLE_LABELS = {
  Personal: "Cá nhân",
  Business: "Doanh nghiệp",
  Moderator: "Kiểm duyệt viên",
  Admin: "Quản trị viên",
};

const getTargetRoleLabel = (role) =>
  TARGET_ROLE_LABELS[normalizeTargetRole(role)] ||
  "Không xác định";

const definitionSupportsBusiness = (definition) =>
  Array.isArray(definition?.targetRoles) &&
  definition.targetRoles.some(
    (role) => normalizeTargetRole(role) === "Business",
  );

const buildDefinitionLookup = (definitions) => {
  const lookup = new Map();

  definitions.forEach((definition) => {
    const key = String(definition?.key || "").trim();

    if (key) {
      lookup.set(key.toLowerCase(), definition);
    }
  });

  return lookup;
};

const formatCurrencyVnd = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const createEmptyCreateForm = () => ({
  code: "",
  name: "",
  description: "",
  price: "",
  duration: "",
  entitlementRows: [],
});

const createEntitlementRow = (definition) => ({
  key: definition.key,
  numericValue: "",
  booleanValue: false,
  isUnlimited: false,
});

const validatePackageFields = (
  form,
  { requireCode },
) => {
  let code;

  if (requireCode) {
    code = form.code.trim();

    if (!code) {
      return { error: "Vui lòng nhập mã gói." };
    }

    if (code.length > 100) {
      return {
        error:
          "Mã gói không được vượt quá 100 ký tự.",
      };
    }

    if (!CODE_PATTERN.test(code)) {
      return {
        error:
          "Mã gói chỉ được chứa chữ cái, số, dấu gạch dưới và gạch ngang.",
      };
    }
  }

  const name = form.name.trim();

  if (!name) {
    return { error: "Vui lòng nhập tên gói." };
  }

  if (name.length > 255) {
    return {
      error: "Tên gói không được vượt quá 255 ký tự.",
    };
  }

  const description = form.description.trim();

  if (description.length > 2000) {
    return {
      error: "Mô tả không được vượt quá 2000 ký tự.",
    };
  }

  const price = Number(form.price);

  if (
    form.price === "" ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return { error: "Vui lòng nhập giá gói hợp lệ." };
  }

  if (!Number.isInteger(price)) {
    return {
      error: "Giá gói phải là số nguyên VND.",
    };
  }

  if (price > 2147483647) {
    return {
      error: "Giá gói vượt quá giới hạn cho phép.",
    };
  }

  const duration = Number(form.duration);

  if (
    form.duration === "" ||
    !Number.isInteger(duration) ||
    duration <= 0
  ) {
    return {
      error:
        "Vui lòng nhập thời hạn hợp lệ (số nguyên lớn hơn 0).",
    };
  }

  return {
    code,
    name,
    description,
    price,
    duration,
  };
};

const validateEntitlementRows = (
  rows,
  definitionLookup,
) => {
  if (!rows.length) {
    return {
      error:
        "Vui lòng chọn ít nhất một quyền lợi.",
    };
  }

  const seenKeys = new Set();
  const entitlements = [];

  for (const row of rows) {
    const normalizedKey = String(row.key || "")
      .trim()
      .toLowerCase();

    const definition = definitionLookup.get(
      normalizedKey,
    );

    if (!definition) {
      return {
        error: `Quyền lợi "${row.key}" không còn hợp lệ.`,
      };
    }

    if (seenKeys.has(normalizedKey)) {
      return {
        error: "Không được chọn trùng quyền lợi.",
      };
    }

    seenKeys.add(normalizedKey);

    const valueType = normalizeValueType(
      definition.valueType,
    );

    if (valueType === "Boolean") {
      entitlements.push({
        key: definition.key,
        numericValue: null,
        booleanValue: Boolean(row.booleanValue),
        isUnlimited: false,
      });

      continue;
    }

    if (row.isUnlimited) {
      if (!definition.supportsUnlimited) {
        return {
          error: `"${definition.displayName}" không hỗ trợ không giới hạn.`,
        };
      }

      entitlements.push({
        key: definition.key,
        numericValue: null,
        booleanValue: null,
        isUnlimited: true,
      });

      continue;
    }

    const numericValue = Number(
      row.numericValue,
    );

    if (
      row.numericValue === "" ||
      !Number.isFinite(numericValue) ||
      numericValue <= 0
    ) {
      return {
        error: `Vui lòng nhập giá trị hợp lệ cho "${definition.displayName}".`,
      };
    }

    if (
      valueType === "Integer" &&
      !Number.isInteger(numericValue)
    ) {
      return {
        error: `"${definition.displayName}" phải là số nguyên.`,
      };
    }

    entitlements.push({
      key: definition.key,
      numericValue,
      booleanValue: null,
      isUnlimited: false,
    });
  }

  return { entitlements };
};

const buildEntitlementSignature = (entitlement) => {
  const key = String(entitlement?.key || "")
    .trim()
    .toLowerCase();

  const numericValue =
    entitlement?.numericValue === null ||
    entitlement?.numericValue === undefined
      ? null
      : Number(entitlement.numericValue);

  const booleanValue =
    entitlement?.booleanValue === null ||
    entitlement?.booleanValue === undefined
      ? null
      : Boolean(entitlement.booleanValue);

  const isUnlimited = Boolean(
    entitlement?.isUnlimited,
  );

  return `${key}|${numericValue}|${booleanValue}|${isUnlimited}`;
};

const sameEntitlementSets = (left, right) => {
  const leftEntitlements = Array.isArray(left)
    ? left
    : [];

  const rightEntitlements = Array.isArray(right)
    ? right
    : [];

  if (
    leftEntitlements.length !==
    rightEntitlements.length
  ) {
    return false;
  }

  const leftSignatures = new Set(
    leftEntitlements.map(
      buildEntitlementSignature,
    ),
  );

  const rightSignatures = new Set(
    rightEntitlements.map(
      buildEntitlementSignature,
    ),
  );

  if (
    leftSignatures.size !== rightSignatures.size
  ) {
    return false;
  }

  for (const signature of leftSignatures) {
    if (!rightSignatures.has(signature)) {
      return false;
    }
  }

  return true;
};

function EntitlementRowEditor({
  row,
  definition,
  disabled,
  onChange,
  onRemove,
}) {
  const valueType = normalizeValueType(
    definition?.valueType,
  );

  const supportsUnlimited =
    Boolean(definition?.supportsUnlimited) &&
    valueType !== "Boolean";

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-text">
            {definition?.displayName || row.key}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-textLight">
            {row.key}
          </p>
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Xóa quyền lợi"
          className="shrink-0 rounded-lg p-1.5 text-textLight transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[18px]">
            close
          </span>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {valueType === "Boolean" ? (
          <select
            value={
              row.booleanValue ? "true" : "false"
            }
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...row,
                booleanValue:
                  event.target.value === "true",
              })
            }
            className="rounded-lg border border-border px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="true">Có</option>
            <option value="false">Không</option>
          </select>
        ) : (
          <>
            <input
              type="number"
              value={
                row.isUnlimited
                  ? ""
                  : row.numericValue
              }
              disabled={
                disabled || row.isUnlimited
              }
              step={
                valueType === "Integer"
                  ? "1"
                  : "0.01"
              }
              min={
                valueType === "Integer"
                  ? "1"
                  : "0.01"
              }
              placeholder="Nhập giá trị"
              onChange={(event) =>
                onChange({
                  ...row,
                  numericValue:
                    event.target.value,
                })
              }
              className="w-40 rounded-lg border border-border px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60"
            />

            {supportsUnlimited && (
              <label className="flex items-center gap-2 text-xs font-bold text-textLight">
                <input
                  type="checkbox"
                  checked={row.isUnlimited}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...row,
                      isUnlimited:
                        event.target.checked,
                      numericValue:
                        event.target.checked
                          ? ""
                          : row.numericValue,
                    })
                  }
                />
                Không giới hạn
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EntitlementEditor({
  rows,
  onChangeRows,
  definitions,
  disabled,
  definitionsLoading,
  definitionsError,
}) {
  const selectedKeys = new Set(
    rows.map((row) =>
      String(row.key || "")
        .trim()
        .toLowerCase(),
    ),
  );

  const availableDefinitions = definitions.filter(
    (definition) =>
      !selectedKeys.has(
        String(definition.key || "")
          .trim()
          .toLowerCase(),
      ),
  );

  const addEntitlement = (key) => {
    const definition = definitions.find(
      (item) => item.key === key,
    );

    if (!definition) {
      return;
    }

    onChangeRows([
      ...rows,
      createEntitlementRow(definition),
    ]);
  };

  const updateRow = (index, nextRow) => {
    const nextRows = rows.slice();
    nextRows[index] = nextRow;
    onChangeRows(nextRows);
  };

  const removeRow = (index) => {
    onChangeRows(
      rows.filter(
        (_, rowIndex) => rowIndex !== index,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-text">
        Quyền lợi
      </p>

      {definitionsLoading && (
        <p className="text-xs text-textLight">
          Đang tải danh sách quyền lợi...
        </p>
      )}

      {!definitionsLoading &&
        definitionsError && (
          <div
            role="alert"
            className="rounded-lg border border-error/20 bg-error/10 px-3 py-2.5 text-xs font-semibold text-error"
          >
            {definitionsError}
          </div>
        )}

      {rows.length === 0 &&
        !definitionsLoading &&
        !definitionsError && (
          <p className="text-xs text-textLight">
            Chưa chọn quyền lợi nào.
          </p>
        )}

      <div className="space-y-3">
        {rows.map((row, index) => {
          const definition = definitions.find(
            (item) => item.key === row.key,
          );

          return (
            <EntitlementRowEditor
              key={row.key}
              row={row}
              definition={definition}
              disabled={disabled}
              onChange={(nextRow) =>
                updateRow(index, nextRow)
              }
              onRemove={() => removeRow(index)}
            />
          );
        })}
      </div>

      {!definitionsLoading &&
        !definitionsError &&
        availableDefinitions.length > 0 && (
          <label className="block text-xs font-bold text-textLight">
            Thêm quyền lợi
            <select
              value=""
              disabled={disabled}
              onChange={(event) => {
                if (event.target.value) {
                  addEntitlement(
                    event.target.value,
                  );
                }
              }}
              className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">
                Chọn quyền lợi để thêm...
              </option>
              {availableDefinitions.map(
                (definition) => (
                  <option
                    key={definition.key}
                    value={definition.key}
                  >
                    {definition.displayName}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
    </div>
  );
}

function CreatePackageModal({
  form,
  onChangeForm,
  definitions,
  definitionsLoading,
  definitionsError,
  busy,
  error,
  onClose,
  onSubmit,
}) {
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-package-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Gói đăng ký
            </p>

            <h2
              id="create-package-title"
              className="mt-1 text-xl font-black text-text"
            >
              Tạo gói đăng ký
            </h2>

            <p className="mt-2 text-sm leading-6 text-textLight">
              Gói mới áp dụng cho tài khoản doanh nghiệp.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-textLight transition hover:bg-background disabled:opacity-50"
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-text">
              Mã gói
              <input
                type="text"
                value={form.code}
                disabled={busy}
                maxLength={100}
                placeholder="VD: BIZ_STANDARD"
                onChange={(event) =>
                  onChangeForm({
                    ...form,
                    code: event.target.value.toUpperCase(),
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
              />
            </label>

            <label className="block text-sm font-bold text-text">
              Vai trò áp dụng
              <input
                type="text"
                value="Doanh nghiệp"
                disabled
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-textLight outline-none"
              />
            </label>
          </div>

          <label className="block text-sm font-bold text-text">
            Tên gói
            <input
              type="text"
              value={form.name}
              disabled={busy}
              maxLength={255}
              onChange={(event) =>
                onChangeForm({
                  ...form,
                  name: event.target.value,
                })
              }
              className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
            />
          </label>

          <label className="block text-sm font-bold text-text">
            Mô tả
            <textarea
              value={form.description}
              disabled={busy}
              maxLength={2000}
              rows={3}
              onChange={(event) =>
                onChangeForm({
                  ...form,
                  description: event.target.value,
                })
              }
              className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-text">
              Giá (VND)
              <input
                type="number"
                value={form.price}
                disabled={busy}
                min="1"
                step="1"
                onChange={(event) =>
                  onChangeForm({
                    ...form,
                    price: event.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
              />
            </label>

            <label className="block text-sm font-bold text-text">
              Thời hạn
              <input
                type="number"
                value={form.duration}
                disabled={busy}
                min="1"
                step="1"
                onChange={(event) =>
                  onChangeForm({
                    ...form,
                    duration: event.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
              />
            </label>
          </div>

          <EntitlementEditor
            rows={form.entitlementRows}
            onChangeRows={(rows) =>
              onChangeForm({
                ...form,
                entitlementRows: rows,
              })
            }
            definitions={definitions}
            disabled={busy}
            definitionsLoading={definitionsLoading}
            definitionsError={definitionsError}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-error/20 bg-error/10 p-3 text-sm font-semibold leading-6 text-error"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-border px-5 py-3 text-sm font-black text-text transition hover:bg-background disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={
              busy || Boolean(definitionsError)
            }
            className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && (
              <span className="material-symbols-outlined animate-spin text-[19px]">
                progress_activity
              </span>
            )}
            {busy ? "Đang tạo..." : "Tạo gói"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PackageDetailDrawer({
  detailState,
  editForm,
  onChangeEditForm,
  definitions,
  definitionsLoading,
  definitionsError,
  busy,
  error,
  notice,
  onClose,
  onSubmit,
}) {
  const detail = detailState.data;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[80] flex justify-end bg-black/50"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-detail-title"
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-primary px-6 py-5 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
              Gói đăng ký
            </p>

            <h2
              id="package-detail-title"
              className="mt-1 text-xl font-black"
            >
              Chi tiết gói đăng ký
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
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
              Đang tải chi tiết gói đăng ký...
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
            detail &&
            editForm && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-text">
                    Mã gói
                    <input
                      type="text"
                      value={detail.code}
                      disabled
                      className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-textLight outline-none"
                    />
                  </label>

                  <label className="block text-sm font-bold text-text">
                    Vai trò áp dụng
                    <input
                      type="text"
                      value={getTargetRoleLabel(
                        detail.targetRole,
                      )}
                      disabled
                      className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-textLight outline-none"
                    />
                  </label>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-textLight">
                    Trạng thái hiện tại
                  </p>
                  <p className="mt-1 text-sm font-black text-text">
                    {detail.isActive
                      ? "Đang hoạt động"
                      : "Đã tắt"}
                  </p>
                </div>

                <label className="block text-sm font-bold text-text">
                  Tên gói
                  <input
                    type="text"
                    value={editForm.name}
                    disabled={busy}
                    maxLength={255}
                    onChange={(event) =>
                      onChangeEditForm({
                        ...editForm,
                        name: event.target.value,
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
                  />
                </label>

                <label className="block text-sm font-bold text-text">
                  Mô tả
                  <textarea
                    value={editForm.description}
                    disabled={busy}
                    maxLength={2000}
                    rows={3}
                    onChange={(event) =>
                      onChangeEditForm({
                        ...editForm,
                        description:
                          event.target.value,
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-text">
                    Giá (VND)
                    <input
                      type="number"
                      value={editForm.price}
                      disabled={busy}
                      min="1"
                      step="1"
                      onChange={(event) =>
                        onChangeEditForm({
                          ...editForm,
                          price:
                            event.target.value,
                        })
                      }
                      className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
                    />
                  </label>

                  <label className="block text-sm font-bold text-text">
                    Thời hạn
                    <input
                      type="number"
                      value={editForm.duration}
                      disabled={busy}
                      min="1"
                      step="1"
                      onChange={(event) =>
                        onChangeEditForm({
                          ...editForm,
                          duration:
                            event.target.value,
                        })
                      }
                      className="mt-1.5 w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-background"
                    />
                  </label>
                </div>

                <EntitlementEditor
                  rows={editForm.entitlementRows}
                  onChangeRows={(rows) =>
                    onChangeEditForm({
                      ...editForm,
                      entitlementRows: rows,
                    })
                  }
                  definitions={definitions}
                  disabled={busy}
                  definitionsLoading={
                    definitionsLoading
                  }
                  definitionsError={
                    definitionsError
                  }
                />

                {notice && (
                  <div
                    role="status"
                    className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary"
                  >
                    {notice}
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-error/20 bg-error/10 p-3 text-sm font-semibold leading-6 text-error"
                  >
                    {error}
                  </div>
                )}
              </>
            )}
        </div>

        {!detailState.loading &&
          !detailState.error &&
          detail && (
            <footer className="flex justify-end gap-3 border-t border-border bg-background px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={
                  busy || Boolean(definitionsError)
                }
                className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                )}
                {busy ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </footer>
          )}
      </section>
    </div>
  );
}

export default function SubscriptionPackagePage() {
  const [
    entitlementDefinitions,
    setEntitlementDefinitions,
  ] = useState([]);

  const [
    definitionsLoading,
    setDefinitionsLoading,
  ] = useState(true);

  const [
    definitionsError,
    setDefinitionsError,
  ] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [targetRoleFilter, setTargetRoleFilter] =
    useState(String(TARGET_ROLE_BUSINESS));

  const [requestVersion, setRequestVersion] =
    useState(0);

  const [packages, setPackages] = useState([]);
  const [listLoading, setListLoading] =
    useState(true);
  const [listError, setListError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");
  const [actionError, setActionError] =
    useState("");

  const [createModalOpen, setCreateModalOpen] =
    useState(false);
  const [createForm, setCreateForm] = useState(
    createEmptyCreateForm,
  );
  const [createBusy, setCreateBusy] =
    useState(false);
  const [createError, setCreateError] =
    useState("");

  const [selectedPackageId, setSelectedPackageId] =
    useState("");
  const [detailState, setDetailState] = useState({
    loading: false,
    error: "",
    data: null,
  });
  const [editForm, setEditForm] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [editNotice, setEditNotice] = useState("");

  const [
    pendingStatusPackage,
    setPendingStatusPackage,
  ] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] =
    useState(null);

  const businessDefinitions = useMemo(
    () =>
      entitlementDefinitions.filter(
        definitionSupportsBusiness,
      ),
    [entitlementDefinitions],
  );

  const definitionLookup = useMemo(
    () =>
      buildDefinitionLookup(businessDefinitions),
    [businessDefinitions],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadDefinitions = async () => {
      setDefinitionsLoading(true);
      setDefinitionsError("");

      try {
        const result =
          await adminSubscriptionPackageApi.getEntitlementDefinitions(
            { signal: controller.signal },
          );

        setEntitlementDefinitions(result);
      } catch (error) {
        if (isRequestCancelled(error)) {
          return;
        }

        setEntitlementDefinitions([]);
        setDefinitionsError(
          getPackageErrorMessage(
            error,
            "Không thể tải danh sách quyền lợi gói đăng ký.",
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setDefinitionsLoading(false);
        }
      }
    };

    void loadDefinitions();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadPackages = async () => {
      setListLoading(true);
      setListError("");

      try {
        const isActive =
          statusFilter === "active"
            ? true
            : statusFilter === "inactive"
              ? false
              : undefined;

        const result =
          await adminSubscriptionPackageApi.getPackages(
            {
              isActive,
              targetRole:
                targetRoleFilter || undefined,
              signal: controller.signal,
            },
          );

        setPackages(result);
      } catch (error) {
        if (isRequestCancelled(error)) {
          return;
        }

        setPackages([]);
        setListError(
          getPackageErrorMessage(error),
        );
      } finally {
        if (!controller.signal.aborted) {
          setListLoading(false);
        }
      }
    };

    void loadPackages();

    return () => {
      controller.abort();
    };
  }, [
    statusFilter,
    targetRoleFilter,
    requestVersion,
  ]);

  useEffect(() => {
    if (!selectedPackageId) {
      return undefined;
    }

    const controller = new AbortController();

    const loadDetail = async () => {
      try {
        const data =
          await adminSubscriptionPackageApi.getPackageById(
            selectedPackageId,
            { signal: controller.signal },
          );

        setDetailState({
          loading: false,
          error: "",
          data,
        });

        setEditForm({
          name: data?.name || "",
          description: data?.description || "",
          price:
            data?.price != null
              ? String(data.price)
              : "",
          duration:
            data?.duration != null
              ? String(data.duration)
              : "",
          entitlementRows: Array.isArray(
            data?.entitlements,
          )
            ? data.entitlements.map(
                (entitlement) => ({
                  key: entitlement.key,
                  numericValue:
                    entitlement.numericValue !=
                    null
                      ? String(
                          entitlement.numericValue,
                        )
                      : "",
                  booleanValue: Boolean(
                    entitlement.booleanValue,
                  ),
                  isUnlimited: Boolean(
                    entitlement.isUnlimited,
                  ),
                }),
              )
            : [],
        });
      } catch (error) {
        if (isRequestCancelled(error)) {
          return;
        }

        setDetailState({
          loading: false,
          error: getPackageErrorMessage(
            error,
            "Không thể tải chi tiết gói đăng ký.",
          ),
          data: null,
        });
      }
    };

    void loadDetail();

    return () => {
      controller.abort();
    };
  }, [selectedPackageId]);

  useEffect(() => {
    if (!selectedPackageId) {
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
  }, [selectedPackageId]);

  const refresh = () => {
    setRequestVersion(
      (currentVersion) => currentVersion + 1,
    );
  };

  const openCreateModal = () => {
    setCreateForm(createEmptyCreateForm());
    setCreateError("");
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (createBusy) {
      return;
    }

    setCreateModalOpen(false);
  };

  const handleCreateSubmit = async () => {
    if (createBusy) {
      return;
    }

    const fieldsResult = validatePackageFields(
      createForm,
      { requireCode: true },
    );

    if (fieldsResult.error) {
      setCreateError(fieldsResult.error);
      return;
    }

    const entitlementsResult =
      validateEntitlementRows(
        createForm.entitlementRows,
        definitionLookup,
      );

    if (entitlementsResult.error) {
      setCreateError(entitlementsResult.error);
      return;
    }

    setCreateBusy(true);
    setCreateError("");

    try {
      const created =
        await adminSubscriptionPackageApi.createPackage(
          {
            code: fieldsResult.code,
            name: fieldsResult.name,
            description:
              fieldsResult.description || null,
            price: fieldsResult.price,
            duration: fieldsResult.duration,
            targetRole: TARGET_ROLE_BUSINESS,
            entitlements:
              entitlementsResult.entitlements,
          },
        );

      setSuccessMessage(
        `Đã tạo gói đăng ký "${
          created?.name || fieldsResult.name
        }" thành công.`,
      );

      setCreateModalOpen(false);
      refresh();
    } catch (error) {
      setCreateError(
        getPackageErrorMessage(error),
      );
    } finally {
      setCreateBusy(false);
    }
  };

  const openDetail = (packageId) => {
    const id = String(packageId || "").trim();

    if (!id) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    setSelectedPackageId(id);
    setEditForm(null);
    setEditError("");
    setEditNotice("");
    setDetailState({
      loading: true,
      error: "",
      data: null,
    });
  };

  function closeDetail() {
    setSelectedPackageId("");
    setEditForm(null);
    setEditError("");
    setEditNotice("");
    setDetailState({
      loading: false,
      error: "",
      data: null,
    });
  }

  const handleEditSubmit = async () => {
    const detail = detailState.data;

    if (!detail || !editForm || editBusy) {
      return;
    }

    const fieldsResult = validatePackageFields(
      editForm,
      { requireCode: false },
    );

    if (fieldsResult.error) {
      setEditError(fieldsResult.error);
      return;
    }

    const entitlementsResult =
      validateEntitlementRows(
        editForm.entitlementRows,
        definitionLookup,
      );

    if (entitlementsResult.error) {
      setEditError(entitlementsResult.error);
      return;
    }

    const patch = {};

    if (
      fieldsResult.name !==
      String(detail.name || "").trim()
    ) {
      patch.name = fieldsResult.name;
    }

    const originalDescription = String(
      detail.description || "",
    ).trim();

    if (
      fieldsResult.description !==
      originalDescription
    ) {
      patch.description = fieldsResult.description;
    }

    if (fieldsResult.price !== Number(detail.price)) {
      patch.price = fieldsResult.price;
    }

    if (
      fieldsResult.duration !==
      Number(detail.duration)
    ) {
      patch.duration = fieldsResult.duration;
    }

    if (
      !sameEntitlementSets(
        detail.entitlements,
        entitlementsResult.entitlements,
      )
    ) {
      patch.entitlements =
        entitlementsResult.entitlements;
    }

    if (Object.keys(patch).length === 0) {
      setEditError("");
      setEditNotice(
        "Không có thay đổi nào cần lưu.",
      );
      return;
    }

    setEditBusy(true);
    setEditError("");
    setEditNotice("");

    try {
      await adminSubscriptionPackageApi.updatePackage(
        detail.packageId,
        patch,
      );

      setSuccessMessage(
        `Đã cập nhật gói đăng ký "${fieldsResult.name}" thành công.`,
      );

      closeDetail();
      refresh();
    } catch (error) {
      setEditError(getPackageErrorMessage(error));
    } finally {
      setEditBusy(false);
    }
  };

  const openStatusConfirm = (pkg) => {
    if (updatingStatusId) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    setPendingStatusPackage(pkg);
  };

  const closeStatusConfirm = () => {
    if (!updatingStatusId) {
      setPendingStatusPackage(null);
    }
  };

  const handleConfirmStatusChange = async () => {
    const pkg = pendingStatusPackage;

    if (!pkg || updatingStatusId) {
      return;
    }

    const nextIsActive = !pkg.isActive;

    setUpdatingStatusId(pkg.packageId);
    setActionError("");

    try {
      await adminSubscriptionPackageApi.updatePackageStatus(
        pkg.packageId,
        nextIsActive,
      );

      setSuccessMessage(
        `Đã ${
          nextIsActive ? "bật" : "tắt"
        } gói đăng ký "${pkg.name}" thành công.`,
      );

      setPendingStatusPackage(null);
      refresh();
    } catch (error) {
      setActionError(getPackageErrorMessage(error));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Cấu hình dịch vụ
        </p>

        <h1 className="mt-1 text-2xl font-bold text-text">
          Gói đăng ký
        </h1>

        <p className="mt-1 text-sm text-textLight">
          Quản lý các gói dịch vụ và quyền lợi áp dụng cho tài khoản doanh nghiệp.
        </p>
      </header>

      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-textLight">
            Trạng thái
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="all">Tất cả</option>
              <option value="active">
                Đang hoạt động
              </option>
              <option value="inactive">
                Đã tắt
              </option>
            </select>
          </label>

          <label className="block text-xs font-bold text-textLight">
            Vai trò áp dụng
            <select
              value={targetRoleFilter}
              onChange={(event) =>
                setTargetRoleFilter(
                  event.target.value,
                )
              }
              className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">Tất cả</option>
              <option
                value={String(
                  TARGET_ROLE_BUSINESS,
                )}
              >
                Doanh nghiệp
              </option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            aria-hidden="true"
          >
            add
          </span>
          Tạo gói đăng ký
        </button>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-start justify-between gap-4 rounded-xl border border-success/20 bg-success/10 p-4 text-sm font-semibold text-success"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Đóng thông báo"
            className="shrink-0 font-black"
          >
            ×
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Đóng thông báo lỗi"
            className="shrink-0 font-black"
          >
            ×
          </button>
        </div>
      )}

      {listLoading && (
        <div
          role="status"
          className="flex min-h-48 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-sm"
        >
          <span className="material-symbols-outlined animate-spin text-3xl">
            refresh
          </span>
          <span className="ml-3 text-sm font-semibold">
            Đang tải danh sách gói đăng ký...
          </span>
        </div>
      )}

      {!listLoading && listError && (
        <div
          role="alert"
          className="rounded-xl border border-error/20 bg-error/10 p-8 text-center"
        >
          <h2 className="font-bold text-error">
            Không thể tải danh sách gói đăng ký
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
        packages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-textLight">
              workspace_premium
            </span>
            <h2 className="mt-3 font-bold text-text">
              Chưa có gói đăng ký
            </h2>
            <p className="mt-1 text-sm text-textLight">
              Hãy tạo gói đăng ký đầu tiên hoặc thay đổi điều kiện lọc.
            </p>
          </div>
        )}

      {!listLoading &&
        !listError &&
        packages.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-xs uppercase tracking-wide text-textLight">
                  <th className="px-4 py-3 font-semibold">
                    Mã gói
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Tên gói
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Giá
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Thời hạn
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Vai trò áp dụng
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Số quyền lợi
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Cập nhật gần nhất
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {packages.map((pkg) => {
                  const isUpdatingStatus =
                    updatingStatusId ===
                    pkg.packageId;

                  const entitlementCount =
                    Array.isArray(
                      pkg.entitlements,
                    )
                      ? pkg.entitlements.length
                      : 0;

                  return (
                    <tr
                      key={pkg.packageId}
                      className="transition hover:bg-background/70"
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-text">
                        {pkg.code}
                      </td>

                      <td className="px-4 py-4 font-bold text-text">
                        {pkg.name}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-textLight">
                        {formatCurrencyVnd(
                          pkg.price,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-textLight">
                        Thời hạn: {pkg.duration}
                      </td>

                      <td className="px-4 py-4 text-textLight">
                        {getTargetRoleLabel(
                          pkg.targetRole,
                        )}
                      </td>

                      <td className="px-4 py-4 text-textLight">
                        {entitlementCount}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-block rounded-full px-3 py-1 text-xs font-semibold",
                            pkg.isActive
                              ? "bg-success/10 text-success"
                              : "bg-background text-textLight",
                          ].join(" ")}
                        >
                          {pkg.isActive
                            ? "Đang hoạt động"
                            : "Đã tắt"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-textLight">
                        {formatDateTime(
                          pkg.updatedAt,
                        )}
                      </td>

                      <td className="space-x-2 whitespace-nowrap px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openDetail(
                              pkg.packageId,
                            )
                          }
                          disabled={Boolean(
                            updatingStatusId,
                          )}
                          title="Xem / Chỉnh sửa"
                          className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Xem / Chỉnh sửa
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openStatusConfirm(pkg)
                          }
                          disabled={Boolean(
                            updatingStatusId,
                          )}
                          title={
                            pkg.isActive
                              ? "Tắt gói"
                              : "Bật gói"
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            pkg.isActive
                              ? "border-error text-error hover:bg-error/10"
                              : "border-success text-success hover:bg-success/10"
                          }`}
                        >
                          {isUpdatingStatus
                            ? "Đang xử lý..."
                            : pkg.isActive
                              ? "Tắt"
                              : "Bật"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {createModalOpen && (
        <CreatePackageModal
          form={createForm}
          onChangeForm={setCreateForm}
          definitions={businessDefinitions}
          definitionsLoading={definitionsLoading}
          definitionsError={definitionsError}
          busy={createBusy}
          error={createError}
          onClose={closeCreateModal}
          onSubmit={handleCreateSubmit}
        />
      )}

      {selectedPackageId && (
        <PackageDetailDrawer
          detailState={detailState}
          editForm={editForm}
          onChangeEditForm={setEditForm}
          definitions={businessDefinitions}
          definitionsLoading={definitionsLoading}
          definitionsError={definitionsError}
          busy={editBusy}
          error={editError}
          notice={editNotice}
          onClose={closeDetail}
          onSubmit={handleEditSubmit}
        />
      )}

      <ConfirmActionModal
        open={Boolean(pendingStatusPackage)}
        title={
          pendingStatusPackage?.isActive
            ? "Tắt gói đăng ký"
            : "Bật gói đăng ký"
        }
        description={
          pendingStatusPackage?.isActive
            ? `Tắt gói đăng ký "${
                pendingStatusPackage?.name || ""
              }"? Gói sẽ không còn hoạt động nhưng dữ liệu lịch sử vẫn được giữ lại.`
            : `Bật lại gói đăng ký "${
                pendingStatusPackage?.name || ""
              }"?`
        }
        confirmLabel={
          pendingStatusPackage?.isActive
            ? "Tắt gói"
            : "Bật gói"
        }
        tone={
          pendingStatusPackage?.isActive
            ? "danger"
            : "success"
        }
        busy={Boolean(updatingStatusId)}
        onCancel={closeStatusConfirm}
        onConfirm={handleConfirmStatusChange}
      />
    </section>
  );
}

// Quy tắc gói đăng ký theo Backend (SubscriptionPackageService.ValidateVipConfiguration).
export const PERSONAL_DURATION_DAYS = 30;
export const PERSONAL_AI_PRICE_KEY = "ai.price_suggestion.daily_count";
export const PERSONAL_AI_PRICE_DAILY_COUNT = 50;
const MAX_DURATION_DAYS = 3650;
const MAX_INT = 2147483647;
const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

export const DELETE_REJECTED_MESSAGE =
  "Chỉ có thể xóa gói Doanh nghiệp chưa từng có lượt đăng ký. Gói đã có lịch sử cần dùng chức năng đóng gói.";

const ERROR_MESSAGES = {
  "SubscriptionPackage.NotFound": "Không tìm thấy gói đăng ký.",
  "SubscriptionPackage.CodeAlreadyExists": "Mã gói đăng ký đã tồn tại.",
  "SubscriptionPackage.NameAlreadyExists": "Tên gói đăng ký đã tồn tại.",
  "SubscriptionPackage.InvalidEntitlement": "Quyền lợi của gói chưa hợp lệ. Vui lòng kiểm tra lại.",
  VALIDATION_ERROR: "Dữ liệu gói đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.",
};

export const getErrorCode = (error) =>
  String(error?.response?.data?.error?.code ?? error?.response?.data?.code ?? error?.code ?? "").trim();

export const getPackageErrorMessage = (error, fallback = "Không thể xử lý gói đăng ký lúc này. Vui lòng thử lại.") =>
  ERROR_MESSAGES[getErrorCode(error)] || fallback;

export const normalizeValueType = (valueType) => {
  const raw = String(valueType ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "integer") return "Integer";
  if (raw === "2" || raw === "decimal") return "Decimal";
  if (raw === "3" || raw === "boolean") return "Boolean";
  return null;
};

export const normalizeTargetRole = (role) => {
  const raw = String(role ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "personal") return "Personal";
  if (raw === "2" || raw === "business") return "Business";
  return null;
};

export const roleLabel = (role) =>
  ({ Personal: "Cá nhân", Business: "Doanh nghiệp" })[normalizeTargetRole(role)] || "Không xác định";

export const definitionSupportsRole = (definition, role) =>
  Array.isArray(definition?.targetRoles) && definition.targetRoles.some((item) => normalizeTargetRole(item) === role);

export const buildDefinitionLookup = (definitions) =>
  new Map(definitions.map((definition) => [String(definition.key).trim().toLowerCase(), definition]));

export const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

export const entitlementValueText = (entitlement, definition) => {
  if (entitlement?.isUnlimited) return "Không giới hạn";
  if (normalizeValueType(entitlement?.valueType ?? definition?.valueType) === "Boolean") {
    return entitlement?.booleanValue ? "Có" : "Không";
  }
  return entitlement?.numericValue === null || entitlement?.numericValue === undefined
    ? "—"
    : Number(entitlement.numericValue).toLocaleString("vi-VN");
};

export const validatePackageFields = (form, { requireCode, role }) => {
  let code;
  if (requireCode) {
    code = form.code.trim();
    if (!code) return { error: "Vui lòng nhập mã gói." };
    if (code.length > 100) return { error: "Mã gói không được vượt quá 100 ký tự." };
    if (!CODE_PATTERN.test(code)) return { error: "Mã gói chỉ được chứa chữ cái, số, dấu gạch dưới và gạch ngang." };
  }
  const name = form.name.trim();
  if (!name) return { error: "Vui lòng nhập tên gói." };
  if (name.length > 255) return { error: "Tên gói không được vượt quá 255 ký tự." };
  const description = form.description.trim();
  if (description.length > 2000) return { error: "Mô tả không được vượt quá 2000 ký tự." };
  const price = Number(form.price);
  if (form.price === "" || !Number.isFinite(price) || price <= 0) return { error: "Vui lòng nhập giá gói hợp lệ." };
  if (!Number.isInteger(price)) return { error: "Giá gói phải là số nguyên VND." };
  if (price > MAX_INT) return { error: "Giá gói vượt quá giới hạn cho phép." };
  const duration = Number(form.duration);
  if (form.duration === "" || !Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_DAYS) {
    return { error: "Vui lòng nhập thời hạn hợp lệ (số nguyên từ 1 đến 3650 ngày)." };
  }
  if (role === "Personal" && duration !== PERSONAL_DURATION_DAYS) {
    return { error: `Gói Cá nhân phải có thời hạn ${PERSONAL_DURATION_DAYS} ngày.` };
  }
  return { code, name, description, price, duration };
};

// rows: [{ key, numericValue (chuỗi), booleanValue, isUnlimited }] — chỉ các quyền lợi đã chọn.
export const validateEntitlementRows = (rows, lookup) => {
  if (!rows.length) return { error: "Vui lòng chọn ít nhất một quyền lợi." };
  const seen = new Set();
  const entitlements = [];
  for (const row of rows) {
    const key = String(row.key || "").trim().toLowerCase();
    const definition = lookup.get(key);
    if (!definition) return { error: `Quyền lợi "${row.key}" không còn hợp lệ.` };
    if (seen.has(key)) return { error: "Không được chọn trùng quyền lợi." };
    seen.add(key);
    const valueType = normalizeValueType(definition.valueType);
    if (valueType === "Boolean") {
      entitlements.push({ key: definition.key, numericValue: null, booleanValue: Boolean(row.booleanValue), isUnlimited: false });
      continue;
    }
    if (row.isUnlimited) {
      if (!definition.supportsUnlimited) return { error: `"${definition.displayName}" không hỗ trợ không giới hạn.` };
      entitlements.push({ key: definition.key, numericValue: null, booleanValue: null, isUnlimited: true });
      continue;
    }
    const numericValue = Number(row.numericValue);
    if (row.numericValue === "" || !Number.isFinite(numericValue) || numericValue <= 0) {
      return { error: `Vui lòng nhập giá trị hợp lệ cho "${definition.displayName}".` };
    }
    if (valueType === "Integer" && (!Number.isInteger(numericValue) || numericValue > MAX_INT)) {
      return { error: `"${definition.displayName}" phải là số nguyên.` };
    }
    entitlements.push({ key: definition.key, numericValue, booleanValue: null, isUnlimited: false });
  }
  return { entitlements };
};

const signature = (entitlement) => {
  const key = String(entitlement?.key || "").trim().toLowerCase();
  const numeric = entitlement?.numericValue === null || entitlement?.numericValue === undefined ? null : Number(entitlement.numericValue);
  const bool = entitlement?.booleanValue === null || entitlement?.booleanValue === undefined ? null : Boolean(entitlement.booleanValue);
  return `${key}|${numeric}|${bool}|${Boolean(entitlement?.isUnlimited)}`;
};

export const sameEntitlementSets = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  const a = new Set(left.map(signature));
  const b = new Set(right.map(signature));
  return a.size === b.size && [...a].every((item) => b.has(item));
};

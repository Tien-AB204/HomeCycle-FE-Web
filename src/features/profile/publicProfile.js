/*
 * Hồ sơ công khai: GET /auth/users/{userId}/profile.
 * Backend trả thẳng đối tượng, không có role: loại hồ sơ suy ra từ các trường
 * (doanh nghiệp có businessName..., cá nhân có fullName). Backend cố ý không
 * trả email, điện thoại, giấy tờ; màn hình cũng không hiện các thông tin đó.
 */

const BUSINESS_KEYS = [
  "businessName",
  "businessDescription",
  "businessAddress",
  "operatingScope",
  "businessModel",
];

const BUSINESS_MODEL_LABELS = Object.freeze({
  householdbusiness: "Hộ kinh doanh",
  0: "Hộ kinh doanh",
  enterprise: "Doanh nghiệp",
  1: "Doanh nghiệp",
});

const pick = (raw, key) => {
  const pascal = key.charAt(0).toUpperCase() + key.slice(1);
  return raw[key] !== undefined ? raw[key] : raw[pascal];
};

const has = (raw, key) => pick(raw, key) !== undefined;

const asText = (value) => {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text || null;
};

const asCount = (value) => {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) && number > 0 ? number : 0;
};

export const normalizePublicProfile = (payload) => {
  let raw = payload && typeof payload === "object" ? payload : {};

  if (!has(raw, "userId") && raw.data && typeof raw.data === "object") {
    raw = raw.data;
  }

  const kind = BUSINESS_KEYS.some((key) => has(raw, key))
    ? "business"
    : has(raw, "fullName")
      ? "personal"
      : "unknown";
  const rating = Number(pick(raw, "displayStarRating"));

  return {
    kind,
    userId: asText(pick(raw, "userId")) || "",
    username: asText(pick(raw, "username")) || "",
    avatarUrl: asText(pick(raw, "avatarUrl")),
    reputationScore: Math.trunc(Number(pick(raw, "reputationScore"))) || 0,
    displayStarRating: Number.isFinite(rating) && rating > 0 ? rating : null,
    joinedAt: asText(pick(raw, "joinedAt")),
    activePostCount: asCount(pick(raw, "activePostCount")),
    fullName: asText(pick(raw, "fullName")),
    businessName: asText(pick(raw, "businessName")),
    businessDescription: asText(pick(raw, "businessDescription")),
    businessAddress: asText(pick(raw, "businessAddress")),
    ward: asText(pick(raw, "ward")),
    city: asText(pick(raw, "city")),
    operatingScope: asText(pick(raw, "operatingScope")),
    businessModel: pick(raw, "businessModel") ?? null,
  };
};

export const getProfileDisplayName = (profile) =>
  (profile?.kind === "business" && profile.businessName) ||
  (profile?.kind === "personal" && profile.fullName) ||
  profile?.username ||
  "Người dùng HomeCycle";

export const getProfileKindLabel = (kind) =>
  kind === "business"
    ? "Tài khoản Doanh nghiệp"
    : kind === "personal"
      ? "Tài khoản Cá nhân"
      : "Tài khoản HomeCycle";

export const getBusinessModelLabel = (value) => {
  if (value === null || value === undefined || value === "") return "Chưa cập nhật";
  return BUSINESS_MODEL_LABELS[String(value).trim().toLowerCase()] || "Không xác định";
};

/*
 * Địa chỉ chính là businessAddress; phường và tỉnh/thành chỉ nối thêm khi
 * chưa có trong địa chỉ để không lặp lại.
 */
export const composeBusinessAddress = (profile) => {
  const parts = [];

  [profile?.businessAddress, profile?.ward, profile?.city].forEach((value) => {
    const text = String(value || "").trim();
    if (!text) return;
    const included = parts.some((part) =>
      part.toLowerCase().includes(text.toLowerCase()),
    );
    if (!included) parts.push(text);
  });

  return parts.join(", ");
};

export const formatStarRating = (value) =>
  Number.isFinite(value) && value > 0 ? `★ ${value.toFixed(1)}` : "Chưa có đánh giá";

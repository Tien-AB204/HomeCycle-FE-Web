import { ROLES } from "../constants/roles";

const ROLE_ALIASES = Object.freeze({
  PERSONAL: ROLES.PERSONAL,
  USER: ROLES.PERSONAL,

  BUSINESS: ROLES.BUSINESS,

  MOD: ROLES.MODERATOR,
  MODERATOR: ROLES.MODERATOR,

  ADMIN: ROLES.ADMIN,
  ADMINISTRATOR: ROLES.ADMIN,
});

/**
 * Chuyển role từ Backend về định dạng thống nhất của Frontend.
 *
 * Ví dụ:
 * Personal  -> PERSONAL
 * Business  -> BUSINESS
 * Moderator -> MODERATOR
 * Admin     -> ADMIN
 */
export const normalizeRole = (role) => {
  if (!role || typeof role !== "string") {
    return "";
  }

  const normalizedRole = role
    .trim()
    .replace(/[\s_-]+/g, "")
    .toUpperCase();

  return ROLE_ALIASES[normalizedRole] || "";
};

/**
 * Trả về trang mặc định sau khi đăng nhập.
 */
export const getHomePathByRole = (role) => {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case ROLES.ADMIN:
      return "/admin/dashboard";

    case ROLES.MODERATOR:
      return "/mod/verification";

    case ROLES.PERSONAL:
    case ROLES.BUSINESS:
    default:
      return "/";
  }
};

/**
 * Kiểm tra người dùng có đúng role yêu cầu hay không.
 */
export const hasRole = (userRole, allowedRole) => {
  return (
    normalizeRole(userRole) ===
    normalizeRole(allowedRole)
  );
};

/**
 * Giải mã phần payload của JWT (KHÔNG xác thực chữ ký) - chỉ dùng để
 * đọc thông tin hiển thị (vd email trong registration token) ở FE,
 * không dùng cho mục đích xác thực/bảo mật.
 */
export const decodeJwtPayload = (token) => {
  try {
    const segments = String(token || "").split(".");

    if (segments.length !== 3) {
      return null;
    }

    const base64Url = segments[1];

    const base64 = base64Url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(
        Math.ceil(base64Url.length / 4) * 4,
        "=",
      );

    const binaryString = window.atob(base64);

    const bytes = Uint8Array.from(binaryString, (character) =>
      character.charCodeAt(0),
    );

    const json = new TextDecoder().decode(bytes);

    return JSON.parse(json);
  } catch {
    return null;
  }
};

/**
 * Backend từng trả mã người dùng với nhiều kiểu key khác nhau.
 * Hàm này giúp các màn hình nghiệp vụ chỉ dùng một nguồn thống nhất.
 */
export const getUserId = (user) => {
  if (!user || typeof user !== "object") {
    return "";
  }

  return String(
    user.userId ||
      user.UserId ||
      user.id ||
      user.Id ||
      "",
  ).trim();
};

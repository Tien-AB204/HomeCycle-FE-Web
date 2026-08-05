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
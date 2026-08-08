import { ROLES } from "./roles";
import { normalizeRole } from "../utils/authUtils";

export const MARKETPLACE_POST_TYPES = Object.freeze({
  SELL: "Sell",
  BUY: "Buy",
});

export const normalizePostType = (postType) => {
  const normalizedValue = String(postType || "")
    .trim()
    .toLowerCase();

  if (normalizedValue === "sell") {
    return MARKETPLACE_POST_TYPES.SELL;
  }

  if (normalizedValue === "buy") {
    return MARKETPLACE_POST_TYPES.BUY;
  }

  return "";
};

export const getManagedPostTypeByRole = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLES.PERSONAL) {
    return MARKETPLACE_POST_TYPES.SELL;
  }

  if (normalizedRole === ROLES.BUSINESS) {
    return MARKETPLACE_POST_TYPES.BUY;
  }

  return "";
};

export const canManagePostType = (role, postType) => {
  return (
    getManagedPostTypeByRole(role) ===
    normalizePostType(postType)
  );
};

export const getPostTypeLabel = (postType) => {
  return normalizePostType(postType) ===
    MARKETPLACE_POST_TYPES.BUY
    ? "tin thu mua"
    : "tin đăng bán";
};

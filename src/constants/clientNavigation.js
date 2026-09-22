import { ROLES } from "./roles.js";

export const MARKETPLACE_NAVIGATION = [
  { name: "Trang chủ", path: "/", icon: "home" },
  { name: "Tin đăng bán", path: "/tin-dang-ban?view=marketplace", icon: "storefront" },
  { name: "Tin thu mua", path: "/tin-thu-mua?view=marketplace", icon: "shopping_bag" },
];

export const getClientEntryPath = (role) =>
  role === ROLES.BUSINESS ? "/tin-thu-mua?view=mine" : "/tin-dang-ban?view=mine";

export const getClientNavigation = (role) => [
  ...(role === ROLES.BUSINESS ? [{ name: "", items: [
    { name: "Hiệu quả thu mua", path: "/business/dashboard", icon: "query_stats" },
  ] }] : []),
  { name: "Tin đăng", items: [
    { name: "Tin của tôi", path: getClientEntryPath(role), icon: "inventory_2", key: "posts" },
  ] },
  { name: "Giao dịch", items: [
    { name: "Đề nghị", path: "/thuong-luong", icon: "local_offer", exact: true },
    { name: "Lịch hẹn", path: "/lich-hen", icon: "event" },
    { name: "Đơn hàng", path: "/don-hang", icon: "package_2" },
    { name: "Tranh chấp", path: "/tranh-chap", icon: "support_agent" },
  ] },
  { name: "Tài chính", items: [
    { name: "Thanh toán", path: "/thanh-toan", icon: "credit_card", prefixes: ["/payments/"] },
    { name: "Ví", path: "/vi", icon: "account_balance_wallet" },
  ] },
  { name: "Tài khoản", items: [
    { name: "Hồ sơ", path: "/ho-so", icon: "person" },
    { name: "Gói VIP", path: "/goi-dang-ky", icon: "workspace_premium" },
  ] },
];

export const isClientItemActive = (item, location, role) => {
  const { pathname, search } = location;
  if (item.key === "posts") {
    const ownPath = role === ROLES.BUSINESS ? "/tin-thu-mua" : "/tin-dang-ban";
    const view = new URLSearchParams(search).get("view");
    return pathname.startsWith("/bai-dang/") || pathname.startsWith("/bai-dang-cua-toi/") ||
      (pathname === ownPath && view !== "marketplace" && view !== "recommended");
  }
  if (item.prefixes?.some((prefix) => pathname.startsWith(prefix))) return true;
  return pathname === item.path || (!item.exact && pathname.startsWith(`${item.path}/`));
};

export const getClientPage = (location, role) => {
  const matched = getClientNavigation(role).flatMap((group) => group.items)
    .find((item) => isClientItemActive(item, location, role));
  if (matched) return matched;
  return [
    { name: "Thương lượng", path: "/thuong-luong/phien", prefixes: ["/thuong-luong/", "/thoa-thuan/"] },
    { name: "Giỏ hàng", path: "/gio-hang" },
    { name: "Hộp thư", path: "/hop-thu" },
    { name: "Thông báo", path: "/thong-bao" },
    { name: "Đánh giá", path: "/danh-gia" },
  ].find((item) => isClientItemActive(item, location, role));
};

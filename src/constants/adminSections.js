export const USER_SECTION_TABS = Object.freeze([
  { label: "Tổng quan", path: "/admin/dashboard/users", exact: true },
  { label: "Danh sách tài khoản", path: "/admin/users" },
]);

export const ORDER_SECTION_TABS = Object.freeze([
  { label: "Tổng quan", path: "/admin/dashboard/orders", exact: true },
  { label: "Lịch sử đơn hàng", path: "/admin/dashboard/orders/history" },
]);

export const APPOINTMENT_SECTION_TABS = Object.freeze([
  { label: "Tổng quan", path: "/admin/dashboard/appointments", exact: true },
  { label: "Lịch sử lịch hẹn", path: "/admin/dashboard/appointments/history" },
]);

export const POST_SECTION_TABS = Object.freeze([
  { label: "Tổng quan", path: "/admin/dashboard/posts", exact: true },
  { label: "Danh sách bài đăng", path: "/admin/posts" },
]);

export const BUSINESS_SECTION_TABS = Object.freeze([
  { label: "Tổng quan", path: "/admin/dashboard/businesses/overview", exact: true },
  { label: "Nhu cầu khảo sát", path: "/admin/dashboard/businesses/demand" },
]);

export const DISPUTE_SECTION_TABS = Object.freeze([
  { label: "Tổng quan", path: "/admin/dashboard/disputes", exact: true },
  { label: "Lịch sử tranh chấp", path: "/admin/dashboard/disputes/history" },
  { label: "Danh mục tranh chấp", path: "/admin/dispute-categories" },
]);

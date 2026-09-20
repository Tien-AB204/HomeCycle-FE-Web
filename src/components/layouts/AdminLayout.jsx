import ManagementPortalLayout from "./ManagementPortalLayout";

const ADMIN_NAV_GROUPS = [
  {
    group: "TỔNG QUAN",
    items: [
      {
        label: "Tổng quan vận hành",
        path: "/admin/dashboard",
        icon: "space_dashboard",
      },
    ],
  },
  {
    group: "VẬN HÀNH",
    items: [
      {
        label: "Đơn hàng",
        path: "/admin/dashboard/orders",
        icon: "inventory_2",
      },
      {
        label: "Lịch hẹn",
        path: "/admin/dashboard/appointments",
        icon: "event",
      },
      {
        label: "Tranh chấp",
        path: "/admin/dashboard/disputes",
        matchPaths: ["/admin/dispute-categories"],
        icon: "gavel",
      },
      {
        label: "Người dùng",
        path: "/admin/dashboard/users",
        matchPaths: ["/admin/users"],
        icon: "group",
      },
      {
        label: "Bài đăng",
        path: "/admin/dashboard/posts",
        icon: "article",
      },
    ],
  },
  {
    group: "TÀI CHÍNH",
    items: [
      {
        label: "Tổng quan",
        path: "/admin/dashboard/finance",
        icon: "account_balance",
      },
      {
        label: "Thanh toán",
        path: "/admin/dashboard/payments",
        icon: "payments",
      },
      {
        label: "Ví & giao dịch",
        path: "/admin/finance-management",
        icon: "receipt_long",
      },
    ],
  },
  {
    group: "DOANH NGHIỆP",
    items: [
      {
        label: "Tổng quan",
        path: "/admin/dashboard/businesses/overview",
        icon: "domain",
      },
      {
        label: "Nhu cầu",
        path: "/admin/dashboard/businesses/demand",
        icon: "query_stats",
      },
      {
        label: "Hoạt động mua bán",
        path: "/admin/dashboard/businesses/performance",
        icon: "monitoring",
      },
    ],
  },
  {
    group: "DỮ LIỆU SẢN PHẨM",
    items: [
      {
        label: "Danh mục",
        path: "/admin/categories",
        icon: "category",
      },
      {
        label: "Thương hiệu",
        path: "/admin/brands",
        icon: "sell",
      },
      {
        label: "Loại & thuộc tính",
        path: "/admin/product-types",
        icon: "tune",
      },
    ],
  },
  {
    group: "CẤU HÌNH HỆ THỐNG",
    items: [
      {
        label: "Gói đăng ký",
        path: "/admin/subscription-packages",
        icon: "workspace_premium",
      },
      {
        label: "Chính sách hệ thống",
        path: "/admin/policies",
        icon: "policy",
      },
      {
        label: "Nhật ký hệ thống",
        path: "/admin/audit-logs",
        icon: "history",
      },
    ],
  },
];

export default function AdminLayout() {
  return (
    <ManagementPortalLayout
      navGroups={ADMIN_NAV_GROUPS}
      dashboardPath="/admin/dashboard"
      centerLabel="TRUNG TÂM QUẢN TRỊ"
      headerLabel="Quản trị hệ thống"
      roleLabel="Quản trị viên"
      defaultPageLabel="Trung tâm quản trị"
      fallbackDisplayName="Quản trị viên"
      navAriaLabel="Điều hướng quản trị"
      openMenuAriaLabel="Mở menu quản trị"
      closeMenuAriaLabel="Đóng menu quản trị"
      notificationsPath="/admin/notifications"
    />
  );
}

import ManagementPortalLayout from "./ManagementPortalLayout";

const ADMIN_NAV_GROUPS = [
  {
    group: "DASHBOARD",
    items: [
      {
        label: "Tổng quan vận hành",
        path: "/admin/dashboard",
        icon: "space_dashboard",
      },
      {
        label: "Giao dịch",
        path: "/admin/dashboard/payments",
        icon: "payments",
      },
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
        icon: "gavel",
      },
      {
        label: "Tổng quan người dùng",
        path: "/admin/dashboard/users",
        icon: "group",
      },
    ],
  },
  {
    group: "DOANH NGHIỆP",
    items: [
      {
        label: "Tổng quan doanh nghiệp",
        path: "/admin/dashboard/businesses/overview",
        icon: "domain",
      },
      {
        label: "Nhu cầu doanh nghiệp",
        path: "/admin/dashboard/businesses/demand",
        icon: "query_stats",
      },
      {
        label: "Hiệu quả kinh doanh",
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
        label: "Loại và thuộc tính",
        path: "/admin/product-types",
        icon: "tune",
      },
    ],
  },
  {
    group: "VẬN HÀNH HỆ THỐNG",
    items: [
      {
        label: "Người dùng",
        path: "/admin/users",
        icon: "group",
      },
      {
        label: "Bài đăng",
        path: "/admin/posts",
        icon: "inventory_2",
      },
      {
        label: "Ví hệ thống",
        path: "/admin/system-wallet",
        icon: "account_balance_wallet",
      },
      {
        label: "Chính sách hệ thống",
        path: "/admin/policies",
        icon: "policy",
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
      fallbackInitial="A"
      navAriaLabel="Điều hướng quản trị"
      openMenuAriaLabel="Mở menu quản trị"
      closeMenuAriaLabel="Đóng menu quản trị"
    />
  );
}
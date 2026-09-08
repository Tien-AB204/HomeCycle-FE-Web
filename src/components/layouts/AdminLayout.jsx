import ManagementPortalLayout from "./ManagementPortalLayout";

const ADMIN_NAV_GROUPS = [
  {
    group: "TỔNG QUAN",
    items: [
      {
        label: "Thống kê hệ thống",
        path: "/admin/dashboard",
        icon: "space_dashboard",
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
import ManagementPortalLayout from "./ManagementPortalLayout";

const MOD_NAV_GROUPS = [
  {
    group: "TỔNG QUAN",
    items: [
      {
        label: "Tổng quan",
        path: "/mod/dashboard",
        icon: "space_dashboard",
      },
    ],
  },
  {
    group: "KIỂM DUYỆT & XỬ LÝ",
    items: [
      {
        label: "Duyệt hồ sơ",
        path: "/mod/verification",
        icon: "fact_check",
      },
      {
        label: "Quản lý bài đăng",
        path: "/mod/posts",
        icon: "inventory_2",
      },
      {
        label: "Tranh chấp",
        path: "/mod/disputes",
        icon: "warning",
      },
      {
        label: "Đánh giá bị báo cáo",
        path: "/mod/reviews",
        icon: "rate_review",
      },
    ],
  },
  {
    group: "GIAO DỊCH & GIÁM SÁT",
    items: [
      {
        label: "Rút tiền",
        path: "/mod/withdrawals",
        icon: "account_balance_wallet",
      },
      {
        label: "Giao dịch & đơn hàng",
        path: "/mod/transactions",
        icon: "receipt_long",
      },
      {
        label: "Lịch hẹn",
        path: "/mod/appointments",
        icon: "event_available",
      },
      {
        label: "Lịch sử thương lượng",
        path: "/mod/negotiations",
        icon: "forum",
      },
    ],
  },
];

export default function ModLayout() {
  return (
    <ManagementPortalLayout
      navGroups={MOD_NAV_GROUPS}
      dashboardPath="/mod/dashboard"
      centerLabel="TRUNG TÂM KIỂM DUYỆT"
      headerLabel="Trung tâm kiểm duyệt"
      roleLabel="Kiểm duyệt viên"
      defaultPageLabel="Trung tâm kiểm duyệt"
      fallbackDisplayName="Kiểm duyệt viên"
      fallbackInitial="M"
      navAriaLabel="Điều hướng kiểm duyệt"
      openMenuAriaLabel="Mở menu kiểm duyệt"
      closeMenuAriaLabel="Đóng menu kiểm duyệt"
    />
  );
}
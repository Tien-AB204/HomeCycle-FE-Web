import ModeratorWorkspaceShell from "../../components/mod/ModeratorWorkspaceShell";

export default function TransactionOrderManagementPage() {
  return (
    <ModeratorWorkspaceShell
      title="Giao dịch & đơn hàng"
      description="Theo dõi luồng đơn hàng và các thông tin thanh toán, giải ngân, vận chuyển liên quan."
      icon="receipt_long"
      searchPlaceholder="Tìm theo mã đơn hoặc người tham gia..."
      statusOptions={[
        "Tất cả",
        "Đang xử lý",
        "Hoàn tất",
        "Đang tranh chấp",
        "Đã hủy",
      ]}
      detailTitle="Chi tiết giao dịch"
      detailDescription="Chọn một đơn hàng để xem tiến trình, thanh toán, giải ngân, vận chuyển và các sự kiện liên quan."
      capabilities={[
        "Xem danh sách đơn hàng",
        "Xem trạng thái đơn hàng",
        "Xem lịch sử thanh toán",
        "Xem lịch sử giải ngân",
        "Xem thông tin vận chuyển",
        "Theo dõi các sự kiện liên quan đến giao dịch",
      ]}
    />
  );
}
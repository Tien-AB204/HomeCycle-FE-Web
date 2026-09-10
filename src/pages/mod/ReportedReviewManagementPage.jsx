import ModeratorWorkspaceShell from "../../components/mod/ModeratorWorkspaceShell";

export default function ReportedReviewManagementPage() {
  return (
    <ModeratorWorkspaceShell
      title="Đánh giá bị báo cáo"
      description="Kiểm tra các đánh giá bị báo cáo và ghi nhận kết quả xử lý theo chính sách."
      icon="rate_review"
      searchPlaceholder="Tìm theo người dùng hoặc nội dung đánh giá..."
      statusOptions={[
        "Tất cả",
        "Chờ xử lý",
        "Đã giữ nguyên",
        "Đã ẩn",
        "Đã xóa",
      ]}
      detailTitle="Chi tiết đánh giá bị báo cáo"
      detailDescription="Chọn một đánh giá để xem nội dung, người gửi báo cáo và thông tin liên quan trước khi xử lý."
      capabilities={[
        "Xem danh sách đánh giá bị báo cáo",
        "Xem nội dung và thông tin liên quan",
        "Giữ nguyên đánh giá",
        "Ẩn đánh giá vi phạm",
        "Xóa đánh giá vi phạm",
        "Ghi nhận kết quả xử lý",
      ]}
    />
  );
}
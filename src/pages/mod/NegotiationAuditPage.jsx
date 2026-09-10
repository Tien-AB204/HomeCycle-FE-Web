import ModeratorWorkspaceShell from "../../components/mod/ModeratorWorkspaceShell";

export default function NegotiationAuditPage() {
  return (
    <ModeratorWorkspaceShell
      title="Kiểm tra thương lượng"
      description="Tra cứu lịch sử chat và thương lượng khi phát sinh tranh chấp, khiếu nại hoặc yêu cầu kiểm tra."
      icon="forum"
      readOnly
      searchPlaceholder="Tìm theo giao dịch hoặc phiên thương lượng..."
      statusOptions={[
        "Tất cả",
        "Có tranh chấp",
        "Yêu cầu kiểm tra",
      ]}
      detailTitle="Lịch sử trao đổi"
      detailDescription="Chọn một phiên được phép kiểm tra để xem toàn bộ lịch sử trao đổi theo thứ tự thời gian."
      capabilities={[
        "Xem lịch sử chat",
        "Xem lịch sử thương lượng",
        "Đối chiếu trao đổi khi có tranh chấp hoặc khiếu nại",
        "Tra cứu khi hệ thống yêu cầu kiểm tra",
        "Không chỉnh sửa nội dung trao đổi",
      ]}
    />
  );
}
import ModeratorWorkspaceShell from "../../components/mod/ModeratorWorkspaceShell";

export default function WithdrawalManagementPage() {
  return (
    <ModeratorWorkspaceShell
      title="Yêu cầu rút tiền"
      description="Theo dõi và xử lý các yêu cầu rút tiền của người dùng theo chính sách hệ thống."
      icon="account_balance_wallet"
      searchPlaceholder="Tìm theo người dùng hoặc mã yêu cầu..."
      statusOptions={[
        "Tất cả",
        "Chờ xử lý",
        "Đã phê duyệt",
        "Đã từ chối",
      ]}
      detailTitle="Chi tiết yêu cầu rút tiền"
      detailDescription="Chọn một yêu cầu để xem người gửi, số tiền, thông tin liên quan và lịch sử giao dịch."
      capabilities={[
        "Xem danh sách yêu cầu rút tiền",
        "Xem chi tiết yêu cầu",
        "Phê duyệt hoặc từ chối yêu cầu",
        "Ghi nhận lý do từ chối",
        "Theo dõi lịch sử giao dịch liên quan",
      ]}
    />
  );
}
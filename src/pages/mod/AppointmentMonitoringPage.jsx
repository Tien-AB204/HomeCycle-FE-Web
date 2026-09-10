import ModeratorWorkspaceShell from "../../components/mod/ModeratorWorkspaceShell";

export default function AppointmentMonitoringPage() {
  return (
    <ModeratorWorkspaceShell
      title="Theo dõi lịch hẹn"
      description="Theo dõi tiến trình các lịch hẹn phát sinh trong quá trình giao dịch."
      icon="event_available"
      searchPlaceholder="Tìm theo mã lịch hẹn hoặc người tham gia..."
      statusOptions={[
        "Tất cả",
        "Sắp tới",
        "Hoàn tất",
        "Quá hạn",
        "Đã hủy",
      ]}
      detailTitle="Chi tiết lịch hẹn"
      detailDescription="Chọn một lịch hẹn để xem thời gian, người tham gia, trạng thái và lịch sử liên quan."
      capabilities={[
        "Xem danh sách lịch hẹn",
        "Theo dõi lịch hẹn sắp tới",
        "Xem lịch hẹn đã hoàn thành",
        "Xem lịch hẹn quá hạn",
        "Xem lịch hẹn bị hủy",
      ]}
    />
  );
}
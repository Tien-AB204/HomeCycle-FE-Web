import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import { APPOINTMENT_SECTION_TABS } from "../../constants/adminSections";
import AppointmentMonitoringPage from "../mod/AppointmentMonitoringPage";
import { adminAppointmentHistoryApi } from "../../services/apis/adminHistoryApi";

export default function AdminAppointmentHistoryPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-7 sm:px-6 lg:px-8">
      <AdminSectionTabs ariaLabel="Khu vực Lịch hẹn" items={APPOINTMENT_SECTION_TABS} />

      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <AppointmentMonitoringPage
          api={adminAppointmentHistoryApi}
          eyebrow="Vận hành"
          title="Lịch sử lịch hẹn"
          description="Tra cứu lịch hẹn kiểm định và thu gom trên toàn hệ thống. Quản trị viên chỉ xem, không thao tác."
        />
      </div>
    </div>
  );
}

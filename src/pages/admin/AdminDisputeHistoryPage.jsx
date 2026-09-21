import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import { DISPUTE_SECTION_TABS } from "../../constants/adminSections";
import DisputeManagementPage from "../mod/DisputeManagementPage";
import { adminDisputeHistoryApi } from "../../services/apis/adminHistoryApi";

export default function AdminDisputeHistoryPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminSectionTabs ariaLabel="Khu vực Tranh chấp" items={DISPUTE_SECTION_TABS} />

      <DisputeManagementPage
        api={adminDisputeHistoryApi}
        readOnly
        eyebrow="Vận hành"
        title="Lịch sử tranh chấp"
      />
    </div>
  );
}

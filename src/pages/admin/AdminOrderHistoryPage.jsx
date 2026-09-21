import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import { ORDER_SECTION_TABS } from "../../constants/adminSections";
import { OrderManagementContent } from "../mod/TransactionOrderManagementPage";
import { adminOrderHistoryApi } from "../../services/apis/adminHistoryApi";

export default function AdminOrderHistoryPage() {
  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <AdminSectionTabs ariaLabel="Khu vực Đơn hàng" items={ORDER_SECTION_TABS} />

      <header className="overflow-hidden rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_50px_rgba(23,40,48,0.14)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">Vận hành</p>
        <h1 className="mt-2 text-3xl font-black">Lịch sử đơn hàng</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
          Tra cứu đơn hàng và lịch sử tài chính của từng đơn trên toàn hệ thống. Quản trị viên chỉ xem, không thao tác.
        </p>
      </header>

      <OrderManagementContent
        api={adminOrderHistoryApi}
        disputeLinkPath="/admin/dashboard/disputes/history"
      />
    </section>
  );
}

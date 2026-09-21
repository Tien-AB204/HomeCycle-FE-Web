import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import { POST_SECTION_TABS } from "../../constants/adminSections";
import ListingDashboardPanel from "../../features/dashboard/ListingDashboardPanel";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

export default function AdminPostOverviewPage() {
  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <AdminSectionTabs ariaLabel="Khu vực Bài đăng" items={POST_SECTION_TABS} />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
            VẬN HÀNH
          </p>

          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Tổng quan bài đăng
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
            Theo dõi bài đăng mới, trạng thái hiện tại, danh mục nổi bật và tương quan
            nguồn cung với đơn hoàn tất. Việc xử lý từng bài đăng thuộc Trung tâm kiểm duyệt.
          </p>
        </div>
      </div>

      <ListingDashboardPanel loadDashboard={adminDashboardApi.getListings} />
    </section>
  );
}

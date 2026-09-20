import { useNavigate } from "react-router-dom";
import ListingDashboardPanel from "../../features/dashboard/ListingDashboardPanel";
import moderatorListingApi from "../../services/apis/moderatorListingApi";

const MODERATOR_AREAS = [
  {
    title: "Duyệt hồ sơ",
    description:
      "Kiểm tra hồ sơ cá nhân và doanh nghiệp đang chờ xác minh.",
    icon: "verified_user",
    path: "/mod/verification",
  },
  {
    title: "Quản lý bài đăng",
    description:
      "Kiểm duyệt bài đăng và xử lý nội dung cần can thiệp.",
    icon: "article",
    path: "/mod/posts",
  },
  {
    title: "Tranh chấp",
    description:
      "Tiếp nhận và xử lý tranh chấp theo luồng nghiệp vụ hiện tại.",
    icon: "gavel",
    path: "/mod/disputes",
  },
  {
    title: "Đánh giá bị báo cáo",
    description:
      "Kiểm tra các đánh giá đã bị người dùng báo cáo.",
    icon: "rate_review",
    path: "/mod/reviews",
  },
  {
    title: "Rút tiền",
    description:
      "Theo dõi và xử lý các yêu cầu rút tiền thuộc phạm vi kiểm duyệt.",
    icon: "account_balance_wallet",
    path: "/mod/withdrawals",
  },
  {
    title: "Giao dịch & đơn hàng",
    description:
      "Theo dõi giao dịch, thanh toán và trạng thái đơn hàng liên quan.",
    icon: "receipt_long",
    path: "/mod/transactions",
  },
  {
    title: "Lịch hẹn",
    description:
      "Theo dõi lịch kiểm định, thu gom và các trạng thái lịch hẹn.",
    icon: "event",
    path: "/mod/appointments",
  },
  {
    title: "Lịch sử thương lượng",
    description:
      "Tra cứu lịch sử thương lượng phục vụ kiểm tra và đối soát.",
    icon: "forum",
    path: "/mod/negotiations",
  },
];

export default function ModDashboardPage() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
            Khu vực kiểm duyệt
          </p>

          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            Trung tâm kiểm duyệt
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
            Truy cập các nghiệp vụ kiểm duyệt theo đúng dữ liệu và API của
            từng màn chức năng.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            TỔNG QUAN BÀI ĐĂNG
          </p>

          <h2 className="mt-1 text-xl font-black text-text">
            Bài đăng mới, trạng thái và bài bị báo cáo
          </h2>

          <p className="mt-1 text-sm text-textLight">
            Số liệu lấy từ tổng quan bài đăng dành cho kiểm duyệt. Việc xử lý từng bài
            bị báo cáo thực hiện tại màn Quản lý bài đăng.
          </p>
        </div>

        <ListingDashboardPanel loadDashboard={moderatorListingApi.getListingDashboard} />
      </section>

      <div className="rounded-2xl border border-primary/10 bg-primary/[0.035] px-5 py-4 text-sm leading-6 text-textLight">
        Trang này không tự ghép số liệu từ các API nghiệp vụ riêng lẻ để tạo
        KPI tổng hợp. Số lượng, trạng thái và bộ lọc của từng nghiệp vụ được
        hiển thị tại màn chức năng tương ứng.
      </div>

      <section>
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            KHU VỰC NGHIỆP VỤ
          </p>

          <h2 className="mt-1 text-xl font-black text-text">
            Chọn chức năng cần xử lý
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MODERATOR_AREAS.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="group rounded-2xl border border-border bg-white p-5 text-left shadow-[0_10px_28px_rgba(24,63,65,0.05)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_32px_rgba(24,63,65,0.08)]"
            >
              <span
                className="material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-xl bg-background text-[24px] text-primary"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <h3 className="mt-4 text-sm font-black text-text">
                {item.title}
              </h3>

              <p className="mt-2 min-h-10 text-xs leading-5 text-textLight">
                {item.description}
              </p>

              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-primary transition group-hover:gap-2">
                Mở chức năng
                <span
                  className="material-symbols-outlined text-[17px]"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

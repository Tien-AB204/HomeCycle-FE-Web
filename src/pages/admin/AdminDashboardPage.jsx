import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import adminPostApi from "../../services/apis/adminPostApi";
import adminUserApi from "../../services/apis/adminUserApi";

const QUICK_ACTIONS = [
  { title: "Quản lý người dùng", description: "Kiểm tra trạng thái và quyền truy cập tài khoản.", path: "/admin/users", icon: "manage_accounts" },
  { title: "Quản lý bài đăng", description: "Theo dõi nội dung đang hoạt động trên thị trường.", path: "/admin/posts", icon: "inventory_2" },
  { title: "Cấu hình sản phẩm", description: "Quản lý loại sản phẩm và các thuộc tính liên quan.", path: "/admin/product-types", icon: "tune" },
];

export default function AdminDashboardPage() {
  const [dashboardState, setDashboardState] = useState({
    loading: true,
    error: "",
    users: [],
    userTotal: 0,
    posts: [],
    postTotal: 0,
  });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      adminUserApi.getAllForManagement({ signal: controller.signal }),
      adminPostApi.getAllForManagement({ signal: controller.signal }),
    ])
      .then(([userResult, postResult]) => {
        setDashboardState({
          loading: false,
          error: "",
          users: userResult.items,
          userTotal: userResult.totalCount,
          posts: postResult.items,
          postTotal: postResult.totalCount,
        });
      })
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }

        setDashboardState((currentState) => ({
          ...currentState,
          loading: false,
          error:
            error?.response?.data?.message ||
            error?.response?.data?.error?.message ||
            error?.message ||
            "Không thể tải thống kê quản trị.",
        }));
      });

    return () => controller.abort();
  }, [requestVersion]);

  const handleRetry = () => {
    setDashboardState((currentState) => ({
      ...currentState,
      loading: true,
      error: "",
    }));
    setRequestVersion((currentVersion) => currentVersion + 1);
  };

  const stats = useMemo(() => {
    const normalizeStatus = (value) => String(value || "").trim().toLowerCase();
    const activeUsers = dashboardState.users.filter(
      (user) => normalizeStatus(user.status) === "active",
    ).length;
    const suspendedUsers = dashboardState.users.filter(
      (user) => normalizeStatus(user.status) === "suspended",
    ).length;
    const activePosts = dashboardState.posts.filter(
      (post) => normalizeStatus(post.status) === "active",
    ).length;
    const restrictedPosts = dashboardState.posts.filter((post) =>
      ["suspended", "closed", "deleted"].includes(normalizeStatus(post.status)),
    ).length;

    return [
      { title: "Tổng người dùng", value: dashboardState.userTotal, note: "Tất cả tài khoản trên hệ thống", icon: "group", accent: "bg-[#EAF4F1] text-[#36777A]" },
      { title: "Người dùng hoạt động", value: activeUsers, note: "Tài khoản đang được phép sử dụng", icon: "person_check", accent: "bg-[#EEF7F0] text-[#338058]" },
      { title: "Người dùng đã khóa", value: suspendedUsers, note: "Tài khoản đang bị tạm khóa", icon: "person_off", accent: "bg-[#FFF0EE] text-[#B7352D]" },
      { title: "Tổng bài đăng", value: dashboardState.postTotal, note: "Tin đăng bán và tin thu mua", icon: "inventory_2", accent: "bg-[#EAF2F8] text-[#2F6F9F]" },
      { title: "Bài đăng hoạt động", value: activePosts, note: "Nội dung đang hiển thị trên thị trường", icon: "task_alt", accent: "bg-[#EEF7F0] text-[#338058]" },
      { title: "Bài đăng đã hạn chế", value: restrictedPosts, note: "Đã đình chỉ, đóng hoặc xóa", icon: "block", accent: "bg-[#FFF4E6] text-[#B86B13]" },
    ];
  }, [dashboardState]);

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#183F41] via-[#285E62] to-[#2F6F9F] px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C8ECE7]">Trung tâm điều hành</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">Tổng quan hệ thống HomeCycle</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
          Theo dõi nhanh hoạt động nền tảng và truy cập các khu vực quản trị quan trọng.
        </p>
      </div>

      {dashboardState.error && (
        <div role="alert" className="flex flex-col justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <span>{dashboardState.error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-xl border border-red-300 bg-white px-4 py-2 font-black text-red-700 transition hover:bg-red-100"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <article key={item.title} className="rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.055)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#718987]">{item.title}</p>
                <p className="mt-3 text-3xl font-black text-[#183F41]">
                  {dashboardState.loading ? (
                    <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-[#E7EFED]" />
                  ) : (
                    new Intl.NumberFormat("vi-VN").format(item.value)
                  )}
                </p>
              </div>
              <span className={`material-symbols-outlined flex h-11 w-11 items-center justify-center rounded-xl text-[23px] ${item.accent}`} aria-hidden="true">
                {item.icon}
              </span>
            </div>
            <p className="mt-4 text-xs font-medium text-[#78908E]">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-[#DCE8E5] bg-white p-6 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
          <div className="border-b border-[#E4EDEA] pb-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6F9F]">Truy cập nhanh</p>
            <h3 className="mt-1 text-xl font-black text-[#183F41]">Công việc quản trị</h3>
          </div>
          <div className="mt-4 divide-y divide-[#E4EDEA]">
            {QUICK_ACTIONS.map((item) => (
              <Link key={item.path} to={item.path} className="group flex items-center gap-4 py-4 first:pt-1 last:pb-1">
                <span className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F4] text-[#36777A] transition group-hover:bg-[#2F6F9F] group-hover:text-white">
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-[#183F41]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#718987]">{item.description}</p>
                </div>
                <span className="material-symbols-outlined text-[#8AA09E] transition group-hover:translate-x-1 group-hover:text-[#2F6F9F]">arrow_forward</span>
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-[#CFE1DD] bg-[#EDF6F4] p-6 shadow-[0_10px_28px_rgba(24,63,65,0.04)]">
          <span className="material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#2F6F9F] shadow-sm">shield_person</span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#4F8588]">Phiên quản trị</p>
          <h3 className="mt-2 text-xl font-black text-[#183F41]">Hệ thống đang hoạt động</h3>
          <p className="mt-2 text-sm leading-6 text-[#5F7876]">
            Số liệu người dùng và bài đăng được tổng hợp trực tiếp từ dữ liệu quản trị hiện tại.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#CFE1DD] bg-white px-4 py-3 text-sm font-bold text-[#36777A]">
            <span className="material-symbols-outlined text-[19px]">check_circle</span>
            Kết nối quản trị an toàn
          </div>
        </aside>
      </div>
    </section>
  );
}

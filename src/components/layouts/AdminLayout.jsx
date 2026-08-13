import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";
import { useAuth } from "../../hooks/useAuth";

const ADMIN_NAV_GROUPS = [
  {
    group: "TỔNG QUAN",
    items: [
      { label: "Thống kê hệ thống", path: "/admin/dashboard", icon: "space_dashboard" },
    ],
  },
  {
    group: "DỮ LIỆU SẢN PHẨM",
    items: [
      { label: "Danh mục", path: "/admin/categories", icon: "category" },
      { label: "Thương hiệu", path: "/admin/brands", icon: "sell" },
      { label: "Loại và thuộc tính", path: "/admin/product-types", icon: "tune" },
    ],
  },
  {
    group: "VẬN HÀNH HỆ THỐNG",
    items: [
      { label: "Người dùng", path: "/admin/users", icon: "group" },
      { label: "Bài đăng", path: "/admin/posts", icon: "inventory_2" },
    ],
  },
];

const getDisplayName = (user) =>
  user?.fullName || user?.username || user?.email || "Quản trị viên";

const getCurrentPage = (pathname) =>
  ADMIN_NAV_GROUPS.flatMap((group) => group.items).find((item) =>
    pathname.startsWith(item.path),
  )?.label || "Trung tâm quản trị";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = getDisplayName(user);
  const avatarCharacter = displayName.trim().charAt(0).toUpperCase() || "A";

  const handleLogout = () => {
    logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="admin-portal flex min-h-screen bg-[#F4F7F6] text-[#183436]">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Đóng menu quản trị"
          className="fixed inset-0 z-30 bg-[#102F31]/45 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[278px] flex-col overflow-hidden bg-gradient-to-b from-[#183F41] via-[#205357] to-[#285E62] text-white shadow-[18px_0_48px_rgba(24,63,65,0.14)] transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-6 py-6">
          <NavLink
            to="/admin/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3"
          >
            <img src={homeCycleMark} alt="" className="h-11 w-11 rounded-xl border border-white/20 shadow-sm" />
            <div>
              <p className="text-lg font-black tracking-tight">HomeCycle</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFE0DC]">
                Admin Center
              </p>
            </div>
          </NavLink>
        </div>

        <nav aria-label="Điều hướng quản trị" className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-6">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin/dashboard"}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      [
                        "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition",
                        isActive
                          ? "bg-white text-[#245B60] shadow-[0_8px_22px_rgba(8,36,38,0.16)]"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                      ].join(" ")
                    }
                  >
                    <span className="material-symbols-outlined text-[21px]" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6F2F0] font-black text-[#285E62]">
              {avatarCharacter}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{displayName}</p>
              <p className="text-xs text-white/55">Quản trị viên</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white/75 transition hover:bg-red-400/10 hover:text-red-100"
          >
            <span className="material-symbols-outlined text-[19px]" aria-hidden="true">logout</span>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-[#DCE8E5] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Mở menu quản trị"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C9DCD8] text-[#285E62] lg:hidden"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6F9F]">Quản trị hệ thống</p>
              <h1 className="truncate text-lg font-black text-[#183F41]">{getCurrentPage(location.pathname)}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-bold text-[#183F41]">{displayName}</p>
              <p className="text-xs text-[#78908E]">Quản trị viên</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5F9291] font-black text-white shadow-sm">
              {avatarCharacter}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}

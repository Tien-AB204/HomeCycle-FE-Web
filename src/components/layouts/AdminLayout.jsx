import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const ADMIN_NAV_GROUPS = [
  {
    group: "TỔNG QUAN",
    items: [
      {
        label: "Thống kê hệ thống",
        path: "/admin/dashboard",
        icon: "📊",
      },
    ],
  },
  {
    group: "DANH MỤC & METADATA",
    items: [
      {
        label: "Quản lý danh mục",
        path: "/admin/categories",
        icon: "📁",
      },
      {
        label: "Quản lý thương hiệu",
        path: "/admin/brands",
        icon: "🏷️",
      },
      {
        label: "Loại SP & thuộc tính",
        path: "/admin/product-types",
        icon: "⚙️",
      },
    ],
  },
  {
    group: "QUẢN TRỊ HỆ THỐNG",
    items: [
      {
        label: "Quản lý người dùng",
        path: "/admin/users",
        icon: "👥",
      },
    ],
  },
];

const getDisplayName = (user) => {
  return user?.fullName || user?.username || user?.email || "Admin";
};

const getAvatarCharacter = (displayName) => {
  return displayName?.trim().charAt(0).toUpperCase() || "A";
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = getDisplayName(user);

  const avatarCharacter = getAvatarCharacter(displayName);

  const handleLogout = () => {
    logout();

    navigate("/auth/login", {
      replace: true,
    });
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="flex w-64 shrink-0 flex-col justify-between bg-slate-900 text-slate-300 shadow-xl">
        <div className="min-h-0">
          <div className="flex items-center gap-3 border-b border-slate-800 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-lg font-bold text-white shadow">
              HC
            </div>

            <div>
              <h2 className="text-base font-bold leading-none text-white">
                HomeCycle
              </h2>

              <span className="text-xs font-medium text-green-400">
                Admin Portal
              </span>
            </div>
          </div>

          <nav
            aria-label="Điều hướng quản trị"
            className="max-h-[calc(100vh-140px)] space-y-6 overflow-y-auto p-4"
          >
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.group} className="space-y-2">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.group}
                </p>

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/admin/dashboard"}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                          isActive
                            ? "bg-green-600 text-white shadow-md"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white",
                        ].join(" ")
                      }
                    >
                      <span aria-hidden="true" className="text-base">
                        {item.icon}
                      </span>

                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <span aria-hidden="true">🚪</span>

            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <div className="text-sm text-gray-500">
            Xin chào,{" "}
            <span className="font-semibold text-gray-800">{displayName}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                {avatarCharacter}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-gray-800">
                  {user?.username || user?.email || "admin_homecycle"}
                </p>

                <p className="text-[10px] text-gray-500">Quản trị viên</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

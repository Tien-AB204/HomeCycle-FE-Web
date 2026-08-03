// src/components/layouts/AdminLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth"; // Hook lấy thông tin user & hàm logout

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (logout) logout();
    navigate("/auth/login");
  };

  const navItems = [
    {
      group: "QUẢN LÝ DÂN CƯ & TÀI KHOẢN",
      items: [
        { label: "Thống kê hệ thống", path: "/admin/dashboard", icon: "📊" },
        { label: "Quản lý tài khoản", path: "/admin/users", icon: "👥" },
      ],
    },
    {
      group: "DANH MỤC & METADATA",
      items: [
        { label: "Quản lý Danh mục", path: "/admin/categories", icon: "📁" },
        { label: "Quản lý Thương hiệu", path: "/admin/brands", icon: "🏷️" },
        {
          label: "Loại SP & Thuộc tính",
          path: "/admin/product-types",
          icon: "⚙️",
        },
      ],
    },
    {
      group: "CẤU HÌNH HỆ THỐNG",
      items: [
        { label: "Gói dịch vụ", path: "/admin/packages", icon: "📦" },
        { label: "Cấu hình tích hợp", path: "/admin/integrations", icon: "🔌" },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shadow-xl">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-lg shadow">
              HC
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-none">
                HomeCycle
              </h2>
              <span className="text-xs text-green-400 font-medium">
                Admin Portal
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-green-600 text-white shadow-md"
                            : "hover:bg-slate-800 hover:text-white text-slate-400"
                        }`
                      }
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
          >
            <span>🚪</span> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
          <div className="text-sm text-gray-500">
            Xin chào,{' '}
            <span className="font-semibold text-gray-800">
              {user?.fullName || 'Admin'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-gray-800">
                  {user?.username || 'admin_homecycle'}
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

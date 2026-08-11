import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import {
  IdcardOutlined,
  ProfileOutlined,
  HomeOutlined,
  DashboardOutlined,
  LogoutOutlined
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";

const MODERATOR_NAV_ITEMS = [
  {
    name: "Tổng quan",
    path: "/mod/dashboard",
    icon: DashboardOutlined,
  },
  {
    name: "Duyệt hồ sơ",
    path: "/mod/verification",
    icon: IdcardOutlined,
  },
  {
    name: "Quản lý bài đăng",
    path: "/mod/posts",
    icon: ProfileOutlined,
  },
];

const ModLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();

    navigate("/auth/login", {
      replace: true,
    });
  };

  const handleGoHome = () => {
    navigate("/");
  };

  // Lấy thông tin hiển thị của Mod
  const username = user?.username || user?.Username || user?.name || "Moderator";
  const email = user?.email || user?.Email || "mod@homecycle.com";
  const displayInitial = username.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans">
      <aside className="z-20 flex w-[250px] shrink-0 flex-col bg-[#1a202c] text-white shadow-lg">
        
        {/* === LOGO === */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-b border-gray-800/50 px-6 py-6">
          <img 
            src="/logo-light-transparent.png" 
            alt="HomeCycle" 
            className="h-8 object-contain transition-transform hover:scale-105"
          />
          <span className="rounded bg-[#0aa679] px-3 py-0.5 text-[10px] font-bold text-white shadow-sm tracking-widest uppercase mt-1">
            Moderator
          </span>
        </div>

        {/* === MENU === */}
        <nav
          aria-label="Điều hướng kiểm duyệt"
          className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
        >
          {MODERATOR_NAV_ITEMS.map(
            (item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={({
                    isActive,
                  }) =>
                    [
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] transition-all",
                      isActive
                        ? "bg-[#0aa679] font-medium text-white shadow-md"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
                    ].join(" ")
                  }
                >
                  <Icon
                    aria-hidden="true"
                    className="text-lg"
                  />

                  <span>{item.name}</span>
                </NavLink>
              );
            },
          )}
        </nav>

        {/* === FOOTER: THÔNG TIN USER & NÚT ĐIỀU HƯỚNG === */}
        <div className="mt-auto border-t border-gray-800 p-4 flex flex-col gap-3">
          
          {/* Hiển thị Avatar chữ cái đầu, Username và Email của Mod */}
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <div className="w-9 h-9 shrink-0 rounded-full bg-[#0aa679] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {displayInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-200 truncate">{username}</p>
              <p className="text-[11px] text-gray-400 truncate">{email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoHome}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-600/50 bg-[#2d3748] py-2.5 text-sm font-medium text-gray-200 transition-colors hover:border-[#0aa679] hover:bg-[#0aa679] hover:text-white"
          >
            <HomeOutlined className="text-lg" />
            Về trang chủ
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600/90 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
          >
            <LogoutOutlined className="text-base" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="relative flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ModLayout;
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
    <div className="flex h-screen bg-[#F4F7F6] font-sans text-[#183436]">
      <aside className="z-20 flex w-[250px] shrink-0 flex-col bg-gradient-to-b from-[#183F41] via-[#205357] to-[#285E62] text-white shadow-[18px_0_48px_rgba(24,63,65,0.14)]">
        
        {/* === LOGO === */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-b border-white/10 px-6 py-6">
          <img 
            src="/logo-light-transparent.png" 
            alt="HomeCycle" 
            className="h-8 object-contain transition-transform hover:scale-105"
          />
          <span className="mt-1 rounded bg-white/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#BFE0DC] shadow-sm">
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
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-bold transition-all",
                      isActive
                        ? "bg-white text-[#245B60] shadow-[0_8px_22px_rgba(8,36,38,0.16)]"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
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
        <div className="mt-auto flex flex-col gap-3 border-t border-white/10 p-4">
          
          {/* Hiển thị Avatar chữ cái đầu, Username và Email của Mod */}
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6F2F0] text-sm font-black text-[#285E62]">
              {displayInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{username}</p>
              <p className="truncate text-[11px] text-white/55">{email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoHome}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 py-2.5 text-sm font-bold text-white/75 transition hover:bg-white/15 hover:text-white"
          >
            <HomeOutlined className="text-lg" />
            Về trang chủ
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm font-bold text-white/75 transition hover:bg-red-400/10 hover:text-red-100"
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
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROLES } from "../../constants/roles"; // Thêm dòng này để lấy quyền

const MainLayout = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const displayName =
    user?.fullName ||
    user?.FullName ||
    user?.username ||
    user?.Username ||
    user?.name ||
    user?.Name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "Trang cá nhân";
  const displayInitial = displayName.charAt(0).toUpperCase();

  const navigationItems = [
    { name: "Trang chủ", icon: "🏠", path: "/" },
    { name: "Tin đăng bán", icon: "📦", path: "/tin-dang-ban" },
    { name: "Tin thu mua", icon: "🤝", path: "/tin-thu-mua" },
    { name: "Thương lượng", icon: "💬", path: "/thuong-luong" },
    { name: "Lịch hẹn", icon: "📅", path: "/lich-hen" },
    { name: "Thanh toán", icon: "💳", path: "/thanh-toan" },
    { name: "Đơn hàng", icon: "📋", path: "/don-hang" },
    { name: "Thông báo", icon: "🔔", path: "/thong-bao" },
    { name: "Hồ sơ", icon: "👤", path: "/ho-so" },
  ];

  return (
    <div className="min-h-screen bg-[#D9DADA] flex flex-col font-sans">
      <header className="bg-[#172830] text-[#BAC2C1] py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-3xl font-semibold text-[#E1FEFF] tracking-wide"
          >
            HomeCycle
          </Link>

          <div className="flex items-center gap-4 text-sm font-semibold">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/auth/login"
                  className="text-white hover:text-[#BAC2C1] transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/auth/register"
                  className="bg-[#2B5659] text-white px-6 py-2 rounded-md hover:bg-[#547B7D] transition"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                {/* NÚT ĐẶC QUYỀN DÀNH RIÊNG CHO MODERATOR HOẶC ADMIN */}
                {(user?.role === ROLES.MODERATOR || user?.role === ROLES.ADMIN) && (
                  <Link
                    to={user?.role === ROLES.MODERATOR ? "/mod/dashboard" : "/admin/dashboard"}
                    className="bg-[#0aa679] text-white px-4 py-2 rounded-md hover:bg-[#088c66] transition flex items-center gap-2 shadow-sm"
                  >
                    <span>Quay lại {user?.role === ROLES.MODERATOR ? "Mod" : "Admin"} Dashboard</span>
                  </Link>
                )}

                <Link
                  to={
                    user?.role === ROLES.MODERATOR ? "/mod/dashboard" : 
                    user?.role === ROLES.ADMIN ? "/admin/dashboard" : 
                    "/ho-so" // Hoặc trang đích mặc định của User thường
                  }
                  className="text-white hover:underline transition flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-[#547B7D] flex items-center justify-center text-white font-bold shadow-sm border border-[#BAC2C1]/30">
                    {displayInitial}
                  </div>
                  <span className="max-w-[150px] truncate">{displayName}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-[#7A1012] text-white px-4 py-2 rounded-md hover:bg-red-700 transition shadow-sm"
                >
                  Đăng xuất
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-4 lg:px-6 lg:py-6 flex flex-col lg:flex-row gap-4 lg:gap-5">
          {isAuthenticated && (
            <aside className="w-full lg:w-58 shrink-0 bg-white border border-[#BAC2C1]/30 rounded-2xl shadow-sm py-4 h-fit sticky top-20 lg:order-first">
              <nav className="px-2 space-y-1.5">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-4 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-left group ${
                        isActive
                          ? "bg-[#2B5659] text-white shadow-sm"
                          : "text-[#172830]/80 hover:bg-[#BAC2C1]/20 hover:text-[#2B5659]"
                      }`
                    }
                  >
                    <span className="text-lg opacity-90 group-hover:scale-105 transition-transform">
                      {item.icon}
                    </span>
                    <span className="tracking-wide">{item.name}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>
          )}

          <div className="flex-1 min-w-0 lg:pl-1">
            <Outlet />
          </div>
        </div>
      </main>

      <footer className="bg-[#172830] text-[#BAC2C1] py-8 border-t border-[#2B5659]/50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">HomeCycle</h2>
            <p>© 2026 HomeCycle Marketplace. All rights reserved.</p>
          </div>
          <div className="flex gap-6 font-medium">
            <Link to="#" className="hover:text-white">
              About Us
            </Link>
            <Link to="#" className="hover:text-white">
              Safety Guide
            </Link>
            <Link to="#" className="hover:text-white">
              Terms of Service
            </Link>
            <Link to="#" className="hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;

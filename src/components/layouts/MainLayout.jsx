import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import homeCycleLogo from "../../assets/brand/homecycle-logo.png";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { normalizeRole } from "../../utils/authUtils";

const PUBLIC_NAVIGATION = [
  { name: "Trang chủ", path: "/" },
  { name: "Tin đăng bán", path: "/tin-dang-ban" },
  { name: "Tin thu mua", path: "/tin-thu-mua" },
];

const ACCOUNT_NAVIGATION = [
  { name: "Đề nghị", path: "/thuong-luong", end: true },
  {
    name: "Phòng thương lượng",
    path: "/thuong-luong/phien",
    activePrefix: "/thuong-luong/",
  },
  { name: "Lịch hẹn", path: "/lich-hen" },
  { name: "Đơn hàng", path: "/don-hang" },
  { name: "Thanh toán", path: "/thanh-toan" },
  { name: "Ví", path: "/vi" },
  { name: "Hồ sơ", path: "/ho-so" },
];

const Logo = ({ compact = false }) => {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-xl bg-primary shadow-sm ${
        compact ? "h-11 w-40" : "h-14 w-48"
      }`}
    >
      <img
        src={homeCycleLogo}
        alt="HomeCycle"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
    </span>
  );
};

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [keyword, setKeyword] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const preferredDisplayName =
    user?.fullName ||
    user?.FullName ||
    user?.representativeName ||
    user?.displayName ||
    "";
  const username =
    user?.username ||
    user?.Username ||
    user?.name ||
    user?.Name ||
    "";
  const displayName =
    preferredDisplayName ||
    (!username.includes("@") ? username : "") ||
    "Tài khoản của tôi";
  const displayInitial = displayName.charAt(0).toUpperCase();
  const normalizedRole = normalizeRole(user?.role);
  const isManager =
    normalizedRole === ROLES.MODERATOR || normalizedRole === ROLES.ADMIN;
  const managerPath =
    normalizedRole === ROLES.MODERATOR ? "/mod/dashboard" : "/admin/dashboard";
  const roleBasedPublicNavigation = PUBLIC_NAVIGATION.filter((item) => {
    if (normalizedRole === ROLES.PERSONAL) {
      return item.path !== "/tin-thu-mua";
    }

    if (normalizedRole === ROLES.BUSINESS) {
      return item.path !== "/tin-dang-ban";
    }

    return true;
  });
  const canUseClientAccount = isAuthenticated && !isManager;
  const navigationItems = canUseClientAccount
    ? [...roleBasedPublicNavigation, ...ACCOUNT_NAVIGATION]
    : PUBLIC_NAVIGATION;
  const createPostLabel =
    normalizedRole === ROLES.PERSONAL
      ? "Đăng tin bán"
      : normalizedRole === ROLES.BUSINESS
        ? "Đăng tin thu mua"
        : "Đăng tin";

  const handleSearch = (event) => {
    event.preventDefault();
    const searchParams = new URLSearchParams();
    const normalizedKeyword = keyword.trim();

    if (normalizedKeyword) {
      searchParams.set("keyword", normalizedKeyword);
    }

    searchParams.set("showFilter", "0");
    navigate(`/search?${searchParams.toString()}`);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate("/");
  };

  const closeMenu = () => setIsMenuOpen(false);

  const isNavigationItemActive = (item, isActive) => {
    return (
      isActive ||
      Boolean(
        item.activePrefix &&
          location.pathname.startsWith(item.activePrefix),
      )
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-text">
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-center text-xs font-medium sm:text-sm">
          <span>Mua bán đồ cũ an toàn · Cho đồ vật một vòng đời mới</span>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border bg-white/95 shadow-[0_4px_24px_rgba(23,40,48,0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" onClick={closeMenu} aria-label="Về trang chủ HomeCycle">
            <Logo />
          </Link>

          <form
            onSubmit={handleSearch}
            className="hidden min-w-0 flex-1 items-center overflow-hidden rounded-full border border-border bg-background transition focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 md:flex"
          >
            <span className="pl-5 text-textLight" aria-hidden="true">
              ⌕
            </span>
            <label htmlFor="header-search" className="sr-only">
              Tìm kiếm sản phẩm
            </label>
            <input
              id="header-search"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Bạn muốn tìm sản phẩm gì?"
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-text outline-none placeholder:text-textLight"
            />
            <button
              type="submit"
              className="m-1.5 rounded-full border border-primary bg-white px-5 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="ml-auto hidden shrink-0 items-center gap-3 lg:flex">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/auth/login"
                  className="rounded-full px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-background"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/auth/register"
                  className="rounded-full border border-primary px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-background"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                {isManager && (
                  <Link
                    to={managerPath}
                    className="rounded-full bg-background px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-white"
                  >
                    Trang quản trị
                  </Link>
                )}
                {canUseClientAccount && (
                  <Link
                    to="/thong-bao"
                    aria-label={
                      unreadCount > 0
                        ? "Thông báo, " + unreadCount + " chưa đọc"
                        : "Thông báo"
                    }
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary shadow-sm transition hover:bg-background"
                  >
                    <span
                      className="material-symbols-outlined text-[22px]"
                      aria-hidden="true"
                    >
                      notifications
                    </span>

                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-error px-1 text-[10px] font-black leading-none text-white">
                        {unreadCount > 99
                          ? "99+"
                          : unreadCount}
                      </span>
                    )}
                  </Link>
                )}

                <div className="flex items-center overflow-hidden rounded-full border border-border bg-white shadow-sm">
                  <Link
                    to={isManager ? managerPath : "/ho-so"}
                    className="flex max-w-[180px] items-center gap-2 py-1.5 pl-1.5 pr-3 text-sm font-bold text-primary transition hover:bg-background"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      {displayInitial}
                    </span>
                    <span className="truncate">{displayName}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="self-stretch border-l border-border px-3 text-xs font-bold text-textLight transition hover:bg-error/10 hover:text-error"
                  >
                    Đăng xuất
                  </button>
                </div>
              </>
            )}

            <Link
              to={isAuthenticated ? "/bai-dang/tao-moi" : "/auth/login"}
                hidden={isManager}
              state={
                isAuthenticated
                  ? undefined
                  : { from: "/bai-dang/tao-moi" }
              }
              className="rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md"
            >
              ＋ {createPostLabel}
            </Link>
          </div>

          <button
            type="button"
            aria-label={isMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl text-primary lg:hidden"
          >
            {isMenuOpen ? "×" : "☰"}
          </button>
        </div>

        <nav className="hidden border-t border-border lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end ?? item.path === "/"}
                className={({ isActive }) =>
                  `shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${
                    isNavigationItemActive(item, isActive)
                      ? "border-primary text-primary"
                      : "border-transparent text-textLight hover:text-primary"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>

        {isMenuOpen && (
          <div className="border-t border-border bg-white px-4 py-4 shadow-xl lg:hidden">
            <form onSubmit={handleSearch} className="flex overflow-hidden rounded-full border border-border bg-background md:hidden">
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
              />
              <button type="submit" className="border-l border-primary bg-white px-4 text-sm font-bold text-primary transition hover:bg-primary hover:text-white">
                Tìm
              </button>
            </form>

            <nav className="mt-3 grid gap-1 sm:grid-cols-2">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end ?? item.path === "/"}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-sm font-bold ${
                      isNavigationItemActive(item, isActive)
                        ? "bg-background text-primary"
                        : "text-textLight hover:bg-background"
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {!isAuthenticated ? (
                <>
                  <Link to="/auth/login" onClick={closeMenu} className="rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary">
                    Đăng nhập
                  </Link>
                  <Link to="/auth/register" onClick={closeMenu} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white">
                    Đăng ký
                  </Link>
                </>
              ) : (
                <>
                  {canUseClientAccount && (
                    <Link
                      to="/thong-bao"
                      onClick={closeMenu}
                      className="relative flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-primary"
                    >
                      <span
                        className="material-symbols-outlined text-[19px]"
                        aria-hidden="true"
                      >
                        notifications
                      </span>

                      <span>Thông báo</span>

                      {unreadCount > 0 && (
                        <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-black text-white">
                          {unreadCount > 99
                            ? "99+"
                            : unreadCount}
                        </span>
                      )}
                    </Link>
                  )}

                  {isManager && (
                    <Link to={managerPath} onClick={closeMenu} className="rounded-full bg-background px-4 py-2 text-sm font-bold text-primary">
                      Trang quản trị
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout} className="rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-textLight transition hover:border-error/30 hover:bg-error/10 hover:text-error">
                    Đăng xuất
                  </button>
                </>
              )}
              <Link
                to={isAuthenticated ? "/bai-dang/tao-moi" : "/auth/login"}
                hidden={isManager}
                state={
                  isAuthenticated
                    ? undefined
                    : { from: "/bai-dang/tao-moi" }
                }
                onClick={closeMenu}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white"
              >
                ＋ {createPostLabel}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="min-w-0 flex-grow">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-border bg-primary text-white/80">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" aria-label="Về trang chủ HomeCycle">
              <Logo compact />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Nền tảng kết nối mua bán đồ đã qua sử dụng, giúp giao dịch minh bạch hơn và kéo dài vòng đời của từng sản phẩm.
            </p>
          </div>

          <div>
            <h2 className="font-extrabold text-white">Khám phá</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <Link to="/tin-dang-ban" className="hover:text-white">Tin đăng bán</Link>
              <Link to="/tin-thu-mua" className="hover:text-white">Tin thu mua</Link>
              <Link to="/search" className="hover:text-white">Tìm kiếm sản phẩm</Link>
            </div>
          </div>

          <div className={isManager ? "hidden" : ""}>
            <h2 className="font-extrabold text-white">Tài khoản</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <Link
                to={isAuthenticated ? "/ho-so" : "/auth/login"}
                state={isAuthenticated ? undefined : { from: "/ho-so" }}
                className="hover:text-white"
              >
                Hồ sơ của tôi
              </Link>
              <Link
                to={isAuthenticated ? "/thuong-luong" : "/auth/login"}
                state={isAuthenticated ? undefined : { from: "/thuong-luong" }}
                className="hover:text-white"
              >
                Đề nghị giá
              </Link>
              <Link
                to={isAuthenticated ? "/thuong-luong/phien" : "/auth/login"}
                state={
                  isAuthenticated
                    ? undefined
                    : { from: "/thuong-luong/phien" }
                }
                className="hover:text-white"
              >
                Phòng thương lượng
              </Link>
              <Link
                to={isAuthenticated ? "/don-hang" : "/auth/login"}
                state={isAuthenticated ? undefined : { from: "/don-hang" }}
                className="hover:text-white"
              >
                Đơn hàng
              </Link>
            </div>
          </div>

          <div>
            <h2 className="font-extrabold text-white">HomeCycle</h2>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              <span>Giao dịch có thương lượng</span>
              <span>Thông tin minh bạch</span>
              <span>Tiêu dùng bền vững</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 HomeCycle. Mọi quyền được bảo lưu.</p>
            <p>Trao giá trị cũ · Tạo tương lai xanh</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;

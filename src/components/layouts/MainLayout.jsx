import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import homeCycleLogo from "../../assets/brand/homecycle-logo.png";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
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
  { name: "Thanh toán", path: "/thanh-toan" },
  { name: "Đơn hàng", path: "/don-hang" },
  { name: "Hồ sơ", path: "/ho-so" },
];

const Logo = ({ compact = false }) => {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-xl bg-[#5F9291] shadow-sm ${
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
  const navigationItems = isAuthenticated
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
    <div className="flex min-h-screen flex-col bg-[#f7f8f6] font-sans text-[#183436]">
      <div className="bg-[#244f51] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium sm:text-sm">
          <img src={homeCycleMark} alt="" className="h-5 w-5 rounded-md" />
          <span>Mua bán đồ cũ an toàn · Cho đồ vật một vòng đời mới</span>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-[#dce8e4] bg-white/95 shadow-[0_4px_24px_rgba(27,73,74,0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" onClick={closeMenu} aria-label="Về trang chủ HomeCycle">
            <Logo />
          </Link>

          <form
            onSubmit={handleSearch}
            className="hidden min-w-0 flex-1 items-center overflow-hidden rounded-full border border-[#cbded9] bg-[#f4f8f6] transition focus-within:border-[#5f9291] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#5f9291]/10 md:flex"
          >
            <span className="pl-5 text-[#5f7b7a]" aria-hidden="true">
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
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#183436] outline-none placeholder:text-[#78908f]"
            />
            <button
              type="submit"
              className="m-1.5 rounded-full border border-[#4f8588] bg-white px-5 py-2 text-sm font-bold text-[#2f686c] transition hover:bg-[#4f8588] hover:text-white"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="ml-auto hidden shrink-0 items-center gap-3 lg:flex">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/auth/login"
                  className="rounded-full px-4 py-2.5 text-sm font-bold text-[#244f51] transition hover:bg-[#edf5f2]"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/auth/register"
                  className="rounded-full border border-[#5f9291] px-4 py-2.5 text-sm font-bold text-[#244f51] transition hover:bg-[#edf5f2]"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                {isManager && (
                  <Link
                    to={managerPath}
                    className="rounded-full bg-[#edf5f2] px-4 py-2.5 text-sm font-bold text-[#244f51] transition hover:bg-[#dcebe6]"
                  >
                    Trang quản trị
                  </Link>
                )}
                <div className="flex items-center overflow-hidden rounded-full border border-[#d7e5e2] bg-white shadow-sm">
                  <Link
                    to={isManager ? managerPath : "/ho-so"}
                    className="flex max-w-[180px] items-center gap-2 py-1.5 pl-1.5 pr-3 text-sm font-bold text-[#244f51] transition hover:bg-[#f1f6f4]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5f9291] text-white">
                      {displayInitial}
                    </span>
                    <span className="truncate">{displayName}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="self-stretch border-l border-[#d7e5e2] px-3 text-xs font-bold text-[#617876] transition hover:bg-red-50 hover:text-[#a74334]"
                  >
                    Đăng xuất
                  </button>
                </div>
              </>
            )}

            <Link
              to={isAuthenticated ? "/bai-dang/tao-moi" : "/auth/login"}
              state={
                isAuthenticated
                  ? undefined
                  : { from: "/bai-dang/tao-moi" }
              }
              className="rounded-full bg-[#4f8588] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#356a70] hover:shadow-md"
            >
              ＋ {createPostLabel}
            </Link>
          </div>

          <button
            type="button"
            aria-label={isMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#cbded9] text-xl text-[#244f51] lg:hidden"
          >
            {isMenuOpen ? "×" : "☰"}
          </button>
        </div>

        <nav className="hidden border-t border-[#edf2f0] lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end ?? item.path === "/"}
                className={({ isActive }) =>
                  `shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${
                    isNavigationItemActive(item, isActive)
                      ? "border-[#4f8588] text-[#244f51]"
                      : "border-transparent text-[#587170] hover:text-[#244f51]"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>

        {isMenuOpen && (
          <div className="border-t border-[#edf2f0] bg-white px-4 py-4 shadow-xl lg:hidden">
            <form onSubmit={handleSearch} className="flex overflow-hidden rounded-full border border-[#cbded9] bg-[#f4f8f6] md:hidden">
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
              />
              <button type="submit" className="border-l border-[#4f8588] bg-white px-4 text-sm font-bold text-[#2f686c] transition hover:bg-[#4f8588] hover:text-white">
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
                        ? "bg-[#e5f1ed] text-[#244f51]"
                        : "text-[#587170] hover:bg-[#f4f8f6]"
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#edf2f0] pt-3">
              {!isAuthenticated ? (
                <>
                  <Link to="/auth/login" onClick={closeMenu} className="rounded-full border border-[#5f9291] px-4 py-2 text-sm font-bold text-[#244f51]">
                    Đăng nhập
                  </Link>
                  <Link to="/auth/register" onClick={closeMenu} className="rounded-full bg-[#244f51] px-4 py-2 text-sm font-bold text-white">
                    Đăng ký
                  </Link>
                </>
              ) : (
                <>
                  {isManager && (
                    <Link to={managerPath} onClick={closeMenu} className="rounded-full bg-[#e5f1ed] px-4 py-2 text-sm font-bold text-[#244f51]">
                      Trang quản trị
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout} className="rounded-full border border-[#cbded9] bg-white px-4 py-2 text-sm font-bold text-[#587170] transition hover:border-[#d8aaa2] hover:bg-red-50 hover:text-[#a74334]">
                    Đăng xuất
                  </button>
                </>
              )}
              <Link
                to={isAuthenticated ? "/bai-dang/tao-moi" : "/auth/login"}
                state={
                  isAuthenticated
                    ? undefined
                    : { from: "/bai-dang/tao-moi" }
                }
                onClick={closeMenu}
                className="rounded-full bg-[#4f8588] px-4 py-2 text-sm font-bold text-white"
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

      <footer className="mt-auto border-t border-[#dbe8e4] bg-[#183f41] text-[#dbeae7]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" aria-label="Về trang chủ HomeCycle">
              <Logo compact />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#bad0cc]">
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

          <div>
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
            <div className="mt-4 grid gap-3 text-sm text-[#bad0cc]">
              <span>Giao dịch có thương lượng</span>
              <span>Thông tin minh bạch</span>
              <span>Tiêu dùng bền vững</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-[#9fbbb7] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 HomeCycle Marketplace. All rights reserved.</p>
            <p>Trao giá trị cũ · Tạo tương lai xanh</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";
import { useAuth } from "../../hooks/useAuth";

const getDisplayName = (user, fallbackName) =>
  user?.fullName || user?.username || user?.email || fallbackName;

const getCurrentPage = (pathname, navGroups, fallbackLabel) =>
  navGroups.flatMap((group) => group.items).find((item) =>
    pathname.startsWith(item.path),
  )?.label || fallbackLabel;

export default function ManagementPortalLayout({
  navGroups,
  dashboardPath,
  centerLabel,
  headerLabel,
  roleLabel,
  defaultPageLabel,
  fallbackDisplayName,
  fallbackInitial,
  navAriaLabel,
  openMenuAriaLabel,
  closeMenuAriaLabel,
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed,
  ] = useState(false);

  const displayName =
    getDisplayName(user, fallbackDisplayName);

  const avatarCharacter =
    String(displayName)
      .trim()
      .charAt(0)
      .toUpperCase() || fallbackInitial;

  const currentPage = getCurrentPage(
    location.pathname,
    navGroups,
    defaultPageLabel,
  );

  const handleLogout = () => {
    logout();
    navigate("/auth/login", {
      replace: true,
    });
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="admin-portal management-portal flex min-h-screen bg-background text-text">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label={closeMenuAriaLabel}
          className="fixed inset-0 z-30 bg-primary/40 lg:hidden"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex h-screen w-[278px] flex-col overflow-visible bg-primary text-white shadow-[18px_0_48px_rgba(23,40,48,0.14)] transition-all duration-200",
          "lg:sticky lg:top-0 lg:translate-x-0",
          desktopSidebarCollapsed
            ? "lg:w-[88px]"
            : "lg:w-[278px]",
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() =>
            setDesktopSidebarCollapsed(
              (current) => !current,
            )
          }
          aria-label={
            desktopSidebarCollapsed
              ? "Mở rộng thanh điều hướng"
              : "Thu gọn thanh điều hướng"
          }
          title={
            desktopSidebarCollapsed
              ? "Mở rộng thanh điều hướng"
              : "Thu gọn thanh điều hướng"
          }
          className="absolute -right-3 top-[82px] z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-primary shadow-md transition hover:bg-background lg:flex"
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden="true"
          >
            {desktopSidebarCollapsed
              ? "chevron_right"
              : "chevron_left"}
          </span>
        </button>

        <div
          className={[
            "shrink-0 border-b border-white/10 py-5 transition-all",
            desktopSidebarCollapsed
              ? "lg:px-3"
              : "px-6",
          ].join(" ")}
        >
          <NavLink
            to={dashboardPath}
            onClick={() =>
              setMobileMenuOpen(false)
            }
            title={
              desktopSidebarCollapsed
                ? "HomeCycle"
                : undefined
            }
            className={[
              "flex items-center gap-3",
              desktopSidebarCollapsed
                ? "lg:justify-center"
                : "",
            ].join(" ")}
          >
            <img
              src={homeCycleMark}
              alt="HomeCycle"
              className="h-11 w-11 shrink-0 rounded-xl border border-white/20 shadow-sm"
            />

            <div
              className={
                desktopSidebarCollapsed
                  ? "lg:hidden"
                  : ""
              }
            >
              <p className="text-lg font-black tracking-tight">
                HomeCycle
              </p>

              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                {centerLabel}
              </p>
            </div>
          </NavLink>
        </div>

        <nav
          aria-label={navAriaLabel}
          className={[
            "min-h-0 flex-1 space-y-4 overflow-y-auto py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']",
            desktopSidebarCollapsed
              ? "lg:px-2"
              : "px-4",
          ].join(" ")}
        >
          {navGroups.map((group) => (
            <div key={group.group}>
              <p
                className={[
                  "mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45",
                  desktopSidebarCollapsed
                    ? "lg:hidden"
                    : "",
                ].join(" ")}
              >
                {group.group}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={
                      item.path ===
                      dashboardPath
                    }
                    title={
                      desktopSidebarCollapsed
                        ? item.label
                        : undefined
                    }
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className={({ isActive }) =>
                      [
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                        desktopSidebarCollapsed
                          ? "lg:justify-center lg:px-2"
                          : "",
                        isActive
                          ? "bg-white text-primary shadow-[0_8px_22px_rgba(23,40,48,0.12)]"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                      ].join(" ")
                    }
                  >
                    <span
                      className="material-symbols-outlined shrink-0 text-[21px]"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>

                    <span
                      className={
                        desktopSidebarCollapsed
                          ? "lg:hidden"
                          : ""
                      }
                    >
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={[
            "shrink-0 border-t border-white/10 transition-all",
            desktopSidebarCollapsed
              ? "p-2"
              : "p-4",
          ].join(" ")}
        >
          <div
            className={[
              "mb-3 flex items-center gap-3 rounded-xl bg-white/10 p-3",
              desktopSidebarCollapsed
                ? "lg:justify-center lg:px-2"
                : "",
            ].join(" ")}
            title={
              desktopSidebarCollapsed
                ? displayName
                : undefined
            }
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 font-black text-white">
              {avatarCharacter}
            </div>

            <div
              className={[
                "min-w-0 flex-1",
                desktopSidebarCollapsed
                  ? "lg:hidden"
                  : "",
              ].join(" ")}
            >
              <p className="truncate text-sm font-bold text-white">
                {displayName}
              </p>

              <p className="text-xs text-white/55">
                {roleLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleGoHome}
              title={
                desktopSidebarCollapsed
                  ? "Về trang chủ"
                  : undefined
              }
              className={[
                "flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white",
                desktopSidebarCollapsed
                  ? "lg:px-2"
                  : "",
              ].join(" ")}
            >
              <span
                className="material-symbols-outlined shrink-0 text-[19px]"
                aria-hidden="true"
              >
                home
              </span>

              <span
                className={
                  desktopSidebarCollapsed
                    ? "lg:hidden"
                    : ""
                }
              >
                Về trang chủ
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title={
                desktopSidebarCollapsed
                  ? "Đăng xuất"
                  : undefined
              }
              className={[
                "flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white/75 transition hover:bg-error/10 hover:text-white",
                desktopSidebarCollapsed
                  ? "lg:px-2"
                  : "",
              ].join(" ")}
            >
              <span
                className="material-symbols-outlined shrink-0 text-[19px]"
                aria-hidden="true"
              >
                logout
              </span>

              <span
                className={
                  desktopSidebarCollapsed
                    ? "lg:hidden"
                    : ""
                }
              >
                Đăng xuất
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={openMenuAriaLabel}
              onClick={() =>
                setMobileMenuOpen(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-primary lg:hidden"
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                menu
              </span>
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-textLight">
                {headerLabel}
              </p>

              <h1 className="truncate text-lg font-black text-text">
                {currentPage}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-bold text-text">
                {displayName}
              </p>

              <p className="text-xs text-textLight">
                {roleLabel}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-black text-white shadow-sm">
              {avatarCharacter}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
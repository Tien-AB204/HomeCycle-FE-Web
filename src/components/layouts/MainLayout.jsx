import { useEffect, useState } from "react";
import { Drawer, Dropdown } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import homeCycleLogo from "../../assets/brand/homecycle-logo.png";
import { ROLES } from "../../constants/roles";
import { getClientEntryPath, getClientPage, MARKETPLACE_NAVIGATION } from "../../constants/clientNavigation";
import { useAuth } from "../../hooks/useAuth";
import subscriptionApi from "../../services/apis/subscriptionApi";
import { normalizeRole } from "../../utils/authUtils";
import Avatar from "../shared/Avatar";
import NotificationBell from "../shared/NotificationBell";
import ClientNavigation from "./ClientNavigation";

const Icon = ({ name }) => <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [vipState, setVipState] = useState({ active: false, expiresAt: null });
  const role = normalizeRole(user?.role);
  const clientEntryPath = getClientEntryPath(role);
  const isManager = role === ROLES.MODERATOR || role === ROLES.ADMIN;
  const canUseClientAccount = isAuthenticated && !isManager;
  const managerPath = role === ROLES.MODERATOR ? "/mod/dashboard" : "/admin/dashboard";
  const displayName = user?.fullName || user?.FullName || user?.representativeName ||
    user?.displayName || user?.username || user?.Username || user?.name || "Tài khoản";
  const clientPage = canUseClientAccount ? getClientPage(location, role) : null;
  const createLabel = role === ROLES.BUSINESS ? "Đăng tin thu mua" : role === ROLES.PERSONAL ? "Đăng tin bán" : "Đăng tin";
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!canUseClientAccount) return undefined;
    let active = true;
    const controller = new AbortController();
    const loadSubscription = () => {
      subscriptionApi.getMySubscription({ signal: controller.signal })
        .then((subscription) => {
          if (!active) return;
          const expiresAt = subscription?.expiresAt || null;
          setVipState({
            active: String(subscription?.status || "").toLowerCase() === "active" && Date.parse(expiresAt) > Date.now(),
            expiresAt,
          });
        })
        .catch((error) => {
          if (active && error?.code !== "ERR_CANCELED") setVipState({ active: false, expiresAt: null });
        });
    };
    loadSubscription();
    window.addEventListener("homecycle:subscription-changed", loadSubscription);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("homecycle:subscription-changed", loadSubscription);
    };
  }, [canUseClientAccount, user?.userId, user?.id]);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };
  const handleSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams({ showFilter: "0" });
    if (keyword.trim()) params.set("keyword", keyword.trim());
    navigate("/search?" + params);
    closeMenu();
  };
  const accountMenu = {
    items: [
      { key: "manage", label: <Link to={isManager ? managerPath : clientEntryPath}>{isManager ? "Trang quản trị" : "Quản lý của tôi"}</Link>, icon: <Icon name="space_dashboard" /> },
      ...(!isManager ? [{ key: "profile", label: <Link to="/ho-so">Hồ sơ của tôi</Link>, icon: <Icon name="person" /> }] : []),
      { type: "divider" },
      { key: "logout", label: "Đăng xuất", icon: <Icon name="logout" />, danger: true, onClick: handleLogout },
    ],
  };
  const marketplaceLinks = (mobile = false) => MARKETPLACE_NAVIGATION.map((item) => {
    const active = !clientPage && location.pathname === item.path.split("?")[0];
    return <Link key={item.path} to={item.path} onClick={closeMenu}
      aria-current={active ? "page" : undefined}
      className={(mobile ? "hc-sidebar-link" : "hc-market-link") + (active ? " is-active" : "")}>
      {mobile && <Icon name={item.icon} />}{item.name}
    </Link>;
  });

  return (
    <div className={"hc-app" + (clientPage ? " hc-app-workspace" : "")}>
      <a href="#hc-content" className="hc-skip-link">Đến nội dung chính</a>
      <header className="hc-header">
        <div className="hc-announcement">
          Mua bán đồ cũ an toàn · Cho đồ vật một vòng đời mới
        </div>
        <div className="hc-header-inner">
          <button type="button" className="hc-icon-button hc-menu-toggle" aria-label="Mở menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
          <Link to="/" aria-label="HomeCycle - Trang chủ" className="hc-logo"><img src={homeCycleLogo} alt="HomeCycle" /></Link>
          <form onSubmit={handleSearch} className="hc-search" role="search">
            <Icon name="search" />
            <label htmlFor="hc-search" className="sr-only">Tìm kiếm sản phẩm</label>
            <input id="hc-search" type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm đồ dùng cho ngôi nhà của bạn" />
            <button type="submit" aria-label="Tìm kiếm">
              <span className="hc-search-submit-label">Tìm kiếm</span>
              <Icon name="arrow_forward" />
            </button>
          </form>
          <div className="hc-header-actions">
            {canUseClientAccount && <>
              <Link to="/gio-hang" className="hc-icon-button hc-cart" aria-label="Giỏ hàng" title="Giỏ hàng"><Icon name="shopping_cart" /></Link>
              <Link to="/thuong-luong/phien" className="hc-icon-button" aria-label="Phòng thương lượng" title="Phòng thương lượng"><Icon name="chat_bubble" /></Link>
              <NotificationBell allNotificationsPath="/thong-bao" />
            </>}
            {isAuthenticated ? (
              <Dropdown menu={accountMenu} trigger={["click"]} placement="bottomRight">
                <button type="button" className="hc-account-button" aria-label={"Menu tài khoản " + displayName}>
                  <Avatar src={user?.avatarUrl} alt={displayName} className="h-8 w-8 shrink-0" />
                  <span className="hc-account-name">{displayName}</span>
                  {canUseClientAccount && vipState.active && <span title={"VIP đến " + new Date(vipState.expiresAt).toLocaleDateString("vi-VN")} className="hc-vip"><Icon name="workspace_premium" /></span>}
                  <Icon name="expand_more" />
                </button>
              </Dropdown>
            ) : <div className="hc-auth-links"><Link to="/auth/login">Đăng nhập</Link><Link to="/auth/register">Đăng ký</Link></div>}
            {!isManager && <Link className="hc-primary-button hc-create-post" to={isAuthenticated ? "/bai-dang/tao-moi" : "/auth/login"} state={isAuthenticated ? undefined : { from: "/bai-dang/tao-moi" }}><Icon name="add" /><span>{createLabel}</span></Link>}
          </div>
        </div>
        <nav className="hc-market-nav" aria-label="Khám phá">
          <div className="hc-market-nav-inner">
            {marketplaceLinks()}
            {canUseClientAccount && <Link to={clientEntryPath} className={"hc-market-link hc-manage-link" + (clientPage ? " is-active" : "")}><Icon name="space_dashboard" />Quản lý của tôi</Link>}
            {isManager && <Link to={managerPath} className="hc-market-link hc-manage-link">Trang quản trị</Link>}
          </div>
        </nav>
      </header>

      <Drawer title="HomeCycle" placement="left" open={menuOpen} onClose={closeMenu} size={300} rootClassName="hc-drawer">
        <div className="hc-mobile-market">{marketplaceLinks(true)}</div>
        {canUseClientAccount && <ClientNavigation role={role} onNavigate={closeMenu} />}
        {!isAuthenticated && <div className="hc-drawer-auth"><Link to="/auth/login" onClick={closeMenu}>Đăng nhập</Link><Link to="/auth/register" onClick={closeMenu}>Đăng ký</Link></div>}
        {isManager && <Link to={managerPath} onClick={closeMenu}>Trang quản trị</Link>}
        {!isManager && <Link className="hc-primary-button" to={isAuthenticated ? "/bai-dang/tao-moi" : "/auth/login"} state={isAuthenticated ? undefined : { from: "/bai-dang/tao-moi" }} onClick={closeMenu}><Icon name="add" />{createLabel}</Link>}
      </Drawer>

      {clientPage ? (
        <div className="hc-workspace">
          <aside className="hc-sidebar">
            <div className="hc-workspace-label"><span className="hc-role-mark"><Icon name={role === ROLES.BUSINESS ? "corporate_fare" : "person"} /></span><div><strong>Không gian của bạn</strong><span>{role === ROLES.BUSINESS ? "Tài khoản doanh nghiệp" : "Tài khoản cá nhân"}</span></div></div>
            <ClientNavigation role={role} />
            <Link to="/" className="hc-back-market"><Icon name="arrow_back" />Về marketplace</Link>
          </aside>
          <div id="hc-content" tabIndex={-1} className="hc-workspace-content">
            <div className="hc-breadcrumb"><Link to={clientEntryPath}>Quản lý của tôi</Link><Icon name="chevron_right" /><span>{clientPage.name}</span></div>
            <Outlet />
          </div>
        </div>
      ) : <div id="hc-content" tabIndex={-1} className="hc-market-content"><Outlet /></div>}

      <footer className="hc-footer"><Link to="/">HomeCycle</Link><span>Cho đồ vật một vòng đời mới.</span><nav aria-label="Liên kết cuối trang"><Link to="/tin-dang-ban?view=marketplace">Tin đăng bán</Link><Link to="/tin-thu-mua?view=marketplace">Tin thu mua</Link></nav><span>© 2026 HomeCycle</span></footer>
    </div>
  );
};

export default MainLayout;

import { Link, useLocation } from "react-router-dom";
import { getClientNavigation, isClientItemActive } from "../../constants/clientNavigation";

const ClientNavigation = ({ role, onNavigate }) => {
  const location = useLocation();
  return (
    <nav aria-label="Quản lý tài khoản" className="hc-sidebar-nav">
      {getClientNavigation(role).map((group, index) => (
        <div className="hc-nav-group" key={group.name || index}>
          {group.name && <p className="hc-nav-label">{group.name}</p>}
          {group.items.map((item) => {
            const active = isClientItemActive(item, location, role);
            return (
              <Link key={item.path} to={item.path} onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`hc-sidebar-link${active ? " is-active" : ""}`}>
                <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default ClientNavigation;

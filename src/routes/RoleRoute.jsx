import {
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  getHomePathByRole,
  hasRole,
} from "../utils/authUtils";

const RoleRoute = ({ allowedRole, allowedRoles }) => {
  const {
    user,
    isAuthenticated,
    isAuthInitializing,
  } = useAuth();

  if (isAuthInitializing) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/login"
        replace
      />
    );
  }

  const roles = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRole];

  const isAllowed = roles
    .filter(Boolean)
    .some((role) => hasRole(user?.role, role));

  if (!isAllowed) {
    return (
      <Navigate
        to={getHomePathByRole(user?.role)}
        replace
      />
    );
  }

  return <Outlet />;
};

export default RoleRoute;

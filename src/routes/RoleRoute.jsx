import {
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  getHomePathByRole,
  hasRole,
} from "../utils/authUtils";

const RoleRoute = ({ allowedRole }) => {
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

  if (!hasRole(user?.role, allowedRole)) {
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
import { Navigate, Outlet } from "react-router-dom";
import { ROLES } from "../constants/roles";
import { useAuth } from "../hooks/useAuth";
import { hasRole } from "../utils/authUtils";

const GhnWebhookDemoRoute = () => {
  const {
    user,
    isAuthenticated,
    isAuthInitializing,
  } = useAuth();

  if (isAuthInitializing) {
    return null;
  }

  const isHomeCycleActor =
    isAuthenticated &&
    (hasRole(user?.role, ROLES.PERSONAL) ||
      hasRole(user?.role, ROLES.BUSINESS));

  if (isHomeCycleActor) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default GhnWebhookDemoRoute;

import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Homepage from "../pages/public/Homepage";
import { getHomePathByRole } from "../utils/authUtils";

const HomeRoute = () => {
  const {
    user,
    isAuthenticated,
    isAuthInitializing,
  } = useAuth();

  if (isAuthInitializing) {
    return null;
  }

  if (!isAuthenticated) {
    return <Homepage />;
  }

  const homePath = getHomePathByRole(
    user?.role,
  );

  if (homePath !== "/") {
    return (
      <Navigate
        to={homePath}
        replace
      />
    );
  }

  return <Homepage />;
};

export default HomeRoute;
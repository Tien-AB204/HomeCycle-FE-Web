import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Homepage from "../pages/public/Homepage";
import { getHomePathByRole } from "../utils/authUtils";
import { ROLES } from "../constants/roles"; // Bổ sung import ROLES

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

  // THAY ĐỔI Ở ĐÂY:
  // Nếu path khác "/" VÀ người dùng KHÔNG PHẢI là MODERATOR thì mới bắt buộc chuyển hướng.
  // Nhờ đó, Admin vẫn bị đá về /admin, nhưng Mod thì được phép ở lại trang chủ (/).
  if (homePath !== "/" && user?.role !== ROLES.MODERATOR) {
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
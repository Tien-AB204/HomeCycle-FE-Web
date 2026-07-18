// src/routes/RoleRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const RoleRoute = ({ allowedRole }) => {
  const { user, isAuthenticated } = useAuth(); // Lấy thông tin user từ Context

  // Nếu chưa đăng nhập -> Đẩy về trang Login (Sửa lại đường dẫn cho khớp với AppRouter)
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Nếu đã đăng nhập nhưng sai quyền (VD: user thường cố vào trang Mod) -> Đẩy về trang chủ
  if (user?.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // Nếu đúng quyền -> Cho phép render các component con bên trong
  return <Outlet />;
};

export default RoleRoute;
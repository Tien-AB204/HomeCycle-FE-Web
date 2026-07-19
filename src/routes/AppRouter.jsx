import { Route, Routes, Navigate } from "react-router-dom";

// Imports - Layouts
import MainLayout from "../components/layouts/MainLayout";
import AuthLayout from "../components/layouts/AuthLayout";
import ModLayout from "../components/layouts/ModLayout";

// Imports - Public & Auth Pages
import Homepage from "../pages/public/Homepage";
import SearchPage from "../pages/public/SearchPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterSelectionPage from "../pages/auth/RegisterSelectionPage";
import RegisterPersonalPage from "../pages/auth/RegisterPersonalPage";
import RegisterBusinessPage from "../pages/auth/RegisterBusinessPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";

// Imports - Moderator Pages & Security
import { ROLES } from '../constants/roles';
import RoleRoute from './RoleRoute';
import PostModerationPage from "../pages/mod/PostModerationPage";
import VerificationPage from "../pages/mod/VerificationPage";

const AppRouter = () => {
  return (
    <Routes>
      {/* ========================================== */}
      {/* ROUTE DÀNH CHO NGƯỜI DÙNG CHUNG & VÃNG LAI   */}
      {/* ========================================== */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Homepage />} />
        <Route path="/search" element={<SearchPage />} />
        
        {/* Trang dành riêng cho Tin đăng bán (Từ Sidebar) */}
        <Route
          path="/tin-dang-ban"
          element={<SearchPage fixedPostType="SELL" />}
        />

        {/* Trang dành riêng cho Tin thu mua (Từ Sidebar) */}
        <Route
          path="/tin-thu-mua"
          element={<SearchPage fixedPostType="BUY" />}
        />
      </Route>

      {/* ========================================== */}
      {/* ROUTE DÀNH CHO XÁC THỰC (ĐĂNG NHẬP/ĐĂNG KÝ)  */}
      {/* ========================================== */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterSelectionPage />} />
        <Route
          path="/auth/register/personal"
          element={<RegisterPersonalPage />}
        />
        <Route
          path="/auth/register/business"
          element={<RegisterBusinessPage />}
        />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* ========================================== */}
      {/* ROUTE DÀNH RIÊNG CHO KIỂM DUYỆT VIÊN (MOD)   */}
      {/* ========================================== */}
      {/* Đã bọc RoleRoute từ nhánh dev để bảo mật */}
      <Route element={<RoleRoute allowedRole={ROLES.MODERATOR} />}>
        <Route path="/mod" element={<ModLayout />}>
          {/* Tự động chuyển hướng từ /mod sang /mod/verification (Từ code của chúng ta) */}
          <Route index element={<Navigate to="verification" replace />} />
          
          {/* Trang duyệt hồ sơ (Từ code của chúng ta) */}
          <Route path="verification" element={<VerificationPage />} />
          
          {/* Trang danh sách bài viết chờ duyệt (Từ nhánh dev của đồng đội) */}
          <Route path="posts" element={<PostModerationPage />} />
        </Route>
      </Route>

    </Routes>
  );
};

export default AppRouter;
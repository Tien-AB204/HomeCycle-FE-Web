import { Navigate, Route, Routes } from "react-router-dom";

// Imports - Layouts
import AdminLayout from "../components/layouts/AdminLayout";
import AuthLayout from "../components/layouts/AuthLayout";
import MainLayout from "../components/layouts/MainLayout";
import ModLayout from "../components/layouts/ModLayout";

// Imports - Public & Auth Pages
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterBusinessPage from "../pages/auth/RegisterBusinessPage";
import RegisterPersonalPage from "../pages/auth/RegisterPersonalPage";
import RegisterSelectionPage from "../pages/auth/RegisterSelectionPage";
import Homepage from "../pages/public/Homepage";
import SearchPage from "../pages/public/SearchPage";

// Imports - Moderator Pages & Security
import { ROLES } from "../constants/roles";
import PostModerationPage from "../pages/mod/PostModerationPage";
import VerificationPage from "../pages/mod/VerificationPage";
import RoleRoute from "./RoleRoute";

// Imports - Admin Pages
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import CategoryPage from "../pages/admin/CategoryPage";
import BrandPage from "../pages/admin/BrandPage";
import ProductTypePage from "../pages/admin/ProductTypePage";

// Imports - User Pages
import UserProfilePage from "../pages/user/UserProfilePage";

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

        {/* THÊM DÒNG NÀY: Trang Quản lý Hồ sơ Cá nhân */}
        <Route path="/ho-so" element={<UserProfilePage />} />
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
      <Route element={<RoleRoute allowedRole={ROLES.MODERATOR} />}>
        <Route path="/mod" element={<ModLayout />}>
          <Route index element={<Navigate to="verification" replace />} />
          <Route path="verification" element={<VerificationPage />} />
          <Route path="posts" element={<PostModerationPage />} />
        </Route>
      </Route>

      {/* ========================================== */}
      {/* ROUTE DÀNH RIÊNG CHO QUẢN TRỊ VIÊN (ADMIN)  */}
      {/* ========================================== */}
      <Route element={<RoleRoute allowedRole={ROLES.ADMIN} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="categories" element={<CategoryPage />} />
          <Route path="brands" element={<BrandPage />} />
          <Route path="product-types" element={<ProductTypePage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRouter;
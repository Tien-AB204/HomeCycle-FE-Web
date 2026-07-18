// src/routes/AppRouter.jsx
import { Route, Routes } from "react-router-dom"; // Bỏ import BrowserRouter ở đây

import AuthLayout from "../components/layouts/AuthLayout";
import MainLayout from "../components/layouts/MainLayout";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterBusinessPage from "../pages/auth/RegisterBusinessPage";
import RegisterPersonalPage from "../pages/auth/RegisterPersonalPage";
import RegisterSelectionPage from "../pages/auth/RegisterSelectionPage";
import Homepage from "../pages/public/Homepage";
import SearchPage from "../pages/public/SearchPage";
import { ROLES } from '../constants/roles';
import ModLayout from '../components/layouts/ModLayout';
import RoleRoute from './RoleRoute';
// Import trang Kiểm duyệt 
import PostModerationPage from "../pages/mod/PostModerationPage";

const AppRouter = () => {
  return (
    // Bỏ thẻ <BrowserRouter> ở đây, chỉ để <Routes> ngoài cùng
    <Routes>
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
      {/* ROUTE DÀNH CHO NGƯỜI DÙNG CHUNG & VÃNG LAI   */}
      {/* ========================================== */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Homepage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route
          path="/tin-dang-ban"
          element={<SearchPage fixedPostType="SELL" />}
        />
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
      <Route element={<RoleRoute allowedRole={ROLES.MODERATOR} />}>
        <Route path="/mod" element={<ModLayout />}>
          {/* Default chuyển hướng hoặc Dashboard */}
          {/* <Route path="dashboard" element={<div>Dashboard</div>} /> */}
          
          {/* Trang danh sách bài viết chờ duyệt */}
          <Route path="posts" element={<PostModerationPage />} />
        </Route>
      </Route>

    </Routes>
  );
};

export default AppRouter;

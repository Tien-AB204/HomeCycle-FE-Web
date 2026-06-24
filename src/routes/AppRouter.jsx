import React from "react";
import { Routes, Route } from "react-router-dom";

import Homepage from "../pages/public/Homepage";
import AuthLayout from "../components/layouts/AuthLayout";
import LoginPage from "../pages/auth/LoginPage";
import RegisterSelectionPage from "../pages/auth/RegisterSelectionPage";
import RegisterPersonalPage from "../pages/auth/RegisterPersonalPage";
import RegisterBusinessPage from "../pages/auth/RegisterBusinessPage";
// import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'; // Bạn có thể tự tạo file này bằng logic State tương tự

const AppRouter = () => {
  return (
    <Routes>
      {/* Các trang Public thông thường */}
      <Route path="/" element={<Homepage />} />

      {/* Khu vực Auth (Dùng chung nền xám AuthLayout) */}
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
        {/* <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} /> */}
      </Route>
    </Routes>
  );
};

export default AppRouter;

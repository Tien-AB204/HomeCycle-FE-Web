import { Route, Routes } from "react-router-dom";

import AuthLayout from "../components/layouts/AuthLayout";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterBusinessPage from "../pages/auth/RegisterBusinessPage";
import RegisterPersonalPage from "../pages/auth/RegisterPersonalPage";
import RegisterSelectionPage from "../pages/auth/RegisterSelectionPage";
import Homepage from "../pages/public/Homepage";

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
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;

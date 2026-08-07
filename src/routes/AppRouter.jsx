import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

// Layouts
import AdminLayout from "../components/layouts/AdminLayout";
import AuthLayout from "../components/layouts/AuthLayout";
import MainLayout from "../components/layouts/MainLayout";
import ModLayout from "../components/layouts/ModLayout";

// Public và Auth Pages
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterBusinessPage from "../pages/auth/RegisterBusinessPage";
import RegisterPersonalPage from "../pages/auth/RegisterPersonalPage";
import RegisterSelectionPage from "../pages/auth/RegisterSelectionPage";
import PostDetailPage from "../pages/public/PostDetailPage";
import SearchPage from "../pages/public/SearchPage";

// Moderator Pages và Security
import { ROLES } from "../constants/roles";
import PostModerationPage from "../pages/mod/PostModerationPage";
import VerificationPage from "../pages/mod/VerificationPage";
import HomeRoute from "./HomeRoute";
import RoleRoute from "./RoleRoute";

// Admin Pages
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import BrandPage from "../pages/admin/BrandPage";
import CategoryPage from "../pages/admin/CategoryPage";
import ProductTypePage from "../pages/admin/ProductTypePage";
import ProductTypeAttributePage from "../pages/admin/ProductTypeAttributePage";

// User Pages
import UserProfilePage from "../pages/user/UserProfilePage";

const AppRouter = () => {
  return (
    <Routes>
      {/* Trang công khai và người dùng */}
      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={<HomeRoute />}
        />

        <Route
          path="/search"
          element={<SearchPage />}
        />

        <Route
          path="/posts/:postId"
          element={<PostDetailPage />}
        />

        <Route
          path="/tin-dang-ban"
          element={
            <SearchPage fixedPostType="SELL" />
          }
        />

        <Route
          path="/tin-thu-mua"
          element={
            <SearchPage fixedPostType="BUY" />
          }
        />

        <Route
          path="/ho-so"
          element={<UserProfilePage />}
        />
      </Route>

      {/* Đăng nhập và đăng ký */}
      <Route element={<AuthLayout />}>
        <Route
          path="/auth/login"
          element={<LoginPage />}
        />

        <Route
          path="/auth/register"
          element={
            <RegisterSelectionPage />
          }
        />

        <Route
          path="/auth/register/personal"
          element={
            <RegisterPersonalPage />
          }
        />

        <Route
          path="/auth/register/business"
          element={
            <RegisterBusinessPage />
          }
        />

        <Route
          path="/auth/forgot-password"
          element={<ForgotPasswordPage />}
        />
      </Route>

      {/* Moderator */}
      <Route
        element={
          <RoleRoute
            allowedRole={ROLES.MODERATOR}
          />
        }
      >
        <Route
          path="/mod"
          element={<ModLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="verification"
                replace
              />
            }
          />

          <Route
            path="verification"
            element={<VerificationPage />}
          />

          <Route
            path="posts"
            element={<PostModerationPage />}
          />
        </Route>
      </Route>

      {/* Admin */}
      <Route
        element={
          <RoleRoute
            allowedRole={ROLES.ADMIN}
          />
        }
      >
        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route
            index
            element={<AdminDashboardPage />}
          />

          <Route
            path="dashboard"
            element={<AdminDashboardPage />}
          />

          <Route
            path="categories"
            element={<CategoryPage />}
          />

          <Route
            path="brands"
            element={<BrandPage />}
          />

          <Route
            path="product-types"
            element={<ProductTypePage />}
          />

          <Route
            path="product-types/:productTypeId/attributes"
            element={
              <ProductTypeAttributePage />
            }
          />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRouter;

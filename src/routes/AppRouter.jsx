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
import ModDashboardPage from "../pages/mod/ModDashboardPage";
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
import UserManagementPage from "../pages/admin/UserManagementPage";
import PostManagementPage from "../pages/admin/PostManagementPage";

// User Pages
import UserProfilePage from "../pages/user/UserProfilePage";
import PostSectionPage from "../pages/user/PostSectionPage";
import CreatePostPage from "../pages/user/CreatePostPage";
import NegotiationListPage from "../pages/user/NegotiationListPage";
import NegotiationRoomPage from "../pages/user/NegotiationRoomPage";
import OfferManagementPage from "../pages/user/OfferManagementPage";
import AgreementPage from "../pages/user/AgreementPage";
import AppointmentPage from "../pages/user/AppointmentPage";
import PendingPaymentsPage from "../pages/user/PendingPaymentsPage";
import PaymentResultPage from "../pages/user/PaymentResultPage";
import OrderListPage from "../pages/user/OrderListPage";
import OrderDetailPage from "../pages/user/OrderDetailPage";
import { MARKETPLACE_POST_TYPES } from "../constants/marketplace";

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
            <PostSectionPage
              postType={MARKETPLACE_POST_TYPES.SELL}
            />
          }
        />

        <Route
          path="/tin-thu-mua"
          element={
            <PostSectionPage
              postType={MARKETPLACE_POST_TYPES.BUY}
            />
          }
        />

        <Route
          element={
            <RoleRoute
              allowedRoles={[
                ROLES.PERSONAL,
                ROLES.BUSINESS,
              ]}
            />
          }
        >
          <Route
            path="/bai-dang-cua-toi/:postId"
            element={
              <PostDetailPage ownerMode />
            }
          />

          <Route
            path="/bai-dang/tao-moi"
            element={<CreatePostPage />}
          />

          <Route
            path="/bai-dang/chinh-sua/:postId"
            element={<CreatePostPage />}
          />

          <Route
            path="/thuong-luong"
            element={<OfferManagementPage />}
          />

          <Route
            path="/thuong-luong/phien"
            element={<NegotiationListPage />}
          />

          <Route
            path="/thuong-luong/:negotiationId/thoa-thuan"
            element={<AgreementPage />}
          />

          <Route
            path="/thoa-thuan/:agreementId"
            element={<AgreementPage />}
          />

          <Route
            path="/thanh-toan"
            element={<PendingPaymentsPage />}
          />

          <Route
            path="/payments/success"
            element={<PaymentResultPage />}
          />

          <Route
            path="/payments/cancel"
            element={<PaymentResultPage />}
          />

          <Route
            path="/lich-hen"
            element={<AppointmentPage />}
          />

          <Route
            path="/don-hang"
            element={<OrderListPage />}
          />

          <Route
            path="/don-hang/:orderId"
            element={<OrderDetailPage />}
          />

          <Route
            path="/thuong-luong/:negotiationId"
            element={<NegotiationRoomPage />}
          />
        </Route>

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
          {/* Đổi redirect mặc định về dashboard */}
          <Route
            index
            element={
              <Navigate
                to="dashboard"
                replace
              />
            }
          />

          {/* Thêm Route cho Dashboard mới */}
          <Route
            path="dashboard"
            element={<ModDashboardPage />}
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

          <Route
            path="users"
            element={<UserManagementPage />}
          />

          <Route
            path="posts"
            element={<PostManagementPage />}
          />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRouter;

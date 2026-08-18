import { Navigate, Route, Routes } from "react-router-dom";

// Layouts
import AdminLayout from "../components/layouts/AdminLayout";
import AuthLayout from "../components/layouts/AuthLayout";
import MainLayout from "../components/layouts/MainLayout";
import ModLayout from "../components/layouts/ModLayout";

// Public vÃ  Auth Pages
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterBusinessPage from "../pages/auth/RegisterBusinessPage";
import RegisterPersonalPage from "../pages/auth/RegisterPersonalPage";
import RegisterSelectionPage from "../pages/auth/RegisterSelectionPage";
import ErrorPage from "../pages/public/ErrorPage";
import PostDetailPage from "../pages/public/PostDetailPage";
import SearchPage from "../pages/public/SearchPage";

// Moderator Pages vÃ  Security
import { ROLES } from "../constants/roles";
import DisputeManagementPage from "../pages/mod/DisputeManagementPage";
import ModDashboardPage from "../pages/mod/ModDashboardPage";
import PostModerationPage from "../pages/mod/PostModerationPage";
import VerificationPage from "../pages/mod/VerificationPage";
import HomeRoute from "./HomeRoute";
import RoleRoute from "./RoleRoute";

// Admin Pages
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import BrandPage from "../pages/admin/BrandPage";
import CategoryPage from "../pages/admin/CategoryPage";
import PostManagementPage from "../pages/admin/PostManagementPage";
import ProductTypeAttributePage from "../pages/admin/ProductTypeAttributePage";
import ProductTypePage from "../pages/admin/ProductTypePage";
import UserManagementPage from "../pages/admin/UserManagementPage";

// User Pages
import { MARKETPLACE_POST_TYPES } from "../constants/marketplace";
import AgreementPage from "../pages/user/AgreementPage";
import AppointmentPage from "../pages/user/AppointmentPage";
import CreatePostPage from "../pages/user/CreatePostPage";
import DisputeDetailPage from "../pages/user/DisputeDetailPage";
import NegotiationListPage from "../pages/user/NegotiationListPage";
import NegotiationRoomPage from "../pages/user/NegotiationRoomPage";
import OfferManagementPage from "../pages/user/OfferManagementPage";
import OrderDetailPage from "../pages/user/OrderDetailPage";
import OrderListPage from "../pages/user/OrderListPage";
import PaymentResultPage from "../pages/user/PaymentResultPage";
import PostSectionPage from "../pages/user/PostSectionPage";
import ProfilePage from "../pages/user/ProfilePage";
import ReceivedReviewsPage from "../pages/user/ReceivedReviewsPage";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/loi" element={<ErrorPage />} />
      {/* Trang cÃ´ng khai vÃ  ngÆ°á»i dÃ¹ng */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomeRoute />} />

        <Route path="/search" element={<SearchPage />} />

        <Route path="/posts/:postId" element={<PostDetailPage />} />

        <Route
          path="/tin-dang-ban"
          element={<PostSectionPage postType={MARKETPLACE_POST_TYPES.SELL} />}
        />

        <Route
          path="/tin-thu-mua"
          element={<PostSectionPage postType={MARKETPLACE_POST_TYPES.BUY} />}
        />

        <Route
          element={
            <RoleRoute allowedRoles={[ROLES.PERSONAL, ROLES.BUSINESS]} />
          }
        >
          <Route
            path="/bai-dang-cua-toi/:postId"
            element={<PostDetailPage ownerMode />}
          />

          <Route path="/bai-dang/tao-moi" element={<CreatePostPage />} />

          <Route
            path="/bai-dang/chinh-sua/:postId"
            element={<CreatePostPage />}
          />

          <Route path="/thuong-luong" element={<OfferManagementPage />} />

          <Route path="/thuong-luong/phien" element={<NegotiationListPage />} />

          <Route
            path="/thuong-luong/:negotiationId/thoa-thuan"
            element={<AgreementPage />}
          />

          <Route path="/thoa-thuan/:agreementId" element={<AgreementPage />} />

          <Route
            path="/thanh-toan"
            element={<Navigate to="/don-hang" replace />}
          />

          <Route path="/payments/success" element={<PaymentResultPage />} />

          <Route path="/payments/cancel" element={<PaymentResultPage />} />

          <Route path="/lich-hen" element={<AppointmentPage />} />

          <Route path="/don-hang" element={<OrderListPage />} />

          <Route path="/don-hang/:orderId" element={<OrderDetailPage />} />

          <Route
            path="/tranh-chap/:disputeId"
            element={<DisputeDetailPage />}
          />

          <Route
            path="/danh-gia/nguoi-dung/:userId"
            element={<ReceivedReviewsPage />}
          />

          <Route
            path="/thuong-luong/:negotiationId"
            element={<NegotiationRoomPage />}
          />
        </Route>

        <Route
          element={
            <RoleRoute allowedRoles={[ROLES.PERSONAL, ROLES.BUSINESS]} />
          }
        >
          <Route path="/ho-so" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* ÄÄƒng nháº­p vÃ  Ä‘Äƒng kÃ½ */}
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

      {/* Moderator */}
      <Route element={<RoleRoute allowedRole={ROLES.MODERATOR} />}>
        <Route path="/mod" element={<ModLayout />}>
          {/* Äá»•i redirect máº·c Ä‘á»‹nh vá» dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* ThÃªm Route cho Dashboard má»›i */}
          <Route path="dashboard" element={<ModDashboardPage />} />

          <Route path="verification" element={<VerificationPage />} />

          <Route path="posts" element={<PostModerationPage />} />

          <Route
            path="disputes"
            element={<DisputeManagementPage />}
          />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<RoleRoute allowedRole={ROLES.ADMIN} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />

          <Route path="dashboard" element={<AdminDashboardPage />} />

          <Route path="categories" element={<CategoryPage />} />

          <Route path="brands" element={<BrandPage />} />

          <Route path="product-types" element={<ProductTypePage />} />

          <Route
            path="product-types/:productTypeId/attributes"
            element={<ProductTypeAttributePage />}
          />

          <Route path="users" element={<UserManagementPage />} />

          <Route path="posts" element={<PostManagementPage />} />
        </Route>
      </Route>
      <Route path="*" element={<ErrorPage notFound />} />
    </Routes>
  );
};

export default AppRouter;

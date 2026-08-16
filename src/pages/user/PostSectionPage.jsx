import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  canManagePostType,
  MARKETPLACE_POST_TYPES,
  normalizePostType,
} from "../../constants/marketplace";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import { normalizeRole } from "../../utils/authUtils";
import SearchPage from "../public/SearchPage";
import MyPostsPage from "./MyPostsPage";

const PostSectionPage = ({ postType }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedPostType = normalizePostType(postType);
  const viewMode = new URLSearchParams(location.search).get("view");
  const isRecommendationView =
    viewMode === "recommended" &&
    normalizedPostType === MARKETPLACE_POST_TYPES.SELL;
  const isBusinessUser = normalizeRole(user?.role) === ROLES.BUSINESS;
  const isMarketplaceView =
    viewMode === "marketplace" || isRecommendationView;
  const hasManagementAccess =
    isAuthenticated &&
    canManagePostType(user?.role, normalizedPostType);

  if (isRecommendationView && (!isAuthenticated || !isBusinessUser)) {
    return <Navigate to="/tin-dang-ban?view=marketplace" replace />;
  }

  if (!hasManagementAccess || isMarketplaceView) {
    return (
      <SearchPage
        recommendationMode={isRecommendationView}
        fixedPostType={
          normalizedPostType === MARKETPLACE_POST_TYPES.SELL
            ? "SELL"
            : "BUY"
        }
      />
    );
  }

  const successMessage =
    location.state?.postSuccessMessage ||
    location.state?.postCreatedMessage ||
    "";

  const dismissSuccessMessage = () => {
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  };

  return (
    <main className="pb-10 pt-7 sm:pt-9">
      {successMessage && (
        <div className="mx-auto mb-5 w-full max-w-7xl px-4 sm:px-6">
          <div
            role="status"
            className="flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <p className="font-semibold">{successMessage}</p>
            <button
              type="button"
              onClick={dismissSuccessMessage}
              aria-label="Đóng thông báo"
              className="shrink-0 font-black text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <MyPostsPage expectedPostType={normalizedPostType} />
    </main>
  );
};

export default PostSectionPage;

import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  canManagePostType,
  getPostTypeLabel,
  MARKETPLACE_POST_TYPES,
  normalizePostType,
} from "../../constants/marketplace";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import SearchPage from "../public/SearchPage";
import MyPostsPage from "./MyPostsPage";

const PostSectionPage = ({ postType }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] =
    useSearchParams();
  const normalizedPostType =
    normalizePostType(postType);
  const hasManagementAccess =
    isAuthenticated &&
    canManagePostType(
      user?.role,
      normalizedPostType,
    );

  if (!hasManagementAccess) {
    return (
      <SearchPage
        fixedPostType={
          normalizedPostType ===
          MARKETPLACE_POST_TYPES.SELL
            ? "SELL"
            : "BUY"
        }
      />
    );
  }

  const activeView =
    searchParams.get("view") === "market"
      ? "market"
      : "mine";
  const isPersonal = user?.role === ROLES.PERSONAL;
  const postTypeLabel = getPostTypeLabel(
    normalizedPostType,
  );
  const successMessage =
    location.state?.postCreatedMessage || "";

  const changeView = (nextView) => {
    const nextSearchParams = new URLSearchParams(
      searchParams,
    );

    nextSearchParams.set("view", nextView);
    setSearchParams(nextSearchParams);
  };

  const dismissSuccessMessage = () => {
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  };

  return (
    <div>
      <section className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-[#BAC2C1]/40 bg-white shadow-sm">
          <div className="bg-[#172830] px-5 py-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C1EAEC]">
                {isPersonal
                  ? "Không gian bán hàng cá nhân"
                  : "Trung tâm thu mua doanh nghiệp"}
              </p>
              <h1 className="mt-2 text-2xl font-bold capitalize">
                Quản lý {postTypeLabel}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C9D4]">
                {isPersonal
                  ? "Theo dõi các sản phẩm bạn đang bán hoặc chuyển sang khám phá nhu cầu thị trường."
                  : "Theo dõi nhu cầu thu mua của doanh nghiệp hoặc khám phá nguồn hàng đang được đăng bán."}
              </p>
            </div>

            <Link
              to="/bai-dang/tao-moi"
              className="mt-4 inline-flex shrink-0 items-center justify-center rounded-lg bg-[#C1EAEC] px-5 py-3 text-sm font-black text-[#172830] transition hover:bg-white sm:mt-0"
            >
              + Tạo {postTypeLabel}
            </Link>
          </div>

          <div
            role="tablist"
            aria-label={`Điều hướng ${postTypeLabel}`}
            className="grid grid-cols-2 border-t border-[#BAC2C1]/20 bg-[#f8fafa] p-2 sm:flex"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "mine"}
              onClick={() => changeView("mine")}
              className={`rounded-lg px-4 py-3 text-sm font-bold transition sm:min-w-48 ${
                activeView === "mine"
                  ? "bg-[#2B5659] text-white shadow-sm"
                  : "text-[#547B7D] hover:bg-[#BAC2C1]/20 hover:text-[#172830]"
              }`}
            >
              Bài đăng của tôi
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "market"}
              onClick={() => changeView("market")}
              className={`rounded-lg px-4 py-3 text-sm font-bold transition sm:min-w-48 ${
                activeView === "market"
                  ? "bg-[#2B5659] text-white shadow-sm"
                  : "text-[#547B7D] hover:bg-[#BAC2C1]/20 hover:text-[#172830]"
              }`}
            >
              Khám phá thị trường
            </button>
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
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

      {activeView === "mine" ? (
        <div className="pt-5">
          <MyPostsPage
            expectedPostType={normalizedPostType}
          />
        </div>
      ) : (
        <SearchPage
          fixedPostType={
            normalizedPostType ===
            MARKETPLACE_POST_TYPES.SELL
              ? "SELL"
              : "BUY"
          }
        />
      )}
    </div>
  );
};

export default PostSectionPage;

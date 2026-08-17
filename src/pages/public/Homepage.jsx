import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  MessageOutlined,
  SearchOutlined,
  ShoppingOutlined,
  SyncOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Link, NavLink, useNavigate } from "react-router-dom";
import ProductCard from "../../components/shared/ProductCard";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import businessRecommendationApi from "../../services/apis/businessRecommendationApi";
import businessProfileApi from "../../services/apis/businessProfileApi";
import postApi from "../../services/apis/postApi";
import {
  getBusinessRecommendationMismatchMessage,
  getBusinessRecommendations,
  hasCompletedBusinessSurvey,
  normalizeBusinessSurvey,
} from "../../utils/businessRecommendationUtils";
import { getUserId, normalizeRole } from "../../utils/authUtils";
import {
  getBusinessSurveySnapshot,
  isFreshBusinessSurveySnapshot,
} from "../../utils/businessSurveySession";
import {
  isPostCatalogStorageEvent,
  POST_CATALOG_CHANGED_EVENT,
} from "../../utils/postCatalogEvents";

const HOME_PAGE_SIZE = 20;
const BUSINESS_POST_LIMIT = 4;
const PERSONAL_POST_LIMIT = 4;

const CATEGORIES = [
  {
    name: "Điện máy",
    description: "Thiết bị nhà bếp và điện gia dụng",
    icon: ThunderboltOutlined,
    className: "bg-[#e6f3ef] text-[#255b57]",
  },
  {
    name: "Nội thất",
    description: "Bàn ghế, giường tủ cho mọi không gian",
    icon: AppstoreOutlined,
    className: "bg-[#f5f0e6] text-[#765b32]",
  },
  {
    name: "Đồ sinh hoạt",
    description: "Đồ dùng tiện ích cho gia đình",
    icon: HomeOutlined,
    className: "bg-[#e2eef7] text-[#2f6f9f]",
  },
];

const BENEFITS = [
  { icon: CheckCircleOutlined, title: "Minh bạch", description: "Thông tin rõ ràng" },
  { icon: MessageOutlined, title: "Linh hoạt", description: "Thương lượng trực tiếp" },
  { icon: SyncOutlined, title: "Bền vững", description: "Kéo dài vòng đời sản phẩm" },
];

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải danh sách bài đăng.";

const isActivePost = (post) =>
  String(post?.status || "").toLowerCase() === "active";

const hasPostType = (post, postType) =>
  String(post?.postType || "").toLowerCase() === postType.toLowerCase();

const LoadingCards = ({ count }) => {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="overflow-hidden rounded-2xl border border-[#e1ebe8] bg-white shadow-sm"
    >
      <div className="h-44 animate-pulse bg-[#e8efed] sm:h-48 lg:h-44 xl:h-48" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-[#dce7e4]" />
        <div className="h-5 w-4/5 animate-pulse rounded-full bg-[#dce7e4]" />
        <div className="h-4 w-full animate-pulse rounded-full bg-[#edf2f0]" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-[#edf2f0]" />
      </div>
    </div>
  ));
};

const EmptyPosts = ({ message }) => (
  <div className="col-span-full rounded-2xl border border-dashed border-[#aac6bf] bg-white px-6 py-12 text-center">
    <p className="text-sm font-semibold text-[#587170]">{message}</p>
  </div>
);

const BusinessSurveyPrompt = () => (
  <section className="pb-12">
    <div className="grid gap-5 rounded-[2rem] border border-[#cfe1dc] bg-gradient-to-br from-[#edf7f3] via-white to-[#eaf2f8] p-6 shadow-[0_12px_36px_rgba(32,77,75,0.08)] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dceee9] text-[#2f686c]"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[30px]">
          query_stats
        </span>
      </span>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#4f8588]">
          Dành riêng cho doanh nghiệp
        </p>
        <h2 className="mt-2 text-xl font-black leading-snug text-[#183436] sm:text-2xl">
          Hãy thực hiện khảo sát để hệ thống đề xuất cho bạn những sản phẩm phù hợp
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68807f]">
          Chọn khu vực, loại sản phẩm và tình trạng hàng hóa doanh nghiệp quan tâm.
        </p>
      </div>
      <Link
        to="/ho-so?tab=survey"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#244f51] px-5 py-3 text-sm font-black text-white transition hover:bg-[#356a70] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#244f51]"
      >
        <span className="material-symbols-outlined text-[18px]">
          tune
        </span>
        Thực hiện khảo sát
      </Link>
    </div>
  </section>
);

const HomepageSearch = () => {
  const navigate = useNavigate();
  const keywordInputRef = useRef(null);

  const navigateToSearch = (showFilter) => {
    const keyword = keywordInputRef.current?.value.trim() || "";
    const searchParams = new URLSearchParams();

    if (keyword) {
      searchParams.set("keyword", keyword);
    }

    searchParams.set("showFilter", showFilter ? "1" : "0");
    navigate(`/search?${searchParams.toString()}`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    navigateToSearch(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_18px_50px_rgba(30,78,77,0.16)] sm:flex-row"
    >
      <label htmlFor="homepage-search-keyword" className="sr-only">
        Từ khóa tìm kiếm
      </label>
      <div className="flex min-w-0 flex-1 items-center">
        <span className="pl-4 text-xl text-[#66817f]" aria-hidden="true">⌕</span>
        <input
          id="homepage-search-keyword"
          ref={keywordInputRef}
          type="search"
          placeholder="Tìm tên sản phẩm, thương hiệu..."
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#183436] outline-none placeholder:text-[#78908f]"
        />
      </div>
      <button
        type="submit"
        className="rounded-xl border border-[#4f8588] bg-white px-6 py-3 text-sm font-extrabold text-[#2f686c] transition hover:bg-[#4f8588] hover:text-white"
      >
        Tìm kiếm
      </button>
      <button
        type="button"
        onClick={() => navigateToSearch(true)}
        className="rounded-xl border border-[#bfd3ce] px-4 py-3 text-sm font-bold text-[#244f51] transition hover:bg-[#edf5f2]"
      >
        Bộ lọc
      </button>
    </form>
  );
};

const SectionHeader = ({ eyebrow, title, description, to }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#4f8588]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-[#183436] sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68807f]">{description}</p>
    </div>
    <NavLink
      to={to}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#5f9291] bg-white px-4 py-2 text-sm font-extrabold text-[#2f686c] transition hover:bg-[#4f8588] hover:text-white"
    >
      Xem tất cả <span aria-hidden="true">→</span>
    </NavLink>
  </div>
);

const Homepage = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [businessSurvey, setBusinessSurvey] = useState(null);
  const [recommendationSourcePosts, setRecommendationSourcePosts] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationNotice, setRecommendationNotice] = useState("");
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const normalizedRole = normalizeRole(user?.role);
  const isBusinessUser = normalizedRole === ROLES.BUSINESS;
  const businessUserId = getUserId(user);
  const preferredDisplayName =
    user?.fullName ||
    user?.FullName ||
    user?.representativeName ||
    user?.displayName ||
    "";
  const username =
    user?.username ||
    user?.Username ||
    user?.name ||
    user?.Name ||
    "";
  const displayName =
    preferredDisplayName ||
    (!username.includes("@") ? username : "") ||
    "bạn";
  const managedPostPath = isBusinessUser
    ? "/tin-thu-mua?view=mine"
    : "/tin-dang-ban?view=mine";
  const managedPostLabel = isBusinessUser
    ? "Tin thu mua của tôi"
    : "Tin đăng bán của tôi";
  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    postApi
      .getAll({
        pageNumber: 1,
        pageSize: HOME_PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        if (isActive) {
          setPosts(result.items || []);
        }
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setPosts([]);
        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [requestVersion]);

  useEffect(() => {
    if (!isBusinessUser) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;
    const surveySnapshot = getBusinessSurveySnapshot(businessUserId);

    Promise.resolve()
      .then(() => {
        if (isActive) {
          setSurveyLoading(true);
        }

        if (isFreshBusinessSurveySnapshot(surveySnapshot)) {
          return surveySnapshot.survey;
        }

        return businessProfileApi.getSurveyDetail({
          signal: controller.signal,
        });
      })
      .then((surveyResponse) => {
        if (!isActive) return;

        setBusinessSurvey(
          normalizeBusinessSurvey(
            surveyResponse,
          ),
        );
      })
      .catch(() => {
        if (isActive) {
          setBusinessSurvey(
            surveySnapshot
              ? normalizeBusinessSurvey(surveySnapshot.survey)
              : null,
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setSurveyLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [businessUserId, isBusinessUser, requestVersion]);

  useEffect(() => {
    if (
      !isBusinessUser ||
      !hasCompletedBusinessSurvey(businessSurvey)
    ) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;
    let isRefreshing = false;
    let refreshQueued = false;

    const refreshRecommendations = async (showLoading = false) => {
      if (isRefreshing) {
        refreshQueued = true;
        return;
      }

      isRefreshing = true;

      if (showLoading && isActive) {
        setRecommendationLoading(true);
      }

      try {
        const result = await businessRecommendationApi.search({
          survey: businessSurvey,
          searchCriteria: {
            sortBy: "Newest",
          },
          signal: controller.signal,
        });

        if (isActive) {
          setRecommendationSourcePosts(result || []);
        }
      } catch (requestError) {
        if (
          isActive &&
          showLoading &&
          !isCanceledRequest(requestError)
        ) {
          setRecommendationSourcePosts([]);
          setError(getErrorMessage(requestError));
        }
      } finally {
        isRefreshing = false;

        if (showLoading && isActive) {
          setRecommendationLoading(false);
        }

        if (refreshQueued && isActive) {
          refreshQueued = false;
          void refreshRecommendations(false);
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshRecommendations(false);
      }
    };

    const handleStorage = (event) => {
      if (isPostCatalogStorageEvent(event)) {
        refreshWhenVisible();
      }
    };

    void Promise.resolve().then(() => refreshRecommendations(true));

    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener(
      POST_CATALOG_CHANGED_EVENT,
      refreshWhenVisible,
    );
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      isActive = false;
      controller.abort();
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener(
        POST_CATALOG_CHANGED_EVENT,
        refreshWhenVisible,
      );
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [businessSurvey, isBusinessUser, requestVersion]);

  const businessPosts = useMemo(
    () =>
      posts
        .filter((post) => isActivePost(post) && hasPostType(post, "Buy"))
        .slice(0, BUSINESS_POST_LIMIT),
    [posts],
  );

  const personalPosts = useMemo(
    () =>
      posts
        .filter((post) => isActivePost(post) && hasPostType(post, "Sell"))
        .slice(0, PERSONAL_POST_LIMIT),
    [posts],
  );

  const recommendedPosts = useMemo(
    () =>
      getBusinessRecommendations({
        posts: recommendationSourcePosts,
        survey: businessSurvey,
        limit: PERSONAL_POST_LIMIT,
      }),
    [businessSurvey, recommendationSourcePosts],
  );

  const handleRecommendationOpen = useCallback(
    async (post) => {
      try {
        const latestPost = await postApi.getById(post.postId);
        const verifiedPost = {
          ...post,
          ...latestPost,
          productTypeId:
            latestPost.productTypeId || post.productTypeId,
          product: {
            ...(post.product || {}),
            ...(latestPost.product || {}),
          },
        };
        const mismatchMessage =
          getBusinessRecommendationMismatchMessage(
            verifiedPost,
            businessSurvey,
          );

        if (mismatchMessage) {
          setRecommendationSourcePosts((currentPosts) =>
            currentPosts.filter(
              (currentPost) => currentPost.postId !== post.postId,
            ),
          );
          setRecommendationNotice(mismatchMessage);
          return false;
        }

        setRecommendationNotice("");
        setRecommendationSourcePosts((currentPosts) =>
          currentPosts.map((currentPost) =>
            currentPost.postId === post.postId
              ? verifiedPost
              : currentPost,
          ),
        );
        return true;
      } catch {
        setRecommendationNotice(
          "Không thể kiểm tra dữ liệu mới nhất của bài đăng. Vui lòng thử lại.",
        );
        return false;
      }
    },
    [businessSurvey],
  );

  const hasBusinessSurvey =
    hasCompletedBusinessSurvey(
      businessSurvey,
    );

  const handleRetry = () => {
    setLoading(true);
    setError("");
    setRequestVersion((currentVersion) => currentVersion + 1);
  };

  return (
    <div className="overflow-hidden pb-20">
      <section className="relative bg-gradient-to-br from-[#e4f1f0] via-[#f3f8f7] to-[#e9f1f6]">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#8db7c4]/25 blur-3xl" />
        <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-[#77aaa4]/20 blur-3xl" />
        <div className="absolute left-[38%] top-1/3 h-72 w-72 rounded-full bg-[#f5f0e6]/80 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
          <div>
            <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#34716c] shadow-sm">
              {isAuthenticated
                ? `Xin chào, ${displayName}`
                : "Marketplace đồ cũ cho gia đình"}
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.035em] text-[#183f41] sm:text-5xl lg:text-6xl">
              {isAuthenticated ? (
                <>
                  Sẵn sàng cho
                  <span className="block text-[#2f6f9f]">giao dịch tiếp theo?</span>
                </>
              ) : (
                <>
                  Đồ cũ trao tay,
                  <span className="block text-[#2f6f9f]">giá trị ở lại.</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#587170] sm:text-lg">
              {isAuthenticated
                ? isBusinessUser
                  ? "Tìm nguồn hàng phù hợp, quản lý nhu cầu thu mua và tiếp tục các phiên thương lượng của doanh nghiệp tại một nơi."
                  : "Quản lý tin đăng bán, theo dõi thương lượng và kết nối với những nhu cầu thu mua phù hợp ngay hôm nay."
                : "Tìm mua, đăng bán và thương lượng đồ gia dụng đã qua sử dụng trên một nền tảng minh bạch, thuận tiện và bền vững."}
            </p>

            {!isAuthenticated && <HomepageSearch />}
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto">
            <div className="absolute inset-8 rotate-6 rounded-[2.5rem] bg-[#79a7ad]" />
            <div className="relative rounded-[2.5rem] border border-white/80 bg-white/90 p-6 shadow-[0_30px_80px_rgba(30,78,77,0.18)] backdrop-blur sm:p-8">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#66817f]">
                  {isAuthenticated ? "Khu vực của bạn" : "HomeCycle hôm nay"}
                </p>
                <p className="mt-2 text-3xl font-black text-[#183f41]">
                  {isAuthenticated
                    ? isBusinessUser
                      ? "Thu mua chủ động"
                      : "Bán đồ thuận tiện"
                    : "Mua bán dễ dàng"}
                </p>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <Link
                  to={isAuthenticated ? managedPostPath : "/tin-dang-ban"}
                  className="rounded-2xl bg-[#f5f0e6] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ShoppingOutlined className="text-3xl text-[#356f6c]" aria-hidden="true" />
                  <p className="mt-4 font-black text-[#244f51]">
                    {isAuthenticated ? managedPostLabel : "Tin đăng bán"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#68807f]">
                    {isAuthenticated ? "Theo dõi và cập nhật bài đăng của bạn." : "Đăng sản phẩm và nhận đề nghị phù hợp."}
                  </p>
                </Link>
                <Link
                  to={isAuthenticated ? "/lich-hen" : "/tin-thu-mua"}
                  className="rounded-2xl bg-[#e2eef7] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <SearchOutlined className="text-3xl text-[#2f6f9f]" aria-hidden="true" />
                  <p className="mt-4 font-black text-[#2f6f9f]">
                    {isAuthenticated ? "Lịch hẹn" : "Tin thu mua"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#627b87]">
                    {isAuthenticated ? "Kiểm tra các lịch kiểm định và thu gom." : "Kết nối đúng người đang cần sản phẩm."}
                  </p>
                </Link>
              </div>

              <Link
                to={isAuthenticated ? "/don-hang" : "/auth/register"}
                className="mt-3 block rounded-2xl bg-[#183f41] p-5 text-white transition hover:bg-[#24575a]"
              >
                <p className="text-sm font-black">
                  {isAuthenticated ? "Đơn hàng của tôi" : "Thương lượng trực tiếp"}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#c7dcda]">
                  {isAuthenticated ? "Theo dõi thanh toán và tiến trình các đơn hàng." : "Hai bên chủ động thống nhất giá, số lượng và cách giao nhận."}
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e2ebe8] bg-white">
        <div className="mx-auto grid max-w-7xl divide-y divide-[#e2ebe8] px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {BENEFITS.map((benefit) => {
            const BenefitIcon = benefit.icon;

            return (
              <div key={benefit.title} className="flex items-center gap-4 py-5 sm:justify-center sm:px-5">
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#e6f3ef] text-xl text-[#2d6a65]" aria-hidden="true">
                  <BenefitIcon />
                </span>
                <div>
                  <p className="font-extrabold text-[#244f51]">{benefit.title}</p>
                  <p className="text-xs text-[#78908f]">{benefit.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <section className="py-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#4f8588]">Danh mục nổi bật</p>
              <h2 className="mt-2 text-2xl font-black text-[#183436] sm:text-3xl">Khám phá theo nhu cầu</h2>
            </div>
            <Link to="/search?showFilter=1" className="hidden rounded-full border border-[#5f9291] bg-white px-4 py-2 text-sm font-extrabold text-[#2f686c] transition hover:bg-[#4f8588] hover:text-white sm:inline-flex">
              Tất cả danh mục →
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {CATEGORIES.map((category) => {
              const CategoryIcon = category.icon;

              return (
                <Link
                  key={category.name}
                  to={`/search?keyword=${encodeURIComponent(category.name)}&showFilter=1`}
                  className={`group flex items-center gap-5 rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-lg ${category.className}`}
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-3xl shadow-sm transition group-hover:scale-105" aria-hidden="true">
                    <CategoryIcon />
                  </span>
                  <div>
                    <h3 className="text-lg font-black">{category.name}</h3>
                    <p className="mt-1 text-sm leading-5 opacity-80">{category.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {error && (
          <div role="alert" className="mb-8 flex flex-col items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button type="button" onClick={handleRetry} className="rounded-full bg-[#a74334] px-5 py-2 text-sm font-bold text-white hover:bg-[#823126]">
              Thử lại
            </button>
          </div>
        )}

        {isBusinessUser &&
          !surveyLoading &&
          !hasBusinessSurvey && (
            <BusinessSurveyPrompt />
          )}

        {isBusinessUser &&
          (surveyLoading ||
            hasBusinessSurvey) && (
            <section className="pb-12">
              <div className="overflow-hidden rounded-[2rem] border border-[#cfe1dc] bg-gradient-to-br from-[#edf7f3] via-white to-[#eaf2f8] p-5 shadow-[0_12px_36px_rgba(32,77,75,0.08)] sm:p-7">
                <SectionHeader
                  eyebrow="Dành riêng cho doanh nghiệp"
                  title="Nguồn hàng phù hợp khảo sát"
                  description="Các tin bán được ưu tiên theo loại sản phẩm, khu vực và tình trạng hàng hóa doanh nghiệp đã chọn trong khảo sát."
                  to="/tin-dang-ban?view=recommended"
                />

                {recommendationNotice && (
                  <div
                    role="alert"
                    className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
                  >
                    {recommendationNotice}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {surveyLoading || recommendationLoading ? (
                    <LoadingCards
                      count={
                        PERSONAL_POST_LIMIT
                      }
                    />
                  ) : recommendedPosts.length > 0 ? (
                    recommendedPosts.map(
                      (post) => (
                        <ProductCard
                          key={post.postId}
                          data={post}
                          variant="personal-sell"
                          onBeforeOpen={handleRecommendationOpen}
                        />
                      ),
                    )
                  ) : (
                    <EmptyPosts message="Chưa có tin bán phù hợp với khảo sát hiện tại. Bạn có thể cập nhật khảo sát trong Hồ sơ doanh nghiệp." />
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <Link
                    to="/ho-so?tab=survey"
                    className="inline-flex items-center gap-2 rounded-full bg-[#244f51] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356a70]"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      tune
                    </span>
                    Cập nhật khảo sát
                  </Link>
                </div>
              </div>
            </section>
          )}

        <section className="pb-12">
          <SectionHeader
            eyebrow="Đang cần tìm"
            title="Nhu cầu thu mua mới"
            description="Kết nối với người đang tìm đúng sản phẩm bạn có và chủ động gửi đề nghị phù hợp."
            to="/tin-thu-mua"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <LoadingCards count={BUSINESS_POST_LIMIT} />
            ) : businessPosts.length > 0 ? (
              businessPosts.map((post) => (
                <ProductCard key={post.postId} data={post} variant="business-buy" />
              ))
            ) : (
              <EmptyPosts message="Hiện chưa có tin thu mua đang hoạt động." />
            )}
          </div>
        </section>
      </div>

      <section className="bg-[#edf4f1] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeader
            eyebrow="Đồ cũ còn tốt"
            title="Sản phẩm mới đăng"
            description="Khám phá sản phẩm từ cộng đồng và gửi mức giá bạn mong muốn ngay trên HomeCycle."
            to="/tin-dang-ban?view=marketplace"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <LoadingCards count={PERSONAL_POST_LIMIT} />
            ) : personalPosts.length > 0 ? (
              personalPosts.map((post) => (
                <ProductCard key={post.postId} data={post} variant="personal-sell" />
              ))
            ) : (
              <EmptyPosts message="Hiện chưa có tin đăng bán đang hoạt động." />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="grid overflow-hidden rounded-[2rem] bg-[#183f41] text-white lg:grid-cols-[1fr_auto]">
          <div className="p-8 sm:p-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#91c5bd]">Bắt đầu với HomeCycle</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Đừng để món đồ tốt bị lãng phí.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c7dcda]">Đăng tin trong vài bước, kết nối đúng đối tác và cùng xây dựng thói quen tiêu dùng tuần hoàn.</p>
          </div>
          <div className="flex items-center bg-[#23585a] px-8 py-8 lg:px-10">
            <Link
              to={isAuthenticated ? "/bai-dang/tao-moi" : "/auth/register"}
              className="rounded-full border border-white bg-white px-7 py-3.5 text-sm font-extrabold text-[#244f51] transition hover:bg-[#dcebe8]"
            >
              Đăng tin ngay →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;

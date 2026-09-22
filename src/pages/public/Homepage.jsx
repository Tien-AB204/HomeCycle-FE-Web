import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppstoreOutlined,
  HomeOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Link, NavLink, useNavigate } from "react-router-dom";
import ProductCard from "../../components/shared/ProductCard";
import StaleDataWarningModal from "../../components/shared/StaleDataWarningModal";
import { normalizePostType } from "../../constants/marketplace";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import postApi from "../../services/apis/postApi";
import { normalizeRole } from "../../utils/authUtils";
import { BUSINESS_DISCOVERY_REFRESH_EVENT } from "../../utils/businessDiscoveryEvents";
import {
  isPostCatalogStorageEvent,
  POST_CATALOG_CHANGED_EVENT,
} from "../../utils/postCatalogEvents";
import {
  getPostChangedFields,
  POST_CHANGED_WARNING,
  VERIFICATION_FAILED_WARNING,
} from "../../utils/transactionFreshnessUtils";
import {
  getSafeProblemDetail,
  getSafeValidationMessage,
} from "../../utils/safeErrorMessage";

const HOME_PAGE_SIZE = 100;
const BUSINESS_POST_LIMIT = 4;
const PERSONAL_POST_LIMIT = 4;

const CATEGORIES = [
  {
    name: "Điện máy",
    description: "Thiết bị nhà bếp và điện gia dụng",
    icon: ThunderboltOutlined,
    className: "border border-border bg-white text-success",
  },
  {
    name: "Nội thất",
    description: "Bàn ghế, giường tủ cho mọi không gian",
    icon: AppstoreOutlined,
    className: "border border-border bg-white text-warning",
  },
  {
    name: "Đồ sinh hoạt",
    description: "Đồ dùng tiện ích cho gia đình",
    icon: HomeOutlined,
    className: "border border-border bg-white text-primary",
  },
];

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const getErrorMessage = (error) => {
  const responseData =
    error?.response?.data;

  return (
    getSafeValidationMessage(
      responseData?.errors,
    ) ||
    getSafeProblemDetail(
      responseData?.error?.message,
    ) ||
    getSafeProblemDetail(
      responseData?.message,
    ) ||
    "Không thể tải danh sách bài đăng."
  );
};

const isActivePost = (post) =>
  String(post?.status || "").toLowerCase() === "active";

const hasPostType = (post, postType) => {
  const normalizedPostType =
    normalizePostType(postType);

  return (
    Boolean(normalizedPostType) &&
    normalizePostType(
      post?.postType,
    ) === normalizedPostType
  );
};

const LoadingCards = ({ count }) => {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
    >
      <div className="h-44 animate-pulse bg-background sm:h-48 lg:h-44 xl:h-48" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-border/40" />
        <div className="h-5 w-4/5 animate-pulse rounded-full bg-border/40" />
        <div className="h-4 w-full animate-pulse rounded-full bg-background" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-background" />
      </div>
    </div>
  ));
};

const EmptyPosts = ({ message }) => (
  <div className="col-span-full rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
    <p className="text-sm font-semibold text-textLight">{message}</p>
  </div>
);

const BusinessSurveyPrompt = () => (
  <section className="pb-12">
    <div className="grid gap-5 rounded-[2rem] border border-border bg-gradient-to-br from-background via-white to-background p-6 shadow-[0_12px_36px_rgba(23,40,48,0.06)] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-primary"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[30px]">
          query_stats
        </span>
      </span>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
          Dành riêng cho doanh nghiệp
        </p>
        <h2 className="mt-2 text-xl font-black leading-snug text-text sm:text-2xl">
          Hãy thực hiện khảo sát để hệ thống đề xuất cho bạn những sản phẩm phù hợp
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-textLight">
          Chọn khu vực, loại sản phẩm và tình trạng hàng hóa doanh nghiệp quan tâm.
        </p>
      </div>
      <Link
        to="/ho-so?tab=survey"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="material-symbols-outlined text-[18px]">
          tune
        </span>
        Thực hiện khảo sát
      </Link>
    </div>
  </section>
);

const SectionHeader = ({ eyebrow, title, description, to }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-text sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-textLight">{description}</p>
    </div>
    <NavLink
      to={to}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary bg-white px-4 py-2 text-sm font-extrabold text-primary transition hover:bg-primary hover:text-white"
    >
      Xem tất cả <span aria-hidden="true">→</span>
    </NavLink>
  </div>
);

const Homepage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [discoveryState, setDiscoveryState] = useState({
    status: "idle",
    items: [],
  });
  const [staleWarning, setStaleWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const normalizedRole = normalizeRole(user?.role);
  const isBusinessUser = isAuthenticated && normalizedRole === ROLES.BUSINESS;
  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    postApi
      .getAllActive({
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

    let isActive = true;
    let activeController = null;

    const refreshRecommendations = async (showLoading = false) => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      if (showLoading && isActive) {
        setDiscoveryState((current) => ({ ...current, status: "loading" }));
      }

      try {
        const result = await postApi.discoverBusiness({
          pageNumber: 1,
          pageSize: 12,
          signal: controller.signal,
        });
        if (isActive) {
          setDiscoveryState({ status: "ready", items: result.items || [] });
        }
      } catch (requestError) {
        if (!isActive || isCanceledRequest(requestError)) return;
        const responseData = requestError?.response?.data;
        const errorCode = responseData?.code || responseData?.error?.code;
        if (Number(requestError?.response?.status) === 409 && errorCode === "SURVEY_REQUIRED") {
          setDiscoveryState({ status: "surveyRequired", items: [] });
        } else {
          setDiscoveryState({ status: "error", items: [] });
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
    window.addEventListener(
      BUSINESS_DISCOVERY_REFRESH_EVENT,
      refreshWhenVisible,
    );
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      isActive = false;
      activeController?.abort();
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener(
        POST_CATALOG_CHANGED_EVENT,
        refreshWhenVisible,
      );
      window.removeEventListener(
        BUSINESS_DISCOVERY_REFRESH_EVENT,
        refreshWhenVisible,
      );
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [isBusinessUser, requestVersion]);

  const buyPosts = useMemo(
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

  const recommendedPosts = discoveryState.items;

  const handleRecommendationOpen = useCallback(
    async (post) => {
      try {
        const latestPost = await postApi.getById(post.postId);
        const verifiedPost = { ...post, ...latestPost };
        const changedFields = getPostChangedFields(post, verifiedPost);

        if (changedFields.length > 0) {
          setStaleWarning({
            postId: post.postId,
            message: POST_CHANGED_WARNING,
            changedFields,
          });
          return false;
        }

        setDiscoveryState((current) => ({
          ...current,
          items: current.items.map((currentPost) =>
            currentPost.postId === post.postId ? verifiedPost : currentPost,
          ),
        }));
        return true;
      } catch {
        setStaleWarning({ message: VERIFICATION_FAILED_WARNING });
        return false;
      }
    },
    [],
  );

  const handlePostOpen = useCallback(async (post) => {
    try {
      const latestPost = await postApi.getById(post.postId);
      const verifiedPost = {
        ...post,
        ...latestPost,
        product: { ...(post.product || {}), ...(latestPost.product || {}) },
      };
      const changedFields = getPostChangedFields(post, verifiedPost);

      if (changedFields.length > 0) {
        setStaleWarning({
          postId: post.postId,
          message: POST_CHANGED_WARNING,
          changedFields,
        });
        return false;
      }

      setPosts((currentPosts) =>
        currentPosts.map((currentPost) =>
          currentPost.postId === post.postId ? verifiedPost : currentPost,
        ),
      );
      return true;
    } catch {
      setStaleWarning({ message: VERIFICATION_FAILED_WARNING });
      return false;
    }
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError("");
    setRequestVersion((currentVersion) => currentVersion + 1);
  };

  return (
    <div className="hc-home pb-12">
      <h1 className="sr-only">Chợ đồ cũ HomeCycle</h1>
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <section className="py-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Danh mục nổi bật</p>
              <h2 className="mt-2 text-2xl font-black text-text sm:text-3xl">Khám phá theo nhu cầu</h2>
            </div>
            <Link to="/search?showFilter=1" className="hidden rounded-full border border-primary bg-white px-4 py-2 text-sm font-extrabold text-primary transition hover:bg-primary hover:text-white sm:inline-flex">
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
                  className={`group flex items-center gap-4 rounded-lg p-4 transition hover:border-primary ${category.className}`}
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
          <div role="alert" className="mb-8 flex flex-col items-start justify-between gap-3 rounded-2xl border border-error/20 bg-error/10 p-4 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-error">{error}</p>
            <button type="button" onClick={handleRetry} className="rounded-full bg-error px-5 py-2 text-sm font-bold text-white hover:bg-error/90">
              Thử lại
            </button>
          </div>
        )}

        {isBusinessUser && discoveryState.status === "surveyRequired" && (
          <BusinessSurveyPrompt />
        )}

        {isBusinessUser &&
          discoveryState.status !== "surveyRequired" && (
            <section className="pb-12">
              <div className="overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-background via-white to-background p-5 shadow-[0_12px_36px_rgba(23,40,48,0.06)] sm:p-7">
                <SectionHeader
                  eyebrow="Dành riêng cho doanh nghiệp"
                  title="Nguồn hàng phù hợp khảo sát"
                  description="Các tin bán được ưu tiên theo loại sản phẩm, khu vực và tình trạng hàng hóa doanh nghiệp đã chọn trong khảo sát."
                  to="/tin-dang-ban?view=recommended"
                />

                {discoveryState.status === "error" && (
                  <div
                    role="alert"
                    className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
                  >
                    <span>Không thể tải nguồn hàng phù hợp lúc này.</span>
                    <button type="button" onClick={handleRetry} className="rounded-full bg-error px-4 py-2 text-xs font-black text-white">Thử lại</button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {discoveryState.status === "error" ? null : discoveryState.status === "loading" || discoveryState.status === "idle" ? (
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
                    <EmptyPosts message="Hiện chưa có bài bán phù hợp với nhu cầu thu mua của doanh nghiệp." />
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <Link
                    to="/ho-so?tab=survey"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary/90"
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

        {!isBusinessUser && (
          <section className="pb-12">
            <SectionHeader
              eyebrow="Đang cần tìm"
              title="Nhu cầu thu mua mới"
              description="Kết nối với người đang tìm đúng sản phẩm bạn có và chủ động gửi đề nghị phù hợp."
              to="/tin-thu-mua"
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {loading ? (
                <LoadingCards count={BUSINESS_POST_LIMIT} />
              ) : buyPosts.length > 0 ? (
                buyPosts.map((post) => (
                  <ProductCard key={post.postId} data={post} variant="business-buy" onBeforeOpen={handlePostOpen} />
                ))
              ) : (
                <EmptyPosts message="Hiện chưa có tin thu mua đang hoạt động." />
              )}
            </div>
          </section>
        )}
      </div>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionHeader
            eyebrow="Đồ cũ còn tốt"
            title="Sản phẩm mới đăng"
            description="Khám phá sản phẩm từ cộng đồng và gửi mức giá bạn mong muốn ngay trên HomeCycle."
            to="/tin-dang-ban?view=marketplace"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              <LoadingCards count={PERSONAL_POST_LIMIT} />
            ) : personalPosts.length > 0 ? (
              personalPosts.map((post) => (
                <ProductCard key={post.postId} data={post} variant="personal-sell" onBeforeOpen={handlePostOpen} />
              ))
            ) : (
              <EmptyPosts message="Hiện chưa có tin đăng bán đang hoạt động." />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="grid overflow-hidden rounded-[2rem] bg-primary text-white lg:grid-cols-[1fr_auto]">
          <div className="p-8 sm:p-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">Bắt đầu với HomeCycle</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Đừng để món đồ tốt bị lãng phí.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Đăng tin trong vài bước, kết nối đúng đối tác và cùng xây dựng thói quen tiêu dùng tuần hoàn.</p>
          </div>
          <div className="flex items-center bg-primary/90 px-8 py-8 lg:px-10">
            <Link
              to={isAuthenticated ? "/bai-dang/tao-moi" : "/auth/register"}
              className="rounded-full border border-white bg-white px-7 py-3.5 text-sm font-extrabold text-primary transition hover:bg-background"
            >
              Đăng tin ngay →
            </Link>
          </div>
        </div>
      </section>
      <StaleDataWarningModal
        open={Boolean(staleWarning)}
        title={staleWarning?.title}
        message={staleWarning?.message}
        changedFields={staleWarning?.changedFields}
        onAcknowledge={() => {
          const postId = staleWarning?.postId;
          setStaleWarning(null);
          if (postId) {
            navigate(
              `/posts/${encodeURIComponent(postId)}`,
              {
                state: {
                  returnTo: "/",
                  returnState: null,
                },
              },
            );
          }
        }}
      />
    </div>
  );
};

export default Homepage;

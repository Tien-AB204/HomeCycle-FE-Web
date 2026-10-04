import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import logoIcon from "../../assets/brand/logo-icon.png";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  AppstoreOutlined,
  FilterOutlined,
  ReloadOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import ProductCard from "../../components/shared/ProductCard";
import StaleDataWarningModal from "../../components/shared/StaleDataWarningModal";
import {
  MARKETPLACE_POST_TYPES,
  normalizePostType,
} from "../../constants/marketplace";
import { ROLES } from "../../constants/roles";
import SearchFilterPanel from "../../features/search/SearchFilterPanel";
import {
  buildSearchCriteria,
  countActiveFilters,
  createInitialFilters,
  DEFAULT_SORT_MODE,
  isSortMode,
  restoreFilters,
  SEARCH_SORT_OPTIONS,
} from "../../features/search/searchFilters";
import { useSearchFilterOptions } from "../../features/search/useSearchFilterOptions";
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
import {
  getPostChangedFields,
  POST_CHANGED_WARNING,
  VERIFICATION_FAILED_WARNING,
} from "../../utils/transactionFreshnessUtils";
import {
  getSafeProblemDetail,
  getSafeValidationMessage,
} from "../../utils/safeErrorMessage";

const PAGE_SIZE = 9;

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

/*
 * GET /business-profiles/survey-detail (BusinessProfileService.
 * GetProcurementPreferenceAsync) trả lỗi 400 với đúng 2 mã hợp đồng đã biết
 * khi doanh nghiệp chưa có khảo sát: "Survey.NotFound" (chưa có hồ sơ
 * doanh nghiệp) và "BusinessProfile.NotFound" (có hồ sơ nhưng chưa lưu
 * khảo sát) - đây là 2 trạng thái nghiệp vụ bình thường, không phải lỗi kỹ
 * thuật. Chỉ đúng 2 mã này mới được coi là "chưa đặt tiêu chí"; mọi lỗi
 * khác (mất mạng, timeout, lỗi máy chủ 5xx, lỗi không xác định...) phải đi
 * tiếp vào luồng lỗi kỹ thuật hiện có, không được giả vờ là trạng thái
 * "chưa có khảo sát". Đọc theo mã (code), không dựa vào nội dung message
 * tiếng Anh, vì message có thể đổi mà không phá hợp đồng.
 */
const SURVEY_INCOMPLETE_ERROR_CODES = new Set([
  "Survey.NotFound",
  "BusinessProfile.NotFound",
]);

const isSurveyIncompleteError = (error) => {
  const responseData = error?.response?.data;
  const code =
    responseData?.code ||
    responseData?.error?.code ||
    "";

  return SURVEY_INCOMPLETE_ERROR_CODES.has(
    String(code).trim(),
  );
};

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
    "Không thể tìm kiếm bài đăng."
  );
};

const getPostTimestamp = (post) => {
  const timestamp = new Date(
    post?.createdAt || 0,
  ).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
};

const getPostPrice = (post) => {
  const price = Number(post?.basePrice);

  return Number.isFinite(price) ? price : 0;
};

const sortPosts = (posts, sortMode) => {
  const sortedPosts = Array.isArray(posts)
    ? [...posts]
    : [];

  switch (sortMode) {
    case "oldest":
      return sortedPosts.sort(
        (firstPost, secondPost) =>
          getPostTimestamp(firstPost) -
          getPostTimestamp(secondPost),
      );
    case "price-ascending":
      return sortedPosts.sort(
        (firstPost, secondPost) =>
          getPostPrice(firstPost) -
          getPostPrice(secondPost),
      );
    case "price-descending":
      return sortedPosts.sort(
        (firstPost, secondPost) =>
          getPostPrice(secondPost) -
          getPostPrice(firstPost),
      );
    case "newest":
    default:
      return sortedPosts.sort(
        (firstPost, secondPost) =>
          getPostTimestamp(secondPost) -
          getPostTimestamp(firstPost),
      );
  }
};

const MarketplaceMark = ({ className = "" }) => (
  <span
    className={`block overflow-hidden rounded-2xl bg-primary shadow-md ${className}`}
    aria-hidden="true"
  >
    <img
      src={logoIcon}
      alt=""
      className="h-full w-full scale-[1.42] object-cover"
    />
  </span>
);

const SearchLoading = () => {
  return Array.from(
    { length: PAGE_SIZE },
    (_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_26px_rgba(23,40,48,0.06)]"
      >
        <div className="h-48 animate-pulse bg-border/20" />
        <div className="space-y-3 p-4">
          <div className="h-3 w-1/3 animate-pulse rounded bg-border/30" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-border/30" />
          <div className="h-4 w-full animate-pulse rounded bg-border/20" />
          <div className="h-9 w-full animate-pulse rounded bg-border/20" />
        </div>
      </div>
    ),
  );
};

const SearchPage = ({ fixedPostType, recommendationMode = false }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const restoredSearchState =
    location.state?.searchPageState;
  const businessUserId = getUserId(user);
  const [searchParams, setSearchParams] =
    useSearchParams();
  const keyword =
    searchParams.get("keyword")?.trim() ||
    "";
  const fixedPostTypeValue =
    fixedPostType === "SELL"
      ? "Sell"
      : fixedPostType === "BUY"
        ? "Buy"
        : "";
  const hasFilterVisibility =
    searchParams.has("showFilter");
  const isFilterOpen = hasFilterVisibility
    ? searchParams.get("showFilter") === "1"
    : Boolean(fixedPostType);

  const isBusinessUser =
    normalizeRole(user?.role) === ROLES.BUSINESS;

  const [filters, setFilters] = useState(() => {
    if (restoredSearchState?.filters) {
      return restoreFilters(restoredSearchState.filters);
    }

    /*
     * Trang chủ mở tìm kiếm theo danh mục qua ?categoryId=.
     */
    const categoryId = searchParams.get("categoryId")?.trim() || "";

    return {
      ...createInitialFilters(),
      categoryId,
      productTypeId: categoryId
        ? searchParams.get("productTypeId")?.trim() || ""
        : "",
    };
  });
  const [pageNumber, setPageNumber] =
    useState(() => {
      const restoredPage = Number(
        restoredSearchState?.pageNumber,
      );

      return Number.isInteger(restoredPage) &&
        restoredPage > 0
        ? restoredPage
        : 1;
    });
  const [sortMode, setSortMode] =
    useState(() =>
      isSortMode(restoredSearchState?.sortMode)
        ? restoredSearchState.sortMode
        : DEFAULT_SORT_MODE,
    );
  const filterOptions = useSearchFilterOptions({
    categoryId: filters.categoryId,
    productTypeId: filters.productTypeId,
  });

  /*
   * Chế độ đề xuất tải một lần tối đa 100 tin rồi tự sắp xếp và phân trang,
   * nên chỉ tìm kiếm thường mới gửi kiểu sắp xếp lên Backend.
   */
  const backendSortMode = recommendationMode
    ? DEFAULT_SORT_MODE
    : sortMode;

  const searchCriteria = useMemo(
    () =>
      buildSearchCriteria({
        filters,
        keyword,
        fixedPostType: fixedPostTypeValue,
        isBusinessUser,
        sortMode: backendSortMode,
      }),
    [
      backendSortMode,
      filters,
      fixedPostTypeValue,
      isBusinessUser,
      keyword,
    ],
  );

  const requestPayload = useMemo(
    () => ({
      ...searchCriteria,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [pageNumber, searchCriteria],
  );

  const recommendationRequestPayload = useMemo(
    () => ({
      ...searchCriteria,
      pageSize: 100,
    }),
    [searchCriteria],
  );

  const requestKey = useMemo(
    () => JSON.stringify(requestPayload),
    [requestPayload],
  );

  const recommendationRequestKey = useMemo(
    () => JSON.stringify(recommendationRequestPayload),
    [recommendationRequestPayload],
  );

  const [searchState, setSearchState] =
    useState({
      requestKey: "",
      result: null,
      error: "",
    });
  const [recommendationState, setRecommendationState] = useState({
    requestKey: "",
    result: null,
    error: "",
  });
  const [recommendationSurvey, setRecommendationSurvey] = useState(null);
  const [recommendationNotice, setRecommendationNotice] = useState("");
  const [staleWarning, setStaleWarning] = useState(null);
  const detailNavigationState = useMemo(
    () => ({
      returnTo: `${location.pathname}${location.search}`,
      returnState: {
        searchPageState: {
          filters,
          pageNumber,
          sortMode,
        },
      },
    }),
    [
      filters,
      location.pathname,
      location.search,
      pageNumber,
      sortMode,
    ],
  );

  useEffect(() => {
    if (recommendationMode) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    postApi
      .search({
        ...requestPayload,
        signal: controller.signal,
      })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setSearchState({
          requestKey,
          result,
          error: "",
        });
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setSearchState({
          requestKey,
          result: null,
          error:
            getErrorMessage(requestError),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [recommendationMode, requestKey, requestPayload]);

  useEffect(() => {
    if (!recommendationMode) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;
    let isRefreshing = false;
    let refreshQueued = false;
    const surveySnapshot = getBusinessSurveySnapshot(businessUserId);
    const surveyRequest = isFreshBusinessSurveySnapshot(surveySnapshot)
      ? Promise.resolve(surveySnapshot.survey)
      : businessProfileApi
          .getSurveyDetail({
            signal: controller.signal,
            skipGlobalErrorPage: true,
          })
          .catch((requestError) => {
            if (surveySnapshot) {
              return surveySnapshot.survey;
            }

            throw requestError;
          });

    const refreshRecommendations = async (showInitialError = false) => {
      if (isRefreshing) {
        refreshQueued = true;
        return;
      }

      isRefreshing = true;

      try {
        let survey;

        try {
          survey = normalizeBusinessSurvey(
            await surveyRequest,
          );
        } catch (surveyError) {
          if (
            isCanceledRequest(surveyError) ||
            !isSurveyIncompleteError(surveyError)
          ) {
            /*
             * Lỗi kỹ thuật thật (mất mạng, timeout, 5xx, ...) hoặc request
             * bị huỷ - không được che thành trạng thái "chưa đặt tiêu chí".
             * Ném tiếp để rơi vào catch bên ngoài, hiển thị đúng lỗi kỹ
             * thuật và cho phép thử lại.
             */
            throw surveyError;
          }

          /*
           * Chỉ 2 mã lỗi hợp đồng đã biết ở trên (khảo sát/hồ sơ doanh
           * nghiệp chưa tồn tại) mới là trạng thái bình thường - dùng khảo
           * sát rỗng để rơi đúng vào nhánh "chưa đặt tiêu chí" bên dưới.
           */
          survey = normalizeBusinessSurvey(null);
        }

        const items = hasCompletedBusinessSurvey(survey)
          ? getBusinessRecommendations({
              posts: await businessRecommendationApi.search({
                survey,
                searchCriteria: recommendationRequestPayload,
                signal: controller.signal,
              }),
              survey,
              limit: Number.POSITIVE_INFINITY,
            })
          : [];

        if (isActive) {
          setRecommendationSurvey(survey);
          setRecommendationState({
            requestKey: recommendationRequestKey,
            result: {
              items,
              totalCount: items.length,
            },
            error: "",
          });
        }
      } catch (requestError) {
        if (
          isActive &&
          showInitialError &&
          !isCanceledRequest(requestError)
        ) {
          setRecommendationState({
            requestKey: recommendationRequestKey,
            result: null,
            error: getErrorMessage(requestError),
          });
        }
      } finally {
        isRefreshing = false;

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
  }, [
    businessUserId,
    recommendationMode,
    recommendationRequestKey,
    recommendationRequestPayload,
  ]);

  const activeRequestKey = recommendationMode
    ? recommendationRequestKey
    : requestKey;
  const activeSearchState = recommendationMode
    ? recommendationState
    : searchState;
  const isLoading =
    activeSearchState.requestKey !== activeRequestKey;
  const sourceResult =
    activeSearchState.requestKey === activeRequestKey
      ? activeSearchState.result
      : null;
  const error =
    activeSearchState.requestKey === activeRequestKey
      ? activeSearchState.error
      : "";

  const isRecommendationSurveyIncomplete =
    recommendationMode &&
    Boolean(recommendationSurvey) &&
    !hasCompletedBusinessSurvey(recommendationSurvey);

  const sortedPosts = useMemo(
    () => {
      if (!recommendationMode) {
        return sourceResult?.items || [];
      }

      const startIndex = (pageNumber - 1) * PAGE_SIZE;

      return sortPosts(sourceResult?.items, sortMode).slice(
        startIndex,
        startIndex + PAGE_SIZE,
      );
    },
    [pageNumber, recommendationMode, sortMode, sourceResult?.items],
  );

  const result = useMemo(() => {
    if (!sourceResult || !recommendationMode) {
      return sourceResult;
    }

    const totalCount = sourceResult.totalCount || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return {
      ...sourceResult,
      pageNumber,
      pageSize: PAGE_SIZE,
      totalPages,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < totalPages,
    };
  }, [pageNumber, recommendationMode, sourceResult]);

  const handlePostOpen = useCallback(
    async (post) => {
      if (recommendationMode && !recommendationSurvey) {
        setRecommendationNotice(
          "Không thể kiểm tra bài đăng vì dữ liệu khảo sát chưa sẵn sàng.",
        );
        return false;
      }

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
        const changedFields = getPostChangedFields(post, verifiedPost);
        const mismatchMessage = recommendationMode
          ? getBusinessRecommendationMismatchMessage(
              verifiedPost,
              recommendationSurvey,
            )
          : "";

        if (mismatchMessage) {
          setStaleWarning({
            postId: post.postId,
            title: "Bài đăng không còn phù hợp khảo sát",
            message: mismatchMessage,
            changedFields,
          });
          return false;
        }

        if (changedFields.length > 0) {
          setStaleWarning({
            postId: post.postId,
            message: POST_CHANGED_WARNING,
            changedFields,
          });
          return false;
        }

        setRecommendationNotice("");
        const updateResult = (currentState) =>
          !currentState.result
            ? currentState
            : {
                ...currentState,
                result: {
                  ...currentState.result,
                  items: currentState.result.items.map((currentPost) =>
                    currentPost.postId === post.postId
                      ? verifiedPost
                      : currentPost,
                  ),
                },
              };

        if (recommendationMode) {
          setRecommendationState(updateResult);
        } else {
          setSearchState(updateResult);
        }
        return true;
      } catch {
        setStaleWarning({ message: VERIFICATION_FAILED_WARNING });
        return false;
      }
    },
    [recommendationMode, recommendationSurvey],
  );

  const handleFiltersChange = (changes) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...changes,
    }));
    setPageNumber(1);
  };

  const handleSortChange = (event) => {
    setSortMode(event.target.value);
    setPageNumber(1);
  };

  const handleToggleFilter = () => {
    const nextSearchParams =
      new URLSearchParams(searchParams);

    nextSearchParams.set(
      "showFilter",
      isFilterOpen ? "0" : "1",
    );
    setSearchParams(nextSearchParams);
  };

  const handleResetFilters = () => {
    setFilters(createInitialFilters());
    setPageNumber(1);
  };

  const pageTitle =
    recommendationMode
      ? "Đề xuất cho doanh nghiệp"
      : fixedPostType === "SELL"
      ? "Tin đăng bán"
      : fixedPostType === "BUY"
        ? "Tin thu mua"
        : "Tìm kiếm bài đăng cùng bộ lọc chuyên biệt theo từng sản phẩm";
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
      <section className="relative mb-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-background via-white to-background p-5 shadow-[0_8px_28px_rgba(23,40,48,0.06)] sm:p-7">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
            <AppstoreOutlined /> HomeCycle Marketplace
          </p>
          <h1 className="mt-2 text-2xl font-black text-text sm:text-[28px]">
            {pageTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-textLight">
            {recommendationMode
              ? "Chỉ hiển thị tin bán đồng thời khớp loại sản phẩm và tỉnh thành doanh nghiệp đã chọn trong khảo sát."
              : fixedPostType === "SELL"
              ? "Tìm kiếm trong các bài đăng bán đang hoạt động."
              : fixedPostType === "BUY"
                ? "Tìm kiếm trong các nhu cầu thu mua đang hoạt động."
                : "Tìm kiếm tất cả bài đăng bán và thu mua trên HomeCycle."}
          </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start">
            <button
              type="button"
              onClick={handleToggleFilter}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition hover:bg-primary hover:text-white"
            >
              <FilterOutlined />
              {isFilterOpen ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <div className="hidden sm:block">
              <MarketplaceMark className="h-16 w-16" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row">
        {isFilterOpen && (
          <SearchFilterPanel
            filters={filters}
            options={filterOptions}
            onChange={handleFiltersChange}
            onReset={handleResetFilters}
            showPostTypeFilter={!fixedPostType && !isBusinessUser}
          />
        )}

        <section className="min-w-0 flex-1">
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-white px-5 py-4 shadow-[0_8px_26px_rgba(23,40,48,0.05)] sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black text-text">
                {keyword
                  ? `Kết quả cho “${keyword}”`
                  : pageTitle}
              </h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-text"
                >
                  <ReloadOutlined /> Xóa {activeFilterCount} bộ lọc đang chọn
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {!isLoading && result && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  {result.totalCount} kết quả
                </span>
              )}
              <label className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-textLight">
                  <SortAscendingOutlined /> Sắp xếp:
                </span>
                <select
                  value={sortMode}
                  onChange={handleSortChange}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {SEARCH_SORT_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error/10 p-5 text-sm text-error"
            >
              {error}
            </div>
          )}

          {recommendationNotice && recommendationMode && (
            <div
              role="alert"
              className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm font-semibold text-warning"
            >
              {recommendationNotice}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <SearchLoading />
            ) : sortedPosts.length > 0 ? (
              sortedPosts.map((post) => (
                <ProductCard
                  key={post.postId}
                  data={post}
                  variant={
                    normalizePostType(
                      post.postType,
                    ) ===
                    MARKETPLACE_POST_TYPES.BUY
                      ? "business-buy"
                      : "personal-sell"
                  }
                  onBeforeOpen={handlePostOpen}
                  navState={detailNavigationState}
                />
              ))
            ) : !error ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center shadow-sm">
                <MarketplaceMark className="mx-auto h-16 w-16 text-4xl" />
                <h3 className="mt-3 font-bold text-text">
                  {isRecommendationSurveyIncomplete
                    ? "Doanh nghiệp chưa đặt tiêu chí cụ thể."
                    : recommendationMode
                      ? "Chưa có tin bán phù hợp khảo sát"
                      : "Không tìm thấy bài đăng phù hợp"}
                </h3>
                <p className="mt-1 text-sm text-textLight">
                  {isRecommendationSurveyIncomplete
                    ? "Thiết lập khảo sát thu mua để HomeCycle đề xuất tin bán phù hợp hơn."
                    : recommendationMode
                      ? "Bạn có thể cập nhật khảo sát hoặc thử lại khi có tin đăng mới."
                      : "Hãy thử từ khóa hoặc bộ lọc khác."}
                </p>
                {isRecommendationSurveyIncomplete && (
                  <Link
                    to="/ho-so?tab=survey"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary/90"
                  >
                    Cập nhật khảo sát
                  </Link>
                )}
              </div>
            ) : null}
          </div>

          {!isLoading &&
            !error &&
            result?.totalCount > 0 && (
              <div className="mt-7 flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-sm sm:flex-row">
                <p className="text-sm text-textLight">
                  Trang {result.pageNumber} /{" "}
                  {Math.max(
                    result.totalPages,
                    1,
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPageNumber(
                        (currentPage) =>
                          Math.max(
                            currentPage - 1,
                            1,
                          ),
                      )
                    }
                    disabled={
                      !result.hasPreviousPage
                    }
                    className="rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPageNumber(
                        (currentPage) =>
                          currentPage + 1,
                      )
                    }
                    disabled={!result.hasNextPage}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
        </section>
      </div>
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
                state: detailNavigationState,
              },
            );
          }
        }}
      />
    </div>
  );
};

export default SearchPage;

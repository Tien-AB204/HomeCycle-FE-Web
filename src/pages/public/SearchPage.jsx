import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  AppstoreOutlined,
  FilterOutlined,
  ReloadOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";
import ProductCard from "../../components/shared/ProductCard";
import {
  CATEGORY_BACKEND_IDS,
  MAIN_CATEGORIES,
} from "../../constants/filterOptions";
import postApi from "../../services/apis/postApi";
import productTypeApi from "../../services/apis/productTypeApi";

const PAGE_SIZE = 8;

const CATEGORY_OPTIONS = [
  {
    value:
      CATEGORY_BACKEND_IDS[
        MAIN_CATEGORIES.APPLIANCE
      ],
    label: "Đồ nội thất",
  },
  {
    value:
      CATEGORY_BACKEND_IDS[
        MAIN_CATEGORIES.ELECTRONIC
      ],
    label: "Điện máy",
  },
  {
    value:
      CATEGORY_BACKEND_IDS[
        MAIN_CATEGORIES.HOUSEHOLD
      ],
    label: "Đồ sinh hoạt",
  },
];

const DELIVERY_OPTIONS = [
  {
    value: "GhnDelivery",
    label: "Giao hàng GHN",
  },
  {
    value: "Unknown",
    label: "Thỏa thuận vận chuyển",
  },
];

const PRIORITY_OPTIONS = [
  { value: "Low", label: "Thấp" },
  { value: "Medium", label: "Trung bình" },
  { value: "High", label: "Cao" },
];

const SORT_OPTIONS = [
  {
    value: "newest",
    label: "Mới nhất",
  },
  {
    value: "oldest",
    label: "Cũ nhất",
  },
  {
    value: "price-ascending",
    label: "Giá tăng dần",
  },
  {
    value: "price-descending",
    label: "Giá giảm dần",
  },
];

const createInitialFilters = () => ({
  postType: "",
  categoryId: "",
  productTypeId: "",
  minPrice: "",
  maxPrice: "",
  city: "",
  deliveryMethod: "",
  priorityLevel: "",
});

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

const getErrorMessage = (error) => {
  const responseData =
    error?.response?.data;

  return (
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    "Không thể tìm kiếm bài đăng."
  );
};

const parseOptionalNumber = (value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : undefined;
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

const SearchLoading = () => {
  return Array.from(
    { length: 6 },
    (_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-2xl border border-[#dceae7] bg-white shadow-[0_8px_26px_rgba(24,63,65,0.06)]"
      >
        <div className="h-48 animate-pulse bg-[#BAC2C1]/20" />
        <div className="space-y-3 p-4">
          <div className="h-3 w-1/3 animate-pulse rounded bg-[#BAC2C1]/30" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-[#BAC2C1]/30" />
          <div className="h-4 w-full animate-pulse rounded bg-[#BAC2C1]/20" />
          <div className="h-9 w-full animate-pulse rounded bg-[#BAC2C1]/20" />
        </div>
      </div>
    ),
  );
};

const SearchPage = ({ fixedPostType }) => {
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

  const [filters, setFilters] = useState(
    createInitialFilters,
  );
  const [pageNumber, setPageNumber] =
    useState(1);
  const [sortMode, setSortMode] =
    useState("newest");
  const [productTypes, setProductTypes] =
    useState([]);
  const [isLoadingProductTypes, setIsLoadingProductTypes] =
    useState(false);

  const requestPayload = useMemo(
    () => ({
      pageNumber,
      pageSize: PAGE_SIZE,
      keyword,
      postType:
        fixedPostTypeValue ||
        filters.postType,
      categoryId: filters.categoryId,
      productTypeId:
        filters.productTypeId,
      minPrice: parseOptionalNumber(
        filters.minPrice,
      ),
      maxPrice: parseOptionalNumber(
        filters.maxPrice,
      ),
      city: filters.city,
      deliveryMethod:
        filters.deliveryMethod,
      priorityLevel:
        filters.priorityLevel,
      onlyAvailable: true,
      sortBy: "Newest",
      attributeFilters: [],
    }),
    [
      filters.categoryId,
      filters.city,
      filters.deliveryMethod,
      filters.maxPrice,
      filters.minPrice,
      filters.postType,
      filters.priorityLevel,
      filters.productTypeId,
      fixedPostTypeValue,
      keyword,
      pageNumber,
    ],
  );

  const requestKey = useMemo(
    () => JSON.stringify(requestPayload),
    [requestPayload],
  );

  const [searchState, setSearchState] =
    useState({
      requestKey: "",
      result: null,
      error: "",
    });

  useEffect(() => {
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
  }, [requestKey, requestPayload]);

  useEffect(() => {
    if (!filters.categoryId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    productTypeApi
      .getByCategory(
        filters.categoryId,
        {
          signal: controller.signal,
        },
      )
      .then((items) => {
        if (!isActive) {
          return;
        }

        setProductTypes(
          items.filter(
            (item) =>
              item?.isActive !== false,
          ),
        );
        setIsLoadingProductTypes(false);
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setProductTypes([]);
        setIsLoadingProductTypes(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [filters.categoryId]);

  const isLoading =
    searchState.requestKey !== requestKey;
  const result =
    searchState.requestKey === requestKey
      ? searchState.result
      : null;
  const error =
    searchState.requestKey === requestKey
      ? searchState.error
      : "";

  const sortedPosts = useMemo(
    () =>
      sortPosts(result?.items, sortMode),
    [result?.items, sortMode],
  );

  const updateFilter = (name, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
    setPageNumber(1);
  };

  const handleCategoryChange = (event) => {
    const categoryId = event.target.value;

    setProductTypes([]);
    setIsLoadingProductTypes(
      Boolean(categoryId),
    );
    setFilters((currentFilters) => ({
      ...currentFilters,
      categoryId,
      productTypeId: "",
    }));
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
    setFilters(
      createInitialFilters(),
    );
    setProductTypes([]);
    setIsLoadingProductTypes(false);
    setPageNumber(1);
  };

  const pageTitle =
    fixedPostType === "SELL"
      ? "Tin đăng bán"
      : fixedPostType === "BUY"
        ? "Tin thu mua"
        : "Tìm kiếm bài đăng cùng bộ lọc chuyên biệt theo từng sản phẩm";
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== "" && value != null,
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
      <section className="relative mb-4 overflow-hidden rounded-2xl border border-[#d8e8e5] bg-gradient-to-r from-[#edf6f3] via-white to-[#e8f1f8] p-5 shadow-[0_8px_28px_rgba(24,63,65,0.06)] sm:p-7">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#2f6f9f]/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#2f6f9f]">
            <AppstoreOutlined /> HomeCycle Marketplace
          </p>
          <h1 className="mt-2 text-2xl font-black text-[#183f41] sm:text-[28px]">
            {pageTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647f7d]">
            {fixedPostType === "SELL"
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
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2f6f9f] bg-white px-4 py-2.5 text-sm font-bold text-[#2f6f9f] shadow-sm transition hover:bg-[#2f6f9f] hover:text-white"
            >
              <FilterOutlined />
              {isFilterOpen ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <img
              src={homeCycleMark}
              alt=""
              className="hidden h-16 w-16 rounded-2xl shadow-md sm:block"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row">
        {isFilterOpen && (
          <aside className="h-fit w-full shrink-0 rounded-2xl border border-[#dceae7] bg-white p-5 shadow-[0_10px_32px_rgba(24,63,65,0.06)] lg:sticky lg:top-24 lg:w-72">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-black text-[#183f41]">
                <FilterOutlined className="text-[#2f6f9f]" /> Bộ lọc
              </h2>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2f6f9f] hover:text-[#183f41]"
              >
                <ReloadOutlined /> Đặt lại
              </button>
            </div>

            <div className="space-y-5">
              {!fixedPostType && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
                    Loại bài đăng
                  </span>
                  <select
                    value={filters.postType}
                    onChange={(event) =>
                      updateFilter(
                        "postType",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-[#d6e5e2] bg-[#fbfdfc] px-3 py-2.5 text-sm text-[#183f41] outline-none transition focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15"
                  >
                    <option value="">
                      Tất cả bài đăng
                    </option>
                    <option value="Buy">
                      Tin thu mua
                    </option>
                    <option value="Sell">
                      Tin đăng bán
                    </option>
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
                  Danh mục
                </span>
                <select
                  value={filters.categoryId}
                  onChange={handleCategoryChange}
                  className="w-full rounded-xl border border-[#d6e5e2] bg-[#fbfdfc] px-3 py-2.5 text-sm text-[#183f41] outline-none transition focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15"
                >
                  <option value="">
                    Tất cả danh mục
                  </option>
                  {CATEGORY_OPTIONS.map(
                    (category) => (
                      <option
                        key={category.value}
                        value={category.value}
                      >
                        {category.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
                  Loại sản phẩm
                </span>
                <select
                  value={filters.productTypeId}
                  onChange={(event) =>
                    updateFilter(
                      "productTypeId",
                      event.target.value,
                    )
                  }
                  disabled={
                    !filters.categoryId ||
                    isLoadingProductTypes
                  }
                  className="w-full rounded-xl border border-[#d6e5e2] bg-[#fbfdfc] px-3 py-2.5 text-sm text-[#183f41] outline-none transition focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">
                    {isLoadingProductTypes
                      ? "Đang tải..."
                      : "Tất cả loại sản phẩm"}
                  </option>
                  {productTypes.map(
                    (productType) => (
                      <option
                        key={
                          productType.productTypeId
                        }
                        value={
                          productType.productTypeId
                        }
                      >
                        {
                          productType.productTypeName
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
                  Khoảng giá
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={filters.minPrice}
                    onChange={(event) =>
                      updateFilter(
                        "minPrice",
                        event.target.value,
                      )
                    }
                    placeholder="Từ"
                    className="min-w-0 rounded-xl border border-[#d6e5e2] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none transition focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15"
                  />
                  <input
                    type="number"
                    min="0"
                    value={filters.maxPrice}
                    onChange={(event) =>
                      updateFilter(
                        "maxPrice",
                        event.target.value,
                      )
                    }
                    placeholder="Đến"
                    className="min-w-0 rounded-xl border border-[#d6e5e2] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none transition focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15"
                  />
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
                  Thành phố
                </span>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(event) =>
                    updateFilter(
                      "city",
                      event.target.value,
                    )
                  }
                  placeholder="Ví dụ: Hồ Chí Minh"
                  className="w-full rounded-xl border border-[#d6e5e2] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none transition focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
                  Vận chuyển
                </span>
                <select
                  value={filters.deliveryMethod}
                  onChange={(event) =>
                    updateFilter(
                      "deliveryMethod",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-[#d6e5e2] bg-[#fbfdfc] px-3 py-2.5 text-sm text-[#183f41] outline-none transition focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15"
                >
                  <option value="">
                    Tất cả hình thức
                  </option>
                  {DELIVERY_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
                  Độ ưu tiên
                </span>
                <select
                  value={filters.priorityLevel}
                  onChange={(event) =>
                    updateFilter(
                      "priorityLevel",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-[#d6e5e2] bg-[#fbfdfc] px-3 py-2.5 text-sm text-[#183f41] outline-none transition focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15"
                >
                  <option value="">
                    Tất cả mức độ
                  </option>
                  {PRIORITY_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
          </aside>
        )}

        <section className="min-w-0 flex-1">
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-[#dceae7] bg-white px-5 py-4 shadow-[0_8px_26px_rgba(24,63,65,0.05)] sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black text-[#183f41]">
                {keyword
                  ? `Kết quả cho “${keyword}”`
                  : pageTitle}
              </h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#2f6f9f] hover:text-[#183f41]"
                >
                  <ReloadOutlined /> Xóa {activeFilterCount} bộ lọc đang chọn
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {!isLoading && result && (
                <span className="rounded-full bg-[#e2eef7] px-3 py-1 text-sm font-bold text-[#2f6f9f]">
                  {result.totalCount} kết quả
                </span>
              )}
              <label className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#547B7D]">
                  <SortAscendingOutlined /> Sắp xếp:
                </span>
                <select
                  value={sortMode}
                  onChange={(event) =>
                    setSortMode(
                      event.target.value,
                    )
                  }
                  className="rounded-xl border border-[#cbdeda] bg-white px-3 py-2 text-sm font-semibold text-[#183f41] outline-none focus:border-[#4f8588] focus:ring-2 focus:ring-[#4f8588]/15"
                >
                  {SORT_OPTIONS.map((option) => (
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
              className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
              {error}
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
                    String(
                      post.postType,
                    ).toLowerCase() === "buy"
                      ? "business-buy"
                      : "personal-sell"
                  }
                />
              ))
            ) : !error ? (
              <div className="col-span-full rounded-2xl border border-dashed border-[#a9c9c3] bg-white px-6 py-16 text-center shadow-sm">
                <img src={homeCycleMark} alt="" className="mx-auto h-16 w-16 rounded-2xl shadow-sm" />
                <h3 className="mt-3 font-bold text-[#172830]">
                  Không tìm thấy bài đăng phù
                  hợp
                </h3>
                <p className="mt-1 text-sm text-[#547B7D]">
                  Hãy thử từ khóa hoặc bộ lọc
                  khác.
                </p>
              </div>
            ) : null}
          </div>

          {!isLoading &&
            !error &&
            result?.totalCount > 0 && (
              <div className="mt-7 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#dceae7] bg-white px-5 py-4 shadow-sm sm:flex-row">
                <p className="text-sm text-[#547B7D]">
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
                    className="rounded-xl border border-[#4f8588] bg-white px-4 py-2.5 text-sm font-bold text-[#2f686c] transition hover:bg-[#edf5f2] disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="rounded-xl bg-[#2f6f9f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#245b84] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
        </section>
      </div>
    </div>
  );
};

export default SearchPage;
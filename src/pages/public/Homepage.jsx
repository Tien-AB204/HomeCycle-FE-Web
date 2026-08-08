import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import ProductCard from "../../components/shared/ProductCard";
import { useAuth } from "../../hooks/useAuth";
import postApi from "../../services/apis/postApi";

const HOME_PAGE_SIZE = 20;
const BUSINESS_POST_LIMIT = 4;
const PERSONAL_POST_LIMIT = 3;

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Không thể tải danh sách bài đăng."
  );
};

const isActivePost = (post) => {
  return (
    String(post?.status || "").toLowerCase() ===
    "active"
  );
};

const hasPostType = (post, postType) => {
  return (
    String(post?.postType || "").toLowerCase() ===
    postType.toLowerCase()
  );
};

const LoadingCards = ({ count }) => {
  return Array.from(
    { length: count },
    (_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-md border border-[#BAC2C1]/30 bg-white shadow-sm"
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

const EmptyPosts = ({ message }) => {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-[#BAC2C1] bg-white px-6 py-10 text-center text-sm text-[#547B7D]">
      {message}
    </div>
  );
};

const HomepageSearch = () => {
  const navigate = useNavigate();
  const keywordInputRef = useRef(null);

  const navigateToSearch = (showFilter) => {
    const keyword =
      keywordInputRef.current?.value.trim() ||
      "";
    const searchParams =
      new URLSearchParams();
    if (keyword) {
      searchParams.set("keyword", keyword);
    }

    searchParams.set(
      "showFilter",
      showFilter ? "1" : "0",
    );

    navigate(
      `/search?${searchParams.toString()}`,
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    navigateToSearch(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex max-w-4xl flex-col gap-2 rounded-xl border border-[#547B7D]/70 bg-[#244149]/90 p-3 shadow-lg sm:flex-row"
    >
      <label
        htmlFor="homepage-search-keyword"
        className="sr-only"
      >
        Từ khóa tìm kiếm
      </label>
      <input
        id="homepage-search-keyword"
        ref={keywordInputRef}
        type="search"
        placeholder="Tìm tên sản phẩm, thương hiệu..."
        className="min-w-0 flex-1 rounded-lg border border-[#547B7D] bg-[#315c61] px-4 py-3 text-sm text-white placeholder-[#B7C9D4] outline-none focus:border-[#C1EAEC] focus:ring-1 focus:ring-[#C1EAEC]"
      />

      <button
        type="submit"
        className="rounded-lg bg-[#C1EAEC] px-5 py-3 text-sm font-bold text-[#172830] transition hover:bg-white"
      >
        Tìm kiếm
      </button>
      <button
        type="button"
        onClick={() => navigateToSearch(true)}
        className="rounded-lg border border-[#B7C9D4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2B5659]"
      >
        Bộ lọc
      </button>
    </form>
  );
};

const Homepage = () => {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] =
    useState(0);

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
        if (!isActive) {
          return;
        }

        setPosts(result.items);
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setPosts([]);
        setError(
          getErrorMessage(requestError),
        );
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

  const businessPosts = useMemo(() => {
    return posts
      .filter(
        (post) =>
          isActivePost(post) &&
          hasPostType(post, "Buy"),
      )
      .slice(0, BUSINESS_POST_LIMIT);
  }, [posts]);

  const personalPosts = useMemo(() => {
    return posts
      .filter(
        (post) =>
          isActivePost(post) &&
          hasPostType(post, "Sell"),
      )
      .slice(0, PERSONAL_POST_LIMIT);
  }, [posts]);

  const handleRetry = () => {
    setLoading(true);
    setError("");

    setRequestVersion(
      (currentVersion) =>
        currentVersion + 1,
    );
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-[#f4f5f5] pb-16">
      {!isAuthenticated && (
        <section className="relative flex min-h-[480px] w-full items-center overflow-hidden bg-[#172830] py-10">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000&auto=format&fit=crop"
            alt="Kho hàng HomeCycle"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#172830] via-[#172830]/75 to-transparent" />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
            <div className="max-w-4xl">
              <h1 className="mb-6 text-3xl font-bold uppercase leading-[1.15] tracking-wide text-[#C1EAEC] md:text-4xl">
                Kết nối người bán với đơn vị{" "}
                <br className="hidden md:inline" />
                thu mua đồ gia dụng cũ
              </h1>
              <p className="max-w-2xl text-base font-normal leading-relaxed text-[#B7C9D4] opacity-90 md:text-lg">
                Giải pháp tối ưu cho việc thanh
                lý và tái chế đồ gia dụng. Minh
                bạch giá cả, nhanh chóng kết
                nối, bảo vệ môi trường.
              </p>
              <HomepageSearch />
              <div className="mt-5 flex flex-wrap gap-5">
                <NavLink
                  to="/tin-thu-mua"
                  className="flex items-center gap-2 rounded bg-[#C1EAEC] px-8 py-3.5 text-sm font-bold tracking-wider text-[#172830] shadow-sm transition-all duration-300 hover:bg-white"
                >
                  Bán ngay ➔
                </NavLink>
                <NavLink
                  to="/search"
                  className="rounded border border-[#C1EAEC]/60 bg-transparent px-8 py-3.5 text-sm font-bold tracking-wider text-[#BAC2C1] transition-all duration-300 hover:border-white hover:text-white"
                >
                  Tìm hiểu thêm
                </NavLink>
              </div>
            </div>
          </div>
        </section>
      )}

      <div
        className={
          isAuthenticated
            ? "w-full min-w-0 px-6"
            : "mx-auto max-w-7xl px-6"
        }
      >
        {isAuthenticated && (
          <div className="mb-8 mt-6 w-full rounded-lg bg-[#172830] p-5 text-white shadow-sm">
            <h2 className="mb-1 text-lg font-bold uppercase tracking-wide">
              Chào mừng bạn quay trở lại!
            </h2>
            <p className="max-w-xl text-xs text-[#B7C9D4] opacity-90">
              Hệ thống quản lý tin đăng bán và
              đối tác thu mua đồ gia dụng cũ
              HomeCycle.
            </p>
            <HomepageSearch />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center"
          >
            <p className="text-sm text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded bg-[#7A1012] px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Thử lại
            </button>
          </div>
        )}

        <section
          className={
            isAuthenticated ? "" : "mt-12"
          }
        >
          <div className="mb-6 flex items-end justify-between border-l-4 border-[#2B5659] pl-3">
            <div>
              <h2 className="text-xl font-bold text-[#2A3B43]">
                Tin thu mua (Doanh nghiệp)
              </h2>
              <p className="mt-1 text-sm text-[#346767]">
                Tin đăng thu mua số lượng lớn
                các loại hàng từ doanh nghiệp.
              </p>
            </div>
            <NavLink
              to="/tin-thu-mua"
              className="ml-2 shrink-0 text-sm font-semibold text-[#172830] hover:text-[#547B7D]"
            >
              Xem tất cả ❯
            </NavLink>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              <LoadingCards
                count={BUSINESS_POST_LIMIT}
              />
            ) : businessPosts.length > 0 ? (
              businessPosts.map((post) => (
                <ProductCard
                  key={post.postId}
                  data={post}
                  variant="business-buy"
                />
              ))
            ) : (
              <EmptyPosts message="Hiện chưa có tin thu mua đang hoạt động." />
            )}
          </div>
        </section>

        <section className="mt-16 w-full min-w-0 rounded-xl border border-[#BAC2C1]/50 bg-[#e8ecec] p-6 pb-4 md:p-8 md:pb-6">
          <div className="mb-6 flex items-end justify-between border-l-4 border-[#547B7D] pl-3">
            <div>
              <h2 className="text-xl font-bold text-[#172830]">
                Tin đăng bán thương lượng (Cá
                nhân)
              </h2>
              <p className="mt-1 text-sm text-[#547B7D]">
                Sản phẩm từ người dùng cá nhân,
                gửi yêu cầu định giá thương
                lượng trực tiếp.
              </p>
            </div>
            <NavLink
              to="/tin-dang-ban"
              className="ml-2 shrink-0 text-sm font-semibold text-[#172830] hover:text-[#547B7D]"
            >
              Xem tất cả ❯
            </NavLink>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <LoadingCards
                count={PERSONAL_POST_LIMIT}
              />
            ) : personalPosts.length > 0 ? (
              personalPosts.map((post) => (
                <ProductCard
                  key={post.postId}
                  data={post}
                  variant="personal-sell"
                />
              ))
            ) : (
              <EmptyPosts message="Hiện chưa có tin đăng bán đang hoạt động." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Homepage;

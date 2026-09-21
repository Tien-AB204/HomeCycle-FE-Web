import { useEffect, useMemo, useState } from "react";
import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import { POST_SECTION_TABS } from "../../constants/adminSections";
import AdminPostDetailModal from "../../features/admin/posts/AdminPostDetailModal";
import adminPostApi from "../../services/apis/adminPostApi";
import PostThumbnail from "../../components/shared/PostThumbnail";
import { getSafeProblemDetail } from "../../utils/safeErrorMessage";

const PAGE_SIZE = 10;

const POST_TYPE_OPTIONS = [
  { value: "", label: "Tất cả loại tin" },
  { value: "Sell", label: "Tin đăng bán" },
  { value: "Buy", label: "Tin thu mua" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Draft", label: "Bản nháp" },
  { value: "Active", label: "Đang hoạt động" },
  { value: "Suspended", label: "Đã đình chỉ" },
  { value: "Closed", label: "Đã đóng" },
  { value: "Deleted", label: "Đã xóa" },
];

const STATUS_META = {
  draft: {
    label: "Bản nháp",
    className: "border-border bg-textLight/10 text-textLight",
  },
  active: {
    label: "Đang hoạt động",
    className: "border-success/20 bg-success/10 text-success",
  },
  suspended: {
    label: "Đã đình chỉ",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  closed: {
    label: "Đã đóng",
    className: "border-border bg-background text-textLight",
  },
  deleted: {
    label: "Đã xóa",
    className: "border-error/20 bg-error/10 text-error",
  },
};

const normalizeValue = (value) =>
  String(value || "").trim().toLowerCase();

const getStatusMeta = (status) =>
  STATUS_META[normalizeValue(status)] || {
    label: "Chưa xác định",
    className: "border-border bg-background text-textLight",
  };

/*
 * PostType của Backend có thể null: chỉ "Buy"/"Sell" được gán nhãn; trống
 * hiển thị "—", giá trị lạ hiển thị "Chưa xác định". Không suy ra Sell.
 */
const POST_TYPE_META = {
  buy: {
    label: "Tin thu mua",
    className: "border-success/30 bg-success/10 text-success",
  },
  sell: {
    label: "Tin đăng bán",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
};

const getPostTypeMeta = (postType) => {
  const key = normalizeValue(postType);

  if (!key) {
    return {
      label: "—",
      className: "border-border bg-background text-textLight",
    };
  }

  return (
    POST_TYPE_META[key] || {
      label: "Chưa xác định",
      className: "border-border bg-background text-textLight",
    }
  );
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatQuantity = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const quantity = Number(value);
  return Number.isFinite(quantity)
    ? new Intl.NumberFormat("vi-VN").format(quantity)
    : "—";
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (error?.response?.status === 403) {
    return "Phiên quản trị hiện tại không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại hoặc kiểm tra quyền tài khoản.";
  }

  return (
    getSafeProblemDetail(responseData?.error?.message) ||
    getSafeProblemDetail(responseData?.message) ||
    getSafeProblemDetail(responseData?.title) ||
    "Không thể thực hiện yêu cầu quản lý bài đăng."
  );
};

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const getThumbnailUrl = (post) => {
  const medias = Array.isArray(post?.medias) ? post.medias : [];

  return medias.find((media) => media?.url)?.url || "";
};

const matchesPageFilters = (post, filters) => {
  const keyword = normalizeValue(filters.keyword);
  const postType = normalizeValue(filters.postType);
  const status = normalizeValue(filters.status);

  if (postType && normalizeValue(post?.postType) !== postType) {
    return false;
  }

  if (status && normalizeValue(post?.status) !== status) {
    return false;
  }

  if (!keyword) {
    return true;
  }

  return [
    post?.productName,
    post?.productTypeName,
    post?.categoryName,
    post?.brandName,
    post?.description,
    post?.ownerId,
    post?.postId,
    post?.city,
    post?.ward,
  ].some((value) => normalizeValue(value).includes(keyword));
};

const Badge = ({ meta }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
  >
    {meta.label}
  </span>
);

export default function PostManagementPage() {
  const [pageNumber, setPageNumber] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const requestKey = String(requestVersion);
  const [listState, setListState] = useState({
    requestKey: "",
    error: "",
    result: null,
  });
  const [keyword, setKeyword] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    adminPostApi
      .getAllForManagement({ signal: controller.signal })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setListState({ requestKey, error: "", result });
      })
      .catch((error) => {
        if (!isActive || isCanceledRequest(error)) {
          return;
        }

        setListState({
          requestKey,
          error: getErrorMessage(error),
          result: null,
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [requestKey]);

  const isLoading = listState.requestKey !== requestKey;
  const posts = useMemo(
    () =>
      Array.isArray(listState.result?.items)
        ? listState.result.items
        : [],
    [listState.result],
  );
  const filteredPosts = useMemo(
    () =>
      posts.filter((post) =>
        matchesPageFilters(post, {
          keyword,
          postType: postTypeFilter,
          status: statusFilter,
        }),
      ),
    [keyword, postTypeFilter, posts, statusFilter],
  );
  const totalFilteredPages = Math.max(
    1,
    Math.ceil(filteredPosts.length / PAGE_SIZE),
  );
  const visiblePosts = useMemo(() => {
    const startIndex = (pageNumber - 1) * PAGE_SIZE;

    return filteredPosts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPosts, pageNumber]);
  const hasFilters = Boolean(
    keyword.trim() || postTypeFilter || statusFilter,
  );

  const resetFilters = () => {
    setKeyword("");
    setPostTypeFilter("");
    setStatusFilter("");
    setPageNumber(1);
  };

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <AdminSectionTabs ariaLabel="Khu vực Bài đăng" items={POST_SECTION_TABS} />

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Quản trị nội dung
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text">
          Quản lý bài đăng
        </h1>
        <p className="mt-1 text-sm text-textLight">
          Tra cứu bài đăng bán và tin thu mua ở chế độ chỉ xem. Việc xử lý nội dung thuộc Trung tâm kiểm duyệt.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_190px_auto]">
          <label className="relative block">
            <span className="sr-only">Lọc nhanh bài đăng trong trang</span>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-textLight">
              search
            </span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPageNumber(1);
              }}
              placeholder="Tên sản phẩm, mã bài, mã chủ sở hữu..."
              className="w-full rounded-lg border border-border py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </label>

          <select
            value={postTypeFilter}
            onChange={(event) => {
              setPostTypeFilter(event.target.value);
              setPageNumber(1);
            }}
            aria-label="Lọc theo loại bài đăng"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            {POST_TYPE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPageNumber(1);
            }}
            aria-label="Lọc theo trạng thái bài đăng"
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-textLight transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>


      {isLoading && (
        <div
          role="status"
          className="flex min-h-64 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-sm"
        >
          <span className="material-symbols-outlined animate-spin text-3xl">
            refresh
          </span>
          <span className="ml-3 text-sm font-semibold">
            Đang tải toàn bộ danh sách bài đăng...
          </span>
        </div>
      )}

      {!isLoading && listState.error && (
        <div
          role="alert"
          className="rounded-xl border border-error/20 bg-error/10 p-8 text-center"
        >
          <h2 className="font-bold text-error">
            Không thể tải danh sách bài đăng
          </h2>
          <p className="mt-2 text-sm text-error">{listState.error}</p>
          <button
            type="button"
            onClick={() =>
              setRequestVersion((currentVersion) => currentVersion + 1)
            }
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition hover:bg-error"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !listState.error && filteredPosts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-border">
            inventory_2
          </span>
          <h2 className="mt-3 font-bold text-text">
            Không tìm thấy bài đăng
          </h2>
          <p className="mt-1 text-sm text-textLight">
            {hasFilters
              ? "Không có bài đăng nào trong hệ thống phù hợp bộ lọc."
              : "Hệ thống chưa có bài đăng nào trong trang này."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-bold text-text hover:bg-background"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {!isLoading && !listState.error && visiblePosts.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-white shadow-sm md:block">
            <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[31%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-background text-xs uppercase tracking-wide text-textLight">
                  <th className="px-4 py-3 font-semibold">Bài đăng</th>
                  <th className="px-4 py-3 font-semibold">Loại tin</th>
                  <th className="px-4 py-3 font-semibold">Giá</th>
                  <th className="px-4 py-3 font-semibold">Số lượng</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visiblePosts.map((post) => {
                  const thumbnailUrl = getThumbnailUrl(post);
                  const statusMeta = getStatusMeta(post.status);
                  const postTypeMeta = getPostTypeMeta(post.postType);
                  const isBuyPost = normalizeValue(post.postType) === "buy";

                  return (
                    <tr
                      key={post.postId}
                      className="transition hover:bg-background/70"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {/*
                           * Tin thu mua (Buy) không có ảnh sản phẩm thật -
                           * không hiển thị ảnh/placeholder/vùng dự trữ nào,
                           * kể cả khi Backend còn trả dữ liệu media cũ.
                           */}
                          {!isBuyPost && (
                            <PostThumbnail
                              src={thumbnailUrl}
                              className="h-14 w-16 shrink-0 rounded-lg"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-bold leading-5 text-text">
                              {post.productName || "Bài đăng chưa có tên"}
                            </p>
                            <p
                              title={post.ownerId}
                              className="mt-1 truncate text-xs text-textLight"
                            >
                              Mã chủ sở hữu: {post.ownerId || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge meta={postTypeMeta} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-bold text-text">
                        {formatCurrency(post.basePrice)}
                      </td>
                      <td className="px-4 py-4 text-textLight">
                        {formatQuantity(post.remainingQuantity)}/
                        {formatQuantity(post.quantity)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge meta={statusMeta} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-textLight">
                        {formatDate(post.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPost(post)}
                            title="Xem chi tiết"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-textLight transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                          >
                            <span className="material-symbols-outlined text-[19px]">
                              visibility
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {visiblePosts.map((post) => {
              const thumbnailUrl = getThumbnailUrl(post);
              const statusMeta = getStatusMeta(post.status);
              const postTypeMeta = getPostTypeMeta(post.postType);
              const isBuyPost = normalizeValue(post.postType) === "buy";

              return (
                <article
                  key={post.postId}
                  className="rounded-xl border border-border bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    {/*
                     * Tin thu mua (Buy) không có ảnh sản phẩm thật - không
                     * hiển thị ảnh/placeholder/vùng dự trữ nào, kể cả khi
                     * Backend còn trả dữ liệu media cũ.
                     */}
                    {!isBuyPost && (
                      <PostThumbnail
                        src={thumbnailUrl}
                        className="h-20 w-24 shrink-0 rounded-lg"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 font-bold text-text">
                        {post.productName || "Bài đăng chưa có tên"}
                      </h2>
                      <p className="mt-1 font-bold text-text">
                        {formatCurrency(post.basePrice)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge meta={postTypeMeta} />
                        <Badge meta={statusMeta} />
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
                    <div>
                      <dt className="text-textLight">Số lượng còn lại</dt>
                      <dd className="mt-1 font-semibold text-text">
                        {formatQuantity(post.remainingQuantity)}/
                        {formatQuantity(post.quantity)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-textLight">Ngày tạo</dt>
                      <dd className="mt-1 font-semibold text-text">
                        {formatDate(post.createdAt)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="w-full rounded-lg border border-primary px-3 py-2.5 text-sm font-bold text-primary"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm sm:flex-row">
            <p className="text-sm text-textLight">
              Trang {pageNumber} / {totalFilteredPages} · Hiển thị{" "}
              {filteredPosts.length}/{posts.length} bài đăng
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage - 1)}
                disabled={pageNumber <= 1}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage + 1)}
                disabled={pageNumber >= totalFilteredPages}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </>
      )}

      {selectedPost && (
        <AdminPostDetailModal
          postSummary={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}

    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import AdminPostDetailModal from "../../features/admin/posts/AdminPostDetailModal";
import adminPostApi from "../../services/apis/adminPostApi";

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
    label: status || "Chưa xác định",
    className: "border-border bg-background text-textLight",
  };

const getPostTypeMeta = (postType) => {
  const isBuyPost = normalizeValue(postType) === "buy";

  return {
    label: isBuyPost ? "Tin thu mua" : "Tin đăng bán",
    className: isBuyPost
      ? "border-success/30 bg-success/10 text-success"
      : "border-primary/30 bg-primary/10 text-primary",
  };
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
    responseData?.error?.message ||
    responseData?.message ||
    responseData?.title ||
    error?.message ||
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
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  const openDeleteConfirmation = (post) => {
    if (!post?.postId || deleteBusy) {
      return;
    }

    setSelectedPost(null);
    setDeleteError("");
    setSuccessMessage("");
    setPendingDelete(post);
  };

  const closeDeleteConfirmation = () => {
    if (deleteBusy) {
      return;
    }

    setDeleteError("");
    setPendingDelete(null);
  };

  const handleDelete = async () => {
    if (!pendingDelete?.postId || deleteBusy) {
      return;
    }

    setDeleteBusy(true);
    setDeleteError("");

    try {
      await adminPostApi.delete(pendingDelete.postId);
      setPendingDelete(null);
      setSuccessMessage("Đã xóa bài đăng khỏi hệ thống.");
      setPageNumber(1);
      setRequestVersion((currentVersion) => currentVersion + 1);
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Quản trị nội dung
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text">
          Quản lý bài đăng
        </h1>
        <p className="mt-1 text-sm text-textLight">
          Theo dõi bài đăng bán, tin thu mua và xử lý nội dung không phù hợp.
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

      {successMessage && (
        <div
          role="status"
          className="flex items-start justify-between gap-4 rounded-xl border border-success/20 bg-success/10 p-4 text-sm font-semibold text-success"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Đóng thông báo"
            className="shrink-0 font-black"
          >
            ×
          </button>
        </div>
      )}

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
                  const isDeleted = normalizeValue(post.status) === "deleted";

                  return (
                    <tr
                      key={post.postId}
                      className="transition hover:bg-background/70"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-textLight">
                            {thumbnailUrl ? (
                              <img
                                src={thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-outlined">
                                image
                              </span>
                            )}
                          </div>
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
                        {post.remainingQuantity ?? 0}/{post.quantity ?? 0}
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
                          <button
                            type="button"
                            onClick={() => openDeleteConfirmation(post)}
                            disabled={isDeleted}
                            title={
                              isDeleted
                                ? "Bài đăng đã bị xóa"
                                : "Xóa bài đăng"
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-error/20 text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-border"
                          >
                            <span className="material-symbols-outlined text-[19px]">
                              delete
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
              const isDeleted = normalizeValue(post.status) === "deleted";

              return (
                <article
                  key={post.postId}
                  className="rounded-xl border border-border bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-border">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-3xl">
                          image
                        </span>
                      )}
                    </div>
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
                        {post.remainingQuantity ?? 0}/{post.quantity ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-textLight">Ngày tạo</dt>
                      <dd className="mt-1 font-semibold text-text">
                        {formatDate(post.createdAt)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="rounded-lg border border-primary px-3 py-2.5 text-sm font-bold text-primary"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirmation(post)}
                      disabled={isDeleted}
                      className="rounded-lg border border-error px-3 py-2.5 text-sm font-bold text-error disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-textLight"
                    >
                      {isDeleted ? "Đã xóa" : "Xóa bài"}
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
          onRequestDelete={openDeleteConfirmation}
        />
      )}

      {pendingDelete && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteConfirmation();
            }
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-post-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                <span className="material-symbols-outlined">delete_forever</span>
              </div>
              <div className="min-w-0">
                <h2
                  id="admin-delete-post-title"
                  className="text-lg font-bold text-text"
                >
                  Xóa bài đăng khỏi hệ thống?
                </h2>
                <p className="mt-2 text-sm leading-6 text-textLight">
                  Thao tác này xóa vĩnh viễn dữ liệu bài đăng và không thể hoàn
                  tác. Chỉ tiếp tục khi nội dung thực sự cần bị loại bỏ.
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-bold text-text">
                  {pendingDelete.productName || "Bài đăng HomeCycle"}
                </p>
              </div>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-error/20 bg-error/10 p-3 text-sm leading-5 text-error"
              >
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={deleteBusy}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-text transition hover:bg-background disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteBusy}
                className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-bold text-white transition hover:bg-error disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteBusy && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    refresh
                  </span>
                )}
                {deleteBusy ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

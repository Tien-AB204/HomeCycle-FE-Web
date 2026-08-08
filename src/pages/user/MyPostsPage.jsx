import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import PostLifecycleControl from "../../components/shared/PostLifecycleControl";
import {
  getPostTypeLabel,
  normalizePostType,
} from "../../constants/marketplace";
import { useAuth } from "../../hooks/useAuth";
import postApi from "../../services/apis/postApi";
import { getUserId } from "../../utils/authUtils";

const PAGE_SIZE = 10;

const STATUS_META = {
  active: {
    label: "Đang hoạt động",
    className:
      "border-green-200 bg-green-50 text-green-700",
  },
  pending: {
    label: "Chờ duyệt",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  },
  suspended: {
    label: "Tạm ẩn",
    className:
      "border-gray-200 bg-gray-100 text-gray-600",
  },
  closed: {
    label: "Đã đóng",
    className:
      "border-slate-300 bg-slate-100 text-slate-700",
  },
  rejected: {
    label: "Bị từ chối",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
  expired: {
    label: "Hết hạn",
    className:
      "border-orange-200 bg-orange-50 text-orange-700",
  },
  completed: {
    label: "Đã hoàn tất",
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
  },
};

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    "Không thể tải bài đăng của bạn."
  );
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Thương lượng";
  }

  return `${amount.toLocaleString("vi-VN")} đ`;
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

const getStatusMeta = (status) => {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  return (
    STATUS_META[normalizedStatus] || {
      label: status || "Chưa xác định",
      className:
        "border-gray-200 bg-gray-50 text-gray-600",
    }
  );
};

const getPostName = (post) => {
  return post?.productName || "Bài đăng chưa có tên";
};

const getPostImage = (post) => {
  return post?.medias?.[0]?.url || "";
};

const MyPostsLoading = () => {
  return (
    <div
      role="status"
      className="rounded-xl border border-[#BAC2C1]/40 bg-white p-10 text-center text-[#547B7D] shadow-sm"
    >
      <span className="material-symbols-outlined animate-spin text-3xl">
        refresh
      </span>
      <p className="mt-2 text-sm font-semibold">
        Đang tải bài đăng của bạn...
      </p>
    </div>
  );
};

const MyPostsPage = ({ expectedPostType }) => {
  const { user } = useAuth();
  const userId = getUserId(user);
  const normalizedExpectedPostType =
    normalizePostType(expectedPostType);
  const postTypeLabel = getPostTypeLabel(
    normalizedExpectedPostType,
  );
  const [pageNumber, setPageNumber] = useState(1);
  const [requestVersion, setRequestVersion] =
    useState(0);
  const [actionMessage, setActionMessage] =
    useState("");
  const requestKey = `${userId}:${normalizedExpectedPostType}:${pageNumber}:${requestVersion}`;
  const [listState, setListState] = useState({
    requestKey: "",
    result: null,
    error: "",
  });

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    postApi
      .getAllByUser(userId, {
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setListState({
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

        setListState({
          requestKey,
          result: null,
          error: getErrorMessage(requestError),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [pageNumber, requestKey, userId]);

  const missingUserIdError = !userId
    ? "Phiên đăng nhập không có mã người dùng. Vui lòng đăng xuất và đăng nhập lại."
    : "";
  const isLoading = Boolean(
    userId && listState.requestKey !== requestKey,
  );
  const result =
    listState.requestKey === requestKey
      ? listState.result
      : null;
  const error = missingUserIdError ||
    (listState.requestKey === requestKey
      ? listState.error
      : "");

  const posts = Array.isArray(result?.items)
    ? result.items.filter(
        (post) =>
          normalizePostType(post?.postType) ===
          normalizedExpectedPostType,
      )
    : [];

  const activePostCount = posts.filter(
    (post) =>
      String(post?.status || "").toLowerCase() ===
      "active",
  ).length;

  const remainingQuantity = posts.reduce(
    (total, post) => {
      const quantity = Number(post?.remainingQuantity);

      return Number.isFinite(quantity)
        ? total + quantity
        : total;
    },
    0,
  );

  const detailPath = (postId) => {
    return `/bai-dang-cua-toi/${encodeURIComponent(postId)}`;
  };

  const editPath = (postId) => {
    return `/bai-dang/chinh-sua/${encodeURIComponent(postId)}`;
  };

  const handleLifecycleCompleted = (message) => {
    setActionMessage(message);
    setRequestVersion(
      (currentVersion) => currentVersion + 1,
    );
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#BAC2C1]/40 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
            Tổng bài đăng
          </p>
          <p className="mt-1 text-2xl font-black text-[#172830]">
            {result?.totalCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-[#BAC2C1]/40 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
            Hoạt động trong trang
          </p>
          <p className="mt-1 text-2xl font-black text-green-700">
            {activePostCount}
          </p>
        </div>
        <div className="rounded-xl border border-[#BAC2C1]/40 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
            Số lượng còn lại
          </p>
          <p className="mt-1 text-2xl font-black text-[#7A1012]">
            {remainingQuantity}
          </p>
        </div>
      </div>

      {actionMessage && (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <p className="font-semibold">
            {actionMessage}
          </p>
          <button
            type="button"
            onClick={() => setActionMessage("")}
            aria-label="Đóng thông báo"
            className="shrink-0 font-black text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {isLoading && <MyPostsLoading />}

      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"
        >
          <h2 className="text-lg font-bold text-red-800">
            Không thể tải {postTypeLabel} của bạn
          </h2>
          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>
          <button
            type="button"
            onClick={() =>
              setRequestVersion(
                (currentVersion) => currentVersion + 1,
              )
            }
            className="mt-5 rounded-md bg-[#7A1012] px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#BAC2C1] bg-white px-6 py-12 text-center shadow-sm">
          <span className="text-5xl" aria-hidden="true">
            📭
          </span>
          <h2 className="mt-4 text-lg font-bold text-[#172830]">
            Bạn chưa có {postTypeLabel} nào
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#547B7D]">
            Hãy tạo bài đăng đầu tiên. Sau đó bạn có thể theo dõi trạng thái và số lượng ngay tại đây.
          </p>
          <Link
            to="/bai-dang/tao-moi"
            className="mt-5 inline-flex rounded-md bg-[#2B5659] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#172830]"
          >
            Tạo {postTypeLabel}
          </Link>
        </div>
      )}

      {!isLoading && !error && posts.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[#BAC2C1]/40 bg-white shadow-sm md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#BAC2C1]/35 bg-[#f5f8f8] text-xs uppercase tracking-wide text-[#547B7D]">
                  <th className="px-4 py-3 font-semibold">
                    Sản phẩm
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Giá
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Số lượng
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Cập nhật
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BAC2C1]/25">
                {posts.map((post) => {
                  const statusMeta = getStatusMeta(post.status);
                  const image = getPostImage(post);

                  return (
                    <tr
                      key={post.postId}
                      className="transition hover:bg-[#f8fafa]"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-[260px] items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e8eeee] text-xl text-[#547B7D]">
                            {image ? (
                              <img
                                src={image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "♻"
                            )}
                          </div>
                          <div>
                            <p className="line-clamp-2 font-bold text-[#172830]">
                              {getPostName(post)}
                            </p>
                            <p className="mt-1 text-xs text-[#547B7D]">
                              {[post.productTypeName, post.brandName]
                                .filter(Boolean)
                                .join(" · ") || "Chưa phân loại"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-bold text-[#7A1012]">
                        {formatCurrency(post.basePrice)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-[#172830]">
                        <span className="font-bold">
                          {post.remainingQuantity ?? 0}
                        </span>{" "}
                        / {post.quantity ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-[#547B7D]">
                        {formatDate(post.updatedAt || post.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            to={detailPath(post.postId)}
                            className="inline-flex rounded-md border border-[#2B5659] px-3 py-2 text-xs font-bold text-[#2B5659] transition hover:bg-[#2B5659] hover:text-white"
                          >
                            Chi tiết
                          </Link>
                          <Link
                            to={editPath(post.postId)}
                            className="inline-flex rounded-md bg-[#2B5659] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#172830]"
                          >
                            Chỉnh sửa
                          </Link>
                          <PostLifecycleControl
                            postId={post.postId}
                            postName={getPostName(post)}
                            status={post.status}
                            onCompleted={
                              handleLifecycleCompleted
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {posts.map((post) => {
              const statusMeta = getStatusMeta(post.status);
              const image = getPostImage(post);

              return (
                <article
                  key={post.postId}
                  className="rounded-xl border border-[#BAC2C1]/40 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e8eeee] text-2xl text-[#547B7D]">
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "♻"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                      <h2 className="mt-2 line-clamp-2 font-bold text-[#172830]">
                        {getPostName(post)}
                      </h2>
                      <p className="mt-1 text-sm font-bold text-[#7A1012]">
                        {formatCurrency(post.basePrice)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-[#547B7D]">
                    <span>
                      Còn {post.remainingQuantity ?? 0}/{post.quantity ?? 0}
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to={detailPath(post.postId)}
                        className="rounded-md border border-[#2B5659] px-3 py-2 font-bold text-[#2B5659]"
                      >
                        Chi tiết
                      </Link>
                      <Link
                        to={editPath(post.postId)}
                        className="rounded-md bg-[#2B5659] px-3 py-2 font-bold text-white"
                      >
                        Chỉnh sửa
                      </Link>
                      <PostLifecycleControl
                        postId={post.postId}
                        postName={getPostName(post)}
                        status={post.status}
                        onCompleted={
                          handleLifecycleCompleted
                        }
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {result && result.totalPages > 1 && (
            <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-lg border border-[#BAC2C1]/35 bg-white px-4 py-3 sm:flex-row">
              <p className="text-sm text-[#547B7D]">
                Trang {result.pageNumber} / {result.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPageNumber(
                      (currentPage) => currentPage - 1,
                    )
                  }
                  disabled={!result.hasPreviousPage}
                  className="rounded-md border border-[#BAC2C1] px-4 py-2 text-sm font-semibold text-[#172830] transition hover:bg-[#BAC2C1]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPageNumber(
                      (currentPage) => currentPage + 1,
                    )
                  }
                  disabled={!result.hasNextPage}
                  className="rounded-md border border-[#BAC2C1] px-4 py-2 text-sm font-semibold text-[#172830] transition hover:bg-[#BAC2C1]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default MyPostsPage;

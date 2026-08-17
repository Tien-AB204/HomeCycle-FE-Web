import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";
import PostLifecycleControl from "../../components/shared/PostLifecycleControl";
import {
  getPostTypeLabel,
  MARKETPLACE_POST_TYPES,
  normalizePostType,
} from "../../constants/marketplace";
import { useAuth } from "../../hooks/useAuth";
import postApi from "../../services/apis/postApi";
import { getUserId } from "../../utils/authUtils";
import { getManagedPostQuantity } from "../../utils/postFormUtils";

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
    <div role="status" className="rounded-2xl border border-[#dceae7] bg-white p-10 text-center text-[#547B7D] shadow-sm">
      <ReloadOutlined className="animate-spin text-3xl text-[#4f8588]" />
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

  const createPostLabel =
    normalizedExpectedPostType === MARKETPLACE_POST_TYPES.SELL
      ? "Đăng tin bán"
      : "Tạo tin thu mua";

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
      <header className="mb-6 flex flex-col gap-4 border-b border-[#dce8e5] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2f6f9f]">
            Quản lý bài đăng
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#183f41] sm:text-3xl">
            {normalizedExpectedPostType === MARKETPLACE_POST_TYPES.SELL
              ? "Tin đăng bán của tôi"
              : "Tin thu mua của tôi"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f8886]">
            Theo dõi trạng thái và cập nhật nội dung các bài đăng của bạn.
          </p>
        </div>
        <Link
          to="/bai-dang/tao-moi"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2f6f9f] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#245b84]"
        >
          <PlusOutlined /> {createPostLabel}
        </Link>
      </header>

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
        <div className="rounded-2xl border border-dashed border-[#a9c9c3] bg-white px-6 py-12 text-center shadow-sm">
          <img src={homeCycleMark} alt="" className="mx-auto h-16 w-16 rounded-2xl shadow-sm" />
          <h2 className="mt-4 text-lg font-bold text-[#172830]">
            Bạn chưa có {postTypeLabel} nào
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#547B7D]">
            Hãy tạo bài đăng đầu tiên. Sau đó bạn có thể theo dõi trạng thái và số lượng ngay tại đây.
          </p>
          <Link
            to="/bai-dang/tao-moi"
            className="mt-5 inline-flex rounded-xl bg-[#2f6f9f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245b84]"
          >
            Tạo {postTypeLabel}
          </Link>
        </div>
      )}

      {!isLoading && !error && posts.length > 0 && (
        <>
          <div className="mb-3">
            <div>
              <h2 className="text-lg font-black text-[#183f41]">Danh sách bài đăng</h2>
              <p className="mt-1 text-sm text-[#78908e]">Kiểm tra hiệu lực, số lượng và cập nhật nội dung ngay tại một nơi.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((post) => {
              const statusMeta = getStatusMeta(post.status);
              const image = getPostImage(post);

              return (
                <article
                  key={post.postId}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d8e6e3] bg-white shadow-[0_6px_20px_rgba(24,63,65,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-[#9fc3bd] hover:shadow-[0_12px_28px_rgba(24,63,65,0.1)]"
                >
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#edf5f2] to-[#e2eef7] sm:h-44 xl:h-40">
                    <div className="absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-1.25rem)] flex-wrap gap-1.5">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold shadow-sm ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      <span className="rounded-full border border-white/80 bg-white/90 px-2 py-1 text-[10px] font-bold text-[#476765] shadow-sm backdrop-blur">
                        {post.productTypeName || "Chưa phân loại"}
                      </span>
                    </div>

                    <div className="flex h-full w-full items-center justify-center">
                      {image ? (
                        <img
                          src={image}
                          alt={getPostName(post)}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <img src={homeCycleMark} alt="" className="h-16 w-16 rounded-2xl shadow-sm" />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 min-h-10 text-base font-black leading-5 text-[#183f41]">
                        {getPostName(post)}
                      </h3>
                      <p className="mt-1.5 text-lg font-black text-[#b33a32]">
                        {formatCurrency(post.basePrice)}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[#f5f8f7] px-2.5 py-2 text-[11px] text-[#68817f]">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <InboxOutlined /> Số lượng {getManagedPostQuantity(post)}
                        </span>
                        <span className="inline-flex min-w-0 items-center justify-end gap-1.5 text-right">
                          <ClockCircleOutlined /> {formatDate(post.updatedAt || post.createdAt)}
                        </span>
                      </div>

                      {post.brandName && (
                        <p className="mt-2.5 truncate text-[11px] text-[#68817f]">
                          Thương hiệu: <strong className="text-[#183f41]">{post.brandName}</strong>
                        </p>
                      )}
                    </div>

                    <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-[#e5eeec] pt-3">
                      <Link
                        to={detailPath(post.postId)}
                        className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-[#4f8588] bg-white px-2 py-2 text-[11px] font-bold text-[#2f686c] transition hover:bg-[#edf5f2]"
                      >
                        <EyeOutlined /> Xem chi tiết
                      </Link>
                      <Link
                        to={editPath(post.postId)}
                        className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-[#2f6f9f] px-2 py-2 text-[11px] font-bold text-white transition hover:bg-[#245b84]"
                      >
                        <EditOutlined /> Chỉnh sửa
                      </Link>
                      <div className="col-span-2">
                        <PostLifecycleControl
                          postId={post.postId}
                          postName={getPostName(post)}
                          status={post.status}
                          onCompleted={
                            handleLifecycleCompleted
                          }
                          fullWidth
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {result && result.totalPages > 1 && (
            <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#dceae7] bg-white px-5 py-4 shadow-sm sm:flex-row">
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
                  className="rounded-xl border border-[#4f8588] bg-white px-4 py-2.5 text-sm font-bold text-[#2f686c] transition hover:bg-[#edf5f2] disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="rounded-xl bg-[#2f6f9f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#245b84] disabled:cursor-not-allowed disabled:opacity-40"
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

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
      "border-success/30 bg-success/10 text-success",
  },
  pending: {
    label: "Chờ duyệt",
    className:
      "border-warning/30 bg-warning/10 text-warning",
  },
  suspended: {
    label: "Tạm ẩn",
    className:
      "border-border bg-textLight/10 text-textLight",
  },
  closed: {
    label: "Đã đóng",
    className:
      "border-border bg-textLight/10 text-textLight",
  },
  rejected: {
    label: "Bị từ chối",
    className:
      "border-error/30 bg-error/10 text-error",
  },
  expired: {
    label: "Hết hạn",
    className:
      "border-warning/30 bg-warning/10 text-warning",
  },
  completed: {
    label: "Đã hoàn tất",
    className:
      "border-primary/30 bg-primary/10 text-primary",
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
        "border-border bg-textLight/10 text-textLight",
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
    <div role="status" className="rounded-2xl border border-border bg-white p-10 text-center text-textLight shadow-sm">
      <ReloadOutlined className="animate-spin text-3xl text-primary" />
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
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            Quản lý bài đăng
          </p>
          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
            {normalizedExpectedPostType === MARKETPLACE_POST_TYPES.SELL
              ? "Tin đăng bán của tôi"
              : "Tin thu mua của tôi"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-textLight">
            Theo dõi trạng thái và cập nhật nội dung các bài đăng của bạn.
          </p>
        </div>
        <Link
          to="/bai-dang/tao-moi"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-primary/90"
        >
          <PlusOutlined /> {createPostLabel}
        </Link>
      </header>

      {actionMessage && (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success"
        >
          <p className="font-semibold">
            {actionMessage}
          </p>
          <button
            type="button"
            onClick={() => setActionMessage("")}
            aria-label="Đóng thông báo"
            className="shrink-0 font-black text-success"
          >
            ×
          </button>
        </div>
      )}

      {isLoading && <MyPostsLoading />}

      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error/10 p-8 text-center"
        >
          <h2 className="text-lg font-bold text-error">
            Không thể tải {postTypeLabel} của bạn
          </h2>
          <p className="mt-2 text-sm text-error">
            {error}
          </p>
          <button
            type="button"
            onClick={() =>
              setRequestVersion(
                (currentVersion) => currentVersion + 1,
              )
            }
            className="mt-5 rounded-md bg-error px-4 py-2 text-sm font-semibold text-white transition hover:bg-error/90"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center shadow-sm">
          <img src={homeCycleMark} alt="" className="mx-auto h-16 w-16 rounded-2xl shadow-sm" />
          <h2 className="mt-4 text-lg font-bold text-text">
            Bạn chưa có {postTypeLabel} nào
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-textLight">
            Hãy tạo bài đăng đầu tiên. Sau đó bạn có thể theo dõi trạng thái và số lượng ngay tại đây.
          </p>
          <Link
            to="/bai-dang/tao-moi"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
          >
            Tạo {postTypeLabel}
          </Link>
        </div>
      )}

      {!isLoading && !error && posts.length > 0 && (
        <>
          <div className="mb-3">
            <div>
              <h2 className="text-lg font-black text-text">Danh sách bài đăng</h2>
              <p className="mt-1 text-sm text-textLight">Kiểm tra hiệu lực, số lượng và cập nhật nội dung ngay tại một nơi.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((post) => {
              const statusMeta = getStatusMeta(post.status);
              const image = getPostImage(post);

              return (
                <article
                  key={post.postId}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_6px_20px_rgba(23,40,48,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_12px_28px_rgba(23,40,48,0.1)]"
                >
                  <div className="relative h-40 overflow-hidden from-background to-border/15 sm:h-44 xl:h-40">
                    <div className="absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-1.25rem)] flex-wrap gap-1.5">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold shadow-sm ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      <span className="rounded-full border border-white/80 bg-white/90 px-2 py-1 text-[10px] font-bold text-text shadow-sm backdrop-blur">
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
                      <h3 className="line-clamp-2 min-h-10 text-base font-black leading-5 text-text">
                        {getPostName(post)}
                      </h3>
                      <p className="mt-1.5 text-lg font-black text-error">
                        {formatCurrency(post.basePrice)}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-background px-2.5 py-2 text-[11px] text-textLight">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <InboxOutlined /> Số lượng {getManagedPostQuantity(post)}
                        </span>
                        <span className="inline-flex min-w-0 items-center justify-end gap-1.5 text-right">
                          <ClockCircleOutlined /> {formatDate(post.updatedAt || post.createdAt)}
                        </span>
                      </div>

                      {post.brandName && (
                        <p className="mt-2.5 truncate text-[11px] text-textLight">
                          Thương hiệu: <strong className="text-text">{post.brandName}</strong>
                        </p>
                      )}
                    </div>

                    <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-border pt-3">
                      <Link
                        to={detailPath(post.postId)}
                        className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-primary bg-white px-2 py-2 text-[11px] font-bold text-primary transition hover:bg-primary/10"
                      >
                        <EyeOutlined /> Xem chi tiết
                      </Link>
                      <Link
                        to={editPath(post.postId)}
                        className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-[11px] font-bold text-white transition hover:bg-primary/90"
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
            <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-sm sm:flex-row">
              <p className="text-sm text-textLight">
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
                  className="rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
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

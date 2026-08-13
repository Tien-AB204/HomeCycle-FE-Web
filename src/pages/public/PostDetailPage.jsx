import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";
import PostLifecycleControl from "../../components/shared/PostLifecycleControl";
import OfferFormModal from "../../features/offers/OfferFormModal";
import { useAuth } from "../../hooks/useAuth";
import offerApi from "../../services/apis/offerApi";
import postApi from "../../services/apis/postApi";
import { getUserId } from "../../utils/authUtils";

const DELIVERY_METHODS = {
  GhnDelivery: "Giao hàng GHN",
  SelfDelivery: "Tự vận chuyển",
  Pickup: "Nhận tại địa chỉ",
  Unknown: "Thỏa thuận vận chuyển",
};

const FUNCTIONALITY_STATUSES = {
  FullyFunctional: "Hoạt động đầy đủ",
  PartiallyFunctional:
    "Hoạt động một phần",
  NotFunctional: "Không hoạt động",
};

const SPACE_USAGES = {
  Living_room: "Phòng khách",
  Bedroom: "Phòng ngủ",
  Kitchen: "Nhà bếp",
  Office: "Văn phòng",
};

const DAMAGE_LEVELS = {
  No_Damage: "Không hư hỏng",
  Cosmetic_Damage: "Trầy xước ngoại quan",
  Minor_Damage: "Hư hỏng nhẹ",
  Major_Damage: "Hư hỏng nặng",
};

const PRIORITY_LEVELS = {
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
};

const POST_STATUS_META = {
  active: {
    label: "Đang hoạt động",
    className: "bg-green-100 text-green-700",
  },
  closed: {
    label: "Đã đóng",
    className: "bg-slate-100 text-slate-700",
  },
  pending: {
    label: "Chờ duyệt",
    className: "bg-amber-100 text-amber-700",
  },
  suspended: {
    label: "Tạm ẩn",
    className: "bg-gray-100 text-gray-600",
  },
  rejected: {
    label: "Bị từ chối",
    className: "bg-red-100 text-red-700",
  },
  expired: {
    label: "Hết hạn",
    className: "bg-orange-100 text-orange-700",
  },
  completed: {
    label: "Đã hoàn tất",
    className: "bg-blue-100 text-blue-700",
  },
};

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

const getErrorMessage = (
  error,
  fallbackMessage = "Không thể tải chi tiết bài đăng.",
) => {
  const responseData =
    error?.response?.data;

  return (
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    fallbackMessage
  );
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Thương lượng";
  }

  return `${amount.toLocaleString("vi-VN")} đ`;
};

const hasValidPrice = (value) => {
  const amount = Number(value);

  return Number.isFinite(amount) && amount > 0;
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const formatFallbackEnum = (value) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
};

const getMappedValue = (
  mapping,
  value,
) => {
  return (
    mapping[value] ||
    formatFallbackEnum(value)
  );
};

const getPostStatusMeta = (status) => {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  return (
    POST_STATUS_META[normalizedStatus] || {
      label: status || "Chưa xác định",
      className: "bg-gray-100 text-gray-600",
    }
  );
};

const getAttributeValue = (attribute) => {
  if (
    attribute?.optionValue !== null &&
    attribute?.optionValue !== undefined &&
    attribute.optionValue !== ""
  ) {
    return attribute.optionValue;
  }

  if (
    attribute?.valueText !== null &&
    attribute?.valueText !== undefined &&
    attribute.valueText !== ""
  ) {
    return attribute.valueText;
  }

  if (
    attribute?.valueNumber !== null &&
    attribute?.valueNumber !== undefined
  ) {
    return attribute.valueNumber;
  }

  if (
    typeof attribute?.valueBoolean ===
    "boolean"
  ) {
    return attribute.valueBoolean
      ? "Có"
      : "Không";
  }

  return "Chưa cập nhật";
};

const getAttributeUnit = (unit) => {
  if (
    !unit ||
    String(unit).toLowerCase() === "string"
  ) {
    return "";
  }

  return unit;
};

const DetailItem = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-[#dceae7] bg-[#f8fbfa] p-4 transition hover:border-[#b7d0cb] hover:bg-white">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-bold text-[#183f41]">
        {value ?? "—"}
      </dd>
    </div>
  );
};

const PostDetailLoading = () => {
  return (
    <div className="grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="h-[300px] rounded-2xl bg-[#BAC2C1]/25 sm:h-[360px] lg:h-[420px]" />
      <div className="space-y-3 rounded-2xl bg-white p-5">
        <div className="h-5 w-1/3 rounded bg-[#BAC2C1]/30" />
        <div className="h-8 w-full rounded bg-[#BAC2C1]/30" />
        <div className="h-8 w-2/3 rounded bg-[#BAC2C1]/25" />
        <div className="h-24 w-full rounded bg-[#BAC2C1]/20" />
        <div className="h-12 w-full rounded bg-[#BAC2C1]/30" />
      </div>
    </div>
  );
};

const PostDetailPage = ({ ownerMode = false }) => {
  const { postId = "" } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const userId = getUserId(user);
  const [requestVersion, setRequestVersion] =
    useState(0);
  const [selectedMediaId, setSelectedMediaId] =
    useState("");
  const [actionMessage, setActionMessage] =
    useState("");
  const [isOfferModalOpen, setIsOfferModalOpen] =
    useState(false);
  const [isOfferSubmitting, setIsOfferSubmitting] =
    useState(false);
  const [offerError, setOfferError] =
    useState("");
  const requestKey = `${ownerMode ? "owner" : "public"}:${userId}:${postId}:${requestVersion}`;
  const [detailState, setDetailState] =
    useState({
      requestKey: "",
      post: null,
      error: "",
    });

  useEffect(() => {
    if (ownerMode && !userId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    const detailRequest = ownerMode
      ? postApi.getDetailByUser(
          userId,
          postId,
          {
            signal: controller.signal,
          },
        )
      : postApi.getById(postId, {
          signal: controller.signal,
        });

    detailRequest
      .then((post) => {
        if (!isActive) {
          return;
        }

        setDetailState({
          requestKey,
          post,
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

        setDetailState({
          requestKey,
          post: null,
          error:
            getErrorMessage(requestError),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [ownerMode, postId, requestKey, userId]);

  const missingUserIdError =
    ownerMode && !userId
      ? "Phiên đăng nhập không có mã người dùng. Vui lòng đăng xuất và đăng nhập lại."
      : "";
  const isLoading = Boolean(
    !missingUserIdError &&
      detailState.requestKey !== requestKey,
  );
  const post =
    detailState.requestKey === requestKey
      ? detailState.post
      : null;
  const error = missingUserIdError ||
    (detailState.requestKey === requestKey
      ? detailState.error
      : "");

  const medias = Array.isArray(post?.medias)
    ? post.medias
    : [];

  const selectedMedia =
    medias.find(
      (media) =>
        media.mediaId === selectedMediaId,
    ) || medias[0];

  const product = post?.product || {};
  const attributes = Array.isArray(
    product.attributeValues,
  )
    ? product.attributeValues
    : [];
  const isBuyPost =
    String(post?.postType).toLowerCase() ===
    "buy";
  const listPath = `${
    isBuyPost
      ? "/tin-thu-mua"
      : "/tin-dang-ban"
  }${ownerMode ? "?view=mine" : ""}`;
  const address = [
    post?.streetAddress,
    post?.ward,
    post?.city,
  ]
    .filter(Boolean)
    .join(", ");
  const statusMeta = getPostStatusMeta(
    post?.status,
  );
  const isOwnPost = Boolean(
    userId &&
      String(post?.ownerId || "") === userId,
  );
  const isActivePost =
    String(post?.status || "").toLowerCase() ===
    "active";
  const remainingQuantity = Number(
    post?.remainingQuantity,
  );
  const hasAvailableQuantity =
    Number.isFinite(remainingQuantity) &&
    remainingQuantity > 0;

  const handlePrimaryAction = () => {
    if (!isAuthenticated) {
      navigate("/auth/login", {
        state: {
          from: `/posts/${postId}`,
        },
      });

      return;
    }

    if (
      !isBuyPost &&
      !isOwnPost &&
      isActivePost &&
      hasAvailableQuantity
    ) {
      setOfferError("");
      setIsOfferModalOpen(true);
    }
  };

  const handleCreateOffer = async (terms) => {
    if (isOfferSubmitting) {
      return;
    }

    setIsOfferSubmitting(true);
    setOfferError("");

    try {
      await offerApi.create({
        postId: post.postId,
        ...terms,
      });
      setIsOfferModalOpen(false);
      setActionMessage(
        "Đã gửi đề nghị thương lượng. Bạn có thể theo dõi tại mục Thương lượng.",
      );
    } catch (requestError) {
      setOfferError(
        getErrorMessage(
          requestError,
          "Không thể gửi đề nghị thương lượng.",
        ),
      );
    } finally {
      setIsOfferSubmitting(false);
    }
  };

  const handleLifecycleCompleted = (message) => {
    setActionMessage(message);
    setRequestVersion(
      (currentVersion) => currentVersion + 1,
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to="/"
          className="font-semibold text-[#547B7D] hover:text-[#2f6f9f]"
        >
          Trang chủ
        </Link>
        <span className="text-[#BAC2C1]">
          /
        </span>
        <Link
          to={post ? listPath : "/search"}
          className="font-semibold text-[#547B7D] hover:text-[#2f6f9f]"
        >
          {post
            ? ownerMode
              ? "Bài đăng của tôi"
              : isBuyPost
                ? "Tin thu mua"
                : "Tin đăng bán"
            : "Bài đăng"}
        </Link>
        {post && (
          <>
            <span className="text-[#BAC2C1]">
              /
            </span>
            <span className="max-w-[280px] truncate font-semibold text-[#172830]">
              {post.productName}
            </span>
          </>
        )}
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

      {isLoading && <PostDetailLoading />}

      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"
        >
          <h1 className="text-xl font-bold text-red-800">
            Không thể mở bài đăng
          </h1>
          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                setRequestVersion(
                  (currentVersion) =>
                    currentVersion + 1,
                )
              }
              className="rounded-md bg-[#7A1012] px-4 py-2 text-sm font-semibold text-white"
            >
              Thử lại
            </button>
            <Link
              to="/search"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#172830]"
            >
              Về trang tìm kiếm
            </Link>
          </div>
        </div>
      )}

      {post && !isLoading && (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="overflow-hidden rounded-2xl border border-[#dceae7] bg-white shadow-[0_12px_38px_rgba(24,63,65,0.07)]">
              <div className="flex h-[300px] items-center justify-center bg-gradient-to-br from-[#edf5f2] via-[#f9fbfa] to-[#e2eef7] sm:h-[360px] lg:h-[420px]">
                {selectedMedia?.url ? (
                  <img
                    src={selectedMedia.url}
                    alt={post.productName}
                    className="h-full w-full object-contain p-3 sm:p-4"
                  />
                ) : (
                  <div className="flex flex-col items-center text-[#547B7D]">
                    <img src={homeCycleMark} alt="" className="h-16 w-16 rounded-2xl shadow-md" />
                    <p className="mt-3 font-semibold">
                      Bài đăng chưa có hình ảnh
                    </p>
                  </div>
                )}
              </div>

              {medias.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-t border-[#BAC2C1]/30 p-3">
                  {medias.map((media) => (
                    <button
                      key={media.mediaId}
                      type="button"
                      onClick={() =>
                        setSelectedMediaId(
                          media.mediaId,
                        )
                      }
                      aria-label={`Xem ảnh ${media.displayOrder}`}
                      aria-pressed={
                        selectedMedia?.mediaId ===
                        media.mediaId
                      }
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-[#e8eeee] transition ${
                        selectedMedia?.mediaId ===
                        media.mediaId
                          ? "border-[#2f6f9f]"
                          : "border-transparent hover:border-[#BAC2C1]"
                      }`}
                    >
                      <img
                        src={media.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <aside className="h-fit rounded-2xl border border-[#dceae7] bg-white p-5 shadow-[0_12px_38px_rgba(24,63,65,0.07)] lg:sticky lg:top-24">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#183f41] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                  <ShoppingOutlined />
                  {isBuyPost
                    ? "Tin thu mua"
                    : "Tin đăng bán"}
                </span>
                {ownerMode && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                )}
                
              </div>

              <h1 className="mt-3 text-xl font-black leading-tight text-[#183f41] sm:text-2xl">
                {post.productName}
              </h1>

              <p className="mt-1.5 text-xs font-medium text-[#547B7D]">
                {post.categoryName} ·{" "}
                {post.productTypeName} ·{" "}
                {post.brandName}
              </p>

              <div className="mt-4 rounded-xl border border-[#f0d6d2] bg-[#fff7f5] p-4">
                {isBuyPost ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#9f4038]">
                      Giá mua tối đa
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#b33a32]">
                      {formatCurrency(post.basePrice)}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                    {hasValidPrice(product.originalPrice) && (
                      <div className="pb-0.5">
                        <p className="text-sm font-semibold text-[#879694] line-through decoration-[#a74334] decoration-2">
                          {formatCurrency(product.originalPrice)}
                        </p>
                      </div>
                    )}
                    <div className={hasValidPrice(product.originalPrice) ? "text-right" : ""}>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#9f4038]">
                        Giá bán
                      </p>
                      <p className="mt-1 text-3xl font-black leading-none text-[#b33a32]">
                        {formatCurrency(post.basePrice)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4 border-b border-gray-100 pb-2.5">
                  <dt className="flex items-center gap-2 text-[#547B7D]">
                    <InboxOutlined className="text-[#4f8588]" />
                    Số lượng còn lại
                  </dt>
                  <dd className="font-bold text-[#172830]">
                    {post.remainingQuantity}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-gray-100 pb-2.5">
                  <dt className="flex items-center gap-2 text-[#547B7D]">
                    <SafetyCertificateOutlined className="text-[#4f8588]" />
                    Vận chuyển
                  </dt>
                  <dd className="text-right font-semibold text-[#172830]">
                    {getMappedValue(
                      DELIVERY_METHODS,
                      post.deliveryMethod,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-gray-100 pb-2.5">
                  <dt className="flex items-center gap-2 text-[#547B7D]">
                    <CalendarOutlined className="text-[#4f8588]" />
                    Độ ưu tiên
                  </dt>
                  <dd className="font-semibold text-[#172830]">
                    {getMappedValue(
                      PRIORITY_LEVELS,
                      post.priorityLevel,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-[#547B7D]">
                    <EnvironmentOutlined className="text-[#2f6f9f]" />
                    Khu vực
                  </dt>
                  <dd className="mt-1 font-semibold text-[#172830]">
                    {address ||
                      "Chưa cập nhật địa chỉ"}
                  </dd>
                </div>
              </dl>

              {ownerMode ? (
                <div className="mt-4 rounded-lg border border-[#BAC2C1]/45 bg-[#f5f8f8] p-3.5">
                  <p className="text-sm leading-6 text-[#547B7D]">
                    Đây là bài đăng của bạn. Bạn có thể chỉnh sửa nội dung hoặc quản lý trạng thái bài đăng.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <Link
                      to={`/bai-dang/chinh-sua/${encodeURIComponent(postId)}`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-[#2f6f9f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#245b84]"
                    >
                      Chỉnh sửa bài đăng
                    </Link>
                    <PostLifecycleControl
                      postId={post.postId}
                      postName={post.productName}
                      status={post.status}
                      onCompleted={
                        handleLifecycleCompleted
                      }
                      fullWidth
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={
                    isAuthenticated &&
                    (isBuyPost ||
                      isOwnPost ||
                      !isActivePost ||
                      !hasAvailableQuantity)
                  }
                  title={
                    !isAuthenticated
                      ? "Đăng nhập để tiếp tục"
                      : isBuyPost
                        ? "Luồng gửi bài bán sẽ được thực hiện ở bước riêng"
                        : isOwnPost
                          ? "Bạn không thể gửi đề nghị cho bài đăng của mình"
                          : !isActivePost ||
                              !hasAvailableQuantity
                            ? "Bài đăng hiện không nhận thêm đề nghị"
                            : "Gửi đề nghị giá cho người bán"
                  }
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f6f9f] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#245b84] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {!isAuthenticated || (!isBuyPost && !isOwnPost && isActivePost && hasAvailableQuantity) ? <SendOutlined /> : null}
                  {!isAuthenticated
                    ? "Đăng nhập để tiếp tục"
                    : isBuyPost
                      ? "Gửi bài bán (sắp ra mắt)"
                      : isOwnPost
                        ? "Đây là bài đăng của bạn"
                        : !isActivePost ||
                            !hasAvailableQuantity
                          ? "Không thể thương lượng"
                          : "Gửi đề nghị thương lượng"}
                </button>
              )}

              <p className="mt-3 flex items-center gap-2 text-xs text-[#547B7D]">
                <CalendarOutlined />
                Đăng lúc {formatDate(post.createdAt)}
              </p>
            </aside>
          </div>

          <section className="mt-5 grid overflow-hidden rounded-2xl border border-[#dce8e5] bg-white shadow-[0_6px_22px_rgba(24,63,65,0.04)] sm:grid-cols-3">
            <div className="flex items-start gap-3 px-5 py-4">
              <SafetyCertificateOutlined className="mt-0.5 text-lg text-[#4f8588]" />
              <div>
                <h2 className="text-sm font-black text-[#183f41]">Thông tin minh bạch</h2>
                <p className="mt-1 text-xs leading-5 text-[#78908e]">Kiểm tra mô tả, tình trạng và thuộc tính trước khi đề nghị.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border-y border-[#e5eeec] px-5 py-4 sm:border-x sm:border-y-0">
              <SendOutlined className="mt-0.5 text-lg text-[#2f6f9f]" />
              <div>
                <h2 className="text-sm font-black text-[#183f41]">Thương lượng trực tiếp</h2>
                <p className="mt-1 text-xs leading-5 text-[#78908e]">Hai bên chủ động thống nhất giá, số lượng và giao nhận.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-5 py-4">
              <EnvironmentOutlined className="mt-0.5 text-lg text-[#4f8588]" />
              <div>
                <h2 className="text-sm font-black text-[#183f41]">Giao nhận rõ ràng</h2>
                <p className="mt-1 text-xs leading-5 text-[#78908e]">Xem khu vực và phương thức giao nhận trước khi giao dịch.</p>
              </div>
            </div>
          </section>

          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#dceae7] bg-white p-6 shadow-[0_10px_34px_rgba(24,63,65,0.06)]">
              <h2 className="text-xl font-bold text-[#172830]">
                Mô tả bài đăng
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-600">
                {post.description ||
                  "Bài đăng chưa có mô tả."}
              </p>

              {product.detailDescription && (
                <>
                  <h3 className="mt-6 font-bold text-[#172830]">
                    Mô tả chi tiết sản phẩm
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-600">
                    {product.detailDescription}
                  </p>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-[#dceae7] bg-white p-6 shadow-[0_10px_34px_rgba(24,63,65,0.06)]">
              <h2 className="text-xl font-bold text-[#172830]">
                Thông tin sản phẩm
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Mã model"
                  value={
                    product.modelNumber || "—"
                  }
                />
                <DetailItem
                  label="Không gian sử dụng"
                  value={getMappedValue(
                    SPACE_USAGES,
                    product.spaceUsage,
                  )}
                />
                <DetailItem
                  label="Khả năng hoạt động"
                  value={getMappedValue(
                    FUNCTIONALITY_STATUSES,
                    product.functionalityStatus,
                  )}
                />
                <DetailItem
                  label="Mức độ hư hỏng"
                  value={getMappedValue(
                    DAMAGE_LEVELS,
                    product.damageLevel,
                  )}
                />
                <DetailItem
                  label="Thời gian sử dụng"
                  value={
                    product.usageDuration != null
                      ? `${product.usageDuration} tháng`
                      : "—"
                  }
                />
                <DetailItem
                  label="Kích thước (D × R × C)"
                  value={
                    [
                      product.length,
                      product.width,
                      product.height,
                    ].every(
                      (value) => value != null,
                    )
                      ? `${product.length} × ${product.width} × ${product.height}`
                      : "—"
                  }
                />
                <DetailItem
                  label="Khối lượng"
                  value={
                    product.weight != null
                      ? `${product.weight} kg`
                      : "—"
                  }
                />
              </dl>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-[#dceae7] bg-white p-6 shadow-[0_10px_34px_rgba(24,63,65,0.06)]">
            <h2 className="text-xl font-bold text-[#172830]">
              Thuộc tính sản phẩm
            </h2>

            {attributes.length > 0 ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {attributes.map((attribute) => {
                  const unit =
                    getAttributeUnit(
                      attribute.unit,
                    );

                  return (
                    <DetailItem
                      key={attribute.attributeId}
                      label={
                        attribute.attributeName
                      }
                      value={`${getAttributeValue(
                        attribute,
                      )}${unit ? ` ${unit}` : ""}`}
                    />
                  );
                })}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-[#547B7D]">
                Sản phẩm chưa có thuộc tính bổ
                sung.
              </p>
            )}
          </section>

          <div className="mt-6">
            <Link
              to={listPath}
              className="inline-flex items-center gap-2 rounded-xl border border-[#4f8588] bg-white px-4 py-2.5 text-sm font-bold text-[#2f686c] transition hover:bg-[#edf5f2]"
            >
              <ArrowLeftOutlined /> Quay lại {ownerMode ? "bài đăng của tôi" : "danh sách"}
            </Link>
          </div>

          {isOfferModalOpen && (
            <OfferFormModal
              post={post}
              submitting={isOfferSubmitting}
              serverError={offerError}
              onClose={() => {
                if (!isOfferSubmitting) {
                  setIsOfferModalOpen(false);
                  setOfferError("");
                }
              }}
              onSubmit={handleCreateOffer}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PostDetailPage;
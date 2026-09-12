import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
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
import { ROLES } from "../../constants/roles";
import PostLifecycleControl from "../../components/shared/PostLifecycleControl";
import StaleDataWarningModal from "../../components/shared/StaleDataWarningModal";
import OfferFormModal from "../../features/offers/OfferFormModal";
import SellerRequestModal from "../../features/offers/SellerRequestModal";
import BuyPostMatchesPanel from "../../features/posts/BuyPostMatchesPanel";
import { useAuth } from "../../hooks/useAuth";
import cartApi from "../../services/apis/cartApi";
import offerApi from "../../services/apis/offerApi";
import postApi from "../../services/apis/postApi";
import { getUserId, normalizeRole } from "../../utils/authUtils";
import {
  getPostChangedFields,
  isConcurrencyConflict,
  POST_CHANGED_WARNING,
  VERIFICATION_FAILED_WARNING,
} from "../../utils/transactionFreshnessUtils";

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
  NonFunctional: "Không hoạt động",
  NotFunctional: "Không hoạt động",
};

const SPACE_USAGES = {
  Living_room: "Phòng khách",
  Bedroom: "Phòng ngủ",
  Kitchen: "Nhà bếp",
  Office: "Văn phòng",
};

const DAMAGE_LEVELS = {
  None: "Không hư hỏng",
  No_Damage: "Không hư hỏng",
  Cosmetic_Damage: "Trầy xước ngoại quan",
  Minor_Damage: "Hư hỏng nhẹ",
  Moderate_Damage: "Hư hỏng vừa",
  Severe_Damage: "Hư hỏng nặng",
  Total_Loss: "Mất hoàn toàn",
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
    className: "bg-success/10 text-success",
  },
  closed: {
    label: "Đã đóng",
    className: "bg-textLight/10 text-textLight",
  },
  pending: {
    label: "Chờ duyệt",
    className: "bg-warning/10 text-warning",
  },
  suspended: {
    label: "Tạm ẩn",
    className: "bg-textLight/10 text-textLight",
  },
  rejected: {
    label: "Bị từ chối",
    className: "bg-error/10 text-error",
  },
  expired: {
    label: "Hết hạn",
    className: "bg-warning/10 text-warning",
  },
  completed: {
    label: "Đã hoàn tất",
    className: "bg-success/10 text-success",
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
      className: "bg-textLight/10 text-textLight",
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
    <div className="rounded-xl border border-border bg-background p-4 transition hover:border-primary hover:bg-white">
      <dt className="text-xs font-semibold uppercase tracking-wide text-textLight">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-bold text-text">
        {value ?? "—"}
      </dd>
    </div>
  );
};

const PostDetailLoading = () => {
  return (
    <div className="grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="h-[300px] rounded-2xl bg-border/25 sm:h-[360px] lg:h-[420px]" />
      <div className="space-y-3 rounded-2xl bg-white p-5">
        <div className="h-5 w-1/3 rounded bg-border/30" />
        <div className="h-8 w-full rounded bg-border/30" />
        <div className="h-8 w-2/3 rounded bg-border/25" />
        <div className="h-24 w-full rounded bg-border/20" />
        <div className="h-12 w-full rounded bg-border/30" />
      </div>
    </div>
  );
};

const PostDetailPage = ({ ownerMode = false }) => {
  const { postId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const userId = getUserId(user);
  const normalizedRole = normalizeRole(user?.role);
  const isBusiness =
    normalizedRole === ROLES.BUSINESS;

  const buyPostIdParam = String(
    searchParams.get("buyPostId") || "",
  ).trim();

  const sellerRequestContinuation =
    location.state
      ?.sellerRequestContinuation;

  const continuationBuyPostId =
    String(
      sellerRequestContinuation
        ?.buyPostId || "",
    ).trim();

  const continuationCreatedSellPostId =
    String(
      sellerRequestContinuation
        ?.createdSellPostId || "",
    ).trim();

  const hasSellerRequestContinuation =
    normalizedRole === ROLES.PERSONAL &&
    continuationBuyPostId ===
      String(postId) &&
    Boolean(
      continuationCreatedSellPostId,
    );
  const isManager =
    normalizedRole === ROLES.ADMIN ||
    normalizedRole === ROLES.MODERATOR;

  const isPersonal =
    normalizedRole === ROLES.PERSONAL;
  const [requestVersion, setRequestVersion] =
    useState(0);
  const [selectedMediaId, setSelectedMediaId] =
    useState("");
  const [actionMessage, setActionMessage] =
    useState(() =>
      hasSellerRequestContinuation
        ? "Tin đăng bán mới đã được tạo. Kiểm tra giá, số lượng rồi gửi chào bán."
        : "",
    );
  const [isOfferModalOpen, setIsOfferModalOpen] =
    useState(false);
  const [isOfferSubmitting, setIsOfferSubmitting] =
    useState(false);
  const [isAddingToCart, setIsAddingToCart] =
    useState(false);
  const [cartFeedback, setCartFeedback] =
    useState(null);
  const [offerError, setOfferError] =
    useState("");

  const [
    isSellerRequestModalOpen,
    setIsSellerRequestModalOpen,
  ] = useState(
    hasSellerRequestContinuation,
  );

  const [
    isSellerRequestSubmitting,
    setIsSellerRequestSubmitting,
  ] = useState(false);

  const [
    sellerRequestError,
    setSellerRequestError,
  ] = useState("");

  const [
    sellerRequestInitialSellPostId,
    setSellerRequestInitialSellPostId,
  ] = useState(() =>
    hasSellerRequestContinuation
      ? continuationCreatedSellPostId
      : "",
  );

  const [isVerifyingPost, setIsVerifyingPost] = useState(false);
  const [staleWarning, setStaleWarning] = useState(null);
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
  const fallbackListPath = `${
    isBuyPost
      ? "/tin-thu-mua"
      : "/tin-dang-ban"
  }${ownerMode ? "?view=mine" : ""}`;
  const requestedReturnTo =
    location.state?.returnTo;
  const hasSafeReturnPath =
    typeof requestedReturnTo === "string" &&
    requestedReturnTo.startsWith("/") &&
    !requestedReturnTo.startsWith("//");
  const listPath = hasSafeReturnPath
    ? requestedReturnTo
    : fallbackListPath;
  const listState = hasSafeReturnPath
    ? location.state?.returnState
    : undefined;
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
  const proactiveBuyPostId =
    isBusiness &&
    !isBuyPost &&
    !isOwnPost &&
    buyPostIdParam
      ? buyPostIdParam
      : "";
  const isActivePost =
    String(post?.status || "").toLowerCase() ===
    "active";
  const remainingQuantity = Number(
    post?.remainingQuantity,
  );
  const hasAvailableQuantity =
    Number.isFinite(remainingQuantity) &&
    remainingQuantity > 0;

  useEffect(() => {
    if (
      !hasSellerRequestContinuation
    ) {
      return;
    }

    const nextState = {
      ...(location.state || {}),
    };

    delete nextState
      .sellerRequestContinuation;

    navigate(location.pathname, {
      replace: true,
      state: nextState,
    });
  }, [
    hasSellerRequestContinuation,
    location.pathname,
    location.state,
    navigate,
  ]);

  const updateDisplayedPost = (latestPost) => {
    setDetailState((currentState) => ({
      ...currentState,
      post: {
        ...(currentState.post || {}),
        ...latestPost,
        product: {
          ...(currentState.post?.product || {}),
          ...(latestPost.product || {}),
        },
      },
      error: "",
    }));
  };

  const handlePrimaryAction = async () => {
    if (isManager) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/auth/login", {
        state: {
          from: `/posts/${postId}`,
        },
      });

      return;
    }

    if (
      isBuyPost &&
      isPersonal &&
      !isOwnPost &&
      !isVerifyingPost
    ) {
      setIsVerifyingPost(true);

      try {
        const latestPost =
          await postApi.getById(post.postId);

        const verifiedPost = {
          ...post,
          ...latestPost,
          product: {
            ...(post.product || {}),
            ...(latestPost.product || {}),
          },
        };

        const changedFields =
          getPostChangedFields(
            post,
            verifiedPost,
          );

        const latestRemainingQuantity =
          Number(
            verifiedPost.remainingQuantity,
          );

        const latestIsAvailable =
          String(
            verifiedPost.status || "",
          ).toLowerCase() === "active" &&
          Number.isFinite(
            latestRemainingQuantity,
          ) &&
          latestRemainingQuantity > 0;

        if (
          changedFields.length > 0 ||
          !latestIsAvailable
        ) {
          updateDisplayedPost(
            verifiedPost,
          );

          setStaleWarning({
            message:
              POST_CHANGED_WARNING,
            changedFields,
          });

          return;
        }

        setSellerRequestError("");
        setIsSellerRequestModalOpen(true);
      } catch {
        setStaleWarning({
          message:
            VERIFICATION_FAILED_WARNING,
        });
      } finally {
        setIsVerifyingPost(false);
      }

      return;
    }

    if (
      isBuyPost ||
      isOwnPost ||
      isVerifyingPost
    ) {
      return;
    }

    setIsVerifyingPost(true);
    try {
      const latestPost = await postApi.getById(post.postId);
      const verifiedPost = {
        ...post,
        ...latestPost,
        product: { ...(post.product || {}), ...(latestPost.product || {}) },
      };
      const changedFields = getPostChangedFields(post, verifiedPost);
      const latestRemainingQuantity = Number(verifiedPost.remainingQuantity);
      const latestIsAvailable =
        String(verifiedPost.status || "").toLowerCase() === "active" &&
        Number.isFinite(latestRemainingQuantity) &&
        latestRemainingQuantity > 0;

      if (changedFields.length > 0 || !latestIsAvailable) {
        updateDisplayedPost(verifiedPost);
        setStaleWarning({
          message: POST_CHANGED_WARNING,
          changedFields,
        });
        return;
      }

      setOfferError("");
      setIsOfferModalOpen(true);
    } catch {
      setStaleWarning({ message: VERIFICATION_FAILED_WARNING });
    } finally {
      setIsVerifyingPost(false);
    }
  };

  const handleAddToCart = async () => {
    if (isAddingToCart) {
      return;
    }

    setIsAddingToCart(true);
    setCartFeedback(null);

    try {
      await cartApi.addToCart(post.postId);

      setCartFeedback({
        type: "success",
        message: "Đã thêm vào giỏ hàng.",
      });
    } catch (error) {
      setCartFeedback({
        type: "error",
        message:
          error?.message || "Không thể thêm vào giỏ hàng. Vui lòng thử lại.",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleCreateOffer = async (terms) => {
    if (isManager || isOfferSubmitting) {
      return;
    }

    setIsOfferSubmitting(true);
    setOfferError("");

    try {
      const latestPost = await postApi.getById(post.postId);
      const verifiedPost = {
        ...post,
        ...latestPost,
        product: { ...(post.product || {}), ...(latestPost.product || {}) },
      };
      const changedFields = getPostChangedFields(post, verifiedPost);
      const latestRemainingQuantity = Number(verifiedPost.remainingQuantity);
      const isUnavailable =
        String(verifiedPost.status || "").toLowerCase() !== "active" ||
        !Number.isFinite(latestRemainingQuantity) ||
        latestRemainingQuantity < Number(terms.offerQuantity || 0);

      if (changedFields.length > 0 || isUnavailable) {
        updateDisplayedPost(verifiedPost);
        setIsOfferModalOpen(false);
        setStaleWarning({
          message: POST_CHANGED_WARNING,
          changedFields,
        });
        return;
      }

      await offerApi.create({
        postId: post.postId,
        ...(proactiveBuyPostId
          ? { buyPostId: proactiveBuyPostId }
          : {}),
        ...terms,
      });
      setIsOfferModalOpen(false);
      setActionMessage(
        "Đã gửi đề nghị thương lượng. Bạn có thể theo dõi tại mục Thương lượng.",
      );
    } catch (requestError) {
      if (isConcurrencyConflict(requestError)) {
        setIsOfferModalOpen(false);
        setStaleWarning({ message: POST_CHANGED_WARNING });
        return;
      }
      setOfferError(
        getErrorMessage(
          requestError,
          VERIFICATION_FAILED_WARNING,
        ),
      );
    } finally {
      setIsOfferSubmitting(false);
    }
  };

  const handleCreateNewSellForRequest =
    () => {
      if (
        !post?.postId ||
        isSellerRequestSubmitting
      ) {
        return;
      }

      setSellerRequestInitialSellPostId(
        "",
      );

      setSellerRequestError("");
      setIsSellerRequestModalOpen(false);

      navigate("/bai-dang/tao-moi", {
        state: {
          sellerRequestContinuation: {
            buyPostId: post.postId,
          },
        },
      });
    };

  const handleCreateSellerRequest =
    async (terms) => {
      if (
        !isPersonal ||
        isSellerRequestSubmitting
      ) {
        return;
      }

      setIsSellerRequestSubmitting(true);
      setSellerRequestError("");

      try {
        const latestBuyPost =
          await postApi.getById(
            post.postId,
          );

        const verifiedBuyPost = {
          ...post,
          ...latestBuyPost,
          product: {
            ...(post.product || {}),
            ...(latestBuyPost.product || {}),
          },
        };

        const changedFields =
          getPostChangedFields(
            post,
            verifiedBuyPost,
          );

        const latestRemainingQuantity =
          Number(
            verifiedBuyPost.remainingQuantity,
          );

        const isUnavailable =
          String(
            verifiedBuyPost.status || "",
          ).toLowerCase() !== "active" ||
          !Number.isFinite(
            latestRemainingQuantity,
          ) ||
          latestRemainingQuantity <
            Number(
              terms.offerQuantity || 0,
            );

        if (
          changedFields.length > 0 ||
          isUnavailable
        ) {
          updateDisplayedPost(
            verifiedBuyPost,
          );

          setIsSellerRequestModalOpen(
            false,
          );

          setStaleWarning({
            message:
              POST_CHANGED_WARNING,
            changedFields,
          });

          return;
        }

        await postApi.createSellerRequest(
          post.postId,
          terms,
        );

        setIsSellerRequestModalOpen(false);
        setSellerRequestInitialSellPostId(
          "",
        );

        setActionMessage(
          "Đã gửi chào hàng. Bạn có thể theo dõi tại mục Chào hàng đã gửi.",
        );
      } catch (requestError) {
        if (
          isConcurrencyConflict(
            requestError,
          )
        ) {
          setIsSellerRequestModalOpen(
            false,
          );

          setStaleWarning({
            message:
              POST_CHANGED_WARNING,
          });

          return;
        }

        setSellerRequestError(
          getErrorMessage(
            requestError,
            "Không thể gửi chào bán. Vui lòng kiểm tra sản phẩm, giá và số lượng.",
          ),
        );
      } finally {
        setIsSellerRequestSubmitting(
          false,
        );
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
          className="font-semibold text-textLight hover:text-primary"
        >
          Trang chủ
        </Link>
        <span className="text-border">
          /
        </span>
        <Link
          to={post ? listPath : "/search"}
          state={post ? listState : undefined}
          className="font-semibold text-textLight hover:text-primary"
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
            <span className="text-border">
              /
            </span>
            <span className="max-w-[280px] truncate font-semibold text-text">
              {post.productName}
            </span>
          </>
        )}
      </div>

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

      {isLoading && <PostDetailLoading />}

      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error/10 p-8 text-center"
        >
          <h1 className="text-xl font-bold text-error">
            Không thể mở bài đăng
          </h1>
          <p className="mt-2 text-sm text-error">
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
              className="rounded-md bg-error px-4 py-2 text-sm font-semibold text-white"
            >
              Thử lại
            </button>
            <Link
              to="/search"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-text"
            >
              Về trang tìm kiếm
            </Link>
          </div>
        </div>
      )}

      {post && !isLoading && (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_38px_rgba(23,40,48,0.07)]">
              <div className="flex h-[300px] items-center justify-center bg-gradient-to-br from-background via-white to-background sm:h-[360px] lg:h-[420px]">
                {selectedMedia?.url ? (
                  <img
                    src={selectedMedia.url}
                    alt={post.productName}
                    className="h-full w-full object-contain p-3 sm:p-4"
                  />
                ) : (
                  <div className="flex flex-col items-center text-textLight">
                    <img src={homeCycleMark} alt="" className="h-16 w-16 rounded-2xl shadow-md" />
                    <p className="mt-3 font-semibold">
                      Bài đăng chưa có hình ảnh
                    </p>
                  </div>
                )}
              </div>

              {medias.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-t border-border/30 p-3">
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
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-background transition ${
                        selectedMedia?.mediaId ===
                        media.mediaId
                          ? "border-primary"
                          : "border-transparent hover:border-border"
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

            <aside className="h-fit rounded-2xl border border-border bg-white p-5 shadow-[0_12px_38px_rgba(23,40,48,0.07)] lg:sticky lg:top-24">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
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

              <h1 className="mt-3 text-xl font-black leading-tight text-text sm:text-2xl">
                {post.productName}
              </h1>

              <p className="mt-1.5 text-xs font-medium text-textLight">
                {post.categoryName} ·{" "}
                {post.productTypeName} ·{" "}
                {post.brandName}
              </p>

              <div className="mt-4 rounded-xl border border-error/20 bg-error/5 p-4">
                {isBuyPost ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-error">
                      Khoảng giá thu mua
                    </p>

                    <p className="mt-1 text-2xl font-black text-error">
                      {hasValidPrice(post.priceFrom) &&
                      hasValidPrice(post.priceTo)
                        ? formatCurrency(
                            post.priceFrom,
                          ) +
                          " – " +
                          formatCurrency(
                            post.priceTo,
                          )
                        : hasValidPrice(
                              post.priceTo,
                            )
                          ? "Tối đa " +
                            formatCurrency(
                              post.priceTo,
                            )
                          : hasValidPrice(
                                post.priceFrom,
                              )
                            ? "Từ " +
                              formatCurrency(
                                post.priceFrom,
                              )
                            : "Thương lượng"}
                    </p>

                    {post.expiryDate && (
                      <p className="mt-1 text-xs font-semibold text-textLight">
                        Hiệu lực đến{" "}
                        {formatDate(
                          post.expiryDate,
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                    {hasValidPrice(product.originalPrice) && (
                      <div className="pb-0.5">
                        <p className="text-sm font-semibold text-textLight line-through decoration-error decoration-2">
                          {formatCurrency(product.originalPrice)}
                        </p>
                      </div>
                    )}
                    <div className={hasValidPrice(product.originalPrice) ? "text-right" : ""}>
                      <p className="text-xs font-bold uppercase tracking-wide text-error">
                        Giá bán
                      </p>
                      <p className="mt-1 text-3xl font-black leading-none text-error">
                        {formatCurrency(post.basePrice)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4 border-b border-border pb-2.5">
                  <dt className="flex items-center gap-2 text-textLight">
                    <InboxOutlined className="text-primary" />
                    Số lượng còn lại
                  </dt>
                  <dd className="font-bold text-text">
                    {post.remainingQuantity}
                  </dd>
                </div>
                {!isBuyPost && (
                  <div className="flex justify-between gap-4 border-b border-border pb-2.5">
                    <dt className="flex items-center gap-2 text-textLight">
                      <SafetyCertificateOutlined className="text-primary" />
                      Vận chuyển
                    </dt>

                    <dd className="text-right font-semibold text-text">
                      {getMappedValue(
                        DELIVERY_METHODS,
                        post.deliveryMethod,
                      )}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-b border-border pb-2.5">
                  <dt className="flex items-center gap-2 text-textLight">
                    <CalendarOutlined className="text-primary" />
                    Độ ưu tiên
                  </dt>
                  <dd className="font-semibold text-text">
                    {getMappedValue(
                      PRIORITY_LEVELS,
                      post.priorityLevel,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-textLight">
                    <EnvironmentOutlined className="text-primary" />
                    Khu vực
                  </dt>
                  <dd className="mt-1 font-semibold text-text">
                    {address ||
                      "Chưa cập nhật địa chỉ"}
                  </dd>
                </div>
              </dl>

              {ownerMode ? (
                <div className="mt-4 rounded-lg border border-border/45 bg-background p-3.5">
                  <p className="text-sm leading-6 text-textLight">
                    Đây là bài đăng của bạn. Bạn có thể chỉnh sửa nội dung hoặc quản lý trạng thái bài đăng.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <Link
                      to={`/bai-dang/chinh-sua/${encodeURIComponent(postId)}`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
                    >
                      Chỉnh sửa bài đăng
                    </Link>
                    <PostLifecycleControl
                      postId={post.postId}
                      postName={post.productName}
                      postType={post.postType}
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
                    isManager ||
                    isVerifyingPost ||
                    (
                      isAuthenticated &&
                      (
                        isOwnPost ||
                        !isActivePost ||
                        !hasAvailableQuantity ||
                        (
                          isBuyPost &&
                          !isPersonal
                        )
                      )
                    )
                  }
                  title={
                    isManager
                      ? "Tài khoản quản trị và kiểm duyệt chỉ có quyền xem khu vực người dùng."
                      : !isAuthenticated
                        ? "Đăng nhập để tiếp tục"
                        : isOwnPost
                          ? "Đây là bài đăng của bạn"
                          : !isActivePost ||
                              !hasAvailableQuantity
                            ? "Bài đăng hiện không nhận thêm giao dịch"
                            : isBuyPost &&
                                !isPersonal
                              ? "Chỉ tài khoản cá nhân có thể chào bán sản phẩm cho tin thu mua."
                              : isBuyPost
                                ? "Chọn tin đăng bán của bạn để gửi chào bán."
                                : "Gửi đề nghị giá cho người bán"
                  }
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {!isManager &&
                  (
                    !isAuthenticated ||
                    (
                      !isOwnPost &&
                      isActivePost &&
                      hasAvailableQuantity &&
                      (
                        !isBuyPost ||
                        isPersonal
                      )
                    )
                  ) ? (
                    <SendOutlined />
                  ) : null}

                  {isManager
                    ? "Chỉ xem bài đăng"
                    : !isAuthenticated
                      ? "Đăng nhập để tiếp tục"
                      : isOwnPost
                        ? "Đây là bài đăng của bạn"
                        : !isActivePost ||
                            !hasAvailableQuantity
                          ? "Không thể giao dịch"
                          : isBuyPost &&
                              !isPersonal
                            ? "Chỉ tài khoản cá nhân có thể chào bán"
                            : isBuyPost
                              ? "Chào bán sản phẩm"
                              : "Gửi đề nghị thương lượng"}
                </button>
              )}

              {!ownerMode &&
                !isManager &&
                !isBuyPost &&
                isAuthenticated &&
                !isOwnPost &&
                isActivePost &&
                hasAvailableQuantity && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                    className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-white px-4 py-3 text-sm font-bold text-primary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAddingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                  </button>
                )}

              {cartFeedback && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    cartFeedback.type === "success"
                      ? "text-success"
                      : "text-error"
                  }`}
                >
                  {cartFeedback.message}
                </p>
              )}

              {proactiveBuyPostId && (
                <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-primary">
                  <p className="font-bold">
                    Đề nghị này sẽ được gắn với tin thu mua đang chọn.
                  </p>

                  <Link
                    to={`/bai-dang-cua-toi/${encodeURIComponent(
                      proactiveBuyPostId,
                    )}`}
                    className="mt-1 inline-block font-bold underline underline-offset-2"
                  >
                    Quay lại tin thu mua
                  </Link>
                </div>
              )}

              <p className="mt-3 flex items-center gap-2 text-xs text-textLight">
                <CalendarOutlined />
                Đăng lúc {formatDate(post.createdAt)}
              </p>
            </aside>
          </div>

          <section className="mt-5 grid overflow-hidden rounded-2xl border border-border bg-white shadow-[0_6px_22px_rgba(23,40,48,0.04)] sm:grid-cols-3">
            <div className="flex items-start gap-3 px-5 py-4">
              <SafetyCertificateOutlined className="mt-0.5 text-lg text-primary" />
              <div>
                <h2 className="text-sm font-black text-text">Thông tin minh bạch</h2>
                <p className="mt-1 text-xs leading-5 text-textLight">Kiểm tra mô tả, tình trạng và thuộc tính trước khi đề nghị.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border-y border-border px-5 py-4 sm:border-x sm:border-y-0">
              <SendOutlined className="mt-0.5 text-lg text-primary" />
              <div>
                <h2 className="text-sm font-black text-text">Thương lượng trực tiếp</h2>
                <p className="mt-1 text-xs leading-5 text-textLight">Hai bên chủ động thống nhất giá, số lượng và giao nhận.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-5 py-4">
              <EnvironmentOutlined className="mt-0.5 text-lg text-primary" />
              <div>
                <h2 className="text-sm font-black text-text">Giao nhận rõ ràng</h2>
                <p className="mt-1 text-xs leading-5 text-textLight">Xem khu vực và phương thức giao nhận trước khi giao dịch.</p>
              </div>
            </div>
          </section>

          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_10px_34px_rgba(23,40,48,0.06)]">
              <h2 className="text-xl font-bold text-text">
                Mô tả bài đăng
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-textLight">
                {post.description ||
                  "Bài đăng chưa có mô tả."}
              </p>

              {product.detailDescription && (
                <>
                  <h3 className="mt-6 font-bold text-text">
                    Mô tả chi tiết sản phẩm
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-textLight">
                    {product.detailDescription}
                  </p>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_10px_34px_rgba(23,40,48,0.06)]">
              <h2 className="text-xl font-bold text-text">
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

          <section className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-[0_10px_34px_rgba(23,40,48,0.06)]">
            <h2 className="text-xl font-bold text-text">
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
              <p className="mt-3 text-sm text-textLight">
                Sản phẩm chưa có thuộc tính bổ
                sung.
              </p>
            )}
          </section>

          {ownerMode &&
          isBuyPost &&
          normalizedRole ===
            ROLES.BUSINESS && (
            <>
              <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_34px_rgba(23,40,48,0.06)] sm:p-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                    Xử lý nhu cầu thu mua
                  </p>

                  <h2 className="mt-1 text-xl font-black text-text">
                    Theo dõi chào hàng và đề nghị
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-textLight">
                    Mở đúng danh sách đã lọc theo tin thu mua này hoặc xem các sản phẩm hệ thống gợi ý.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Link
                    to={`/thuong-luong?tab=received&buyPostId=${encodeURIComponent(
                      post.postId,
                    )}`}
                    className="rounded-xl border border-primary/20 bg-primary/5 p-4 transition hover:border-primary hover:bg-primary/10"
                  >
                    <p className="font-black text-primary">
                      Mở chào hàng nhận được
                    </p>
                    <p className="mt-1 text-xs leading-5 text-textLight">
                      Xem các sản phẩm Personal đã chủ động chào bán cho nhu cầu này.
                    </p>
                  </Link>

                  <Link
                    to={`/thuong-luong?tab=sent&buyPostId=${encodeURIComponent(
                      post.postId,
                    )}`}
                    className="rounded-xl border border-border bg-background/60 p-4 transition hover:border-primary hover:bg-primary/5"
                  >
                    <p className="font-black text-text">
                      Mở đề nghị đã gửi
                    </p>
                    <p className="mt-1 text-xs leading-5 text-textLight">
                      Xem các đề nghị mua doanh nghiệp đã chủ động gửi từ tin thu mua này.
                    </p>
                  </Link>

                  <a
                    href="#buy-post-matches"
                    className="rounded-xl border border-border bg-background/60 p-4 transition hover:border-primary hover:bg-primary/5"
                  >
                    <p className="font-black text-text">
                      Xem sản phẩm phù hợp
                    </p>
                    <p className="mt-1 text-xs leading-5 text-textLight">
                      Đối chiếu các tin đăng bán đang hoạt động với tiêu chí thu mua hiện tại.
                    </p>
                  </a>
                </div>
              </section>

              <div id="buy-post-matches">
                <BuyPostMatchesPanel
                  buyPostId={post.postId}
                />
              </div>
            </>
          )}

          <div className="mt-6">
            <Link
              to={listPath}
              state={listState}
              className="inline-flex items-center gap-2 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10"
            >
              <ArrowLeftOutlined /> Quay lại {ownerMode ? "bài đăng của tôi" : "danh sách"}
            </Link>
          </div>

          {isSellerRequestModalOpen && (
            <SellerRequestModal
              buyPost={post}
              userId={userId}
              initialSellPostId={
                sellerRequestInitialSellPostId
              }
              onCreateNew={
                handleCreateNewSellForRequest
              }
              submitting={
                isSellerRequestSubmitting
              }
              serverError={
                sellerRequestError
              }
              onClose={() => {
                if (
                  !isSellerRequestSubmitting
                ) {
                  setIsSellerRequestModalOpen(
                    false,
                  );

                  setSellerRequestError("");
                }
              }}
              onSubmit={
                handleCreateSellerRequest
              }
            />
          )}

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

          <StaleDataWarningModal
            open={Boolean(staleWarning)}
            message={staleWarning?.message}
            changedFields={staleWarning?.changedFields}
            onAcknowledge={() => setStaleWarning(null)}
          />
        </>
      )}
    </div>
  );
};

export default PostDetailPage;

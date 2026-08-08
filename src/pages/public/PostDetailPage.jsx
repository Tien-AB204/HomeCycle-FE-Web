import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
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
    "Không thể tải chi tiết bài đăng."
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
    <div className="rounded-lg border border-[#BAC2C1]/35 bg-[#f8fafa] p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-semibold text-[#172830]">
        {value ?? "—"}
      </dd>
    </div>
  );
};

const PostDetailLoading = () => {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
      <div className="h-[520px] rounded-xl bg-[#BAC2C1]/25" />
      <div className="space-y-4 rounded-xl bg-white p-6">
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

  const handlePrimaryAction = () => {
    if (!isAuthenticated) {
      navigate("/auth/login", {
        state: {
          from: `/posts/${postId}`,
        },
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to="/"
          className="font-medium text-[#547B7D] hover:text-[#172830]"
        >
          Trang chủ
        </Link>
        <span className="text-[#BAC2C1]">
          /
        </span>
        <Link
          to={post ? listPath : "/search"}
          className="font-medium text-[#547B7D] hover:text-[#172830]"
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
            <section className="overflow-hidden rounded-xl border border-[#BAC2C1]/35 bg-white shadow-sm">
              <div className="flex min-h-[420px] items-center justify-center bg-[#e8eeee] lg:min-h-[520px]">
                {selectedMedia?.url ? (
                  <img
                    src={selectedMedia.url}
                    alt={post.productName}
                    className="max-h-[620px] w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-[#547B7D]">
                    <span className="text-7xl">
                      ♻
                    </span>
                    <p className="mt-3 font-semibold">
                      Bài đăng chưa có hình ảnh
                    </p>
                  </div>
                )}
              </div>

              {medias.length > 1 && (
                <div className="flex gap-3 overflow-x-auto border-t border-[#BAC2C1]/30 p-4">
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
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-[#e8eeee] transition ${
                        selectedMedia?.mediaId ===
                        media.mediaId
                          ? "border-[#2B5659]"
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

            <aside className="h-fit rounded-xl border border-[#BAC2C1]/35 bg-white p-6 shadow-sm lg:sticky lg:top-24">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#172830] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  {isBuyPost
                    ? "Tin thu mua"
                    : "Tin đăng bán"}
                </span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  {getMappedValue(
                    {
                      Active: "Đang hoạt động",
                    },
                    post.status,
                  )}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold leading-tight text-[#172830]">
                {post.productName}
              </h1>

              <p className="mt-2 text-sm font-medium text-[#547B7D]">
                {post.categoryName} ·{" "}
                {post.productTypeName} ·{" "}
                {post.brandName}
              </p>

              <div className="mt-5 rounded-lg bg-[#7A1012]/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A1012]">
                  {isBuyPost
                    ? "Giá mua tối đa"
                    : "Giá đăng bán"}
                </p>
                <p className="mt-1 text-3xl font-black text-[#7A1012]">
                  {formatCurrency(
                    post.basePrice,
                  )}
                </p>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                  <dt className="text-[#547B7D]">
                    Số lượng còn lại
                  </dt>
                  <dd className="font-bold text-[#172830]">
                    {post.remainingQuantity} /{" "}
                    {post.quantity}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                  <dt className="text-[#547B7D]">
                    Vận chuyển
                  </dt>
                  <dd className="text-right font-semibold text-[#172830]">
                    {getMappedValue(
                      DELIVERY_METHODS,
                      post.deliveryMethod,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-gray-100 pb-3">
                  <dt className="text-[#547B7D]">
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
                  <dt className="text-[#547B7D]">
                    Khu vực
                  </dt>
                  <dd className="mt-1 font-semibold text-[#172830]">
                    {address ||
                      "Chưa cập nhật địa chỉ"}
                  </dd>
                </div>
              </dl>

              {ownerMode ? (
                <div className="mt-6 rounded-lg border border-[#BAC2C1]/45 bg-[#f5f8f8] p-4 text-sm leading-6 text-[#547B7D]">
                  Đây là bài đăng của bạn. Chức năng cập nhật và thay đổi trạng thái sẽ được kết nối ở bước API tiếp theo.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={isAuthenticated}
                  title={
                    isAuthenticated
                      ? "Chức năng giao dịch sẽ được gắn ở bước sau"
                      : "Đăng nhập để tiếp tục"
                  }
                  className="mt-6 w-full rounded-lg bg-[#2B5659] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#172830] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAuthenticated
                    ? isBuyPost
                      ? "Gửi bài bán (sắp ra mắt)"
                      : "Thương lượng (sắp ra mắt)"
                    : "Đăng nhập để tiếp tục"}
                </button>
              )}

              <p className="mt-4 text-xs text-[#547B7D]">
                Đăng lúc {formatDate(post.createdAt)}
              </p>
            </aside>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-[#BAC2C1]/35 bg-white p-6 shadow-sm">
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

            <section className="rounded-xl border border-[#BAC2C1]/35 bg-white p-6 shadow-sm">
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
                  label="Giá mua ban đầu"
                  value={formatCurrency(
                    product.originalPrice,
                  )}
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

          <section className="mt-6 rounded-xl border border-[#BAC2C1]/35 bg-white p-6 shadow-sm">
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
              className="inline-flex items-center gap-2 rounded-md border border-[#BAC2C1] bg-white px-4 py-2 text-sm font-semibold text-[#172830] transition hover:bg-[#BAC2C1]/20"
            >
              ← Quay lại {ownerMode ? "bài đăng của tôi" : "danh sách"}
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default PostDetailPage;

import { useEffect, useState } from "react";
import adminPostApi from "../../../services/apis/adminPostApi";

const STATUS_META = {
  draft: {
    label: "Bản nháp",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  active: {
    label: "Đang hoạt động",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  suspended: {
    label: "Đã đình chỉ",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  closed: {
    label: "Đã đóng",
    className: "border-gray-300 bg-gray-100 text-gray-700",
  },
  deleted: {
    label: "Đã xóa",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const ENUM_LABELS = {
  Living_room: "Phòng khách",
  Bedroom: "Phòng ngủ",
  Kitchen: "Nhà bếp",
  Bathroom: "Phòng tắm",
  Laundry_room: "Phòng giặt",
  Balcony: "Ban công",
  Garage: "Nhà để xe",
  Restroom: "Nhà vệ sinh",
  FullyFunctional: "Hoạt động đầy đủ",
  PartiallyFunctional: "Hoạt động một phần",
  NonFunctional: "Không hoạt động",
  None: "Không hư hỏng",
  Cosmetic_Damage: "Trầy xước ngoại quan",
  Minor_Damage: "Hư hỏng nhẹ",
  Moderate_Damage: "Hư hỏng trung bình",
  Severe_Damage: "Hư hỏng nặng",
  Total_Loss: "Không thể phục hồi",
  GhnDelivery: "Giao hàng GHN",
  SellerDelivers: "Người bán giao",
  BuyerPickUp: "Người mua đến nhận",
  Unknown: "Chưa xác định",
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
};

const normalizeValue = (value) =>
  String(value || "").trim().toLowerCase();

const getStatusMeta = (status) =>
  STATUS_META[normalizeValue(status)] || {
    label: status || "Chưa xác định",
    className: "border-gray-200 bg-gray-50 text-gray-600",
  };

const formatEnum = (value) => ENUM_LABELS[value] || value || "—";

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

const formatDateTime = (value) => {
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    responseData?.error?.message ||
    responseData?.message ||
    responseData?.title ||
    error?.message ||
    "Không thể tải chi tiết bài đăng."
  );
};

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const getAttributeValue = (attribute) => {
  let value = attribute?.optionValue;

  if (value === undefined || value === null || value === "") {
    value = attribute?.valueText;
  }

  if (value === undefined || value === null || value === "") {
    value = attribute?.valueNumber;
  }

  if (value === undefined || value === null || value === "") {
    value =
      typeof attribute?.valueBoolean === "boolean"
        ? attribute.valueBoolean
          ? "Có"
          : "Không"
        : "—";
  }

  const unit = String(attribute?.unit || "").trim();

  return unit && unit.toLowerCase() !== "string"
    ? `${value} ${unit}`
    : String(value);
};

const DetailRow = ({ label, value, emphasize = false }) => (
  <div className="min-w-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
      {label}
    </dt>
    <dd
      className={`mt-1 break-words text-sm ${
        emphasize ? "font-bold text-gray-900" : "font-medium text-gray-700"
      }`}
    >
      {value ?? "—"}
    </dd>
  </div>
);

export default function AdminPostDetailModal({
  postSummary,
  onClose,
  onRequestDelete,
}) {
  const postId = postSummary?.postId;
  const [detailState, setDetailState] = useState({
    postId: "",
    post: null,
    error: "",
  });
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!postId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    adminPostApi
      .getById(postId, { signal: controller.signal })
      .then((post) => {
        if (!isActive) {
          return;
        }

        setDetailState({ postId, post, error: "" });
      })
      .catch((error) => {
        if (!isActive || isCanceledRequest(error)) {
          return;
        }

        setDetailState({ postId, post: null, error: getErrorMessage(error) });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [postId]);

  const isLoading = detailState.postId !== postId;
  const post = detailState.post;
  const statusMeta = getStatusMeta(post?.status || postSummary?.status);
  const medias = Array.isArray(post?.medias) ? post.medias : [];
  const selectedMedia = medias[selectedMediaIndex] || medias[0];
  const product = post?.product || {};
  const attributes = Array.isArray(product.attributeValues)
    ? product.attributeValues
    : [];
  const isBuyPost = normalizeValue(post?.postType) === "buy";
  const isDeleted = normalizeValue(post?.status) === "deleted";

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 sm:p-6"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-post-detail-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
              Chi tiết bài đăng
            </p>
            <h2
              id="admin-post-detail-title"
              className="mt-1 truncate text-xl font-bold text-gray-900"
            >
              {post?.productName ||
                postSummary?.productName ||
                "Bài đăng HomeCycle"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết bài đăng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading && (
            <div className="flex min-h-80 items-center justify-center text-green-700">
              <span className="material-symbols-outlined animate-spin text-3xl">
                refresh
              </span>
              <span className="ml-3 text-sm font-semibold">
                Đang tải chi tiết bài đăng...
              </span>
            </div>
          )}

          {!isLoading && detailState.error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"
            >
              <span className="material-symbols-outlined text-4xl text-red-400">
                error
              </span>
              <h3 className="mt-2 font-bold text-red-800">
                Không thể tải chi tiết bài đăng
              </h3>
              <p className="mt-2 text-sm text-red-700">
                {detailState.error}
              </p>
            </div>
          )}

          {!isLoading && !detailState.error && post && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div>
                  <div className="aspect-[4/3] overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                    {selectedMedia?.url ? (
                      <img
                        src={selectedMedia.url}
                        alt={post.productName || "Hình ảnh bài đăng"}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-gray-300">
                        <span className="material-symbols-outlined text-6xl">
                          image_not_supported
                        </span>
                        <span className="mt-2 text-sm font-semibold">
                          Chưa có hình ảnh
                        </span>
                      </div>
                    )}
                  </div>

                  {medias.length > 1 && (
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {medias.slice(0, 5).map((media, index) => (
                        <button
                          key={media.mediaId || `${media.url}-${index}`}
                          type="button"
                          onClick={() => setSelectedMediaIndex(index)}
                          aria-label={`Xem ảnh ${index + 1}`}
                          className={`aspect-square overflow-hidden rounded-lg border-2 bg-gray-50 transition ${
                            selectedMediaIndex === index
                              ? "border-green-600"
                              : "border-transparent hover:border-gray-300"
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
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        isBuyPost
                          ? "bg-violet-50 text-violet-700"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {isBuyPost ? "Tin thu mua" : "Tin đăng bán"}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-500">
                      {isBuyPost ? "Giá thu mua dự kiến" : "Giá bán"}
                    </p>
                    <p className="mt-1 text-3xl font-black text-green-700">
                      {formatCurrency(post.basePrice)}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl bg-gray-50 p-4">
                    <DetailRow label="Số lượng" value={post.quantity} />
                    <DetailRow
                      label="Còn lại"
                      value={post.remainingQuantity}
                    />
                    <DetailRow
                      label="Danh mục"
                      value={post.categoryName || "—"}
                    />
                    <DetailRow
                      label="Loại sản phẩm"
                      value={post.productTypeName || "—"}
                    />
                    <DetailRow
                      label="Thương hiệu"
                      value={post.brandName || "—"}
                    />
                    <DetailRow
                      label="Độ ưu tiên"
                      value={formatEnum(post.priorityLevel)}
                    />
                  </dl>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Mô tả bài đăng
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                      {post.description || "Bài đăng chưa có mô tả."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900">
                    Thông tin sản phẩm
                  </h3>
                  <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
                    <DetailRow
                      label="Tên sản phẩm"
                      value={post.productName || "—"}
                      emphasize
                    />
                    {!isBuyPost && (
                      <DetailRow
                        label="Giá mua ban đầu"
                        value={formatCurrency(product.originalPrice)}
                      />
                    )}
                    <DetailRow
                      label="Thời gian sử dụng"
                      value={
                        product.usageDuration === null ||
                        product.usageDuration === undefined
                          ? "—"
                          : `${product.usageDuration} tháng`
                      }
                    />
                    <DetailRow
                      label="Khả năng hoạt động"
                      value={formatEnum(product.functionalityStatus)}
                    />
                    <DetailRow
                      label="Mức độ hư hỏng"
                      value={formatEnum(product.damageLevel)}
                    />
                    <DetailRow
                      label="Không gian sử dụng"
                      value={formatEnum(product.spaceUsage)}
                    />
                    <DetailRow
                      label="Khối lượng"
                      value={
                        product.weight === null || product.weight === undefined
                          ? "—"
                          : `${product.weight} kg`
                      }
                    />
                  </dl>

                  {product.detailDescription && (
                    <p className="mt-4 border-t border-gray-100 pt-4 text-sm leading-6 text-gray-600">
                      {product.detailDescription}
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900">
                    Giao nhận và hệ thống
                  </h3>
                  <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
                    <DetailRow
                      label="Giao nhận"
                      value={formatEnum(post.deliveryMethod)}
                    />
                    <DetailRow
                      label="Địa chỉ"
                      value={
                        [post.streetAddress, post.ward, post.city]
                          .filter(Boolean)
                          .join(", ") || "—"
                      }
                    />
                    <DetailRow
                      label="Ngày tạo"
                      value={formatDateTime(post.createdAt)}
                    />
                    <DetailRow
                      label="Cập nhật gần nhất"
                      value={formatDateTime(post.updatedAt)}
                    />
                    <DetailRow
                      label="Ngày hết hạn"
                      value={formatDateTime(post.expiryDate)}
                    />
                  </dl>
                </section>
              </div>

              {attributes.length > 0 && (
                <section className="rounded-xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900">
                    Thuộc tính chuyên biệt
                  </h3>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {attributes.map((attribute, index) => (
                      <DetailRow
                        key={attribute.attributeId || index}
                        label={attribute.attributeName || "Thuộc tính"}
                        value={getAttributeValue(attribute)}
                      />
                    ))}
                  </dl>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Đóng
          </button>
          {post && !isDeleted && (
            <button
              type="button"
              onClick={() => onRequestDelete(post)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800"
            >
              <span className="material-symbols-outlined text-[18px]">
                delete
              </span>
              Xóa bài đăng
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
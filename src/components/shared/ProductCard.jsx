import { useNavigate } from "react-router-dom";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";

const CONDITION_MAP = {
  good_working: "Hoạt động tốt",
  minor_fault: "Hư hỏng nhẹ",
  dead_scrap: "Cần sửa chữa",
};

const LOGISTICS_MAP = {
  truck_required: "Cần xe tải",
  need_disassemble: "Cần tháo dỡ",
  motor_friendly: "Chở bằng xe máy",
  GhnDelivery: "Giao hàng GHN",
  SelfDelivery: "Tự vận chuyển",
  Pickup: "Nhận tại địa chỉ",
  Unknown: "Thỏa thuận giao nhận",
};

const formatPrice = (value) => {
  const price = Number(value);

  if (!Number.isFinite(price)) {
    return "Thương lượng";
  }

  return `${price.toLocaleString("vi-VN")} đ`;
};

const hasValidPrice = (value) => {
  const price = Number(value);

  return Number.isFinite(price) && price > 0;
};

const ProductCard = ({ data, variant = "business-buy" }) => {
  const navigate = useNavigate();

  if (!data) {
    return null;
  }

  const image = data.image || data.thumbnailUrl || data.medias?.[0]?.url;
  const name = data.name || data.productName || "Sản phẩm chưa có tên";
  const type =
    data.type || data.categoryName || data.productTypeName || "Đồ gia dụng";
  const description = data.desc || data.description || "Chưa có mô tả.";
  const price = data.price ?? data.basePrice;
  const originalPrice =
    data.originalPrice ??
    data.productOriginalPrice ??
    data.product?.originalPrice;
  const ownerName = String(
    data.businessName ||
      data.ownerName ||
      data.sellerName ||
      data.createdByName ||
      data.displayName ||
      (typeof data.owner === "string" ? data.owner : "") ||
      data.owner?.displayName ||
      data.owner?.fullName ||
      "",
  ).trim();
  const conditionLabel =
    CONDITION_MAP[data.condition] || data.conditionName || data.productTypeName || "Đã qua sử dụng";
  const logisticsLabel =
    LOGISTICS_MAP[data.logistics || data.deliveryMethod] ||
    data.city ||
    data.provinceName ||
    "Thỏa thuận giao nhận";
  const postId = data.postId || "";
  const isBuyPost = variant === "business-buy";

  const handleOpenDetail = () => {
    if (postId) {
      navigate(`/posts/${encodeURIComponent(postId)}`);
    }
  };

  const handleCardKeyDown = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenDetail();
    }
  };

  const handleActionClick = (event) => {
    event.stopPropagation();
    handleOpenDetail();
  };

  return (
    <article
      role={postId ? "link" : undefined}
      tabIndex={postId ? 0 : undefined}
      aria-label={postId ? `Xem chi tiết ${name}` : undefined}
      onClick={handleOpenDetail}
      onKeyDown={handleCardKeyDown}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e0ebe8] bg-white shadow-[0_6px_22px_rgba(32,77,75,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#b9d2cc] hover:shadow-[0_16px_38px_rgba(32,77,75,0.13)] ${
        postId
          ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5f9291] focus:ring-offset-2"
          : ""
      }`}
    >
      <div className="relative h-44 overflow-hidden bg-[#eaf1ef] sm:h-48 lg:h-44 xl:h-48">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#eef5f2] to-[#d9e9e5] text-[#5f817e]">
            <img src={homeCycleMark} alt="" className="h-14 w-14 rounded-2xl shadow-sm" />
            <span className="mt-2 text-xs font-bold">Chưa có hình ảnh</span>
          </div>
        )}

        {isBuyPost && (
          <span className="absolute left-3 top-3 rounded-full bg-[#244f51] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
            Đang tìm mua
          </span>
        )}
        <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-extrabold text-[#476765] shadow-sm backdrop-blur">
          {type}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {ownerName && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#68807f]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e3f0ec] text-[10px] text-[#2d6a65]" aria-hidden="true">✓</span>
            <span className="truncate">{ownerName}</span>
          </div>
        )}

        <h3 className={`${ownerName ? "mt-2.5" : "mt-0"} line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#183436] transition group-hover:text-[#2d6a65]`}>
          {name}
        </h3>

        <p className="mt-1.5 line-clamp-2 min-h-9 text-[11px] leading-[18px] text-[#78908f]">
          {description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#edf5f2] px-2.5 py-1 text-[10px] font-bold text-[#476765]">
            {conditionLabel}
          </span>
          <span className="rounded-full bg-[#e7f0f5] px-2.5 py-1 text-[10px] font-bold text-[#355f73]">
            {logisticsLabel}
          </span>
        </div>

        <div className="mt-auto border-t border-[#edf2f0] pt-3">
          {isBuyPost ? (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#829795]">
                Giá mua dự kiến
              </p>
              <p className="mt-0.5 text-lg font-black text-[#b33a32]">
                {formatPrice(price)}
              </p>
            </div>
          ) : (
            <div className="flex min-h-10 items-end justify-between gap-3">
              {hasValidPrice(originalPrice) && (
                <div className="min-w-0 pb-0.5">
                  <p className="truncate text-xs font-semibold text-[#8a9997] line-through decoration-[#a74334] decoration-1">
                    {formatPrice(originalPrice)}
                  </p>
                </div>
              )}

              <div className={`min-w-0 ${hasValidPrice(originalPrice) ? "text-right" : ""}`}>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9f4038]">
                  Giá bán
                </p>
                <p className="mt-0.5 truncate text-xl font-black leading-none text-[#b33a32]">
                  {formatPrice(price)}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleActionClick}
            className="mt-3 w-full rounded-lg border border-[#5f9291] bg-white px-4 py-2 text-[11px] font-extrabold text-[#2f686c] transition hover:bg-[#3f777b] hover:text-white"
          >
            {isBuyPost ? "Xem nhu cầu thu mua" : "Xem và thương lượng"}
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
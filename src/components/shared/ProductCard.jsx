const CONDITION_MAP = {
  good_working: "Chạy tốt / Độ mới cao",
  minor_fault: "Hỏng nhẹ / Đã qua sử dụng",
  dead_scrap: "Hỏng nặng / Bán xác máy",
};

const LOGISTICS_MAP = {
  truck_required: "Cần xe tải",
  need_disassemble: "Cần thợ tháo dỡ",
  motor_friendly: "Chở bằng xe máy",
  GhnDelivery: "Giao hàng GHN",
  SelfDelivery: "Tự vận chuyển",
  Pickup: "Nhận tại địa chỉ",
  Unknown: "Thỏa thuận vận chuyển",
};

const formatPrice = (value) => {
  const price = Number(value);

  if (!Number.isFinite(price)) {
    return "Thương lượng";
  }

  return `${price.toLocaleString("vi-VN")} đ`;
};

const ProductCard = ({
  data,
  variant = "business-buy",
}) => {
  if (!data) {
    return null;
  }

  const image =
    data.image || data.medias?.[0]?.url;
  const name =
    data.name ||
    data.productName ||
    "Sản phẩm chưa có tên";
  const type =
    data.type ||
    data.categoryName ||
    data.productTypeName ||
    "Sản phẩm";
  const description =
    data.desc ||
    data.description ||
    "Chưa có mô tả.";
  const price =
    data.price ?? data.basePrice;
  const businessName =
    data.businessName ||
    data.owner ||
    "Đối tác thu mua";
  const conditionLabel =
    CONDITION_MAP[data.condition] ||
    data.productTypeName ||
    "Đang thu mua";
  const logisticsLabel =
    LOGISTICS_MAP[
      data.logistics ||
        data.deliveryMethod
    ] ||
    data.city ||
    "Thỏa thuận vận chuyển";

  return (
    <article className="group flex h-full flex-col justify-between overflow-hidden rounded-md border border-[#BAC2C1]/30 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="relative h-48 overflow-hidden bg-[#BAC2C1]/10">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#e8eeee] to-[#cbd9d9] text-[#547B7D]">
            <span
              aria-hidden="true"
              className="text-4xl"
            >
              ♻
            </span>
            <span className="mt-2 text-xs font-semibold">
              Chưa có hình ảnh
            </span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded bg-[#172830] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          {type}
        </span>
      </div>

      <div className="flex flex-grow flex-col justify-between p-4">
        <div>
          {variant === "business-buy" ? (
            <>
              <div className="mb-1 flex items-center gap-1">
                <span className="truncate text-[11px] font-bold uppercase tracking-wide text-[#2B5659]">
                  {businessName}
                </span>
                <span
                  className="text-xs text-[#2B5659]"
                  title="Đối tác doanh nghiệp"
                >
                  ✓
                </span>
              </div>

              <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-[#172830]">
                {name}
              </h3>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded bg-[#BAC2C1]/30 px-2 py-0.5 text-[10px] font-medium text-[#172830]">
                  {conditionLabel}
                </span>
                <span className="rounded bg-[#7A1012]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7A1012]">
                  {logisticsLabel}
                </span>
              </div>
            </>
          ) : (
            <>
              <h3 className="mb-1 line-clamp-1 text-base font-bold leading-snug text-[#172830]">
                {name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-[#547B7D]">
                “{description}”
              </p>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          {variant === "business-buy" ? (
            <>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-tight text-[#547B7D]">
                  Giá mua tối đa
                </p>
                <span className="text-lg font-extrabold text-[#7A1012]">
                  {formatPrice(price)}
                </span>
              </div>
              <button
                type="button"
                className="rounded bg-[#2B5659] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#172830]"
              >
                Gửi bài bán
              </button>
            </>
          ) : (
            <button
              type="button"
              className="w-full rounded border-2 border-[#BAC2C1] py-2 text-xs font-bold uppercase tracking-wider text-[#2B5659] transition-all hover:border-[#2B5659] hover:bg-[#2B5659] hover:text-white"
            >
              Thương lượng giá
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
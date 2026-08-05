// 1. TỪ ĐIỂN DỊCH TAG (Ánh xạ từ code chuẩn hóa sang Tiếng Việt cho User dễ đọc)
const CONDITION_MAP = {
  good_working: "Chạy tốt / Độ mới cao",
  minor_fault: "Hỏng nhẹ / Đã qua sử dụng",
  dead_scrap: "Hỏng nặng / Bán xác máy",
};

const LOGISTICS_MAP = {
  truck_required: "Cần xe tải",
  need_disassemble: "Cần thợ tháo dỡ",
  motor_friendly: "Chở bằng xe máy",
};

const ProductCard = ({ data, variant = "business-buy" }) => {
  // Phòng hờ trường hợp data chưa load kịp
  if (!data) return null;

  return (
    <div className="bg-white rounded-md shadow-sm border border-[#BAC2C1]/30 overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
      {/* 1. PHẦN HÌNH ẢNH & TAG DANH MỤC */}
      <div className="relative h-48 bg-[#BAC2C1]/10 overflow-hidden">
        <img
          src={data.image} // 👈 Đã sửa: imageUrl -> image
          alt={data.name} // 👈 Đã sửa: title -> name
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <span className="absolute top-3 left-3 bg-[#172830] text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider">
          {data.type?.toUpperCase()}
        </span>

        {/* Gợi ý AI */}
        {variant === "personal-sell" && data.aiSuggested && (
          <span className="absolute top-3 right-3 bg-white text-[#172830] text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow">
            
          </span>
        )}
      </div>

      {/* 2. PHẦN NỘI DUNG CHI TIẾT */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          {/* BIẾN THỂ 1: TIN THU MUA CỦA DOANH NGHIỆP */}
          {variant === "business-buy" && (
            <>
              {/* Tên doanh nghiệp + Tích xanh */}
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px] font-bold text-[#2B5659] uppercase tracking-wide truncate">
                  {/* Dùng businessName, nếu không có thì lấy owner */}
                  {data.businessName || data.owner || "Đối tác thu mua"}
                </span>
                <span className="text-[#2B5659] text-xs">✔️</span>
              </div>

              {/* Tiêu đề tin */}
              <h3 className="font-bold text-[#172830] text-base leading-snug line-clamp-2 mb-2">
                {data.name} {/* 👈 Đã sửa: title -> name */}
              </h3>

              {/* Tag tiêu chuẩn thu mua */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] bg-[#BAC2C1]/30 text-[#172830] px-2 py-0.5 rounded font-medium">
                  {/* 👈 Đã sửa: Dùng từ điển để dịch mã condition */}
                  {CONDITION_MAP[data.condition] ||
                    data.condition ||
                    "Độ mới > 85%"}
                </span>
                <span className="text-[10px] bg-[#7A1012]/10 text-[#7A1012] font-semibold px-2 py-0.5 rounded">
                  {/* 👈 Đã sửa: Dùng từ điển để dịch mã logistics (vận chuyển) */}
                  {LOGISTICS_MAP[data.logistics] ||
                    data.logistics ||
                    "Thu mua tận nơi"}
                </span>
              </div>
            </>
          )}

          {/* BIẾN THỂ 2: TIN ĐĂNG BÁN THƯƠNG LƯỢNG CỦA CÁ NHÂN */}
          {variant === "personal-sell" && (
            <>
              <h3 className="font-bold text-[#172830] text-base leading-snug line-clamp-1 mb-1">
                {data.name} {/* 👈 Đã sửa: title -> name */}
              </h3>
              <p className="text-xs text-[#547B7D] line-clamp-2 italic mt-1 leading-relaxed">
                "{data.desc}" {/* 👈 Đã sửa: description -> desc */}
              </p>
            </>
          )}
        </div>

        {/* 3. PHẦN KHU VỰC GIÁ VÀ NÚT HÀNH ĐỘNG */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          {variant === "business-buy" ? (
            <>
              <div>
                <p className="text-[10px] text-[#547B7D] font-medium uppercase tracking-tight">
                  Giá mua tối đa
                </p>
                <span className="font-extrabold text-[#7A1012] text-lg">
                  {/* Thêm dấu ? (Optional Chaining) để tránh lỗi nếu giá bị null */}
                  {data.price?.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <button className="bg-[#2B5659] hover:bg-[#172830] text-white text-[11px] font-bold px-3 py-2 rounded transition-colors uppercase tracking-wider">
                Gửi bài bán
              </button>
            </>
          ) : (
            <>
              <button className="w-full py-2 border-2 border-[#BAC2C1] text-[#2B5659] font-bold rounded text-xs hover:bg-[#2B5659] hover:text-white hover:border-[#2B5659] transition-all uppercase tracking-wider">
                Thương lượng giá
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

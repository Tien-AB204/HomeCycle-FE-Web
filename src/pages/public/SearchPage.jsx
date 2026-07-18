// src/pages/public/SearchPage.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  APPLIANCE_DEEP_FILTERS,
  COMMON_FILTERS,
  ELECTRONIC_DEEP_FILTERS,
  MAIN_CATEGORIES,
} from "../../constants/filterOptions";
import { mockBusinessPosts, mockPersonalPosts } from "../../utils/mockData";
const ALL_POSTS = [...mockBusinessPosts, ...mockPersonalPosts];

// =========================================================
// MOCK DATA: ĐÃ THÊM THUỘC TÍNH 'postType' ĐỂ PHÂN BIỆT MUA/BÁN
// =========================================================

// Thêm prop displayMode: "ALL" | "SELL_ONLY" | "BUY_ONLY"
const SearchPage = ({ displayMode = "ALL" }) => {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  // Trạng thái danh mục lớn (Gia dụng / Điện tử)
  const [mainCategory, setMainCategory] = useState(null);

  // Lưu các tiêu chí lọc đang được tích chọn
  const [selectedLogistics, setSelectedLogistics] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);

  // Bộ lọc đặc thù Gia dụng
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  // Bộ lọc đặc thù Điện tử
  const [selectedSubCats, setSelectedSubCats] = useState([]);
  const [selectedTechIssues, setSelectedTechIssues] = useState([]);

  const [filteredProducts, setFilteredProducts] = useState([]);

  // Reset sạch bộ lọc khi nhảy giữa 2 danh mục lớn
  const handleCategoryReset = (category) => {
    setMainCategory(category);
    setSelectedLogistics([]);
    setSelectedConditions([]);
    setSelectedSpaces([]);
    setSelectedMaterials([]);
    setSelectedSubCats([]);
    setSelectedTechIssues([]);
  };

  const handleCheckboxChange = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  // LOGIC LỌC ĐA LUỒNG CHO DÂN BUÔN & NGƯỜI DÂN
  useEffect(() => {
    if (!mainCategory) return;

    // 1. LỌC THEO DANH MỤC GỐC
    let result = ALL_POSTS.filter((p) => p.category === mainCategory);

    // 2. LỌC THEO NGỮ CẢNH TRANG (ALL / MUA / BÁN) - BƯỚC NÀY MỚI THÊM
    if (displayMode === "SELL_ONLY") {
      result = result.filter((p) => p.postType === "SELL");
    } else if (displayMode === "BUY_ONLY") {
      result = result.filter((p) => p.postType === "BUY");
    }

    // 3. Lọc theo ô tìm kiếm
    if (keyword.trim()) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword.toLowerCase()) ||
          p.desc.toLowerCase().includes(keyword.toLowerCase()),
      );
    }

    // 4. Lọc theo Logistics (vận chuyển bằng gì)
    if (selectedLogistics.length > 0) {
      result = result.filter((p) => selectedLogistics.includes(p.logistics));
    }

    // 5. Lọc theo Độ mới/Tình trạng hoạt động
    if (selectedConditions.length > 0) {
      result = result.filter((p) => selectedConditions.includes(p.condition));
    }

    // 6. CHỈ LỌC GIA DỤNG
    if (mainCategory === MAIN_CATEGORIES.APPLIANCE) {
      if (selectedSpaces.length > 0) {
        result = result.filter((p) => selectedSpaces.includes(p.space));
      }
      if (selectedMaterials.length > 0) {
        result = result.filter((p) => selectedMaterials.includes(p.material));
      }
    }

    // 7. CHỈ LỌC ĐIỆN TỬ
    if (mainCategory === MAIN_CATEGORIES.ELECTRONIC) {
      if (selectedSubCats.length > 0) {
        result = result.filter((p) => selectedSubCats.includes(p.subCat));
      }
      if (selectedTechIssues.length > 0) {
        result = result.filter((p) => selectedTechIssues.includes(p.techIssue));
      }
    }

    setFilteredProducts(result);
  }, [
    displayMode, // Cập nhật dependency
    mainCategory,
    keyword,
    selectedLogistics,
    selectedConditions,
    selectedSpaces,
    selectedMaterials,
    selectedSubCats,
    selectedTechIssues,
  ]);

  // =========================================================
  // MÀN HÌNH CHỌN PHÂN KHÚC THU MUA ĐẦU VÀO
  // =========================================================
  if (!mainCategory) {
    return (
      <div className="max-w-4xl mx-auto my-16 px-6 text-center">
        <h2 className="text-3xl font-extrabold text-[#172830] mb-2">
          Hệ Thống Thu Mua HomeCycle
        </h2>
        <p className="text-gray-500 mb-8">
          Vui lòng chọn lĩnh vực bạn quan tâm để chúng tôi mở các thông số lọc
          chuyên sâu phù hợp.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-[#2B5659] rounded-2xl hover:border-solid hover:border-[#547B7D] hover:bg-[#E1FEFF]/10 transition-all duration-300 shadow-sm"
            onClick={() => handleCategoryReset(MAIN_CATEGORIES.APPLIANCE)}
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition">
              🛋️
            </span>
            <span className="text-xl font-bold text-[#172830]">
              Đồ Gia Dụng
            </span>
            <span className="text-xs text-gray-400 mt-2">
              Lọc chuyên sâu theo: Chất liệu gỗ tự nhiên/MDF, da, sắt, kính;
              tháo dỡ cồng kềnh...
            </span>
          </button>

          <button
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-[#2B5659] rounded-2xl hover:border-solid hover:border-[#547B7D] hover:bg-[#E1FEFF]/10 transition-all duration-300 shadow-sm"
            onClick={() => handleCategoryReset(MAIN_CATEGORIES.ELECTRONIC)}
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition">
              📺
            </span>
            <span className="text-xl font-bold text-[#172830]">Đồ Điện Tử</span>
            <span className="text-xs text-gray-400 mt-2">
              Lọc chuyên sâu theo: Bo mạch chết, vỡ màn hình tivi, hỏng block
              điện lạnh, hàng rã xác...
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      {/* ==========================================
          BÊN TRÁI: BỘ LỌC CHUYÊN SÂU
          ========================================== */}
      <aside className="w-1/4 bg-white rounded-xl shadow-sm border border-gray-200 p-6 self-start">
        <button
          onClick={() => setMainCategory(null)}
          className="flex items-center gap-2 text-sm font-semibold text-[#547B7D] hover:text-[#2B5659] mb-6 transition"
        >
          &larr; Đổi nhóm sản phẩm
        </button>

        <h3 className="font-bold text-lg text-[#172830] border-b pb-3 mb-4">
          Bộ lọc chuyên ngành
        </h3>

        {/* 1. LỌC ĐẶC THÙ CHO ĐỒ GIA DỤNG */}
        {mainCategory === MAIN_CATEGORIES.APPLIANCE && (
          <>
            <div className="mb-6">
              <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
                Cốt chất liệu cốt lõi
              </h4>
              <div className="flex flex-col gap-2">
                {APPLIANCE_DEEP_FILTERS.materials.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-black"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMaterials.includes(item.value)}
                      onChange={() =>
                        handleCheckboxChange(
                          item.value,
                          selectedMaterials,
                          setSelectedMaterials,
                        )
                      }
                      className="mr-3 rounded text-[#2B5659] focus:ring-[#547B7D] border-gray-300"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6 border-t pt-4">
              <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
                Phân loại theo phòng
              </h4>
              <div className="flex flex-col gap-2">
                {APPLIANCE_DEEP_FILTERS.spaces.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-black"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpaces.includes(item.value)}
                      onChange={() =>
                        handleCheckboxChange(
                          item.value,
                          selectedSpaces,
                          setSelectedSpaces,
                        )
                      }
                      className="mr-3 rounded text-[#2B5659] focus:ring-[#547B7D] border-gray-300"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 2. LỌC ĐẶC THÙ CHO ĐỒ ĐIỆN TỬ */}
        {mainCategory === MAIN_CATEGORIES.ELECTRONIC && (
          <>
            <div className="mb-6">
              <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
                Nhóm thiết bị
              </h4>
              <div className="flex flex-col gap-2">
                {ELECTRONIC_DEEP_FILTERS.subCategories.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-black"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubCats.includes(item.value)}
                      onChange={() =>
                        handleCheckboxChange(
                          item.value,
                          selectedSubCats,
                          setSelectedSubCats,
                        )
                      }
                      className="mr-3 rounded text-[#2B5659] focus:ring-[#547B7D] border-gray-300"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6 border-t pt-4">
              <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
                Tình trạng kĩ thuật
              </h4>
              <div className="flex flex-col gap-2">
                {ELECTRONIC_DEEP_FILTERS.technicalIssues.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-black"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTechIssues.includes(item.value)}
                      onChange={() =>
                        handleCheckboxChange(
                          item.value,
                          selectedTechIssues,
                          setSelectedTechIssues,
                        )
                      }
                      className="mr-3 rounded text-[#2B5659] focus:ring-[#547B7D] border-gray-300"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 3. LỌC CHUNG: LOGISTICS */}
        <div className="mb-6 border-t pt-4">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
            Điều kiện vận chuyển
          </h4>
          <div className="flex flex-col gap-2">
            {COMMON_FILTERS.logistics.map((item) => (
              <label
                key={item.value}
                className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-black"
              >
                <input
                  type="checkbox"
                  checked={selectedLogistics.includes(item.value)}
                  onChange={() =>
                    handleCheckboxChange(
                      item.value,
                      selectedLogistics,
                      setSelectedLogistics,
                    )
                  }
                  className="mr-3 rounded text-[#2B5659] focus:ring-[#547B7D] border-gray-300"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        {/* 4. LỌC CHUNG: TÌNH TRẠNG SỬ DỤNG */}
        <div className="mb-6 border-t pt-4">
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
            Khả năng hoạt động
          </h4>
          <div className="flex flex-col gap-2">
            {COMMON_FILTERS.conditions.map((item) => (
              <label
                key={item.value}
                className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-black"
              >
                <input
                  type="checkbox"
                  checked={selectedConditions.includes(item.value)}
                  onChange={() =>
                    handleCheckboxChange(
                      item.value,
                      selectedConditions,
                      setSelectedConditions,
                    )
                  }
                  className="mr-3 rounded text-[#2B5659] focus:ring-[#547B7D] border-gray-300"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* ==========================================
          BÊN PHẢI: HIỂN THỊ TIN ĐĂNG (BÁN & MUA)
          ========================================== */}
      <main className="flex-grow">
        <h2 className="text-xl font-bold text-[#172830] mb-6 flex items-center justify-between">
          <span>Kết quả tìm kiếm</span>
          <span className="text-sm font-normal text-gray-400">
            ({filteredProducts.length} kết quả)
          </span>
        </h2>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative"
              >
                {/* NHÃN PHÂN LOẠI TIN MUA/BÁN NỔI BẬT */}
                <div
                  className={`absolute top-3 left-3 z-10 px-3 py-1 text-[10px] font-bold rounded-lg shadow-sm uppercase ${
                    product.postType === "SELL"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {product.postType === "SELL"
                    ? "📢 Tin Đăng Bán"
                    : "🏢 Tin Thu Mua"}
                </div>

                <div>
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-3 right-3 bg-[#172830] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                      {product.category === MAIN_CATEGORIES.APPLIANCE
                        ? "Gia dụng"
                        : "Điện tử"}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base text-[#172830] line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[32px]">
                      {product.desc}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
                        📍 {product.owner}
                      </span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded font-medium">
                        ⚙️{" "}
                        {product.condition === "good_working"
                          ? "Đang chạy tốt"
                          : product.condition === "minor_fault"
                            ? "Hỏng nhẹ / Cũ"
                            : "Hỏng nặng / Xác máy"}
                      </span>
                      <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded font-medium">
                        🚚{" "}
                        {product.logistics === "motor_friendly"
                          ? "Xe máy chở được"
                          : product.logistics === "truck_required"
                            ? "Cần xe tải"
                            : "Hỗ trợ tháo dỡ"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-400 font-medium">
                      {product.postType === "SELL"
                        ? "GIÁ BÁN ĐỀ XUẤT"
                        : "MỨC GIÁ THU MUA (TỪ)"}
                    </div>
                    <span className="text-lg font-black text-red-700">
                      {product.price.toLocaleString("vi-VN")} đ
                    </span>
                  </div>

                  {/* Nút bấm đổi màu theo ngữ cảnh */}
                  <button
                    className={`text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors ${
                      product.postType === "SELL"
                        ? "bg-[#172830] hover:bg-[#2B5659]"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {product.postType === "SELL"
                      ? "Liên hệ mua ngay"
                      : "Gửi bài bán"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-16 text-center text-gray-500 shadow-sm">
            <span className="text-5xl mb-4 block">🛠️</span>
            <p className="text-lg font-semibold text-[#172830] mb-1">
              Không tìm thấy kết quả phù hợp
            </p>
            <p className="text-sm text-gray-400">
              Vui lòng nới lỏng bớt tiêu chí lọc hoặc thay đổi lựa chọn nhé.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;

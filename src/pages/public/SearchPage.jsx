// src/pages/public/SearchPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  APPLIANCE_DEEP_FILTERS,
  CATEGORY_BACKEND_IDS,
  ELECTRONIC_DEEP_FILTERS,
  HOUSEHOLD_DEEP_FILTERS,
  MAIN_CATEGORIES,
} from "../../constants/filterOptions";
import FilterPanel from "../../features/marketplace/FilterPanel";
import { productApi } from "../../services/apis/productApi";
import { mockBusinessPosts, mockPersonalPosts } from "../../utils/mockData";
import { filterPosts } from "../../utils/searchUtils";
const ALL_POSTS = [...mockBusinessPosts, ...mockPersonalPosts];

// =========================================================
// MOCK DATA: ĐÃ THÊM THUỘC TÍNH 'postType' ĐỂ PHÂN BIỆT MUA/BÁN
// =========================================================

// Thêm prop displayMode: "ALL" | "SELL_ONLY" | "BUY_ONLY"
const SearchPage = ({ displayMode = "ALL", fixedPostType }) => {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  const showFilter = searchParams.get("showFilter") === "1";
  const resolvedDisplayMode = fixedPostType
    ? fixedPostType === "SELL"
      ? "SELL_ONLY"
      : "BUY_ONLY"
    : displayMode;

  // Trạng thái danh mục lớn (Gia dụng / Điện tử)
  const [mainCategory, setMainCategory] = useState(null);
  const [searchInput, setSearchInput] = useState(keyword);
  const [submittedQuery, setSubmittedQuery] = useState(keyword);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Lưu các tiêu chí lọc đang được tích chọn
  const [selectedLogistics, setSelectedLogistics] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);

  // Bộ lọc đặc thù Gia dụng
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  // Bộ lọc đặc thù Điện tử
  const [selectedSubCats, setSelectedSubCats] = useState([]);
  const [selectedTechIssues, setSelectedTechIssues] = useState([]);

  // Bộ lọc đặc thù Sinh hoạt
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState([]);
  const [selectedCoreMaterials, setSelectedCoreMaterials] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);

  // Danh sách loại sản phẩm tải từ backend theo category
  const [productTypes, setProductTypes] = useState([]);
  const [selectedProductTypeIds, setSelectedProductTypeIds] = useState([]);

  const hasKeyword = keyword.trim().length > 0;
  const shouldShowCategorySelection =
    !mainCategory && resolvedDisplayMode === "ALL" && showFilter;

  const handleSearchSubmit = () => {
    setSubmittedQuery(searchInput.trim());
  };

  const handleOpenFilter = () => {
    setIsFilterOpen(true);
  };

  const handleCategorySelection = (category) => {
    handleCategoryReset(category);
    setIsFilterOpen(false);
  };

  const handleResetCategorySelection = () => {
    handleCategoryReset(null);
    setIsFilterOpen(true);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearchSubmit();
    }
  };

  useEffect(() => {
    if (!mainCategory) {
      setProductTypes([]);
      return;
    }

    const backendCategoryId = CATEGORY_BACKEND_IDS[mainCategory];
    if (!backendCategoryId) {
      setProductTypes([]);
      return;
    }

    const loadProductTypes = async () => {
      try {
        const response =
          await productApi.getProductTypesByCategory(backendCategoryId);
        const types = Array.isArray(response)
          ? response
          : Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.data)
              ? response.data.data
              : [];
        setProductTypes(types);
      } catch (error) {
        console.error("Failed to load product types:", error);
        setProductTypes([]);
      }
    };

    loadProductTypes();
  }, [mainCategory]);

  // Reset sạch bộ lọc khi nhảy giữa 2 danh mục lớn
  const handleCategoryReset = (category) => {
    setMainCategory(category);
    setSelectedLogistics([]);
    setSelectedConditions([]);
    setSelectedSpaces([]);
    setSelectedMaterials([]);
    setSelectedSubCats([]);
    setSelectedTechIssues([]);
    setSelectedMaterialTypes([]);
    setSelectedCoreMaterials([]);
    setSelectedBrands([]);
    setProductTypes([]);
    setSelectedProductTypeIds([]);
  };

  const handleCheckboxChange = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleFilterChange = (type, value, checked) => {
    const toggleValue = (setter, currentValues) => {
      setter((prev) => {
        if (checked) {
          return prev.includes(value) ? prev : [...prev, value];
        }
        return prev.filter((item) => item !== value);
      });
    };

    switch (type) {
      case "logistics":
        toggleValue(setSelectedLogistics, selectedLogistics);
        break;
      case "condition":
        toggleValue(setSelectedConditions, selectedConditions);
        break;
      case "material":
        toggleValue(setSelectedMaterials, selectedMaterials);
        break;
      case "space":
        toggleValue(setSelectedSpaces, selectedSpaces);
        break;
      case "subCat":
        toggleValue(setSelectedSubCats, selectedSubCats);
        break;
      case "techIssue":
        toggleValue(setSelectedTechIssues, selectedTechIssues);
        break;
      case "materialType":
        toggleValue(setSelectedMaterialTypes, selectedMaterialTypes);
        break;
      case "coreMaterial":
        toggleValue(setSelectedCoreMaterials, selectedCoreMaterials);
        break;
      case "brand":
        toggleValue(setSelectedBrands, selectedBrands);
        break;
      case "productType":
        toggleValue(setSelectedProductTypeIds, selectedProductTypeIds);
        break;
      default:
        break;
    }
  };

  const filteredProducts = useMemo(() => {
    return filterPosts(ALL_POSTS, {
      mainCategory,
      displayMode: resolvedDisplayMode,
      submittedQuery,
      selectedLogistics,
      selectedConditions,
      selectedSpaces,
      selectedMaterials,
      selectedSubCats,
      selectedTechIssues,
      selectedMaterialTypes,
      selectedCoreMaterials,
      selectedBrands,
      selectedProductTypeIds,
    });
  }, [
    resolvedDisplayMode,
    mainCategory,
    submittedQuery,
    selectedLogistics,
    selectedConditions,
    selectedSpaces,
    selectedMaterials,
    selectedSubCats,
    selectedTechIssues,
    selectedMaterialTypes,
    selectedCoreMaterials,
    selectedBrands,
    selectedProductTypeIds,
  ]);

  // =========================================================
  // MÀN HÌNH CHỌN PHÂN KHÚC THU MUA ĐẦU VÀO
  // =========================================================
  if (
    !mainCategory &&
    resolvedDisplayMode === "ALL" &&
    !hasKeyword &&
    !showFilter
  ) {
    return (
      <div className="max-w-4xl mx-auto my-16 px-6 text-center">
        <h2 className="text-3xl font-extrabold text-[#172830] mb-2">
          Hệ Thống Thu Mua HomeCycle
        </h2>
        <p className="text-gray-500 mb-8">
          Vui lòng chọn lĩnh vực bạn quan tâm để chúng tôi mở các thông số lọc
          chuyên sâu phù hợp.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Nút Đồ Nội Thất */}
          <button
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-[#2B5659] rounded-2xl hover:border-solid hover:border-[#547B7D] hover:bg-[#E1FEFF]/10 transition-all duration-300 shadow-sm"
            onClick={() => handleCategoryReset(MAIN_CATEGORIES.APPLIANCE)}
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition">
              🛋️
            </span>
            <span className="text-xl font-bold text-[#172830]">
              Đồ Nội Thất
            </span>
            <span className="text-xs text-gray-400 mt-2">
              Lọc chuyên sâu theo: Chất liệu gỗ tự nhiên/MDF, da, sắt, kính;
              tháo dỡ cồng kềnh...
            </span>
          </button>
          {/* Nút Đồ Điện Tử */}
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
          {/* Nút Đồ Sinh Hoạt (MỚI) */}
          <button
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-[#2B5659] rounded-2xl hover:border-solid hover:border-[#547B7D] hover:bg-[#E1FEFF]/10 transition-all duration-300 shadow-sm"
            onClick={() => handleCategoryReset(MAIN_CATEGORIES.HOUSEHOLD)}
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition">
              🧺
            </span>
            <span className="text-xl font-bold text-[#172830]">
              Đồ Sinh Hoạt
            </span>
            <span className="text-xs text-gray-400 mt-2 text-center">
              Lọc chuyên sâu theo: Loại vật liệu, chất liệu an toàn, thương
              hiệu, tình trạng...
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (
    !mainCategory &&
    resolvedDisplayMode === "ALL" &&
    hasKeyword &&
    !showFilter
  ) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#547B7D]">
                  Kết quả tìm kiếm
                </p>
                <h2 className="text-2xl font-bold text-[#172830] mt-2">
                  Kết quả cho "{submittedQuery.trim()}"
                </h2>
              </div>
              <span className="text-sm text-gray-500">
                ({filteredProducts.length} kết quả)
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Hiển thị kết quả theo từ khóa đã nhập, không mở bộ lọc chuyên
              biệt.
            </p>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative"
                >
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
                Vui lòng thử lại từ khóa khác.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (
    shouldShowCategorySelection ||
    (!mainCategory && resolvedDisplayMode !== "ALL")
  ) {
    if (shouldShowCategorySelection) {
      return (
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#547B7D]">
                  Chọn lĩnh vực lọc
                </p>
                <h2 className="text-2xl font-bold text-[#172830] mt-2">
                  Vui lòng chọn lĩnh vực bạn quan tâm
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Chọn nhóm hàng phù hợp để mở bộ lọc chuyên sâu.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  handleCategorySelection(MAIN_CATEGORIES.APPLIANCE)
                }
                className="rounded-xl border border-gray-200 bg-[#F8FAFA] p-4 text-left hover:border-[#547B7D] hover:bg-[#E1FEFF]/40"
              >
                <div className="text-xl mb-2">🛋️</div>
                <div className="font-semibold text-[#172830]">Đồ Gia Dụng</div>
                <div className="text-sm text-gray-500 mt-1">
                  Lọc theo chất liệu, phòng sử dụng và điều kiện vận chuyển.
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCategorySelection(MAIN_CATEGORIES.ELECTRONIC)
                }
                className="rounded-xl border border-gray-200 bg-[#F8FAFA] p-4 text-left hover:border-[#547B7D] hover:bg-[#E1FEFF]/40"
              >
                <div className="text-xl mb-2">📺</div>
                <div className="font-semibold text-[#172830]">Đồ Điện Tử</div>
                <div className="text-sm text-gray-500 mt-1">
                  Lọc theo nhóm thiết bị, lỗi kỹ thuật và điều kiện vận chuyển.
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCategorySelection(MAIN_CATEGORIES.HOUSEHOLD)
                }
                className="rounded-xl border border-gray-200 bg-[#F8FAFA] p-4 text-left hover:border-[#547B7D] hover:bg-[#E1FEFF]/40"
              >
                <div className="text-xl mb-2">🧺</div>
                <div className="font-semibold text-[#172830]">Đồ Sinh Hoạt</div>
                <div className="text-sm text-gray-500 mt-1">
                  Lọc theo loại vật liệu, chất liệu, thương hiệu và điều kiện
                  vận chuyển.
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }

    const sectionTitle =
      resolvedDisplayMode === "SELL_ONLY"
        ? "Đây là khu vực tin đăng bán"
        : "Đây là khu vực tin thu mua";
    const sectionSubtitle =
      resolvedDisplayMode === "SELL_ONLY"
        ? "Khu vực này dùng để tìm các tin đăng bán phù hợp."
        : "Khu vực này dùng để tìm các tin thu mua phù hợp.";

    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#547B7D]">
                {resolvedDisplayMode === "SELL_ONLY"
                  ? "Khu vực tin đăng bán"
                  : "Khu vực tin thu mua"}
              </p>
              <h2 className="text-2xl font-bold text-[#172830] mt-2">
                {sectionTitle}
              </h2>
              <p className="text-sm text-gray-500 mt-2">{sectionSubtitle}</p>
            </div>

            <div className="w-full lg:w-105">
              <label
                htmlFor="post-search"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Tìm kiếm sản phẩm
              </label>
              <div className="flex gap-2">
                <input
                  id="post-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Nhập tên sản phẩm..."
                  className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-[#172830] focus:border-[#547B7D] focus:outline-none focus:ring-2 focus:ring-[#E1FEFF]"
                />
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="rounded-lg bg-[#2B5659] px-3 py-2 text-sm font-semibold text-white hover:bg-[#547B7D]"
                >
                  Tìm
                </button>
                <button
                  type="button"
                  onClick={handleOpenFilter}
                  className="rounded-lg border border-[#2B5659] bg-white px-3 py-2 text-sm font-semibold text-[#2B5659] hover:bg-[#E1FEFF]"
                >
                  Lọc
                </button>
              </div>
            </div>
          </div>

          {isFilterOpen && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#172830]">
                    Chọn lĩnh vực tìm kiếm
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Chọn nhóm đồ để mở bộ lọc chuyên biệt phù hợp với nội thất
                    hoặc điện tử.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="text-sm font-semibold text-gray-500 hover:text-[#172830]"
                >
                  Đóng
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() =>
                    handleCategorySelection(MAIN_CATEGORIES.APPLIANCE)
                  }
                  className="rounded-xl border border-gray-200 bg-[#F8FAFA] p-4 text-left hover:border-[#547B7D] hover:bg-[#E1FEFF]/40"
                >
                  <div className="text-xl mb-2">🛋️</div>
                  <div className="font-semibold text-[#172830]">
                    Đồ nội thất
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Lọc theo chất liệu, phòng sử dụng và điều kiện vận chuyển.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCategorySelection(MAIN_CATEGORIES.ELECTRONIC)
                  }
                  className="rounded-xl border border-gray-200 bg-[#F8FAFA] p-4 text-left hover:border-[#547B7D] hover:bg-[#E1FEFF]/40"
                >
                  <div className="text-xl mb-2">📺</div>
                  <div className="font-semibold text-[#172830]">Đồ điện tử</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Lọc theo nhóm thiết bị, lỗi kỹ thuật và điều kiện vận
                    chuyển.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCategorySelection(MAIN_CATEGORIES.HOUSEHOLD)
                  }
                  className="rounded-xl border border-gray-200 bg-[#F8FAFA] p-4 text-left hover:border-[#547B7D] hover:bg-[#E1FEFF]/40"
                >
                  <div className="text-xl mb-2">🧺</div>
                  <div className="font-semibold text-[#172830]">
                    Đồ sinh hoạt
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Lọc theo loại vật liệu, chất liệu, thương hiệu và điều kiện
                    vận chuyển.
                  </div>
                </button>
              </div>
            </div>
          )}

          {mainCategory && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#172830]">
                    Bộ lọc chuyên biệt
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Các tiêu chí dưới đây giúp thu hẹp kết quả tìm kiếm phù hợp
                    hơn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetCategorySelection}
                  className="text-sm font-semibold text-[#547B7D] hover:text-[#2B5659]"
                >
                  Đổi lĩnh vực
                </button>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {mainCategory === MAIN_CATEGORIES.APPLIANCE && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        Chất liệu cốt lõi
                      </h4>
                      <div className="space-y-2">
                        {APPLIANCE_DEEP_FILTERS.materials.map((item) => (
                          <label
                            key={item.value}
                            className="flex items-center text-sm text-gray-600"
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
                              className="mr-3 rounded text-[#2B5659]"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        Phân loại phòng
                      </h4>
                      <div className="space-y-2">
                        {APPLIANCE_DEEP_FILTERS.spaces.map((item) => (
                          <label
                            key={item.value}
                            className="flex items-center text-sm text-gray-600"
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
                              className="mr-3 rounded text-[#2B5659]"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {mainCategory === MAIN_CATEGORIES.ELECTRONIC && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        Nhóm thiết bị
                      </h4>
                      <div className="space-y-2">
                        {ELECTRONIC_DEEP_FILTERS.subCategories.map((item) => (
                          <label
                            key={item.value}
                            className="flex items-center text-sm text-gray-600"
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
                              className="mr-3 rounded text-[#2B5659]"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        Tình trạng kỹ thuật
                      </h4>
                      <div className="space-y-2">
                        {ELECTRONIC_DEEP_FILTERS.technicalIssues.map((item) => (
                          <label
                            key={item.value}
                            className="flex items-center text-sm text-gray-600"
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
                              className="mr-3 rounded text-[#2B5659]"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {mainCategory === MAIN_CATEGORIES.HOUSEHOLD && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        Loại vật liệu
                      </h4>
                      <div className="space-y-2">
                        {HOUSEHOLD_DEEP_FILTERS.materialTypes.map((item) => (
                          <label
                            key={item.value}
                            className="flex items-center text-sm text-gray-600"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMaterialTypes.includes(
                                item.value,
                              )}
                              onChange={() =>
                                handleCheckboxChange(
                                  item.value,
                                  selectedMaterialTypes,
                                  setSelectedMaterialTypes,
                                )
                              }
                              className="mr-3 rounded text-[#2B5659]"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        Chất liệu
                      </h4>
                      <div className="space-y-2">
                        {HOUSEHOLD_DEEP_FILTERS.coreMaterials.map((item) => (
                          <label
                            key={item.value}
                            className="flex items-center text-sm text-gray-600"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCoreMaterials.includes(
                                item.value,
                              )}
                              onChange={() =>
                                handleCheckboxChange(
                                  item.value,
                                  selectedCoreMaterials,
                                  setSelectedCoreMaterials,
                                )
                              }
                              className="mr-3 rounded text-[#2B5659]"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
                        Thương hiệu
                      </h4>
                      <div className="space-y-2">
                        {HOUSEHOLD_DEEP_FILTERS.brands.map((item) => (
                          <label
                            key={item.value}
                            className="flex items-center text-sm text-gray-600"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBrands.includes(item.value)}
                              onChange={() =>
                                handleCheckboxChange(
                                  item.value,
                                  selectedBrands,
                                  setSelectedBrands,
                                )
                              }
                              className="mr-3 rounded text-[#2B5659]"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
            {submittedQuery.trim() ? (
              <>
                <p className="text-lg font-semibold text-[#172830]">
                  Kết quả cho “{submittedQuery.trim()}”
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {filteredProducts.length > 0
                    ? `Đã tìm thấy ${filteredProducts.length} tin phù hợp trong khu vực này.`
                    : "Chưa có tin nào phù hợp với từ khóa này."}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-[#172830]">
                  Chưa có từ khóa tìm kiếm
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Nhập tên sản phẩm hoặc mô tả để xem các tin phù hợp.
                </p>
              </>
            )}
          </div>

          {submittedQuery.trim() && filteredProducts.length > 0 && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative"
                >
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
          )}
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
          onClick={handleResetCategorySelection}
          className="flex items-center gap-2 text-sm font-semibold text-[#547B7D] hover:text-[#2B5659] mb-6 transition"
        >
          &larr; Đổi nhóm sản phẩm
        </button>

        <FilterPanel
          mainCategory={mainCategory}
          onFilterChange={handleFilterChange}
          productTypes={productTypes}
          selectedProductTypeIds={selectedProductTypeIds}
        />
      </aside>

      {/* ==========================================
          BÊN PHẢI: HIỂN THỊ TIN ĐĂNG (BÁN & MUA)
          ========================================== */}
      <main className="grow">
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
                        : product.category === MAIN_CATEGORIES.ELECTRONIC
                          ? "Điện tử"
                          : "Sinh hoạt"}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base text-[#172830] line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-8">
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

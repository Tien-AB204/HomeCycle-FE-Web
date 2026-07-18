// src/features/marketplace/FilterPanel.jsx
import {
  APPLIANCE_FILTERS,
  COMMON_FILTERS,
  ELECTRONIC_FILTERS,
  MAIN_CATEGORIES,
} from "../../constants/filterOptions";

const FilterPanel = ({ mainCategory, onFilterChange }) => {
  // Lấy bộ lọc tương ứng với danh mục đang chọn
  const specificFilters =
    mainCategory === MAIN_CATEGORIES.APPLIANCE
      ? APPLIANCE_FILTERS
      : ELECTRONIC_FILTERS;

  return (
    <div className="filter-panel p-4 border rounded-md bg-white">
      <h3 className="font-bold text-lg mb-4">Bộ lọc tìm kiếm</h3>

      {/* Lọc theo Tình trạng (Dùng chung) */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2">Tình trạng</h4>
        {COMMON_FILTERS.conditions.map((item) => (
          <label key={item.value} className="block mb-1 cursor-pointer">
            <input
              type="checkbox"
              className="mr-2"
              onChange={(e) =>
                onFilterChange("condition", item.value, e.target.checked)
              }
            />
            {item.label}
          </label>
        ))}
      </div>

      {/* Lọc theo Mức giá (Dùng chung) */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2">Mức giá</h4>
        {COMMON_FILTERS.priceRanges.map((item) => (
          <label key={item.value} className="block mb-1 cursor-pointer">
            <input
              type="radio"
              name="priceRange"
              className="mr-2"
              onChange={() => onFilterChange("price", item.value, true)}
            />
            {item.label}
          </label>
        ))}
      </div>

      {/* Lọc Động: Chỉ hiện khi là Đồ Gia Dụng */}
      {mainCategory === MAIN_CATEGORIES.APPLIANCE && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Không gian sử dụng</h4>
          {specificFilters.spaces.map((item) => (
            <label key={item.value} className="block mb-1 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2"
                onChange={(e) =>
                  onFilterChange("space", item.value, e.target.checked)
                }
              />
              {item.label}
            </label>
          ))}
        </div>
      )}

      {/* Lọc Động: Chỉ hiện khi là Đồ Điện Máy */}
      {mainCategory === MAIN_CATEGORIES.ELECTRONIC && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Thương hiệu</h4>
          {specificFilters.brands.map((item) => (
            <label key={item.value} className="block mb-1 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2"
                onChange={(e) =>
                  onFilterChange("brand", item.value, e.target.checked)
                }
              />
              {item.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;

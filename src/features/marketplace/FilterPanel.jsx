// src/features/marketplace/FilterPanel.jsx
import {
  APPLIANCE_DEEP_FILTERS,
  COMMON_FILTERS,
  ELECTRONIC_DEEP_FILTERS,
  HOUSEHOLD_DEEP_FILTERS,
  MAIN_CATEGORIES,
} from "../../constants/filterOptions";

const FilterPanel = ({
  mainCategory,
  onFilterChange,
  productTypes = [],
  selectedProductTypeIds = [],
}) => {
  let specificFilters = {};
  if (mainCategory === MAIN_CATEGORIES.APPLIANCE) {
    specificFilters = APPLIANCE_DEEP_FILTERS;
  } else if (mainCategory === MAIN_CATEGORIES.ELECTRONIC) {
    specificFilters = ELECTRONIC_DEEP_FILTERS;
  } else if (mainCategory === MAIN_CATEGORIES.HOUSEHOLD) {
    specificFilters = HOUSEHOLD_DEEP_FILTERS;
  }

  return (
    <div className="filter-panel p-4 border rounded-md bg-white">
      <h3 className="font-bold text-lg mb-4">Bộ lọc tìm kiếm</h3>

      {productTypes.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Loại sản phẩm</h4>
          {productTypes.map((item) => (
            <label
              key={item.productTypeId}
              className="block mb-1 cursor-pointer"
            >
              <input
                type="checkbox"
                className="mr-2"
                checked={selectedProductTypeIds.includes(item.productTypeId)}
                onChange={(e) =>
                  onFilterChange(
                    "productType",
                    item.productTypeId,
                    e.target.checked,
                  )
                }
              />
              {item.productTypeName}
            </label>
          ))}
        </div>
      )}

      {/* Lọc theo điều kiện vận chuyển (Dùng chung) */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2">Điều kiện vận chuyển</h4>
        {COMMON_FILTERS.logistics?.map((item) => (
          <label key={item.value} className="block mb-1 cursor-pointer">
            <input
              type="checkbox"
              className="mr-2"
              onChange={(e) =>
                onFilterChange("logistics", item.value, e.target.checked)
              }
            />
            {item.label}
          </label>
        ))}
      </div>

      {/* Lọc theo khả năng hoạt động (Dùng chung) */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2">Khả năng hoạt động</h4>
        {COMMON_FILTERS.conditions?.map((item) => (
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

      {/* Lọc Động: Chỉ hiện khi là Đồ Gia Dụng */}
      {mainCategory === MAIN_CATEGORIES.APPLIANCE &&
        specificFilters.materials && (
          <div className="mb-6">
            <h4 className="font-semibold mb-2">Chất liệu cốt lõi</h4>
            {specificFilters.materials.map((item) => (
              <label key={item.value} className="block mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={(e) =>
                    onFilterChange("material", item.value, e.target.checked)
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        )}

      {mainCategory === MAIN_CATEGORIES.APPLIANCE && specificFilters.spaces && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Phân loại phòng</h4>
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

      {mainCategory === MAIN_CATEGORIES.APPLIANCE && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Thương hiệu</h4>
          {specificFilters.brands?.map((item) => (
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

      {/* Lọc Động: Chỉ hiện khi là Đồ Điện Tử */}
      {mainCategory === MAIN_CATEGORIES.ELECTRONIC &&
        specificFilters.subCategories && (
          <div className="mb-6">
            <h4 className="font-semibold mb-2">Nhóm thiết bị</h4>
            {specificFilters.subCategories.map((item) => (
              <label key={item.value} className="block mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={(e) =>
                    onFilterChange("subCat", item.value, e.target.checked)
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        )}

      {mainCategory === MAIN_CATEGORIES.ELECTRONIC &&
        specificFilters.technicalIssues && (
          <div className="mb-6">
            <h4 className="font-semibold mb-2">Tình trạng kỹ thuật</h4>
            {specificFilters.technicalIssues.map((item) => (
              <label key={item.value} className="block mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={(e) =>
                    onFilterChange("techIssue", item.value, e.target.checked)
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        )}

      {mainCategory === MAIN_CATEGORIES.ELECTRONIC && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Thương hiệu</h4>
          {specificFilters.brands?.map((item) => (
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

      {/* Lọc Động: Chỉ hiện khi là Đồ Sinh Hoạt (MỚI) */}
      {mainCategory === MAIN_CATEGORIES.HOUSEHOLD && (
        <>
          <div className="mb-6">
            <h4 className="font-semibold mb-2">Loại vật liệu</h4>
            {specificFilters.materialTypes?.map((item) => (
              <label key={item.value} className="block mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={(e) =>
                    onFilterChange("materialType", item.value, e.target.checked)
                  }
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-2">Chất liệu</h4>
            {specificFilters.coreMaterials?.map((item) => (
              <label key={item.value} className="block mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={(e) =>
                    onFilterChange("coreMaterial", item.value, e.target.checked)
                  }
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-2">Thương hiệu</h4>
            {specificFilters.brands?.map((item) => (
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
        </>
      )}
    </div>
  );
};

export default FilterPanel;

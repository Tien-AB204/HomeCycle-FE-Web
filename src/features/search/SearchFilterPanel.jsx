import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  DAMAGE_LEVEL_FILTER_OPTIONS,
  DELIVERY_METHOD_OPTIONS,
  FUNCTIONALITY_OPTIONS,
  SPACE_USAGE_OPTIONS,
  toggleAttributeOption,
} from "./searchFilters";

const FIELD_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed";
const RANGE_INPUT_CLASS =
  "min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const FieldLabel = ({ children }) => (
  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-textLight">
    {children}
  </span>
);

const SelectField = ({ label, value, onChange, options, emptyLabel, disabled }) => (
  <label className="block">
    <FieldLabel>{label}</FieldLabel>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={FIELD_CLASS}
    >
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const RangeField = ({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder = "Từ",
  maxPlaceholder = "Đến",
  step,
}) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="grid grid-cols-2 gap-2">
      <input
        type="number"
        min="0"
        step={step}
        value={minValue}
        onChange={(event) => onMinChange(event.target.value)}
        placeholder={minPlaceholder}
        aria-label={`${label} tối thiểu`}
        className={RANGE_INPUT_CLASS}
      />
      <input
        type="number"
        min="0"
        step={step}
        value={maxValue}
        onChange={(event) => onMaxChange(event.target.value)}
        placeholder={maxPlaceholder}
        aria-label={`${label} tối đa`}
        className={RANGE_INPUT_CLASS}
      />
    </div>
  </div>
);

const AttributeFilters = ({
  attributes,
  isLoading,
  error,
  selectedOptions,
  onToggle,
}) => {
  if (isLoading) {
    return (
      <p className="rounded-xl bg-background px-3 py-2 text-xs font-semibold text-textLight">
        Đang tải bộ lọc của loại sản phẩm...
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
        {error}
      </p>
    );
  }

  if (!attributes.length) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background/60 p-3">
      {attributes.map((attribute) => {
        const selectedIds = selectedOptions[attribute.attributeId] || [];

        return (
          <fieldset key={attribute.attributeId}>
            <legend className="mb-2 text-xs font-bold text-text">
              {attribute.attributeName}
              {attribute.unit ? ` (${attribute.unit})` : ""}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {attribute.options.map((option) => {
                const isSelected = selectedIds.includes(option.optionId);

                return (
                  <button
                    key={option.optionId}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      onToggle(attribute.attributeId, option.optionId)
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-textLight hover:border-primary hover:text-primary"
                    }`}
                  >
                    {option.optionValue}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
};

/*
 * onChange nhận một phần bộ lọc cần cập nhật; trang tìm kiếm tự quay về
 * trang 1.
 */
const SearchFilterPanel = ({
  filters,
  options,
  onChange,
  onReset,
  showPostTypeFilter,
  children,
}) => {
  const update = (name) => (value) => onChange({ [name]: value });

  const handleCategoryChange = (categoryId) =>
    onChange({ categoryId, productTypeId: "", attributeOptions: {} });

  const handleProductTypeChange = (productTypeId) =>
    onChange({ productTypeId, attributeOptions: {} });

  const handleAttributeToggle = (attributeId, optionId) =>
    onChange({
      attributeOptions: toggleAttributeOption(
        filters.attributeOptions,
        attributeId,
        optionId,
      ),
    });

  const provinceOptions = options.provinces.map((name) => ({
    value: name,
    label: name,
  }));

  // Giữ lựa chọn cũ (nhập tay trước đây) để người dùng vẫn thấy và xóa được.
  if (filters.city && !options.provinces.includes(filters.city)) {
    provinceOptions.unshift({ value: filters.city, label: filters.city });
  }

  return (
    <aside className="h-fit w-full shrink-0 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_32px_rgba(23,40,48,0.06)] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:w-72 lg:overflow-y-auto">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-black text-text">
          <FilterOutlined className="text-primary" /> Bộ lọc
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-text"
        >
          <ReloadOutlined /> Đặt lại
        </button>
      </div>

      <div className="space-y-5">
        {showPostTypeFilter && (
          <SelectField
            label="Loại bài đăng"
            value={filters.postType}
            onChange={update("postType")}
            emptyLabel="Tất cả bài đăng"
            options={[
              { value: "Buy", label: "Tin thu mua" },
              { value: "Sell", label: "Tin đăng bán" },
            ]}
          />
        )}

        <SelectField
          label="Danh mục"
          value={filters.categoryId}
          onChange={handleCategoryChange}
          emptyLabel="Tất cả danh mục"
          options={options.categories.map((category) => ({
            value: category.categoryId,
            label: category.categoryName,
          }))}
        />

        <div className="space-y-3">
          <SelectField
            label="Loại sản phẩm"
            value={filters.productTypeId}
            onChange={handleProductTypeChange}
            disabled={!filters.categoryId || options.isLoadingProductTypes}
            emptyLabel={
              options.isLoadingProductTypes
                ? "Đang tải..."
                : filters.categoryId
                  ? "Tất cả loại sản phẩm"
                  : "Chọn danh mục trước"
            }
            options={options.productTypes.map((productType) => ({
              value: productType.productTypeId,
              label: productType.productTypeName,
            }))}
          />

          {options.productTypeError && (
            <p className="text-xs font-semibold text-warning">
              {options.productTypeError}
            </p>
          )}

          {filters.productTypeId && (
            <AttributeFilters
              attributes={options.attributes}
              isLoading={options.isLoadingAttributes}
              error={options.attributeError}
              selectedOptions={filters.attributeOptions}
              onToggle={handleAttributeToggle}
            />
          )}
        </div>

        <RangeField
          label="Khoảng giá (đ)"
          minValue={filters.minPrice}
          maxValue={filters.maxPrice}
          onMinChange={update("minPrice")}
          onMaxChange={update("maxPrice")}
          step="1000"
        />

        <SelectField
          label="Tỉnh/Thành phố"
          value={filters.city}
          onChange={update("city")}
          emptyLabel="Toàn quốc"
          options={provinceOptions}
        />

        <SelectField
          label="Vận chuyển"
          value={filters.deliveryMethod}
          onChange={update("deliveryMethod")}
          emptyLabel="Tất cả hình thức"
          options={DELIVERY_METHOD_OPTIONS}
        />

        <SelectField
          label="Tình trạng hoạt động"
          value={filters.functionalityStatus}
          onChange={update("functionalityStatus")}
          emptyLabel="Tất cả tình trạng"
          options={FUNCTIONALITY_OPTIONS}
        />

        <div>
          <FieldLabel>Mức hư hỏng</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["minDamageLevel", "Từ mức", "Mức hư hỏng tối thiểu"],
              ["maxDamageLevel", "Đến mức", "Mức hư hỏng tối đa"],
            ].map(([name, emptyLabel, ariaLabel]) => (
              <select
                key={name}
                value={filters[name]}
                onChange={(event) => onChange({ [name]: event.target.value })}
                aria-label={ariaLabel}
                className={`${FIELD_CLASS} px-2 text-xs`}
              >
                <option value="">{emptyLabel}</option>
                {DAMAGE_LEVEL_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <RangeField
          label="Thời gian đã dùng (tháng)"
          minValue={filters.minUsageDuration}
          maxValue={filters.maxUsageDuration}
          onMinChange={update("minUsageDuration")}
          onMaxChange={update("maxUsageDuration")}
          minPlaceholder="Từ tháng"
          maxPlaceholder="Đến tháng"
          step="1"
        />

        <SelectField
          label="Không gian sử dụng"
          value={filters.spaceUsage}
          onChange={update("spaceUsage")}
          emptyLabel="Tất cả không gian"
          options={SPACE_USAGE_OPTIONS}
        />

        {children}
      </div>
    </aside>
  );
};

export default SearchFilterPanel;

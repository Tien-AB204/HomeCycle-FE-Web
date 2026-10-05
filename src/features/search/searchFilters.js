import {
  DELIVERY_METHOD_OPTIONS,
  FUNCTIONALITY_OPTIONS,
  SPACE_USAGE_OPTIONS,
} from "../../constants/postFormOptions.js";

export { DELIVERY_METHOD_OPTIONS, FUNCTIONALITY_OPTIONS, SPACE_USAGE_OPTIONS };

/*
 * Mức hư hỏng gửi lên Backend là số của enum DamageLevel (0-5).
 */
export const DAMAGE_LEVEL_FILTER_OPTIONS = Object.freeze([
  { value: "0", label: "Không hư hỏng" },
  { value: "1", label: "Trầy xước ngoại quan" },
  { value: "2", label: "Hư hỏng nhẹ" },
  { value: "3", label: "Hư hỏng trung bình" },
  { value: "4", label: "Hư hỏng nặng" },
  { value: "5", label: "Tổn thất toàn bộ" },
]);

/*
 * Sắp xếp do Backend thực hiện trên toàn bộ kết quả, không chỉ trang hiện tại.
 */
export const SEARCH_SORT_OPTIONS = Object.freeze([
  { value: "newest", label: "Mới nhất", sortBy: "Newest" },
  { value: "oldest", label: "Cũ nhất", sortBy: "Oldest" },
  { value: "price-ascending", label: "Giá tăng dần", sortBy: "PriceAsc" },
  { value: "price-descending", label: "Giá giảm dần", sortBy: "PriceDesc" },
]);

export const DEFAULT_SORT_MODE = "newest";

export const isSortMode = (value) =>
  SEARCH_SORT_OPTIONS.some((option) => option.value === value);

export const toBackendSortBy = (sortMode) =>
  SEARCH_SORT_OPTIONS.find((option) => option.value === sortMode)?.sortBy ||
  "Newest";

export const createInitialFilters = () => ({
  postType: "",
  categoryId: "",
  productTypeId: "",
  attributeOptions: {},
  minPrice: "",
  maxPrice: "",
  city: "",
  deliveryMethod: "",
  functionalityStatus: "",
  spaceUsage: "",
  minDamageLevel: "",
  maxDamageLevel: "",
  minUsageDuration: "",
  maxUsageDuration: "",
});

const FILTER_KEYS = Object.keys(createInitialFilters());

/*
 * Bộ lọc khôi phục từ lịch sử điều hướng có thể chứa khóa cũ (ví dụ
 * priorityLevel); chỉ giữ các khóa còn hỗ trợ.
 */
export const restoreFilters = (savedFilters) => {
  const filters = createInitialFilters();

  if (!savedFilters || typeof savedFilters !== "object") {
    return filters;
  }

  FILTER_KEYS.forEach((key) => {
    if (key === "attributeOptions") {
      filters.attributeOptions = normalizeAttributeOptions(
        savedFilters.attributeOptions,
      );
    } else if (typeof savedFilters[key] === "string") {
      filters[key] = savedFilters[key];
    }
  });

  return filters;
};

const normalizeAttributeOptions = (attributeOptions) => {
  if (!attributeOptions || typeof attributeOptions !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(attributeOptions)
      .map(([attributeId, optionIds]) => [
        attributeId,
        Array.isArray(optionIds) ? optionIds.filter(Boolean) : [],
      ])
      .filter(([attributeId, optionIds]) => attributeId && optionIds.length),
  );
};

export const toggleAttributeOption = (attributeOptions, attributeId, optionId) => {
  const current = attributeOptions?.[attributeId] || [];
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId];
  const nextOptions = { ...(attributeOptions || {}) };

  if (next.length) {
    nextOptions[attributeId] = next;
  } else {
    delete nextOptions[attributeId];
  }

  return nextOptions;
};

const parseNonNegativeNumber = (value, { integer = false } = {}) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return undefined;
  }

  return integer ? Math.trunc(number) : number;
};

/*
 * Backend từ chối khoảng có cận dưới lớn hơn cận trên, nên đảo lại thay vì
 * báo lỗi.
 */
const toRange = (minValue, maxValue, options) => {
  const min = parseNonNegativeNumber(minValue, options);
  const max = parseNonNegativeNumber(maxValue, options);

  return min !== undefined && max !== undefined && min > max
    ? [max, min]
    : [min, max];
};

/*
 * Lựa chọn thuộc tính bị xóa mỗi khi đổi danh mục/loại sản phẩm, nên mọi
 * lựa chọn còn lại đều thuộc loại sản phẩm đang chọn.
 */
export const buildAttributeFilters = (attributeOptions) =>
  Object.entries(normalizeAttributeOptions(attributeOptions)).map(
    ([attributeId, optionIds]) => ({ attributeId, optionIds }),
  );

export const buildSearchCriteria = ({
  filters,
  keyword = "",
  fixedPostType = "",
  isBusinessUser = false,
  sortMode = DEFAULT_SORT_MODE,
}) => {
  const [minPrice, maxPrice] = toRange(filters.minPrice, filters.maxPrice);
  const [minDamageLevel, maxDamageLevel] = toRange(
    filters.minDamageLevel,
    filters.maxDamageLevel,
    { integer: true },
  );
  const [minUsageDuration, maxUsageDuration] = toRange(
    filters.minUsageDuration,
    filters.maxUsageDuration,
    { integer: true },
  );

  /*
   * Doanh nghiệp chỉ khám phá tin bán của cá nhân; tin thu mua là nhu cầu
   * của doanh nghiệp khác.
   */
  const postType = isBusinessUser
    ? "Sell"
    : fixedPostType || filters.postType;
  const categoryId = filters.categoryId;

  return {
    keyword,
    postType,
    categoryId,
    // Backend yêu cầu có danh mục khi lọc theo loại sản phẩm.
    productTypeId: categoryId ? filters.productTypeId : "",
    minPrice,
    maxPrice,
    city: filters.city,
    deliveryMethod: filters.deliveryMethod,
    functionalityStatus: filters.functionalityStatus,
    spaceUsage: filters.spaceUsage,
    minDamageLevel,
    maxDamageLevel,
    minUsageDuration,
    maxUsageDuration,
    onlyAvailable: true,
    sortBy: toBackendSortBy(sortMode),
    attributeFilters:
      categoryId && filters.productTypeId
        ? buildAttributeFilters(filters.attributeOptions)
        : [],
  };
};

export const countActiveFilters = (filters) =>
  Object.entries(filters).reduce((count, [key, value]) => {
    if (key === "attributeOptions") {
      return count + Object.values(value || {}).filter((ids) => ids.length).length;
    }

    return value !== "" && value !== null && value !== undefined
      ? count + 1
      : count;
  }, 0);

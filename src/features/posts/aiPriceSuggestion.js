/*
 * Trạng thái Backend trả về khi có giá dùng được để áp dụng vào tin.
 */
const USABLE_STATUSES = new Set([
  "SUGGESTED",
  "FALLBACK_DB_ONLY",
  "FALLBACK_INTERNAL_LISTINGS",
  "FALLBACK_MARKET_LISTINGS",
  "FALLBACK_EQUIVALENT_MODEL",
]);

export const AI_CONFIDENCE_LABELS = {
  HIGH: "Độ tin cậy cao",
  MEDIUM: "Độ tin cậy khá",
  LOW: "Chỉ mang tính tham khảo",
  NONE: "Chưa đủ dữ liệu",
};

const MAX_ATTRIBUTE_VALUES = 30;

export const normalizeStatus = (value) =>
  String(value || "").trim().toUpperCase();

export const hasUsablePrice = (result) =>
  USABLE_STATUSES.has(normalizeStatus(result?.status)) &&
  Number(result?.suggestedPrice) > 0;

/*
 * Dữ liệu gửi đi lấy từ form hiện tại; "issue" là lý do chưa thể gợi ý, rỗng
 * khi đã đủ thông tin. "key" dùng để biết kết quả cũ còn khớp form không.
 */
export const buildAiPricingContext = ({
  form,
  attributeValues,
  missingRequiredAttribute,
  isLoadingAttributes,
}) => {
  const usageText = String(form.usageDuration ?? "").trim();
  const usageDuration = Number(usageText);
  const validUsageDuration =
    usageText === "" || (Number.isFinite(usageDuration) && usageDuration >= 0);

  const product = {
    productTypeId: String(form.productTypeId || "").trim(),
    brandId: String(form.brandId || "").trim(),
    productName: String(form.productName || "").trim(),
    modelNumber: String(form.modelNumber || "").trim(),
    functionalityStatus: form.functionalityStatus || "",
    damageLevel: form.damageLevel || "",
    ...(usageText && validUsageDuration ? { usageDuration } : {}),
    attributeValues,
  };

  const missingCore =
    !product.productTypeId ||
    !product.brandId ||
    !product.productName ||
    !product.modelNumber ||
    !product.functionalityStatus ||
    !product.damageLevel;

  const issue = missingCore
    ? "Chọn loại sản phẩm, thương hiệu, nhập tên, mã model và tình trạng để nhận gợi ý giá."
    : isLoadingAttributes
      ? "Đang tải thông số sản phẩm."
      : missingRequiredAttribute
        ? "Hoàn tất các thuộc tính bắt buộc ở bước 3 để nhận gợi ý giá."
        : !validUsageDuration
          ? "Thời gian sử dụng chưa hợp lệ."
          : attributeValues.length > MAX_ATTRIBUTE_VALUES
            ? "Sản phẩm có quá nhiều thông số để gợi ý giá."
            : "";

  return { product, key: JSON.stringify(product), issue };
};

const toCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const isNewPriceSource = (source) =>
  normalizeStatus(source?.sourceType) === "NEW_MARKET_REFERENCE";

/*
 * Backend mới đánh dấu usedInCalculation cho từng nguồn; bản cũ thì không.
 */
export const hasUsageFlags = (sources) =>
  (sources || []).some((source) => typeof source?.usedInCalculation === "boolean");

export const countWebListingsUsed = (sources) =>
  (sources || []).filter(
    (source) => source?.usedInCalculation === true && !isNewPriceSource(source),
  ).length;

export const countWebListingsFound = (evidence) =>
  toCount(evidence?.externalListingSamples) +
  toCount(evidence?.equivalentExternalListingSamples);

/*
 * Số mẫu giá máy cũ thực sự dùng để tính (không đếm tin bị loại hoặc chỉ để
 * tham khảo).
 */
export const countAiPriceSamples = (evidence, sources) =>
  toCount(evidence?.completedTradeSamples) +
  toCount(evidence?.internalListingSamples) +
  toCount(evidence?.equivalentCompletedTradeSamples) +
  toCount(evidence?.equivalentInternalListingSamples) +
  (hasUsageFlags(sources)
    ? countWebListingsUsed(sources)
    : countWebListingsFound(evidence));

export const getSampleGroups = (evidence, sources) => {
  const webFound = countWebListingsFound(evidence);
  const withUsageFlags = hasUsageFlags(sources);

  return [
    {
      label: "Giao dịch trên HomeCycle",
      value:
        toCount(evidence?.completedTradeSamples) +
        toCount(evidence?.equivalentCompletedTradeSamples),
    },
    {
      label: "Tin đang bán trên HomeCycle",
      value:
        toCount(evidence?.internalListingSamples) +
        toCount(evidence?.equivalentInternalListingSamples),
    },
    { label: "Tin rao trên mạng", value: webFound, isWeb: true },
  ]
    .filter((group) => group.value > 0)
    .map((group) => ({
      label: group.label,
      text:
        group.isWeb && withUsageFlags
          ? `${countWebListingsUsed(sources)} dùng để tính / ${webFound} tìm thấy`
          : String(group.value),
    }));
};

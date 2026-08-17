import {
  DAMAGE_LEVEL_OPTIONS,
  FUNCTIONALITY_BY_DAMAGE_LEVEL,
  FUNCTIONALITY_OPTIONS,
  LEGACY_DAMAGE_LEVEL_ALIASES,
  LEGACY_FUNCTIONALITY_ALIASES,
} from "../constants/postFormOptions.js";

const FIELD_BY_BACKEND_KEY = Object.freeze({
  categoryid: "categoryId",
  productcategoryid: "categoryId",
  producttypeid: "productTypeId",
  brandid: "brandId",
  productname: "productName",
  modelnumber: "modelNumber",
  baseprice: "price",
  price: "price",
  originalprice: "originalPrice",
  quantity: "quantity",
  description: "description",
  detaildescription: "detailDescription",
  prioritylevel: "priorityLevel",
  deliverymethod: "deliveryMethod",
  city: "city",
  ward: "ward",
  streetaddress: "streetAddress",
  spaceusage: "spaceUsage",
  functionalitystatus: "functionalityStatus",
  usageduration: "usageDuration",
  damagelevel: "damageLevel",
  length: "length",
  width: "width",
  height: "height",
  weight: "weight",
  medias: "medias",
  files: "medias",
});

const FIELD_ERROR_MESSAGES = Object.freeze({
  categoryId: "Danh mục không hợp lệ.",
  productTypeId: "Loại sản phẩm không hợp lệ.",
  brandId: "Thương hiệu không hợp lệ.",
  productName: "Tên sản phẩm không hợp lệ.",
  modelNumber: "Mã model không hợp lệ.",
  price: "Giá đăng không hợp lệ.",
  originalPrice: "Giá mua ban đầu không hợp lệ.",
  quantity: "Số lượng không hợp lệ.",
  description: "Mô tả bài đăng không hợp lệ.",
  detailDescription: "Mô tả chi tiết không hợp lệ.",
  priorityLevel: "Độ ưu tiên không hợp lệ.",
  deliveryMethod: "Hình thức giao nhận không hợp lệ.",
  city: "Tỉnh hoặc thành phố không hợp lệ.",
  ward: "Phường hoặc xã không hợp lệ.",
  streetAddress: "Địa chỉ chi tiết không hợp lệ.",
  spaceUsage: "Không gian sử dụng không hợp lệ.",
  functionalityStatus: "Tình trạng hoạt động không hợp lệ.",
  usageDuration: "Thời gian sử dụng không hợp lệ.",
  damageLevel: "Mức độ hư hỏng không hợp lệ.",
  length: "Chiều dài không hợp lệ.",
  width: "Chiều rộng không hợp lệ.",
  height: "Chiều cao không hợp lệ.",
  weight: "Khối lượng không hợp lệ.",
  medias: "Hình ảnh sản phẩm không hợp lệ.",
  attributes: "Thuộc tính sản phẩm không hợp lệ.",
});

export const POST_NOT_EDITABLE_MESSAGE =
  "Không thể chỉnh sửa bài đăng không hoạt động.";

export const isPostStatusEditable = (status) =>
  String(status || "").trim().toLowerCase() === "active";

export const getManagedPostQuantity = (post) => {
  const quantity = Number(post?.quantity);

  if (Number.isInteger(quantity) && quantity >= 0) {
    return quantity;
  }

  const remainingQuantity = Number(post?.remainingQuantity);

  return Number.isInteger(remainingQuantity) && remainingQuantity >= 0
    ? remainingQuantity
    : 0;
};

const getLastBackendKey = (key) =>
  String(key || "")
    .replace(/\[\d+\]/g, "")
    .split(".")
    .filter(Boolean)
    .at(-1)
    ?.toLowerCase() || "";

const resolveFormField = (backendKey) => {
  const normalizedKey = String(backendKey || "").toLowerCase();

  if (normalizedKey.includes("attributevalues")) {
    return "attributes";
  }

  return FIELD_BY_BACKEND_KEY[getLastBackendKey(backendKey)] || "";
};

const isVietnameseMessage = (message) =>
  /[À-ỹĐđ]/u.test(String(message || ""));

const getGeneralVietnameseError = (error, fallbackMessage) => {
  const status = Number(error?.response?.status);
  const responseData = error?.response?.data;
  const serverMessage =
    responseData?.error?.message || responseData?.message || "";

  if (isVietnameseMessage(serverMessage)) {
    return serverMessage;
  }

  if (status === 400 || status === 422) {
    return "Dữ liệu bài đăng chưa hợp lệ. Vui lòng kiểm tra lại các trường được đánh dấu.";
  }

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác với bài đăng này.";
  }

  if (status === 404) {
    return "Không tìm thấy bài đăng hoặc dữ liệu liên quan.";
  }

  if (status === 409) {
    return "Dữ liệu bài đăng đã thay đổi. Vui lòng tải lại và thử lại.";
  }

  if (status === 413) {
    return "Tệp hình ảnh vượt quá dung lượng hệ thống cho phép.";
  }

  if (status >= 500) {
    return "Hệ thống đang gặp sự cố khi xử lý bài đăng. Vui lòng thử lại sau.";
  }

  if (
    error?.code === "ECONNABORTED" ||
    /timeout/i.test(String(error?.message || ""))
  ) {
    return "Yêu cầu đã quá thời gian chờ. Vui lòng thử lại.";
  }

  if (!error?.response) {
    const localMessage = String(error?.message || "");

    return isVietnameseMessage(localMessage)
      ? localMessage
      : "Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng và thử lại.";
  }

  return fallbackMessage;
};

export const getPostFormApiErrors = (
  error,
  fallbackMessage = "Không thể xử lý bài đăng. Vui lòng thử lại.",
) => {
  const validationErrors = error?.response?.data?.errors;
  const fieldErrors = {};
  let hasUnknownValidationError = false;

  if (validationErrors && typeof validationErrors === "object") {
    Object.keys(validationErrors).forEach((backendKey) => {
      const fieldName = resolveFormField(backendKey);

      if (!fieldName) {
        hasUnknownValidationError = true;
        return;
      }

      fieldErrors[fieldName] = FIELD_ERROR_MESSAGES[fieldName];
    });
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return {
    fieldErrors,
    generalMessage:
      hasFieldErrors && !hasUnknownValidationError
        ? ""
        : getGeneralVietnameseError(error, fallbackMessage),
  };
};

export const normalizeDamageLevel = (value) =>
  LEGACY_DAMAGE_LEVEL_ALIASES[value] || value || "None";

export const normalizeFunctionalityStatus = (value) =>
  LEGACY_FUNCTIONALITY_ALIASES[value] || value || "FullyFunctional";

export const getFunctionalityForDamageLevel = (damageLevel) =>
  FUNCTIONALITY_BY_DAMAGE_LEVEL[normalizeDamageLevel(damageLevel)] || "";

export const normalizePostConditionValues = (
  damageLevel,
  functionalityStatus,
) => {
  const normalizedDamageLevel = normalizeDamageLevel(damageLevel);
  const requiredFunctionality = getFunctionalityForDamageLevel(
    normalizedDamageLevel,
  );

  return {
    damageLevel: normalizedDamageLevel,
    functionalityStatus:
      requiredFunctionality ||
      normalizeFunctionalityStatus(functionalityStatus),
  };
};

const getOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || value;

export const getPostConditionFieldErrors = (
  damageLevel,
  functionalityStatus,
) => {
  const normalizedDamageLevel = normalizeDamageLevel(damageLevel);
  const normalizedFunctionalityStatus = normalizeFunctionalityStatus(
    functionalityStatus,
  );
  const requiredFunctionality = getFunctionalityForDamageLevel(
    normalizedDamageLevel,
  );

  if (!requiredFunctionality) {
    return {
      damageLevel: "Mức độ hư hỏng không hợp lệ.",
    };
  }

  if (normalizedFunctionalityStatus === requiredFunctionality) {
    return {};
  }

  const damageLabel = getOptionLabel(
    DAMAGE_LEVEL_OPTIONS,
    normalizedDamageLevel,
  );
  const functionalityLabel = getOptionLabel(
    FUNCTIONALITY_OPTIONS,
    requiredFunctionality,
  );

  return {
    damageLevel:
      "Mức độ hư hỏng chưa phù hợp với tình trạng hoạt động.",
    functionalityStatus: `Với “${damageLabel}”, tình trạng hoạt động phải là “${functionalityLabel}”.`,
  };
};

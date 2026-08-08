import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import DynamicAttributeFields from "../../features/posts/DynamicAttributeFields";
import MediaUploadField from "../../features/posts/MediaUploadField";
import {
  DAMAGE_LEVEL_OPTIONS,
  DELIVERY_METHOD_OPTIONS,
  FUNCTIONALITY_OPTIONS,
  PRIORITY_LEVEL_OPTIONS,
  SPACE_USAGE_OPTIONS,
} from "../../constants/postFormOptions";
import {
  getManagedPostTypeByRole,
  MARKETPLACE_POST_TYPES,
} from "../../constants/marketplace";
import { useAuth } from "../../hooks/useAuth";
import brandApi from "../../services/apis/brandApi";
import categoryApi from "../../services/apis/categoryApi";
import postApi from "../../services/apis/postApi";
import productTypeApi from "../../services/apis/productTypeApi";
import productTypeAttributeApi from "../../services/apis/productTypeAttributeApi";

const REFERENCE_PAGE_SIZE = 100;

const createInitialForm = () => ({
  categoryId: "",
  productTypeId: "",
  brandId: "",
  productName: "",
  modelNumber: "",
  price: "",
  originalPrice: "",
  quantity: "1",
  description: "",
  detailDescription: "",
  priorityLevel: "Low",
  deliveryMethod: "Unknown",
  city: "",
  ward: "",
  streetAddress: "",
  spaceUsage: "Living_room",
  functionalityStatus: "FullyFunctional",
  usageDuration: "0",
  damageLevel: "None",
  length: "",
  width: "",
  height: "",
  weight: "",
  medias: [],
});

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

const getValidationMessage = (errors) => {
  if (!errors || typeof errors !== "object") {
    return "";
  }

  return Object.values(errors)
    .flat()
    .filter(Boolean)
    .join("\n");
};

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  return (
    getValidationMessage(responseData?.errors) ||
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    "Không thể tạo bài đăng. Vui lòng thử lại."
  );
};

const parseOptionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const isNonNegativeNumber = (value) => {
  if (value === "") {
    return true;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue >= 0;
};

const hasAttributeValue = (attribute, value) => {
  const options = Array.isArray(attribute?.options)
    ? attribute.options
    : [];
  const inputMode = String(attribute?.inputMode || "")
    .trim()
    .toLowerCase();
  const dataType = String(attribute?.dataType || "Text")
    .trim()
    .toLowerCase();

  if (options.length > 0 || inputMode === "optiononly") {
    return Boolean(value?.optionId);
  }

  if (dataType === "boolean") {
    return value?.valueBoolean === "true" || value?.valueBoolean === "false";
  }

  if (dataType === "number") {
    return (
      value?.valueNumber !== "" &&
      value?.valueNumber !== undefined &&
      Number.isFinite(Number(value.valueNumber))
    );
  }

  return Boolean(String(value?.valueText || "").trim());
};

const buildAttributeValues = (attributes, values) => {
  return attributes.flatMap((attribute) => {
    const value = values[attribute.attributeId] || {};

    if (!hasAttributeValue(attribute, value)) {
      return [];
    }

    const dataType = String(attribute.dataType || "Text")
      .trim()
      .toLowerCase();

    return [
      {
        attributeId: attribute.attributeId,
        optionId: value.optionId || null,
        valueBoolean:
          dataType === "boolean"
            ? value.valueBoolean === "true"
            : null,
        valueText:
          dataType !== "boolean" &&
          dataType !== "number" &&
          !value.optionId
            ? String(value.valueText || "").trim()
            : null,
        valueNumber:
          dataType === "number" && !value.optionId
            ? Number(value.valueNumber)
            : null,
      },
    ];
  });
};

const FieldError = ({ message }) => {
  return message ? (
    <p className="mt-1 text-xs text-red-600">{message}</p>
  ) : null;
};

const SectionHeading = ({ number, title, description }) => {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2B5659] text-sm font-black text-white">
        {number}
      </span>
      <div>
        <h2 className="font-bold text-[#172830]">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-[#547B7D]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const postType = getManagedPostTypeByRole(user?.role);
  const isBuyPost = postType === MARKETPLACE_POST_TYPES.BUY;
  const listPath = isBuyPost ? "/tin-thu-mua" : "/tin-dang-ban";
  const postTypeLabel = isBuyPost ? "tin thu mua" : "tin đăng bán";

  const [form, setForm] = useState(createInitialForm);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [attributeErrors, setAttributeErrors] = useState({});
  const [referenceError, setReferenceError] = useState("");
  const [attributeLoadError, setAttributeLoadError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isLoadingReferences, setIsLoadingReferences] = useState(true);
  const [isLoadingProductTypes, setIsLoadingProductTypes] = useState(false);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    Promise.all([
      categoryApi.search({
        keyword: "",
        isActive: true,
        pageNumber: 1,
        pageSize: REFERENCE_PAGE_SIZE,
        signal: controller.signal,
      }),
      brandApi.search({
        keyword: "",
        isActive: true,
        pageNumber: 1,
        pageSize: REFERENCE_PAGE_SIZE,
        signal: controller.signal,
      }),
    ])
      .then(([categoryResult, brandResult]) => {
        if (!isActive) {
          return;
        }

        setCategories(categoryResult.items);
        setBrands(brandResult.items);
        setReferenceError("");
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setReferenceError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingReferences(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!form.categoryId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    productTypeApi
      .getByCategory(form.categoryId, {
        signal: controller.signal,
      })
      .then((items) => {
        if (!isActive) {
          return;
        }

        setProductTypes(
          items.filter((item) => item?.isActive !== false),
        );
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setProductTypes([]);
        setReferenceError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProductTypes(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [form.categoryId]);

  useEffect(() => {
    if (!form.productTypeId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    productTypeAttributeApi
      .getAll(form.productTypeId, {
        signal: controller.signal,
      })
      .then((items) => {
        if (!isActive) {
          return;
        }

        setAttributes(items);
        setAttributeLoadError("");
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setAttributes([]);
        setAttributeLoadError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingAttributes(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [form.productTypeId]);

  const updateField = (name, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
    setServerError("");
  };

  const handleCategoryChange = (event) => {
    const categoryId = event.target.value;

    setForm((currentForm) => ({
      ...currentForm,
      categoryId,
      productTypeId: "",
    }));
    setProductTypes([]);
    setAttributes([]);
    setAttributeValues({});
    setAttributeErrors({});
    setAttributeLoadError("");
    setIsLoadingProductTypes(Boolean(categoryId));
    setIsLoadingAttributes(false);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      categoryId: "",
      productTypeId: "",
    }));
  };

  const handleProductTypeChange = (event) => {
    const productTypeId = event.target.value;

    updateField("productTypeId", productTypeId);
    setAttributes([]);
    setAttributeValues({});
    setAttributeErrors({});
    setAttributeLoadError("");
    setIsLoadingAttributes(Boolean(productTypeId));
  };

  const handleAttributeChange = (attributeId, field, value) => {
    setAttributeValues((currentValues) => ({
      ...currentValues,
      [attributeId]: {
        ...currentValues[attributeId],
        [field]: value,
      },
    }));
    setAttributeErrors((currentErrors) => ({
      ...currentErrors,
      [attributeId]: "",
    }));
    setServerError("");
  };

  const validateForm = () => {
    const nextErrors = {};
    const nextAttributeErrors = {};
    const quantity = Number(form.quantity);
    const price = Number(form.price);
    const usageDuration = Number(form.usageDuration);

    if (!form.categoryId) {
      nextErrors.categoryId = "Vui lòng chọn danh mục.";
    }

    if (!form.productTypeId) {
      nextErrors.productTypeId = "Vui lòng chọn loại sản phẩm.";
    }

    if (!form.brandId) {
      nextErrors.brandId = "Vui lòng chọn thương hiệu.";
    }

    if (form.productName.trim().length < 3) {
      nextErrors.productName = "Tên sản phẩm phải có ít nhất 3 ký tự.";
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      nextErrors.quantity = "Số lượng phải là số nguyên lớn hơn 0.";
    }

    if (!Number.isFinite(price) || price <= 0) {
      nextErrors.price = "Mức giá phải lớn hơn 0.";
    }

    if (form.description.trim().length < 10) {
      nextErrors.description = "Mô tả phải có ít nhất 10 ký tự.";
    }

    if (!Number.isInteger(usageDuration) || usageDuration < 0) {
      nextErrors.usageDuration =
        "Thời gian sử dụng phải là số nguyên không âm.";
    }

    if (!form.city.trim()) {
      nextErrors.city = "Vui lòng nhập tỉnh hoặc thành phố.";
    }

    if (!form.ward.trim()) {
      nextErrors.ward = "Vui lòng nhập phường hoặc xã.";
    }

    if (!form.streetAddress.trim()) {
      nextErrors.streetAddress = "Vui lòng nhập địa chỉ chi tiết.";
    }

    if (form.medias.length === 0) {
      nextErrors.medias = "Vui lòng chọn ít nhất một ảnh sản phẩm.";
    }

    if (!isBuyPost) {
      ["originalPrice", "length", "width", "height", "weight"].forEach(
        (fieldName) => {
          if (!isNonNegativeNumber(form[fieldName])) {
            nextErrors[fieldName] = "Giá trị phải là số không âm.";
          }
        },
      );
    }

    attributes.forEach((attribute) => {
      if (
        attribute.isRequired &&
        !hasAttributeValue(
          attribute,
          attributeValues[attribute.attributeId],
        )
      ) {
        nextAttributeErrors[attribute.attributeId] =
          `Vui lòng nhập ${attribute.attributeName}.`;
      }
    });

    if (attributeLoadError) {
      nextErrors.attributes =
        "Không thể kiểm tra thuộc tính bắt buộc của loại sản phẩm.";
    }

    setFieldErrors(nextErrors);
    setAttributeErrors(nextAttributeErrors);

    return (
      Object.keys(nextErrors).length === 0 &&
      Object.keys(nextAttributeErrors).length === 0
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    const payload = {
      ...form,
      productName: form.productName.trim(),
      price: Number(form.price),
      originalPrice: parseOptionalNumber(form.originalPrice),
      quantity: Number(form.quantity),
      description: form.description.trim(),
      detailDescription: form.detailDescription.trim(),
      modelNumber: form.modelNumber.trim(),
      usageDuration: Number(form.usageDuration),
      length: parseOptionalNumber(form.length),
      width: parseOptionalNumber(form.width),
      height: parseOptionalNumber(form.height),
      weight: parseOptionalNumber(form.weight),
      city: form.city.trim(),
      ward: form.ward.trim(),
      streetAddress: form.streetAddress.trim(),
      attributeValues: buildAttributeValues(attributes, attributeValues),
    };

    try {
      const createdPost = isBuyPost
        ? await postApi.createBuy(payload)
        : await postApi.createSell(payload);

      navigate(`${listPath}?view=mine`, {
        replace: true,
        state: {
          postCreatedMessage: `Đã tạo ${postTypeLabel} “${
            createdPost.productName || payload.productName
          }” thành công.`,
        },
      });
    } catch (requestError) {
      setServerError(getErrorMessage(requestError));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!postType) {
    return <Navigate to="/" replace />;
  }

  const inputClassName =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#172830] outline-none transition focus:border-[#2B5659] focus:ring-1 focus:ring-[#2B5659] disabled:cursor-not-allowed disabled:bg-gray-100";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to={`${listPath}?view=mine`}
          className="font-semibold text-[#547B7D] hover:text-[#172830]"
        >
          Bài đăng của tôi
        </Link>
        <span className="text-[#BAC2C1]">/</span>
        <span className="font-bold text-[#172830]">
          Tạo {postTypeLabel}
        </span>
      </div>

      <header className="rounded-xl bg-[#172830] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C1EAEC]">
          {isBuyPost
            ? "Dành cho doanh nghiệp"
            : "Dành cho tài khoản cá nhân"}
        </p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">
          Tạo {postTypeLabel} mới
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C9D4]">
          {isBuyPost
            ? "Mô tả chính xác nhu cầu thu mua để tiếp cận đúng người đang có sản phẩm phù hợp."
            : "Cung cấp đầy đủ thông tin và hình ảnh để sản phẩm dễ được tìm thấy và tạo sự tin cậy."}
        </p>
      </header>

      {(referenceError || serverError) && (
        <div
          role="alert"
          className="mt-5 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {serverError || referenceError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <section className="rounded-xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            number="1"
            title="Phân loại sản phẩm"
            description="Chọn đúng danh mục và loại sản phẩm để hệ thống tải các thuộc tính bắt buộc."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Danh mục <span className="text-red-600">*</span>
              </span>
              <select
                value={form.categoryId}
                onChange={handleCategoryChange}
                disabled={isLoadingReferences || isSubmitting}
                className={inputClassName}
              >
                <option value="">
                  {isLoadingReferences ? "Đang tải..." : "Chọn danh mục"}
                </option>
                {categories.map((category) => (
                  <option
                    key={category.categoryId}
                    value={category.categoryId}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.categoryId} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Loại sản phẩm <span className="text-red-600">*</span>
              </span>
              <select
                value={form.productTypeId}
                onChange={handleProductTypeChange}
                disabled={
                  !form.categoryId || isLoadingProductTypes || isSubmitting
                }
                className={inputClassName}
              >
                <option value="">
                  {isLoadingProductTypes
                    ? "Đang tải..."
                    : "Chọn loại sản phẩm"}
                </option>
                {productTypes.map((productTypeItem) => (
                  <option
                    key={productTypeItem.productTypeId}
                    value={productTypeItem.productTypeId}
                  >
                    {productTypeItem.productTypeName}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.productTypeId} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Thương hiệu <span className="text-red-600">*</span>
              </span>
              <select
                value={form.brandId}
                onChange={(event) => updateField("brandId", event.target.value)}
                disabled={isLoadingReferences || isSubmitting}
                className={inputClassName}
              >
                <option value="">Chọn thương hiệu</option>
                {brands.map((brand) => (
                  <option key={brand.brandId} value={brand.brandId}>
                    {brand.brandName}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.brandId} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Tên sản phẩm <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                value={form.productName}
                onChange={(event) =>
                  updateField("productName", event.target.value)
                }
                disabled={isSubmitting}
                maxLength={200}
                placeholder={
                  isBuyPost
                    ? "Ví dụ: Thu mua Smart Tivi Samsung 55 inch"
                    : "Ví dụ: Smart Tivi Samsung OLED 55 inch"
                }
                className={inputClassName}
              />
              <FieldError message={fieldErrors.productName} />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            number="2"
            title={isBuyPost ? "Nhu cầu thu mua" : "Thông tin đăng bán"}
            description="Mức giá và tình trạng sản phẩm giúp kết quả ghép nối chính xác hơn."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                {isBuyPost ? "Giá mua dự kiến" : "Giá đăng bán"}{" "}
                <span className="text-red-600">*</span>
              </span>
              <input
                type="number"
                min="1"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                disabled={isSubmitting}
                placeholder="Đơn vị: VNĐ"
                className={inputClassName}
              />
              <FieldError message={fieldErrors.price} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Số lượng <span className="text-red-600">*</span>
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(event) =>
                  updateField("quantity", event.target.value)
                }
                disabled={isSubmitting}
                className={inputClassName}
              />
              <FieldError message={fieldErrors.quantity} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Độ ưu tiên
              </span>
              <select
                value={form.priorityLevel}
                onChange={(event) =>
                  updateField("priorityLevel", event.target.value)
                }
                disabled={isSubmitting}
                className={inputClassName}
              >
                {PRIORITY_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Không gian sử dụng
              </span>
              <select
                value={form.spaceUsage}
                onChange={(event) =>
                  updateField("spaceUsage", event.target.value)
                }
                disabled={isSubmitting}
                className={inputClassName}
              >
                {SPACE_USAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Khả năng hoạt động
              </span>
              <select
                value={form.functionalityStatus}
                onChange={(event) =>
                  updateField("functionalityStatus", event.target.value)
                }
                disabled={isSubmitting}
                className={inputClassName}
              >
                {FUNCTIONALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Mức độ hư hỏng
              </span>
              <select
                value={form.damageLevel}
                onChange={(event) =>
                  updateField("damageLevel", event.target.value)
                }
                disabled={isSubmitting}
                className={inputClassName}
              >
                {DAMAGE_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Thời gian sử dụng (tháng)
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.usageDuration}
                onChange={(event) =>
                  updateField("usageDuration", event.target.value)
                }
                disabled={isSubmitting}
                className={inputClassName}
              />
              <FieldError message={fieldErrors.usageDuration} />
            </label>

            {!isBuyPost && (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                    Mã model
                  </span>
                  <input
                    type="text"
                    value={form.modelNumber}
                    onChange={(event) =>
                      updateField("modelNumber", event.target.value)
                    }
                    disabled={isSubmitting}
                    className={inputClassName}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                    Giá mua ban đầu
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.originalPrice}
                    onChange={(event) =>
                      updateField("originalPrice", event.target.value)
                    }
                    disabled={isSubmitting}
                    className={inputClassName}
                  />
                  <FieldError message={fieldErrors.originalPrice} />
                </label>
              </>
            )}
          </div>

          {!isBuyPost && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["length", "Chiều dài"],
                ["width", "Chiều rộng"],
                ["height", "Chiều cao"],
                ["weight", "Khối lượng"],
              ].map(([fieldName, label]) => (
                <label key={fieldName} className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                    {label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form[fieldName]}
                    onChange={(event) =>
                      updateField(fieldName, event.target.value)
                    }
                    disabled={isSubmitting}
                    className={inputClassName}
                  />
                  <FieldError message={fieldErrors[fieldName]} />
                </label>
              ))}
            </div>
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
              Mô tả bài đăng <span className="text-red-600">*</span>
            </span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              disabled={isSubmitting}
              maxLength={2000}
              className={`${inputClassName} resize-y`}
            />
            <FieldError message={fieldErrors.description} />
          </label>

          {!isBuyPost && (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Mô tả chi tiết sản phẩm
              </span>
              <textarea
                rows={3}
                value={form.detailDescription}
                onChange={(event) =>
                  updateField("detailDescription", event.target.value)
                }
                disabled={isSubmitting}
                maxLength={2000}
                className={`${inputClassName} resize-y`}
              />
            </label>
          )}
        </section>

        <section className="rounded-xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            number="3"
            title="Thuộc tính sản phẩm"
            description="Các trường được tải tự động theo loại sản phẩm và dấu * là bắt buộc."
          />

          {!form.productTypeId ? (
            <div className="rounded-lg border border-dashed border-[#BAC2C1] bg-[#f8fafa] p-5 text-sm text-[#547B7D]">
              Vui lòng chọn loại sản phẩm ở bước 1.
            </div>
          ) : (
            <DynamicAttributeFields
              attributes={attributes}
              values={attributeValues}
              errors={attributeErrors}
              loading={isLoadingAttributes}
              loadError={attributeLoadError || fieldErrors.attributes}
              disabled={isSubmitting}
              onChange={handleAttributeChange}
            />
          )}
        </section>

        <section className="rounded-xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            number="4"
            title="Giao nhận và hình ảnh"
            description="Địa chỉ giúp người dùng đánh giá khoảng cách trước khi giao dịch."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Hình thức giao nhận
              </span>
              <select
                value={form.deliveryMethod}
                onChange={(event) =>
                  updateField("deliveryMethod", event.target.value)
                }
                disabled={isSubmitting}
                className={inputClassName}
              >
                {DELIVERY_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Tỉnh/Thành phố <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                disabled={isSubmitting}
                className={inputClassName}
              />
              <FieldError message={fieldErrors.city} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Phường/Xã <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                value={form.ward}
                onChange={(event) => updateField("ward", event.target.value)}
                disabled={isSubmitting}
                className={inputClassName}
              />
              <FieldError message={fieldErrors.ward} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
                Địa chỉ chi tiết <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                value={form.streetAddress}
                onChange={(event) =>
                  updateField("streetAddress", event.target.value)
                }
                disabled={isSubmitting}
                className={inputClassName}
              />
              <FieldError message={fieldErrors.streetAddress} />
            </label>
          </div>

          <div className="mt-5">
            <span className="mb-2 block text-sm font-semibold text-[#172830]">
              Hình ảnh sản phẩm <span className="text-red-600">*</span>
            </span>
            <MediaUploadField
              files={form.medias}
              error={fieldErrors.medias}
              disabled={isSubmitting}
              onChange={(files) => updateField("medias", files)}
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 rounded-xl border border-[#BAC2C1]/40 bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
          <Link
            to={`${listPath}?view=mine`}
            className="rounded-md border border-gray-300 px-5 py-3 text-center text-sm font-bold text-[#172830] transition hover:bg-gray-50"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              isLoadingReferences ||
              isLoadingProductTypes ||
              isLoadingAttributes ||
              Boolean(referenceError)
            }
            className="flex items-center justify-center gap-2 rounded-md bg-[#2B5659] px-6 py-3 text-sm font-black text-white transition hover:bg-[#172830] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && (
              <span className="material-symbols-outlined animate-spin text-[18px]">
                refresh
              </span>
            )}
            {isSubmitting ? "Đang tạo bài..." : `Tạo ${postTypeLabel}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;

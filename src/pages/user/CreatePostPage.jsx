import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import DynamicAttributeFields from "../../features/posts/DynamicAttributeFields";
import MediaUploadField from "../../features/posts/MediaUploadField";
import PostAddressFields from "../../features/posts/PostAddressFields";
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
  normalizePostType,
} from "../../constants/marketplace";
import { useAuth } from "../../hooks/useAuth";
import brandApi from "../../services/apis/brandApi";
import categoryApi from "../../services/apis/categoryApi";
import postApi from "../../services/apis/postApi";
import productTypeApi from "../../services/apis/productTypeApi";
import productTypeAttributeApi from "../../services/apis/productTypeAttributeApi";
import { getUserId } from "../../utils/authUtils";
import {
  POST_NOT_EDITABLE_MESSAGE,
  getFunctionalityForDamageLevel,
  getPostConditionFieldErrors,
  getPostFormApiErrors,
  isPostStatusEditable,
  normalizePostConditionValues,
} from "../../utils/postFormUtils";

const REFERENCE_PAGE_SIZE = 100;

const FORM_STEPS = Object.freeze([
  {
    number: "1",
    id: "post-step-1",
    title: "Phân loại",
    description: "Danh mục và sản phẩm",
  },
  {
    number: "2",
    id: "post-step-2",
    title: "Thông tin chính",
    description: "Giá, số lượng và mô tả",
  },
  {
    number: "3",
    id: "post-step-3",
    title: "Thuộc tính",
    description: "Thông số theo sản phẩm",
  },
  {
    number: "4",
    id: "post-step-4",
    title: "Giao nhận",
    description: "Địa chỉ và hình ảnh",
  },
]);

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

const toFormString = (value, fallbackValue = "") => {
  if (value === undefined || value === null) {
    return fallbackValue;
  }

  return String(value);
};

const createFormFromPost = (post) => {
  const product = post?.product || {};
  const condition = normalizePostConditionValues(
    product.damageLevel,
    product.functionalityStatus,
  );

  return {
    ...createInitialForm(),
    categoryId: product.categoryId || "",
    productTypeId: product.productTypeId || "",
    brandId: product.brandId || "",
    productName: product.productName || post?.productName || "",
    modelNumber: product.modelNumber || "",
    price: toFormString(post?.basePrice),
    originalPrice: toFormString(product.originalPrice),
    quantity: toFormString(post?.quantity, "1"),
    description: post?.description || "",
    detailDescription: product.detailDescription || "",
    priorityLevel: post?.priorityLevel || "Low",
    deliveryMethod: post?.deliveryMethod || "Unknown",
    city: post?.city || "",
    ward: post?.ward || "",
    streetAddress: post?.streetAddress || "",
    spaceUsage: product.spaceUsage || "Living_room",
    functionalityStatus: condition.functionalityStatus,
    usageDuration: toFormString(product.usageDuration, "0"),
    damageLevel: condition.damageLevel,
    length: toFormString(product.length),
    width: toFormString(product.width),
    height: toFormString(product.height),
    weight: toFormString(product.weight),
    medias: [],
  };
};

const createAttributeValuesFromPost = (post) => {
  const attributeValues = Array.isArray(post?.product?.attributeValues)
    ? post.product.attributeValues
    : [];

  return attributeValues.reduce((result, attributeValue) => {
    if (!attributeValue?.attributeId) {
      return result;
    }

    result[attributeValue.attributeId] = {
      optionId: attributeValue.optionId || "",
      valueBoolean:
        typeof attributeValue.valueBoolean === "boolean"
          ? String(attributeValue.valueBoolean)
          : "",
      valueText: toFormString(attributeValue.valueText),
      valueNumber: toFormString(attributeValue.valueNumber),
    };

    return result;
  }, {});
};

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

const getErrorMessage = (error, fallbackMessage) =>
  getPostFormApiErrors(error, fallbackMessage).generalMessage ||
  fallbackMessage ||
  "Không thể xử lý bài đăng. Vui lòng thử lại.";

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
    <p role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  ) : null;
};

const SectionHeading = ({ number, title, description }) => {
  return (
    <div className="mb-6 flex items-start gap-3 border-b border-[#E3ECE9] pb-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4F1EE] text-sm font-black text-[#2F686C]">
        {number}
      </span>
      <div>
        <h2 className="text-lg font-black text-[#183F41]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-5 text-[#68807F]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { postId = "" } = useParams();
  const { user } = useAuth();
  const userId = getUserId(user);
  const isEditing = Boolean(postId);
  const postType = getManagedPostTypeByRole(user?.role);
  const isBuyPost = postType === MARKETPLACE_POST_TYPES.BUY;
  const listPath = isBuyPost ? "/tin-thu-mua" : "/tin-dang-ban";
  const postTypeLabel = isBuyPost ? "tin thu mua" : "tin đăng bán";

  const [form, setForm] = useState(createInitialForm);
  const [existingMedias, setExistingMedias] = useState([]);
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
  const [successMessage, setSuccessMessage] = useState("");
  const [detailError, setDetailError] = useState("");
  const [detailRequestVersion, setDetailRequestVersion] = useState(0);
  const [isLoadingReferences, setIsLoadingReferences] = useState(true);
  const [isLoadingProductTypes, setIsLoadingProductTypes] = useState(false);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing || !userId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    postApi
      .getDetailByUser(userId, postId, {
        signal: controller.signal,
      })
      .then((post) => {
        if (!isActive) {
          return;
        }

        if (normalizePostType(post.postType) !== postType) {
          throw new Error(
            "Bài đăng không phù hợp với quyền quản lý của tài khoản này.",
          );
        }

        if (!isPostStatusEditable(post.status)) {
          throw new Error(POST_NOT_EDITABLE_MESSAGE);
        }

        const nextForm = createFormFromPost(post);

        setForm(nextForm);
        setExistingMedias(
          Array.isArray(post.medias) ? post.medias : [],
        );
        setAttributeValues(createAttributeValuesFromPost(post));
        setIsLoadingProductTypes(Boolean(nextForm.categoryId));
        setIsLoadingAttributes(Boolean(nextForm.productTypeId));
        setDetailError("");
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setDetailError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingDetail(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [detailRequestVersion, isEditing, postId, postType, userId]);

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
    setSuccessMessage("");
  };

  const handleDamageLevelChange = (event) => {
    const damageLevel = event.target.value;
    const functionalityStatus = getFunctionalityForDamageLevel(damageLevel);

    setForm((currentForm) => ({
      ...currentForm,
      damageLevel,
      functionalityStatus,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      damageLevel: "",
      functionalityStatus: "",
    }));
    setServerError("");
    setSuccessMessage("");
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
    setServerError("");
    setSuccessMessage("");
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
    setSuccessMessage("");
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

    Object.assign(
      nextErrors,
      getPostConditionFieldErrors(
        form.damageLevel,
        form.functionalityStatus,
      ),
    );

    if (!form.city.trim()) {
      nextErrors.city = "Vui lòng nhập tỉnh hoặc thành phố.";
    }

    if (!form.ward.trim()) {
      nextErrors.ward = "Vui lòng nhập phường hoặc xã.";
    }

    if (!form.streetAddress.trim()) {
      nextErrors.streetAddress = "Vui lòng nhập địa chỉ chi tiết.";
    }

    if (
      form.medias.length === 0 &&
      existingMedias.length === 0
    ) {
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
    setSuccessMessage("");

    const normalizedCondition = normalizePostConditionValues(
      form.damageLevel,
      form.functionalityStatus,
    );

    const payload = {
      ...form,
      ...normalizedCondition,
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
      if (isEditing) {
        const latestPost = await postApi.getDetailByUser(userId, postId);

        if (!isPostStatusEditable(latestPost.status)) {
          throw new Error(POST_NOT_EDITABLE_MESSAGE);
        }
      }

      const savedPost = isEditing
        ? isBuyPost
          ? await postApi.updateBuy(postId, payload)
          : await postApi.updateSell(postId, payload)
        : isBuyPost
          ? await postApi.createBuy(payload)
          : await postApi.createSell(payload);

      const nextSuccessMessage = `Đã ${
        isEditing ? "cập nhật" : "tạo"
      } ${postTypeLabel} “${
        savedPost.productName || payload.productName
      }” thành công.`;

      if (isEditing) {
        setSuccessMessage(nextSuccessMessage);
        setFieldErrors({});
        setAttributeErrors({});
      } else {
        navigate(`${listPath}?view=mine`, {
          replace: true,
          state: {
            postSuccessMessage: nextSuccessMessage,
          },
        });
      }
    } catch (requestError) {
      if (
        isEditing &&
        [400, 409].includes(Number(requestError?.response?.status))
      ) {
        try {
          const latestPost = await postApi.getDetailByUser(userId, postId);

          if (!isPostStatusEditable(latestPost.status)) {
            setFieldErrors({});
            setAttributeErrors({});
            setServerError(POST_NOT_EDITABLE_MESSAGE);
            return;
          }
        } catch (statusRequestError) {
          if (
            statusRequestError?.message === POST_NOT_EDITABLE_MESSAGE
          ) {
            setFieldErrors({});
            setAttributeErrors({});
            setServerError(POST_NOT_EDITABLE_MESSAGE);
            return;
          }
        }
      }

      const apiErrors = getPostFormApiErrors(requestError);

      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        ...apiErrors.fieldErrors,
      }));
      setServerError(apiErrors.generalMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!postType) {
    return <Navigate to="/" replace />;
  }

  const missingUserIdError =
    isEditing && !userId
      ? "Phiên đăng nhập không có mã người dùng. Vui lòng đăng xuất và đăng nhập lại."
      : "";
  const resolvedDetailError = missingUserIdError || detailError;
  const isNonEditablePostError =
    resolvedDetailError === POST_NOT_EDITABLE_MESSAGE;

  if (isEditing && isLoadingDetail && !resolvedDetailError) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
        <div
          role="status"
          className="rounded-xl border border-[#BAC2C1]/40 bg-white p-10 text-[#68807F] shadow-sm"
        >
          <span className="material-symbols-outlined animate-spin text-4xl">
            refresh
          </span>
          <p className="mt-3 font-semibold">
            Đang tải dữ liệu bài đăng...
          </p>
        </div>
      </div>
    );
  }

  if (isEditing && resolvedDetailError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"
        >
          <h1 className="text-xl font-black text-red-800">
            Không thể mở bài đăng để chỉnh sửa
          </h1>
          <p className="mt-2 text-sm text-red-700">
            {resolvedDetailError}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {!missingUserIdError && !isNonEditablePostError && (
              <button
                type="button"
                onClick={() => {
                  setDetailError("");
                  setIsLoadingDetail(true);
                  setDetailRequestVersion(
                    (currentVersion) => currentVersion + 1,
                  );
                }}
                className="rounded-md bg-[#7A1012] px-4 py-2 text-sm font-bold text-white"
              >
                Thử lại
              </button>
            )}
            <Link
              to={`${listPath}?view=mine`}
              className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-800"
            >
              Về bài đăng của tôi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputClassName =
    "w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-3.5 py-3 text-sm text-[#183436] outline-none transition placeholder:text-[#91A4A1] hover:border-[#A9C5BF] focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10 disabled:cursor-not-allowed disabled:bg-[#EEF3F1] disabled:text-[#839492]";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to={`${listPath}?view=mine`}
          className="font-semibold text-[#68807F] transition hover:text-[#183F41]"
        >
          Bài đăng của tôi
        </Link>
        <span className="text-[#BAC2C1]">/</span>
        <span className="font-bold text-[#183F41]">
          {isEditing ? "Chỉnh sửa" : "Tạo"} {postTypeLabel}
        </span>
      </div>

      <header className="relative overflow-hidden rounded-3xl border border-[#D7E7E3] bg-gradient-to-br from-[#183F41] via-[#244F51] to-[#2F6F9F] p-6 text-white shadow-[0_18px_50px_rgba(24,63,65,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[34px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-20 right-28 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C8ECE7]">
              {isBuyPost
                ? "HomeCycle - Nền tảng mua bán đồ cũ"
                : "HomeCycle - Nền tảng mua bán đồ cũ"}
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {isEditing ? "Chỉnh sửa" : "Tạo"} {postTypeLabel}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D8E9E7]">
              {isEditing
                ? "Kiểm tra lại thông tin trước khi lưu. Dữ liệu sau cập nhật sẽ được tải lại từ hệ thống."
                : isBuyPost
                  ? "Mô tả chính xác nhu cầu thu mua để tiếp cận đúng người đang có sản phẩm phù hợp."
                  : "Cung cấp đầy đủ thông tin và hình ảnh để sản phẩm dễ được tìm thấy và tạo sự tin cậy."}
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
            {isEditing ? "Chế độ chỉnh sửa" : "Bài đăng mới"}
          </span>
        </div>
      </header>

      {referenceError && (
        <div
          role="alert"
          className="mt-5 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {referenceError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]"
      >
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-2xl border border-[#DCE8E5] bg-white p-4 shadow-[0_10px_30px_rgba(24,63,65,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6F9F]">
              Nội dung bài đăng
            </p>
            <nav className="mt-3 grid grid-cols-2 gap-2 lg:block lg:space-y-1.5">
              {FORM_STEPS.map((step) => (
                <a
                  key={step.id}
                  href={`#${step.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-[#EDF5F2]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#C9DDD8] bg-[#F7FBFA] text-xs font-black text-[#4F8588] transition group-hover:border-[#4F8588] group-hover:bg-white">
                    {step.number}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[#183F41]">
                      {step.title}
                    </strong>
                    <small className="hidden truncate text-[11px] text-[#78908E] lg:block">
                      {step.description}
                    </small>
                  </span>
                </a>
              ))}
            </nav>
            <div className="mt-4 rounded-xl bg-[#EDF4F8] p-3 text-xs leading-5 text-[#426A82]">
              Các trường có dấu <strong className="text-red-600">*</strong> là
              thông tin bắt buộc.
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
        <section
          id="post-step-1"
          className="scroll-mt-32 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)] sm:p-6"
        >
          <SectionHeading
            number="1"
            title="Phân loại sản phẩm"
            description="Chọn đúng danh mục và loại sản phẩm để hệ thống tải các thuộc tính bắt buộc."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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

        <section
          id="post-step-2"
          className="scroll-mt-32 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)] sm:p-6"
        >
          <SectionHeading
            number="2"
            title={isBuyPost ? "Nhu cầu thu mua" : "Thông tin đăng bán"}
            description="Mức giá và tình trạng sản phẩm giúp kết quả ghép nối chính xác hơn."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <FieldError message={fieldErrors.priorityLevel} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <FieldError message={fieldErrors.spaceUsage} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
                Khả năng hoạt động
              </span>
              <select
                value={form.functionalityStatus}
                disabled
                className={inputClassName}
              >
                {FUNCTIONALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#68807F]">
                Tự động xác định theo mức độ hư hỏng.
              </p>
              <FieldError message={fieldErrors.functionalityStatus} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
                Mức độ hư hỏng
              </span>
              <select
                value={form.damageLevel}
                onChange={handleDamageLevelChange}
                disabled={isSubmitting}
                className={inputClassName}
              >
                {DAMAGE_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.damageLevel} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
                  <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
                  <FieldError message={fieldErrors.modelNumber} />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
                  <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
            <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <FieldError message={fieldErrors.detailDescription} />
            </label>
          )}
        </section>

        <section
          id="post-step-3"
          className="scroll-mt-32 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)] sm:p-6"
        >
          <SectionHeading
            number="3"
            title="Thuộc tính sản phẩm"
            description="Các trường được tải tự động theo loại sản phẩm và dấu * là bắt buộc."
          />

          {!form.productTypeId ? (
            <div className="rounded-xl border border-dashed border-[#BFD3CE] bg-[#F7FAF9] p-5 text-sm text-[#68807F]">
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

        <section
          id="post-step-4"
          className="scroll-mt-32 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(24,63,65,0.05)] sm:p-6"
        >
          <SectionHeading
            number="4"
            title="Giao nhận và hình ảnh"
            description="Địa chỉ giúp người dùng đánh giá khoảng cách trước khi giao dịch."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#183F41]">
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
              <FieldError message={fieldErrors.deliveryMethod} />
            </label>

            <PostAddressFields
              city={form.city}
              ward={form.ward}
              streetAddress={form.streetAddress}
              errors={fieldErrors}
              disabled={isSubmitting}
              inputClassName={inputClassName}
              onChange={updateField}
            />
          </div>

          <div className="mt-5">
            <span className="mb-2 block text-sm font-semibold text-[#183F41]">
              Hình ảnh sản phẩm <span className="text-red-600">*</span>
            </span>
            <MediaUploadField
              files={form.medias}
              error={fieldErrors.medias}
              disabled={isSubmitting}
              onChange={(files) => updateField("medias", files)}
            />

            {isEditing && existingMedias.length > 0 && (
              <div className="mt-4 rounded-xl border border-[#DCE8E5] bg-[#F7FAF9] p-4">
                <p className="text-sm font-bold text-[#183F41]">
                  Ảnh hiện có ({existingMedias.length})
                </p>
                <div className="mt-3 flex gap-3 overflow-x-auto">
                  {existingMedias.map((media, index) => (
                    <div
                      key={media.mediaId || media.url}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#C9DDD8] bg-white"
                    >
                      {media.url ? (
                        <img
                          src={media.url}
                          alt={`Ảnh hiện có ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#68807F]">
                          ♻
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-[#68807F]">
                  Nếu không chọn ảnh mới, frontend sẽ không gửi trường Medias và giữ nguyên dữ liệu ảnh hiện có theo cơ chế của Backend.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="sticky bottom-4 z-20 rounded-2xl border border-[#DCE8E5] bg-white/95 p-4 shadow-[0_16px_45px_rgba(24,63,65,0.14)] backdrop-blur">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              to={`${listPath}?view=mine`}
              className="rounded-xl border border-[#9FBFBA] bg-white px-5 py-3 text-center text-sm font-bold text-[#285E62] transition hover:border-[#4F8588] hover:bg-[#F1F7F5]"
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
                isLoadingDetail ||
                Boolean(referenceError)
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-[#4F8588] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  refresh
                </span>
              )}
              {isSubmitting
                ? isEditing
                  ? "Đang lưu thay đổi..."
                  : "Đang tạo bài..."
                : isEditing
                  ? "Lưu thay đổi"
                  : `Tạo ${postTypeLabel}`}
            </button>
          </div>

          {successMessage && (
            <p
              id="post-submit-feedback"
              role="status"
              className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 sm:ml-auto sm:max-w-xl"
            >
              {successMessage}
            </p>
          )}

          {serverError && (
            <p
              id="post-submit-error"
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:ml-auto sm:max-w-xl"
            >
              {serverError}
            </p>
          )}
        </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;

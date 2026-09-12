import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  Navigate,
  useLocation,
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
  priceFrom: "",
  expiryDate: "",
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
    price: toFormString(
      post?.priceTo ?? post?.basePrice,
    ),
    priceFrom:
      toFormString(post?.priceFrom),
    expiryDate:
      post?.expiryDate
        ? String(post.expiryDate).slice(0, 10)
        : "",
    originalPrice:
      toFormString(product.originalPrice),
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
    <p role="alert" className="mt-1 text-xs text-error">
      {message}
    </p>
  ) : null;
};

const SectionHeading = ({ number, title, description }) => {
  return (
    <div className="mb-6 flex items-start gap-3 border-b border-border pb-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
        {number}
      </span>
      <div>
        <h2 className="text-lg font-black text-text">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-5 text-textLight">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

const CreatePostPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { postId = "" } = useParams();
  const { user } = useAuth();
  const userId = getUserId(user);
  const isEditing = Boolean(postId);
  const postType = getManagedPostTypeByRole(user?.role);
  const isBuyPost = postType === MARKETPLACE_POST_TYPES.BUY;
  const listPath = isBuyPost ? "/tin-thu-mua" : "/tin-dang-ban";
  const postTypeLabel = isBuyPost ? "tin thu mua" : "tin đăng bán";

  const rawSellerRequestContinuation =
    location.state?.sellerRequestContinuation;

  const sellerRequestBuyPostId =
    !isEditing &&
    !isBuyPost &&
    typeof rawSellerRequestContinuation?.buyPostId === "string"
      ? rawSellerRequestContinuation.buyPostId.trim()
      : "";

  const sellerRequestReturnPath =
    sellerRequestBuyPostId
      ? `/posts/${encodeURIComponent(
          sellerRequestBuyPostId,
        )}`
      : `${listPath}?view=mine`;

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

    const price =
      form.price === ""
        ? undefined
        : Number(form.price);

    const priceFrom =
      form.priceFrom === ""
        ? undefined
        : Number(form.priceFrom);

    const usageDuration =
      Number(form.usageDuration);

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

    if (
      !isBuyPost &&
      (
        !Number.isFinite(price) ||
        price <= 0
      )
    ) {
      nextErrors.price =
        "Mức giá phải lớn hơn 0.";
    }

    if (
      isBuyPost &&
      price !== undefined &&
      (
        !Number.isFinite(price) ||
        price < 0
      )
    ) {
      nextErrors.price =
        "Giá tối đa phải từ 0 trở lên.";
    }

    if (
      isBuyPost &&
      priceFrom !== undefined &&
      (
        !Number.isFinite(priceFrom) ||
        priceFrom < 0
      )
    ) {
      nextErrors.priceFrom =
        "Giá tối thiểu phải từ 0 trở lên.";
    }

    if (
      isBuyPost &&
      Number.isFinite(priceFrom) &&
      Number.isFinite(price) &&
      priceFrom > price
    ) {
      nextErrors.priceFrom =
        "Giá tối thiểu không được lớn hơn giá tối đa.";
    }

    if (isBuyPost && form.expiryDate) {
      const expiryDate =
        new Date(
          form.expiryDate + "T23:59:59",
        );

      const now = new Date();
      const maxExpiryDate = new Date();

      maxExpiryDate.setMonth(
        maxExpiryDate.getMonth() + 6,
      );

      if (
        Number.isNaN(expiryDate.getTime()) ||
        expiryDate <= now ||
        expiryDate > maxExpiryDate
      ) {
        nextErrors.expiryDate =
          "Hạn tin phải ở tương lai và không quá 6 tháng.";
      }
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
      !isBuyPost &&
      form.medias.length === 0 &&
      existingMedias.length === 0
    ) {
      nextErrors.medias =
        "Vui lòng chọn ít nhất một ảnh sản phẩm.";
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
      price: isBuyPost
        ? parseOptionalNumber(form.price)
        : Number(form.price),

      priceFrom:
        parseOptionalNumber(form.priceFrom),

      expiryDate:
        form.expiryDate || undefined,

      originalPrice:
        parseOptionalNumber(form.originalPrice),
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
      } else if (sellerRequestBuyPostId) {
        navigate(sellerRequestReturnPath, {
          replace: true,
          state: {
            sellerRequestContinuation: {
              buyPostId:
                sellerRequestBuyPostId,
              createdSellPostId:
                savedPost.postId,
            },
            postSuccessMessage:
              nextSuccessMessage,
          },
        });
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
          className="rounded-xl border border-border/40 bg-white p-10 text-textLight shadow-sm"
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
          className="rounded-xl border border-error/30 bg-error/10 p-8 text-center"
        >
          <h1 className="text-xl font-black text-error">
            Không thể mở bài đăng để chỉnh sửa
          </h1>
          <p className="mt-2 text-sm text-error">
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
                className="rounded-md bg-error px-4 py-2 text-sm font-bold text-white"
              >
                Thử lại
              </button>
            )}
            <Link
              to={`${listPath}?view=mine`}
              className="rounded-md border border-error/30 bg-white px-4 py-2 text-sm font-bold text-error"
            >
              Về bài đăng của tôi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputClassName =
    "w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition placeholder:text-textLight hover:border-primary focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-background disabled:text-textLight";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to={`${listPath}?view=mine`}
          className="font-semibold text-textLight transition hover:text-text"
        >
          Bài đăng của tôi
        </Link>
        <span className="text-border">/</span>
        <span className="font-bold text-text">
          {isEditing ? "Chỉnh sửa" : "Tạo"} {postTypeLabel}
        </span>
      </div>

      <header className="relative overflow-hidden rounded-3xl border border-border bg-primary p-6 text-white shadow-[0_18px_50px_rgba(23,40,48,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[34px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-20 right-28 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
              {isBuyPost
                ? "HomeCycle - Nền tảng mua bán đồ cũ"
                : "HomeCycle - Nền tảng mua bán đồ cũ"}
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {isEditing ? "Chỉnh sửa" : "Tạo"} {postTypeLabel}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
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
          className="mt-5 whitespace-pre-line rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error"
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
          <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_30px_rgba(23,40,48,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
              Nội dung bài đăng
            </p>
            <nav className="mt-3 grid grid-cols-2 gap-2 lg:block lg:space-y-1.5">
              {FORM_STEPS.map((step) => (
                <a
                  key={step.id}
                  href={`#${step.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-primary/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xs font-black text-primary transition group-hover:border-primary group-hover:bg-white">
                    {step.number}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-text">
                      {step.title}
                    </strong>
                    <small className="hidden truncate text-[11px] text-textLight lg:block">
                      {step.description}
                    </small>
                  </span>
                </a>
              ))}
            </nav>
            <div className="mt-4 rounded-xl bg-primary/5 p-3 text-xs leading-5 text-primary">
              Các trường có dấu <strong className="text-error">*</strong> là
              thông tin bắt buộc.
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
        <section
          id="post-step-1"
          className="scroll-mt-32 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6"
        >
          <SectionHeading
            number="1"
            title="Phân loại sản phẩm"
            description="Chọn đúng danh mục và loại sản phẩm để hệ thống tải các thuộc tính bắt buộc."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">
                Danh mục <span className="text-error">*</span>
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
              <span className="mb-1.5 block text-sm font-semibold text-text">
                Loại sản phẩm <span className="text-error">*</span>
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
              <span className="mb-1.5 block text-sm font-semibold text-text">
                Thương hiệu <span className="text-error">*</span>
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
              <span className="mb-1.5 block text-sm font-semibold text-text">
                Tên sản phẩm <span className="text-error">*</span>
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
          className="scroll-mt-32 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6"
        >
          <SectionHeading
            number="2"
            title={isBuyPost ? "Nhu cầu thu mua" : "Thông tin đăng bán"}
            description="Mức giá và tình trạng sản phẩm giúp kết quả ghép nối chính xác hơn."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isBuyPost && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-text">
                  Giá tối thiểu
                </span>

                <input
                  type="number"
                  min="0"
                  value={form.priceFrom}
                  onChange={(event) =>
                    updateField(
                      "priceFrom",
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  placeholder="Không bắt buộc"
                  className={inputClassName}
                />

                <FieldError
                  message={fieldErrors.priceFrom}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">
                {isBuyPost
                  ? "Giá tối đa"
                  : "Giá đăng bán"}{" "}

                {!isBuyPost && (
                  <span className="text-error">*</span>
                )}
              </span>

              <input
                type="number"
                min={isBuyPost ? "0" : "1"}
                value={form.price}
                onChange={(event) =>
                  updateField(
                    "price",
                    event.target.value,
                  )
                }
                disabled={isSubmitting}
                placeholder={
                  isBuyPost
                    ? "Không bắt buộc"
                    : "Đơn vị: VNĐ"
                }
                className={inputClassName}
              />

              <FieldError
                message={fieldErrors.price}
              />
            </label>

            {isBuyPost && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-text">
                  Hiệu lực đến
                </span>

                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) =>
                    updateField(
                      "expiryDate",
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className={inputClassName}
                />

                <FieldError
                  message={fieldErrors.expiryDate}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">
                Số lượng <span className="text-error">*</span>
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
              <span className="mb-1.5 block text-sm font-semibold text-text">
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

            {!isBuyPost && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-text">
                  Không gian sử dụng
                </span>

                <select
                  value={form.spaceUsage}
                  onChange={(event) =>
                    updateField(
                      "spaceUsage",
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className={inputClassName}
                >
                  {SPACE_USAGE_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>

                <FieldError
                  message={fieldErrors.spaceUsage}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">
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
              <p className="mt-1 text-xs text-textLight">
                Tự động xác định theo mức độ hư hỏng.
              </p>
              <FieldError message={fieldErrors.functionalityStatus} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">
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
              <span className="mb-1.5 block text-sm font-semibold text-text">
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
                  <span className="mb-1.5 block text-sm font-semibold text-text">
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
                  <span className="mb-1.5 block text-sm font-semibold text-text">
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
                  <span className="mb-1.5 block text-sm font-semibold text-text">
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
            <span className="mb-1.5 block text-sm font-semibold text-text">
              Mô tả bài đăng <span className="text-error">*</span>
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
              <span className="mb-1.5 block text-sm font-semibold text-text">
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
          className="scroll-mt-32 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6"
        >
          <SectionHeading
            number="3"
            title="Thuộc tính sản phẩm"
            description="Các trường được tải tự động theo loại sản phẩm và dấu * là bắt buộc."
          />

          {!form.productTypeId ? (
            <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-textLight">
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
          className="scroll-mt-32 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6"
        >
          <SectionHeading
            number="4"
            title="Giao nhận và hình ảnh"
            description="Địa chỉ giúp người dùng đánh giá khoảng cách trước khi giao dịch."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {!isBuyPost && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-text">
                  Hình thức giao nhận
                </span>

                <select
                  value={form.deliveryMethod}
                  onChange={(event) =>
                    updateField(
                      "deliveryMethod",
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className={inputClassName}
                >
                  {DELIVERY_METHOD_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>

                <FieldError
                  message={fieldErrors.deliveryMethod}
                />
              </label>
            )}

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

          {!isBuyPost && (
          <div className="mt-5">
            <span className="mb-2 block text-sm font-semibold text-text">
              Hình ảnh sản phẩm <span className="text-error">*</span>
            </span>

            <MediaUploadField
              files={form.medias}
              error={fieldErrors.medias}
              disabled={isSubmitting}
              onChange={(files) =>
                updateField("medias", files)
              }
            />

            {isEditing && existingMedias.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-bold text-text">
                  Ảnh hiện có ({existingMedias.length})
                </p>
                <div className="mt-3 flex gap-3 overflow-x-auto">
                  {existingMedias.map((media, index) => (
                    <div
                      key={media.mediaId || media.url}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-white"
                    >
                      {media.url ? (
                        <img
                          src={media.url}
                          alt={`Ảnh hiện có ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-textLight">
                          ♻
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-textLight">
                  Nếu không chọn ảnh mới, frontend sẽ không gửi trường Medias và giữ nguyên dữ liệu ảnh hiện có theo cơ chế của Backend.
                </p>
              </div>
            )}
          </div>
          )}
        </section>

        <div className="sticky bottom-4 z-20 rounded-2xl border border-border bg-white/95 p-4 shadow-[0_16px_45px_rgba(23,40,48,0.14)] backdrop-blur">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              to={sellerRequestReturnPath}
              className="rounded-xl border border-border bg-white px-5 py-3 text-center text-sm font-bold text-primary transition hover:border-primary hover:bg-primary/10"
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
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="mt-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success sm:ml-auto sm:max-w-xl"
            >
              {successMessage}
            </p>
          )}

          {serverError && (
            <p
              id="post-submit-error"
              role="alert"
              className="mt-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error sm:ml-auto sm:max-w-xl"
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

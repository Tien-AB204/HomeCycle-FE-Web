import { useCallback, useMemo, useRef, useState } from "react";
import {
  AGREEMENT_TYPE,
  AGREEMENT_TYPE_OPTIONS,
  DELIVERY_METHOD,
  DELIVERY_METHOD_OPTIONS,
  PAYMENT_TYPE,
  PAYMENT_TYPE_OPTIONS,
  normalizeDeliveryMethod,
} from "../../constants/agreements";
import agreementApi from "../../services/apis/agreementApi";
import { getGhnErrorMessage } from "../../utils/ghnErrorMessages";
import { getSafeProblemDetail } from "../../utils/safeErrorMessage";
import GhnCollectionFields from "../appointments/GhnCollectionFields";
import {
  createGhnCollectionInfo,
  formatGhnContactAddress,
  sanitizeGhnCollectionInfo,
  validateGhnCollectionInfo,
} from "../appointments/ghnCollectionUtils";
import AddressSelector from "./AddressSelector";

const toDateTimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() * 60000,
    );

  return localDate
    .toISOString()
    .slice(0, 16);
};

const createInitialValues = (agreement) => {
  const details =
    agreement?.agreementDetails || {};

  return {
    agreementType:
      agreement?.agreementType ||
      AGREEMENT_TYPE.INSPECTION,

    paymentType:
      agreement?.paymentType ||
      PAYMENT_TYPE.DEPOSIT,

    notes:
      details.notes || "",

    inspectionDate:
      toDateTimeLocal(
        details.inspectionDate,
      ),

    inspectionAddress:
      details.inspectionAddress || "",

    collectionDate:
      toDateTimeLocal(
        details.collectionDate,
      ),

    pickupAddress:
      details.pickupAddress || "",

    deliveryAddress:
      details.deliveryAddress || "",

    deliveryMethod:
      details.deliveryMethod &&
      details.deliveryMethod !==
        DELIVERY_METHOD.UNKNOWN
        ? details.deliveryMethod
        : DELIVERY_METHOD.BUYER_PICK_UP,

    codValue:
      details.codValue ?? 0,

    estimatedShippingFee:
      Number(
        agreement?.estimatedShippingFee ??
          details.estimatedShippingFee ??
          0,
      ) || 0,
  };
};

const createInitialGhnPreview = (
  agreement,
) => {
  const details =
    agreement?.agreementDetails || {};

  const fee =
    Number(
      agreement?.estimatedShippingFee ??
        details.estimatedShippingFee ??
        0,
    );

  if (
    details.deliveryMethod !==
      DELIVERY_METHOD.GHN ||
    !Number.isFinite(fee) ||
    fee <= 0
  ) {
    return null;
  }

  return {
    totalFee: fee,

    expectedDeliveryAt:
      details?.ghnInfo?.quote
        ?.expectedDeliveryAt ||
      null,
  };
};

const getErrorMessage = (
  error,
  fallbackMessage,
) =>
  getGhnErrorMessage(
    error,
    error?.response?.data
      ?.error?.message ||
    error?.response?.data
      ?.message ||
    getSafeProblemDetail(
      error?.response?.data?.detail,
    ) ||
    fallbackMessage,
  );

const formatCurrency = (value) => {
  const amount =
    Number(value);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "—";
};

const formatDate = (value) => {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
};

const FieldError = ({ children }) =>
  children ? (
    <p className="mt-1 text-xs font-semibold text-error">
      {children}
    </p>
  ) : null;

const getFirstParcelValue = (...values) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== "",
  ) ?? "";

const createParcelSuggestion = (parcelInfo, currentItem = {}) => {
  const item = Array.isArray(parcelInfo?.items)
    ? parcelInfo.items[0] || {}
    : {};
  const lightParcel = parcelInfo?.lightParcel || {};

  const suggestion = {
    name: String(
      item.name ||
        currentItem.name ||
        parcelInfo?.productName ||
        "Sản phẩm HomeCycle",
    ),
    code: String(item.code || currentItem.code || ""),
    quantity: 1,
    weightGram: getFirstParcelValue(
      item.weightGram,
      lightParcel.weightGram,
      parcelInfo?.productWeightGram,
    ),
    lengthCm: getFirstParcelValue(
      item.lengthCm,
      lightParcel.lengthCm,
      parcelInfo?.productLengthCm,
    ),
    widthCm: getFirstParcelValue(
      item.widthCm,
      lightParcel.widthCm,
      parcelInfo?.productWidthCm,
    ),
    heightCm: getFirstParcelValue(
      item.heightCm,
      lightParcel.heightCm,
      parcelInfo?.productHeightCm,
    ),
  };

  const hasSuggestion = [
    suggestion.weightGram,
    suggestion.lengthCm,
    suggestion.widthCm,
    suggestion.heightCm,
  ].some((value) => Number(value) > 0);

  return hasSuggestion ? suggestion : null;
};

const AgreementForm = ({
  agreement,
  negotiationId,
  onSubmit,
  onCancel,
  busy,
  originalPost,
}) => {
  const initialValues =
    useMemo(
      () =>
        createInitialValues(
          agreement,
        ),
      [agreement],
    );

  const initialGhnInfo =
    useMemo(
      () =>
        createGhnCollectionInfo({
          existingInfo:
            agreement
              ?.agreementDetails
              ?.ghnInfo,
        }),
      [agreement],
    );

  const initialGhnPreview =
    useMemo(
      () =>
        createInitialGhnPreview(
          agreement,
        ),
      [agreement],
    );

  const [values, setValues] =
    useState(initialValues);

  const [ghnInfo, setGhnInfo] =
    useState(initialGhnInfo);

  const [ghnPreview, setGhnPreview] =
    useState(initialGhnPreview);

  const originalPostDeliveryMethod =
    normalizeDeliveryMethod(
      originalPost?.product?.deliveryMethod ??
        originalPost?.deliveryMethod,
    );

  const showOriginalPostGhnWarning =
    Boolean(originalPost) &&
    values.deliveryMethod === DELIVERY_METHOD.GHN &&
    originalPostDeliveryMethod !== DELIVERY_METHOD.GHN;

  const [errors, setErrors] =
    useState({});

  const [
    loadingParcelInfo,
    setLoadingParcelInfo,
  ] = useState(false);

  const [
    previewingGhn,
    setPreviewingGhn,
  ] = useState(false);

  const [
    ghnError,
    setGhnError,
  ] = useState("");

  const [
    ghnNotice,
    setGhnNotice,
  ] = useState("");

  const parcelInfoLoadedRef =
    useRef(
      Boolean(
        agreement
          ?.agreementDetails
          ?.ghnInfo,
      ),
    );
  const ghnEditVersionRef = useRef(0);

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10";

  const updateField = (event) => {
    const {
      name,
      value,
    } = event.target;

    setValues(
      (current) => ({
        ...current,
        [name]: value,
      }),
    );

    setErrors(
      (current) => ({
        ...current,
        [name]: "",
      }),
    );
  };

  const updateAddress =
    useCallback(
      (name, value) => {
        setValues(
          (current) => ({
            ...current,
            [name]: value,
          }),
        );

        setErrors(
          (current) => ({
            ...current,
            [name]: "",
          }),
        );
      },
      [],
    );

  const loadGhnParcelInfo =
    useCallback(
      async () => {
        const id =
          String(
            negotiationId || "",
          ).trim();

        if (
          !id ||
          parcelInfoLoadedRef.current
        ) {
          return;
        }

        setLoadingParcelInfo(
          true,
        );

        setGhnError("");
        setGhnNotice("");
        const editVersion = ghnEditVersionRef.current;

        try {
          const parcelInfo =
            await agreementApi
              .getGhnParcelInfo(
                id,
              );

          /*
           * ServiceTypeId trả về từ API chỉ mang tính tham khảo cũ - không
           * còn được tin trực tiếp. Kiện hàng vật lý (items) là dữ liệu duy
           * nhất được nạp; serviceTypeId luôn được createGhnCollectionInfo
           * suy ra lại từ khối lượng thực tế của kiện.
           */
          const parcelSuggestion =
            createParcelSuggestion(parcelInfo);
          const hasParcelSuggestion =
            Boolean(parcelSuggestion);

          setGhnInfo(
            (current) => {
              if (ghnEditVersionRef.current !== editVersion) {
                return current;
              }

              if (!parcelSuggestion) return current;

              return createGhnCollectionInfo({
                existingInfo: {
                  ...current,
                  items: [parcelSuggestion],
                },
              });
            },
          );

          parcelInfoLoadedRef.current =
            true;

          if (ghnEditVersionRef.current !== editVersion) {
            setGhnNotice(
              "Đã giữ nguyên thông tin kiện hàng bạn vừa chỉnh sửa.",
            );
          } else if (hasParcelSuggestion) {
            setGhnNotice(
              "Đã nạp thông tin kiện hàng từ sản phẩm hiện tại.",
            );
          } else if (
            parcelInfo
              ?.hasProductDimensions ===
            false
          ) {
            setGhnNotice(
              "Sản phẩm chưa có đủ khối lượng hoặc kích thước. Vui lòng nhập thủ công thông tin kiện hàng.",
            );
          } else {
            setGhnNotice(
              "Vui lòng nhập thông tin kiện hàng.",
            );
          }
        } catch (error) {
          setGhnError(
            getErrorMessage(
              error,
              "Không thể tự động lấy thông tin kiện hàng GHN.",
            ),
          );
        } finally {
          setLoadingParcelInfo(
            false,
          );
        }
      },
      [negotiationId],
    );

  const handleDeliveryMethodChange =
    (event) => {
      const method =
        event.target.value;

      setValues(
        (current) => ({
          ...current,
          deliveryMethod:
            method,

          estimatedShippingFee:
            method ===
            DELIVERY_METHOD.GHN
              ? 0
              : current
                  .estimatedShippingFee,
        }),
      );

      setErrors(
        (current) => ({
          ...current,
          deliveryMethod: "",
          pickupAddress: "",
          deliveryAddress: "",
          ghnInfo: "",
        }),
      );

      setGhnPreview(null);
      setGhnError("");
      setGhnNotice("");

      if (
        method ===
        DELIVERY_METHOD.GHN
      ) {
        void loadGhnParcelInfo();
      }
    };

  const handleGhnInfoChange =
    (nextInfo) => {
      ghnEditVersionRef.current += 1;
      setGhnInfo(nextInfo);
      setGhnPreview(null);

      setValues(
        (current) => ({
          ...current,
          estimatedShippingFee:
            0,
        }),
      );

      setErrors(
        (current) => ({
          ...current,
          ghnInfo: "",
        }),
      );

      setGhnError("");
      setGhnNotice("");
    };

  const handlePreviewGhn =
    async () => {
      const id =
        String(
          negotiationId || "",
        ).trim();

      if (!id) {
        setGhnError(
          "Không tìm thấy phiên thương lượng để tính phí GHN.",
        );
        return;
      }

      const validationMessage =
        validateGhnCollectionInfo(
          ghnInfo,
        );

      if (validationMessage) {
        setErrors(
          (current) => ({
            ...current,
            ghnInfo:
              validationMessage,
          }),
        );

        return;
      }

      setPreviewingGhn(true);
      setGhnError("");
      setGhnNotice("");

      try {
        const sanitized =
          sanitizeGhnCollectionInfo(
            ghnInfo,
          );

        /*
         * Current BE GhnShippingPreviewRequest yêu cầu CẢ root parcel
         * fields (ParcelCount/WeightGram/LengthCm/WidthCm/HeightCm) LẪN
         * Items - SnapshotHash băm cả hai và bắt buộc khớp tuyệt đối.
         * sanitizeGhnCollectionInfo đã tự suy ra root từ items nên preview
         * và save luôn dùng chung đúng một snapshot đã chuẩn hoá.
         *
         * AgreementType/DeliveryMethod cũng bắt buộc phải gửi kèm - Backend
         * chỉ tính phí GHN khi đúng No_Inspection + GhnDelivery, dùng lại
         * chính giá trị values đã chuẩn hoá (giống hệt payload lưu thỏa
         * thuận), không hardcode chuỗi enum.
         */
        const previewPayload = {
          agreementType:
            values.agreementType,

          deliveryMethod:
            values.deliveryMethod,

          sender:
            sanitized.sender,

          receiver:
            sanitized.receiver,

          serviceTypeId:
            sanitized
              .serviceTypeId,

          requiredNote:
            sanitized
              .requiredNote,

          parcelCount:
            sanitized
              .parcelCount,

          weightGram:
            sanitized
              .weightGram,

          lengthCm:
            sanitized
              .lengthCm,

          widthCm:
            sanitized
              .widthCm,

          heightCm:
            sanitized
              .heightCm,

          items:
            sanitized.items,
        };

        const result =
          await agreementApi
            .previewGhnShipping(
              id,
              previewPayload,
            );

        const totalFee =
          Number(
            result?.totalFee,
          );

        if (
          !Number.isFinite(
            totalFee,
          ) ||
          totalFee <= 0
        ) {
          throw new Error(
            "Máy chủ chưa trả về phí GHN hợp lệ.",
          );
        }

        /*
         * Content là một phần của SnapshotHash phía Backend (được suy ra
         * từ tên sản phẩm nếu request không gửi kèm). Phải lưu lại đúng
         * giá trị canonical này từ response để gửi lại y hệt khi lưu thỏa
         * thuận - không được tự suy ra từ số lượng thương mại, nhãn UI,
         * tên kiện, hay tên bài đăng phía client.
         */
        const canonicalContent =
          String(
            result?.shippingInfo
              ?.content || "",
          ).trim();

        if (!canonicalContent) {
          throw new Error(
            "Máy chủ chưa trả về nội dung xem trước phí GHN hợp lệ.",
          );
        }

        const nextPreview = {
          totalFee,

          expectedDeliveryAt:
            result
              ?.expectedDeliveryAt ||
            null,

          previewToken:
            result
              ?.previewToken ||
            null,

          expiresAt:
            result
              ?.expiresAt ||
            null,

          content:
            canonicalContent,
        };

        setGhnPreview(
          nextPreview,
        );

        setValues(
          (current) => ({
            ...current,
            estimatedShippingFee:
              totalFee,
          }),
        );

        setErrors(
          (current) => ({
            ...current,
            ghnInfo: "",
          }),
        );

        setGhnNotice(
          "Đã tính phí GHN từ dữ liệu hiện tại.",
        );
      } catch (error) {
        setGhnPreview(null);

        setValues(
          (current) => ({
            ...current,
            estimatedShippingFee:
              0,
          }),
        );

        setGhnError(
          getErrorMessage(
            error,
            "Không thể tính phí giao hàng GHN lúc này.",
          ),
        );
      } finally {
        setPreviewingGhn(
          false,
        );
      }
    };

  const validate = () => {
    const nextErrors = {};

    if (
      values.agreementType ===
      AGREEMENT_TYPE.INSPECTION
    ) {
      if (
        !values.inspectionDate
      ) {
        nextErrors.inspectionDate =
          "Vui lòng chọn lịch kiểm định.";
      } else if (
        new Date(
          values.inspectionDate,
        ).getTime() <=
        Date.now()
      ) {
        nextErrors.inspectionDate =
          "Lịch kiểm định phải ở thời điểm tương lai.";
      }

      if (
        !values.inspectionAddress
          .trim()
      ) {
        nextErrors.inspectionAddress =
          "Vui lòng nhập địa chỉ kiểm định.";
      }
    } else {
      if (
        !values.deliveryMethod ||
        values.deliveryMethod ===
          DELIVERY_METHOD.UNKNOWN
      ) {
        nextErrors.deliveryMethod =
          "Vui lòng chọn phương thức giao nhận.";
      } else if (
        values.deliveryMethod ===
        DELIVERY_METHOD.GHN
      ) {
        const validationMessage =
          validateGhnCollectionInfo(
            ghnInfo,
          );

        if (validationMessage) {
          nextErrors.ghnInfo =
            validationMessage;
        } else if (
          Array.isArray(ghnInfo?.items) &&
          ghnInfo.items.length > 1
        ) {
          nextErrors.ghnInfo =
            "Hệ thống hiện chưa xác nhận được đơn hàng có từ 2 kiện trở lên qua GHN. Vui lòng gộp về 1 kiện hoặc đổi hình thức giao nhận.";
        } else if (
          !ghnPreview ||
          Number(
            ghnPreview.totalFee,
          ) <= 0 ||
          !ghnPreview.previewToken
        ) {
          nextErrors.ghnInfo =
            "Vui lòng tính lại phí GHN trước khi lưu thỏa thuận.";
        } else if (
          ghnPreview.expiresAt &&
          new Date(
            ghnPreview.expiresAt,
          ).getTime() <=
            Date.now()
        ) {
          nextErrors.ghnInfo =
            "Phí GHN đã tính trước đó đã hết hạn. Vui lòng tính lại phí GHN trước khi lưu thỏa thuận.";
        }
      } else {
        if (
          !values.pickupAddress
            .trim()
        ) {
          nextErrors.pickupAddress =
            "Vui lòng nhập địa chỉ lấy hàng.";
        }

        if (
          !values.deliveryAddress
            .trim()
        ) {
          nextErrors.deliveryAddress =
            "Vui lòng nhập địa chỉ nhận hàng.";
        }
      }
    }

    setErrors(
      nextErrors,
    );

    return (
      Object.keys(
        nextErrors,
      ).length === 0
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const revision =
      Number(
        agreement
          ?.agreementDetails
          ?.revision ||
          0,
      ) + 1;

    const details = {
      revision,

      notes:
        values.notes.trim() ||
        null,

      inspectionDate:
        null,

      inspectionAddress:
        null,

      collectionDate:
        null,

      pickupAddress:
        null,

      deliveryAddress:
        null,

      deliveryMethod:
        null,

      ghnInfo:
        null,

      codValue:
        null,

      estimatedShippingFee:
        null,
    };

    if (
      values.agreementType ===
      AGREEMENT_TYPE.INSPECTION
    ) {
      details.inspectionDate =
        new Date(
          values.inspectionDate,
        ).toISOString();

      details.inspectionAddress =
        values.inspectionAddress
          .trim();
    } else {
      details.collectionDate =
        values.collectionDate
          ? new Date(
              values.collectionDate,
            ).toISOString()
          : null;

      details.deliveryMethod =
        values.deliveryMethod;

      if (
        values.deliveryMethod ===
        DELIVERY_METHOD.GHN
      ) {
        const sanitized =
          sanitizeGhnCollectionInfo(
            ghnInfo,
          );

        details.pickupAddress =
          formatGhnContactAddress(
            sanitized.sender,
          );

        details.deliveryAddress =
          formatGhnContactAddress(
            sanitized.receiver,
          );

        /*
         * AgreementDetails validator explicitly rejects:
         * - PaymentTypeId
         * - Quote
         * - QuoteStatus
         *
         * sanitizeGhnCollectionInfo does not send them.
         *
         * PreviewToken phải được gửi kèm để Backend xác nhận
         * (ConfirmPreview) và khóa EstimatedShippingFee - đây là token
         * do ghn-preview trả về, không phải dữ liệu do người dùng nhập.
         *
         * Content cũng nằm trong SnapshotHash phía Backend - phải gửi lại
         * đúng giá trị canonical mà ghn-preview đã trả về (ghnPreview.content),
         * không tự suy ra, nếu không hash sẽ lệch và ConfirmPreview từ chối.
         */
        details.ghnInfo = {
          ...sanitized,
          content:
            ghnPreview?.content ||
            null,
          previewToken:
            ghnPreview?.previewToken ||
            null,
        };

        details.codValue =
          Math.max(
            0,
            Number(
              values.codValue,
            ) || 0,
          );

        /*
         * Backend recomputes EstimatedShippingFee on create/update.
         * This value is only the latest preview shown to the user.
         */
        details.estimatedShippingFee =
          Number(
            ghnPreview?.totalFee,
          ) || null;
      } else {
        details.pickupAddress =
          values.pickupAddress
            .trim();

        details.deliveryAddress =
          values.deliveryAddress
            .trim();

        details.codValue = 0;

        details.estimatedShippingFee =
          0;
      }
    }

    onSubmit({
      ...(agreement
        ? {}
        : {
            negotiationId,
          }),

      agreementType:
        values.agreementType,

      paymentType:
        values.paymentType,

      agreementDetails:
        details,
    });
  };

  const isInspection =
    values.agreementType ===
    AGREEMENT_TYPE.INSPECTION;

  const isGhn =
    !isInspection &&
    values.deliveryMethod ===
      DELIVERY_METHOD.GHN;

  /*
   * Không kiểm định + Giao hàng GHN hiện bắt buộc Thanh toán toàn bộ
   * (PaymentService.CalculatePaymentAmount phía Backend tự ép Full_Payment
   * và tính basePrice + phí ship cho tổ hợp này, bỏ qua PaymentType đã
   * lưu) - đồng bộ ngay trong render để không cho người dùng thấy một lựa
   * chọn Đặt cọc mà Backend âm thầm thu tiền khác đi. Điều chỉnh ngay
   * trong render (không dùng effect) theo quy ước đã có của form này.
   */
  const requiresFullPaymentForGhn = isGhn;

  /*
   * Backend hiện luôn từ chối xác nhận GHN từ 2 kiện trở lên
   * (Ghn.MultiParcelDimensionsUnverified) - chặn "Tính phí GHN"/gửi thỏa
   * thuận ở đây để không tốn công người dùng chờ một lỗi chắc chắn xảy ra,
   * thay vì cố gộp/áng chừng kích thước hộ Backend.
   */
  const hasMultipleGhnParcels =
    isGhn &&
    Array.isArray(ghnInfo?.items) &&
    ghnInfo.items.length > 1;

  if (
    requiresFullPaymentForGhn &&
    values.paymentType !== PAYMENT_TYPE.FULL_PAYMENT
  ) {
    setValues((current) => ({
      ...current,
      paymentType: PAYMENT_TYPE.FULL_PAYMENT,
    }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          1. Hình thức thỏa thuận
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {AGREEMENT_TYPE_OPTIONS.map(
            (option) => (
              <label
                key={
                  option.value
                }
                className={
                  `cursor-pointer rounded-xl border p-4 transition ${
                    values.agreementType ===
                    option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary"
                  }`
                }
              >
                <input
                  type="radio"
                  name="agreementType"
                  value={
                    option.value
                  }
                  checked={
                    values.agreementType ===
                    option.value
                  }
                  onChange={
                    updateField
                  }
                  className="sr-only"
                />

                <span className="block font-black text-text">
                  {option.label}
                </span>

                <span className="mt-1 block text-xs leading-5 text-textLight">
                  {
                    option.description
                  }
                </span>
              </label>
            ),
          )}
        </div>

        <label className="mt-5 block text-sm font-bold text-text">
          Hình thức thanh toán

          <select
            name="paymentType"
            value={
              values.paymentType
            }
            onChange={
              updateField
            }
            disabled={
              requiresFullPaymentForGhn
            }
            className={`${inputClass} ${
              requiresFullPaymentForGhn
                ? "cursor-not-allowed opacity-60"
                : ""
            }`}
          >
            {PAYMENT_TYPE_OPTIONS.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              ),
            )}
          </select>

          {requiresFullPaymentForGhn && (
            <span className="mt-1.5 block text-xs font-normal leading-5 text-textLight">
              Giao hàng GHN cho thỏa thuận không kiểm định hiện yêu cầu thanh toán toàn bộ.
            </span>
          )}
        </label>
      </section>

      {isInspection && (
        <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            2. Lịch kiểm định
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-text">
              Ngày giờ kiểm định{" "}
              <span className="text-error">
                *
              </span>

              <input
                type="datetime-local"
                name="inspectionDate"
                value={
                  values.inspectionDate
                }
                onChange={
                  updateField
                }
                className={
                  inputClass
                }
              />

              <FieldError>
                {
                  errors.inspectionDate
                }
              </FieldError>
            </label>

            <AddressSelector
              id="inspection-address"
              label="Địa chỉ kiểm định"
              value={
                values.inspectionAddress
              }
              onChange={(value) =>
                updateAddress(
                  "inspectionAddress",
                  value,
                )
              }
              error={
                errors.inspectionAddress
              }
              required
              inputClass={
                inputClass
              }
            />
          </div>

          <p className="mt-4 rounded-xl bg-background px-4 py-3 text-xs leading-5 text-textLight">
            Với thỏa thuận có kiểm định, thông tin giao nhận sẽ được xác định ở bước sau khi kết quả kiểm định được hoàn tất.
          </p>
        </section>
      )}

      {!isInspection && (
        <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            2. Giao nhận
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-text">
              Phương thức giao nhận{" "}
              <span className="text-error">
                *
              </span>

              <select
                name="deliveryMethod"
                value={
                  values.deliveryMethod
                }
                onChange={
                  handleDeliveryMethodChange
                }
                className={
                  inputClass
                }
              >
                {DELIVERY_METHOD_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>

              <FieldError>
                {
                  errors.deliveryMethod
                }
              </FieldError>
            </label>

            <label className="text-sm font-bold text-text">
              Ngày giờ nhận hàng dự kiến

              <input
                type="datetime-local"
                name="collectionDate"
                value={
                  values.collectionDate
                }
                onChange={
                  updateField
                }
                className={
                  inputClass
                }
              />
            </label>
          </div>

          {showOriginalPostGhnWarning && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold leading-6 text-warning"
            >
              Bài đăng ban đầu không sử dụng GHN. Khối lượng và kích thước hiện tại có thể chưa phù hợp với quy định giao hàng nhanh. Vui lòng kiểm tra và điều chỉnh thông tin kiện hàng trước khi tính phí.
            </p>
          )}

          {!isGhn && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AddressSelector
                id="pickup-address"
                label="Địa chỉ lấy hàng"
                value={
                  values.pickupAddress
                }
                onChange={(value) =>
                  updateAddress(
                    "pickupAddress",
                    value,
                  )
                }
                error={
                  errors.pickupAddress
                }
                required
                inputClass={
                  inputClass
                }
              />

              <AddressSelector
                id="delivery-address"
                label="Địa chỉ nhận hàng"
                value={
                  values.deliveryAddress
                }
                onChange={(value) =>
                  updateAddress(
                    "deliveryAddress",
                    value,
                  )
                }
                error={
                  errors.deliveryAddress
                }
                required
                inputClass={
                  inputClass
                }
              />
            </div>
          )}

          {isGhn && (
            <>
              {loadingParcelInfo && (
                <p
                  role="status"
                  className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary"
                >
                  Đang lấy thông tin kiện hàng từ sản phẩm...
                </p>
              )}

              <GhnCollectionFields
                value={
                  ghnInfo
                }
                onChange={
                  handleGhnInfoChange
                }
                disabled={
                  busy ||
                  previewingGhn
                }
              />

              <FieldError>
                {
                  errors.ghnInfo
                }
              </FieldError>

              <div className="mt-4 grid gap-4 rounded-xl border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="text-sm font-bold text-text">
                  Giá trị thu hộ COD
                  <span className="ml-1 text-xs font-semibold text-textLight">
                    (nếu có)
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1000"
                    name="codValue"
                    value={
                      values.codValue
                    }
                    onChange={
                      updateField
                    }
                    className={
                      inputClass
                    }
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    void handlePreviewGhn();
                  }}
                  disabled={
                    busy ||
                    previewingGhn ||
                    loadingParcelInfo ||
                    hasMultipleGhnParcels
                  }
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {previewingGhn
                    ? "Đang tính phí..."
                    : "Tính phí GHN"}
                </button>
              </div>

              {hasMultipleGhnParcels && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning"
                >
                  Hệ thống hiện chưa xác nhận được đơn hàng có từ 2 kiện trở
                  lên qua GHN. Vui lòng gộp về 1 kiện, hoặc chọn hình thức Tự
                  vận chuyển/Nhận tại địa chỉ.
                </p>
              )}

              {ghnError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
                >
                  {ghnError}
                </p>
              )}

              {ghnNotice && (
                <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                  {ghnNotice}
                </p>
              )}

              {ghnPreview && (
                <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-success">
                    Phí GHN xem trước
                  </p>

                  <p className="mt-2 text-xl font-black text-text">
                    {formatCurrency(
                      ghnPreview.totalFee,
                    )}
                  </p>

                  {ghnPreview.expectedDeliveryAt && (
                    <p className="mt-1 text-xs font-semibold text-textLight">
                      Dự kiến giao:{" "}
                      {formatDate(
                        ghnPreview.expectedDeliveryAt,
                      )}
                    </p>
                  )}

                  <p className="mt-2 text-xs leading-5 text-textLight">
                    Máy chủ sẽ tính lại phí GHN khi lưu thỏa thuận để tránh dùng mức phí cũ.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          3. Điều khoản chung
        </p>

        <label className="mt-4 block text-sm font-bold text-text">
          Nội dung đã thống nhất
          <span className="ml-1 text-xs font-semibold text-textLight">
            (không bắt buộc)
          </span>

          <textarea
            name="notes"
            value={
              values.notes
            }
            onChange={
              updateField
            }
            rows={6}
            placeholder="Mô tả thêm tình trạng sản phẩm, lịch hẹn, cách thanh toán và trách nhiệm của hai bên..."
            className={
              inputClass
            }
          />
        </label>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              busy
            }
            className="rounded-lg border border-primary bg-white px-5 py-3 text-sm font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Hủy chỉnh sửa
          </button>
        )}

        <button
          type="submit"
          disabled={
            busy ||
            previewingGhn
          }
          className="rounded-lg bg-primary px-6 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Đang lưu..."
            : agreement
              ? "Lưu và xác nhận nội dung mới"
              : "Tạo và gửi thỏa thuận"}
        </button>
      </div>
    </form>
  );
};

export default AgreementForm;

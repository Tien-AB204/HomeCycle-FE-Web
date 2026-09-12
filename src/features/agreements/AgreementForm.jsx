import { useCallback, useMemo, useRef, useState } from "react";
import {
  AGREEMENT_TYPE,
  AGREEMENT_TYPE_OPTIONS,
  DELIVERY_METHOD,
  DELIVERY_METHOD_OPTIONS,
  PAYMENT_TYPE,
  PAYMENT_TYPE_OPTIONS,
} from "../../constants/agreements";
import agreementApi from "../../services/apis/agreementApi";
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
  error?.response?.data
    ?.error?.message ||
  error?.response?.data
    ?.message ||
  error?.response?.data
    ?.detail ||
  fallbackMessage;

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

const AgreementForm = ({
  agreement,
  negotiationId,
  onSubmit,
  onCancel,
  busy,
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

        try {
          const parcelInfo =
            await agreementApi
              .getGhnParcelInfo(
                id,
              );

          const serviceTypeId =
            Number(
              parcelInfo
                ?.serviceTypeId,
            ) === 5
              ? 5
              : 2;

          setGhnInfo(
            (current) => {
              const next = {
                ...current,
                serviceTypeId,
              };

              if (
                serviceTypeId === 5 &&
                Array.isArray(
                  parcelInfo?.items,
                ) &&
                parcelInfo
                  .items.length > 0
              ) {
                next.items =
                  parcelInfo.items;
              }

              return createGhnCollectionInfo({
                existingInfo:
                  next,
              });
            },
          );

          parcelInfoLoadedRef.current =
            true;

          if (
            serviceTypeId === 2 &&
            parcelInfo
              ?.hasProductDimensions ===
              false
          ) {
            setGhnNotice(
              "Sản phẩm chưa có đủ khối lượng hoặc kích thước. Máy chủ sẽ không thể tính phí GHN cho hàng nhẹ cho đến khi dữ liệu sản phẩm được bổ sung.",
            );
          } else {
            setGhnNotice(
              "Đã nạp thông tin kiện hàng từ sản phẩm hiện tại.",
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
         * Current BE GhnShippingPreviewRequest:
         * - Sender / Receiver
         * - ServiceTypeId
         * - RequiredNote
         * - optional top-level light overrides
         * - Items for heavy goods.
         *
         * We intentionally do NOT copy Mobile's nested
         * lightParcel preview override. For light goods,
         * Backend resolves dimensions from Product.
         */
        const previewPayload = {
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

          ...(sanitized
            .serviceTypeId === 5
            ? {
                items:
                  sanitized.items,
              }
            : {}),
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

        const nextPreview = {
          totalFee,

          expectedDeliveryAt:
            result
              ?.expectedDeliveryAt ||
            null,
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
          !ghnPreview ||
          Number(
            ghnPreview.totalFee,
          ) <= 0
        ) {
          nextErrors.ghnInfo =
            "Vui lòng tính lại phí GHN trước khi lưu thỏa thuận.";
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
         */
        details.ghnInfo =
          sanitized;

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
            className={
              inputClass
            }
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
                    loadingParcelInfo
                  }
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {previewingGhn
                    ? "Đang tính phí..."
                    : "Tính phí GHN"}
                </button>
              </div>

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
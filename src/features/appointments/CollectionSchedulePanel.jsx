import {
  useEffect,
  useState,
} from "react";
import {
  DELIVERY_METHOD,
  getDeliveryMethodLabel,
} from "../../constants/agreements";
import GhnCollectionFields from "./GhnCollectionFields";
import {
  createGhnCollectionInfo,
  formatGhnContactAddress,
  sanitizeGhnCollectionInfo,
  validateGhnCollectionInfo,
} from "./ghnCollectionUtils";
import agreementApi from "../../services/apis/agreementApi";
import inspectionFormApi from "../../services/apis/inspectionFormApi";
import orderApi from "../../services/apis/orderApi";

const DIRECT_METHODS = [
  DELIVERY_METHOD.BUYER_PICK_UP,
  DELIVERY_METHOD.SELLER_DELIVERS,
];

const SUPPORTED_METHODS = [
  ...DIRECT_METHODS,
  DELIVERY_METHOD.GHN,
];

const toDateTimeLocal = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000,
  );

  return localDate
    .toISOString()
    .slice(0, 16);
};

const getErrorMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  fallback;

const createInitialForm = () => ({
  collectionDate: "",
  pickupAddress: "",
  deliveryAddress: "",
  deliveryMethod:
    DELIVERY_METHOD.BUYER_PICK_UP,
  estimatedShippingFee: "0",
});

export default function CollectionSchedulePanel({
  inspectionForm,
  onClose,
  onScheduled,
  onRefreshRequired,
}) {
  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [agreement, setAgreement] =
    useState(null);

  const [orderContext, setOrderContext] =
    useState(null);

  const [ghnInfo, setGhnInfo] =
    useState(null);


  const [form, setForm] =
    useState(createInitialForm);

  useEffect(() => {
    const controller =
      new AbortController();

    const loadContext = async () => {
      try {
        const orderResponse =
          await orderApi.getById(
            inspectionForm.orderId,
            {
              signal: controller.signal,
            },
          );

        const order =
          orderResponse?.order ||
          orderResponse;

        if (!order?.agreementId) {
          throw new Error(
            "Không xác định được thỏa thuận của đơn hàng.",
          );
        }

        setOrderContext(order);

        const nextAgreement =
          await agreementApi.getById(
            order.agreementId,
            {
              signal: controller.signal,
            },
          );


        const details =
          nextAgreement.agreementDetails ||
          {};

        const currentMethod =
          SUPPORTED_METHODS.includes(
            details.deliveryMethod,
          )
            ? details.deliveryMethod
            : DELIVERY_METHOD.BUYER_PICK_UP;

        setAgreement(nextAgreement);

        setGhnInfo(
          createGhnCollectionInfo({
            order,
            existingInfo:
              details.ghnInfo,
          }),
        );
        setForm({
          collectionDate:
            toDateTimeLocal(
              details.collectionDate,
            ),
          pickupAddress:
            String(
              details.pickupAddress ||
                "",
            ),
          deliveryAddress:
            String(
              details.deliveryAddress ||
                "",
            ),
          deliveryMethod:
            currentMethod,
          estimatedShippingFee:
            currentMethod ===
            DELIVERY_METHOD.SELLER_DELIVERS
              ? String(
                  details.estimatedShippingFee ??
                    0,
                )
              : "0",
        });
      } catch (requestError) {
        if (
          requestError?.name !==
            "CanceledError" &&
          requestError?.code !==
            "ERR_CANCELED"
        ) {
          setError(
            getErrorMessage(
              requestError,
              "Không thể tải thông tin để tạo lịch thu gom.",
            ),
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    };

    void loadContext();

    return () =>
      controller.abort();
  }, [
    inspectionForm.orderId,
  ]);

  const updateField = (
    event,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (
        name ===
          "deliveryMethod" &&
        value ===
          DELIVERY_METHOD.BUYER_PICK_UP
      ) {
        next.estimatedShippingFee =
          "0";
      }

      return next;
    });

    if (name === "deliveryMethod") {
      if (
        value === DELIVERY_METHOD.GHN &&
        !ghnInfo
      ) {
        setGhnInfo(
          createGhnCollectionInfo({
            order: orderContext,
            existingInfo:
              agreement?.agreementDetails
                ?.ghnInfo,
          }),
        );
      }
    }

    setError("");
  };

  const validate = () => {
    if (!agreement) {
      return "Chưa tải được thỏa thuận giao dịch.";
    }

    const collectionDate =
      new Date(
        form.collectionDate,
      );

    if (
      !form.collectionDate ||
      Number.isNaN(
        collectionDate.getTime(),
      ) ||
      collectionDate.getTime() <=
        Date.now()
    ) {
      return "Thời gian thu gom phải ở tương lai.";
    }

    if (
      !SUPPORTED_METHODS.includes(
        form.deliveryMethod,
      )
    ) {
      return "Phương thức giao nhận không hợp lệ.";
    }

    const isGhn =
      form.deliveryMethod ===
      DELIVERY_METHOD.GHN;

    if (isGhn) {
      const ghnError =
        validateGhnCollectionInfo(
          ghnInfo,
        );

      if (ghnError) {
        return ghnError;
      }

    } else {
      if (
        !form.pickupAddress.trim()
      ) {
        return "Vui lòng nhập địa chỉ lấy hàng.";
      }

      if (
        !form.deliveryAddress.trim()
      ) {
        return "Vui lòng nhập địa chỉ nhận hàng.";
      }
    }

    if (
      form.deliveryMethod ===
      DELIVERY_METHOD.SELLER_DELIVERS
    ) {
      const fee =
        Number(
          form.estimatedShippingFee,
        );

      if (
        !Number.isFinite(fee) ||
        fee < 0
      ) {
        return "Phí giao hàng không được nhỏ hơn 0.";
      }
    }

    return "";
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    const validationError =
      validate();

    if (validationError) {
      setError(
        validationError,
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const isSellerDelivery =
        form.deliveryMethod ===
        DELIVERY_METHOD.SELLER_DELIVERS;

      const isGhn =
        form.deliveryMethod ===
        DELIVERY_METHOD.GHN;

      const safeGhnInfo =
        isGhn
          ? sanitizeGhnCollectionInfo(
              ghnInfo,
            )
          : null;

      const result =
        await inspectionFormApi.scheduleCollection(
          inspectionForm.inspectionFormId,
          {
            expectedRevision:
              inspectionForm.revision,

            collectionDate:
              new Date(
                form.collectionDate,
              ).toISOString(),

            pickupAddress:
              isGhn
                ? formatGhnContactAddress(
                    safeGhnInfo.sender,
                  )
                : form.pickupAddress.trim(),

            deliveryAddress:
              isGhn
                ? formatGhnContactAddress(
                    safeGhnInfo.receiver,
                  )
                : form.deliveryAddress.trim(),

            deliveryMethod:
              form.deliveryMethod,


            estimatedShippingFee:
              isGhn
                ? null
                : isSellerDelivery
                  ? Number(
                      form.estimatedShippingFee,
                    )
                  : 0,

            ghnInfo:
              safeGhnInfo,
          },
        );

      await onScheduled?.(
        result,
      );
    } catch (requestError) {
      const errorCode =
        String(
          requestError?.response?.data
            ?.error?.code ||
            requestError?.response?.data
              ?.code ||
            "",
        ).trim();

      if (
        errorCode ===
        "Inspection.RevisionMismatch"
      ) {
        setError(
          "Biên bản kiểm định đã thay đổi. HomeCycle đang tải lại phiên bản mới nhất.",
        );

        await onRefreshRequired?.();
        return;
      }

      setError(
        getErrorMessage(
          requestError,
          "Không thể tạo lịch thu gom.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="mt-4 rounded-xl border border-border bg-white p-4 text-sm font-semibold text-textLight"
        role="status"
      >
        Đang tải thông tin tạo lịch thu gom...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-primary/20 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-text">
            Tạo lịch thu gom
          </p>

          <p className="mt-1 text-xs leading-5 text-textLight">
            Phiên bản biên bản:{" "}
            <strong>
              {inspectionForm.revision}
            </strong>
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-black text-textLight hover:bg-background disabled:opacity-50"
        >
          Đóng
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-error/25 bg-error/10 px-3 py-2.5 text-xs font-semibold leading-5 text-error"
        >
          {error}
        </div>
      )}


      <fieldset className="mt-4">
        <legend className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
          Phương thức giao nhận
        </legend>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SUPPORTED_METHODS.map(
            (method) => (
              <label
                key={method}
                className={[
                  "cursor-pointer rounded-xl border p-3 text-sm font-bold transition",
                  form.deliveryMethod ===
                  method
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-white text-text hover:border-primary/40",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value={method}
                  checked={
                    form.deliveryMethod ===
                    method
                  }
                  onChange={
                    updateField
                  }
                  className="mr-2 accent-primary"
                />

                {getDeliveryMethodLabel(
                  method,
                )}
              </label>
            ),
          )}
        </div>

        <p className="mt-2 text-xs leading-5 text-textLight">
          Phí GHN do máy chủ tính. HomeCycle không tự tính hoặc
          gửi phí GHN từ trình duyệt.
        </p>


        {form.deliveryMethod ===
          DELIVERY_METHOD.GHN &&
          ghnInfo && (
            <GhnCollectionFields
              value={ghnInfo}
              onChange={(nextInfo) => {
                setGhnInfo(nextInfo);
                setError("");
              }}
              disabled={submitting}
            />
          )}
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-text">
          Thời gian thu gom
          <span className="text-error">
            {" "}*
          </span>

          <input
            type="datetime-local"
            name="collectionDate"
            value={
              form.collectionDate
            }
            onChange={
              updateField
            }
            disabled={submitting}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white"
          />
        </label>

        {form.deliveryMethod ===
          DELIVERY_METHOD.SELLER_DELIVERS && (
          <label className="text-sm font-bold text-text">
            Phí tự giao
            <span className="ml-1 text-xs font-medium text-textLight">
              (đ)
            </span>

            <input
              type="number"
              min="0"
              step="1000"
              name="estimatedShippingFee"
              value={
                form.estimatedShippingFee
              }
              onChange={
                updateField
              }
              disabled={submitting}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white"
            />
          </label>
        )}

        {form.deliveryMethod !==
          DELIVERY_METHOD.GHN && (
          <>
            <label className="text-sm font-bold text-text sm:col-span-2">
              Địa chỉ lấy hàng
              <span className="text-error">
                {" "}*
              </span>

              <input
                type="text"
                name="pickupAddress"
                value={
                  form.pickupAddress
                }
                onChange={
                  updateField
                }
                disabled={submitting}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white"
              />
            </label>

            <label className="text-sm font-bold text-text sm:col-span-2">
              Địa chỉ nhận hàng
              <span className="text-error">
                {" "}*
              </span>

              <input
                type="text"
                name="deliveryAddress"
                value={
                  form.deliveryAddress
                }
                onChange={
                  updateField
                }
                disabled={submitting}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white"
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-black text-textLight hover:bg-background disabled:opacity-50"
        >
          Hủy
        </button>

        <button
          type="submit"
          disabled={
            submitting ||
            !agreement
          }
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Đang tạo lịch..."
            : "Xác nhận tạo lịch"}
        </button>
      </div>
    </form>
  );
}
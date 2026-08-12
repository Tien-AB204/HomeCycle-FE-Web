import { useMemo, useState } from "react";
import {
  AGREEMENT_TYPE,
  AGREEMENT_TYPE_OPTIONS,
  DELIVERY_METHOD,
  DELIVERY_METHOD_OPTIONS,
  PAYMENT_TYPE,
  PAYMENT_TYPE_OPTIONS,
} from "../../constants/agreements";

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const createInitialValues = (agreement) => {
  const details = agreement?.agreementDetails || {};
  return {
    agreementType: agreement?.agreementType || AGREEMENT_TYPE.INSPECTION,
    paymentType: agreement?.paymentType || PAYMENT_TYPE.DEPOSIT,
    notes: details.notes || "",
    inspectionDate: toDateTimeLocal(details.inspectionDate),
    inspectionAddress: details.inspectionAddress || "",
    collectionDate: toDateTimeLocal(details.collectionDate),
    pickupAddress: details.pickupAddress || "",
    deliveryAddress: details.deliveryAddress || "",
    deliveryMethod: details.deliveryMethod || DELIVERY_METHOD.BUYER_PICK_UP,
    codValue: details.codValue ?? 0,
    estimatedShippingFee: details.estimatedShippingFee ?? 0,
  };
};

const FieldError = ({ children }) =>
  children ? <p className="mt-1 text-xs font-semibold text-red-600">{children}</p> : null;

const AgreementForm = ({ agreement, negotiationId, onSubmit, onCancel, busy }) => {
  const initialValues = useMemo(() => createInitialValues(agreement), [agreement]);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.notes.trim()) nextErrors.notes = "Vui lòng ghi rõ các điều khoản hai bên đã thống nhất.";
    if (values.agreementType === AGREEMENT_TYPE.INSPECTION) {
      if (!values.inspectionDate) nextErrors.inspectionDate = "Vui lòng chọn lịch kiểm định.";
      else if (new Date(values.inspectionDate).getTime() <= Date.now()) {
        nextErrors.inspectionDate = "Lịch kiểm định phải ở thời điểm tương lai.";
      }
      if (!values.inspectionAddress.trim()) nextErrors.inspectionAddress = "Vui lòng nhập địa chỉ kiểm định.";
    }
    if (!values.pickupAddress.trim()) nextErrors.pickupAddress = "Vui lòng nhập địa chỉ lấy hàng.";
    if (!values.deliveryAddress.trim()) nextErrors.deliveryAddress = "Vui lòng nhập địa chỉ nhận hàng.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const revision = Number(agreement?.agreementDetails?.revision || 0) + 1;
    const details = {
      revision,
      notes: values.notes.trim(),
      inspectionDate:
        values.agreementType === AGREEMENT_TYPE.INSPECTION
          ? new Date(values.inspectionDate).toISOString()
          : null,
      inspectionAddress:
        values.agreementType === AGREEMENT_TYPE.INSPECTION
          ? values.inspectionAddress.trim()
          : null,
      collectionDate: values.collectionDate ? new Date(values.collectionDate).toISOString() : null,
      pickupAddress: values.pickupAddress.trim(),
      deliveryAddress: values.deliveryAddress.trim(),
      deliveryMethod: values.deliveryMethod,
      ghnInfo: null,
      codValue: Number(values.codValue) || 0,
      estimatedShippingFee: Number(values.estimatedShippingFee) || 0,
    };

    onSubmit({
      ...(agreement ? {} : { negotiationId }),
      agreementType: values.agreementType,
      paymentType: values.paymentType,
      agreementDetails: details,
    });
  };

  const inputClass = "mt-1.5 w-full rounded-xl border border-[#BAC2C1] bg-white px-3.5 py-3 text-sm text-[#172830] outline-none transition focus:border-[#2B5659] focus:ring-2 focus:ring-[#2B5659]/10";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#547B7D]">1. Hình thức thỏa thuận</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {AGREEMENT_TYPE_OPTIONS.map((option) => (
            <label key={option.value} className={`cursor-pointer rounded-xl border p-4 transition ${values.agreementType === option.value ? "border-[#2B5659] bg-[#EAF3F3]" : "border-[#BAC2C1]/50 hover:border-[#547B7D]"}`}>
              <input type="radio" name="agreementType" value={option.value} checked={values.agreementType === option.value} onChange={updateField} className="sr-only" />
              <span className="block font-black text-[#172830]">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[#547B7D]">{option.description}</span>
            </label>
          ))}
        </div>
        <label className="mt-5 block text-sm font-bold text-[#172830]">
          Hình thức thanh toán
          <select name="paymentType" value={values.paymentType} onChange={updateField} className={inputClass}>
            {PAYMENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </section>

      {values.agreementType === AGREEMENT_TYPE.INSPECTION && (
        <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#547B7D]">2. Lịch kiểm định</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-[#172830]">
              Ngày giờ kiểm định <span className="text-red-600">*</span>
              <input type="datetime-local" name="inspectionDate" value={values.inspectionDate} onChange={updateField} className={inputClass} />
              <FieldError>{errors.inspectionDate}</FieldError>
            </label>
            <label className="text-sm font-bold text-[#172830]">
              Địa chỉ kiểm định <span className="text-red-600">*</span>
              <input name="inspectionAddress" value={values.inspectionAddress} onChange={updateField} placeholder="Địa điểm hai bên gặp để kiểm tra sản phẩm" className={inputClass} />
              <FieldError>{errors.inspectionAddress}</FieldError>
            </label>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#547B7D]">{values.agreementType === AGREEMENT_TYPE.INSPECTION ? "3" : "2"}. Giao nhận</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-[#172830]">
            Phương thức giao nhận
            <select name="deliveryMethod" value={values.deliveryMethod} onChange={updateField} className={inputClass}>
              {DELIVERY_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-[#172830]">
            Ngày giờ nhận hàng
            <input type="datetime-local" name="collectionDate" value={values.collectionDate} onChange={updateField} className={inputClass} />
          </label>
          <label className="text-sm font-bold text-[#172830]">
            Địa chỉ lấy hàng <span className="text-red-600">*</span>
            <input name="pickupAddress" value={values.pickupAddress} onChange={updateField} className={inputClass} />
            <FieldError>{errors.pickupAddress}</FieldError>
          </label>
          <label className="text-sm font-bold text-[#172830]">
            Địa chỉ nhận hàng <span className="text-red-600">*</span>
            <input name="deliveryAddress" value={values.deliveryAddress} onChange={updateField} className={inputClass} />
            <FieldError>{errors.deliveryAddress}</FieldError>
          </label>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          Tích hợp giao hàng GHN đang được backend cập nhật. Hiện tại form hỗ trợ người mua tự lấy hoặc người bán giao hàng.
        </p>
      </section>

      <section className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#547B7D]">{values.agreementType === AGREEMENT_TYPE.INSPECTION ? "4" : "3"}. Điều khoản chung</p>
        <label className="mt-4 block text-sm font-bold text-[#172830]">
          Nội dung đã thống nhất <span className="text-red-600">*</span>
          <textarea name="notes" value={values.notes} onChange={updateField} rows={6} placeholder="Mô tả tình trạng sản phẩm, lịch hẹn, cách thanh toán và trách nhiệm của hai bên..." className={inputClass} />
          <FieldError>{errors.notes}</FieldError>
        </label>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-[#BAC2C1] px-5 py-3 text-sm font-bold text-[#2B5659] hover:bg-[#BAC2C1]/20 disabled:opacity-50">Hủy chỉnh sửa</button>}
        <button type="submit" disabled={busy} className="rounded-xl bg-[#2B5659] px-6 py-3 text-sm font-black text-white transition hover:bg-[#172830] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Đang lưu..." : agreement ? "Lưu và xác nhận nội dung mới" : "Tạo và gửi thỏa thuận"}
        </button>
      </div>
    </form>
  );
};

export default AgreementForm;

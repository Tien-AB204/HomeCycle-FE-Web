export const APPOINTMENT_TYPE = Object.freeze({
  INSPECTION: "inspections",
  COLLECTION: "collections",
});

export const APPOINTMENT_PERSPECTIVE = Object.freeze({
  BUYER: "buyer",
  SELLER: "seller",
});

export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  MISSED: 4,
});

const APPOINTMENT_STATUS_META = Object.freeze({
  [APPOINTMENT_STATUS.PENDING]: {
    label: "Đang chờ",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  [APPOINTMENT_STATUS.CONFIRMED]: {
    label: "Đã xác nhận",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  [APPOINTMENT_STATUS.COMPLETED]: {
    label: "Đã hoàn tất",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  [APPOINTMENT_STATUS.CANCELLED]: {
    label: "Đã hủy",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  [APPOINTMENT_STATUS.MISSED]: {
    label: "Đã lỡ hẹn",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
});

export const APPOINTMENT_STATUS_OPTIONS = Object.freeze([
  { value: "", label: "Tất cả trạng thái" },
  { value: APPOINTMENT_STATUS.PENDING, label: "Đang chờ" },
  { value: APPOINTMENT_STATUS.CONFIRMED, label: "Đã xác nhận" },
  { value: APPOINTMENT_STATUS.COMPLETED, label: "Đã hoàn tất" },
  { value: APPOINTMENT_STATUS.CANCELLED, label: "Đã hủy" },
  { value: APPOINTMENT_STATUS.MISSED, label: "Đã lỡ hẹn" },
]);

export const getAppointmentStatusMeta = (status) => {
  return APPOINTMENT_STATUS_META[Number(status)] || {
    label: "Chưa xác định",
    className: "border-gray-200 bg-gray-50 text-gray-600",
  };
};

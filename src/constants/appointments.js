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
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  [APPOINTMENT_STATUS.CONFIRMED]: {
    label: "Đã xác nhận",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  [APPOINTMENT_STATUS.COMPLETED]: {
    label: "Đã hoàn tất",
    className: "border-success/30 bg-success/10 text-success",
  },
  [APPOINTMENT_STATUS.CANCELLED]: {
    label: "Đã hủy",
    className: "border-error/30 bg-error/10 text-error",
  },
  [APPOINTMENT_STATUS.MISSED]: {
    label: "Đã lỡ hẹn",
    className: "border-border bg-textLight/10 text-textLight",
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
    className: "border-border bg-textLight/10 text-textLight",
  };
};

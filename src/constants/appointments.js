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
  IN_PROGRESS: 5,
});

/*
 * Backend AppointmentStatus enum names thật (Proposed/Scheduled/Completed/
 * Cancelled/Expired/InProgress), dùng làm canonical key. List DTO trả int,
 * Detail DTO trả enum-name string (JsonStringEnumConverter) - bảng meta
 * phải tra được cả hai dạng cho cùng 1 trạng thái.
 */
const APPOINTMENT_STATUS_NAMES = Object.freeze({
  [APPOINTMENT_STATUS.PENDING]: "Proposed",
  [APPOINTMENT_STATUS.CONFIRMED]: "Scheduled",
  [APPOINTMENT_STATUS.COMPLETED]: "Completed",
  [APPOINTMENT_STATUS.CANCELLED]: "Cancelled",
  [APPOINTMENT_STATUS.MISSED]: "Expired",
  [APPOINTMENT_STATUS.IN_PROGRESS]: "InProgress",
});

const APPOINTMENT_STATUS_META = Object.freeze({
  Proposed: {
    label: "Đang chờ",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  Scheduled: {
    label: "Đã xác nhận",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  Completed: {
    label: "Đã hoàn tất",
    className: "border-success/30 bg-success/10 text-success",
  },
  Cancelled: {
    label: "Đã hủy",
    className: "border-error/30 bg-error/10 text-error",
  },
  Expired: {
    label: "Đã lỡ hẹn",
    className: "border-border bg-textLight/10 text-textLight",
  },
  InProgress: {
    label: "Đang diễn ra",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
});

const UNKNOWN_APPOINTMENT_STATUS_META = Object.freeze({
  label: "Chưa xác định",
  className: "border-border bg-textLight/10 text-textLight",
});

export const APPOINTMENT_STATUS_OPTIONS = Object.freeze([
  { value: "", label: "Tất cả trạng thái" },
  { value: APPOINTMENT_STATUS.PENDING, label: "Đang chờ" },
  { value: APPOINTMENT_STATUS.CONFIRMED, label: "Đã xác nhận" },
  { value: APPOINTMENT_STATUS.COMPLETED, label: "Đã hoàn tất" },
  { value: APPOINTMENT_STATUS.CANCELLED, label: "Đã hủy" },
  { value: APPOINTMENT_STATUS.MISSED, label: "Đã lỡ hẹn" },
  { value: APPOINTMENT_STATUS.IN_PROGRESS, label: "Đang diễn ra" },
]);

/*
 * Chuẩn hoá 1 giá trị status (number | numeric string | enum-name string)
 * về đúng tên enum Backend (vd "Completed"), hoặc null nếu không nhận diện được.
 */
export const normalizeAppointmentStatus = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (
    typeof value === "string" &&
    Object.values(APPOINTMENT_STATUS_NAMES).includes(value)
  ) {
    return value;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) &&
    APPOINTMENT_STATUS_NAMES[numeric] !== undefined
    ? APPOINTMENT_STATUS_NAMES[numeric]
    : null;
};

export const isAppointmentStatus = (value, canonicalName) =>
  normalizeAppointmentStatus(value) === canonicalName;

export const getAppointmentStatusMeta = (status) => {
  const name = normalizeAppointmentStatus(status);
  return (name && APPOINTMENT_STATUS_META[name]) || UNKNOWN_APPOINTMENT_STATUS_META;
};

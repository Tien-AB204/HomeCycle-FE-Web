import {
  APPOINTMENT_PERSPECTIVE,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE,
  getAppointmentStatusMeta,
  normalizeAppointmentStatus,
} from "../../constants/appointments.js";

export const APPOINTMENT_SCOPE = Object.freeze({
  ALL: "all",
  OPEN: "open",
  HISTORY: "history",
});

export const APPOINTMENT_SORT = Object.freeze({
  NEWEST: "desc",
  OLDEST: "asc",
});

// Lịch còn hiệu lực: chờ thống nhất, đã xác nhận hoặc đang diễn ra.
const OPEN_STATUS_NAMES = Object.freeze(["Proposed", "Scheduled", "InProgress"]);

export const APPOINTMENT_RING_STATUSES = Object.freeze([
  { status: APPOINTMENT_STATUS.PENDING, color: "#9A6418" },
  { status: APPOINTMENT_STATUS.CONFIRMED, color: "#537DA9" },
  { status: APPOINTMENT_STATUS.IN_PROGRESS, color: "#2B5659" },
  { status: APPOINTMENT_STATUS.COMPLETED, color: "#2F765D" },
  { status: APPOINTMENT_STATUS.CANCELLED, color: "#9AA8A0" },
  { status: APPOINTMENT_STATUS.MISSED, color: "#B04E57" },
]);

const VIETNAM_DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const VIETNAM_TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
});

const pad = (value) => String(value).padStart(2, "0");

// "YYYY-MM-DD" theo giờ Việt Nam, để lịch không lệch ngày khi máy đặt múi giờ khác.
export const toVietnamDayKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : VIETNAM_DAY_FORMAT.format(date);
};

export const formatVietnamTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--:--" : VIETNAM_TIME_FORMAT.format(date);
};

export const getScheduledAt = (item) =>
  item?.inspectionDate || item?.collectionDate || null;

const getSortTime = (item) =>
  new Date(getScheduledAt(item) || item?.createdAt).getTime() || 0;

export const isInspection = (item) =>
  item?.viewType === APPOINTMENT_TYPE.INSPECTION;

export const isOpenAppointment = (item) =>
  OPEN_STATUS_NAMES.includes(normalizeAppointmentStatus(item?.appointmentStatus));

const hasStatus = (item, status) =>
  status === "" ||
  status === null ||
  status === undefined ||
  normalizeAppointmentStatus(item?.appointmentStatus) ===
    normalizeAppointmentStatus(status);

export const hasSellerAppointments = (items) =>
  (Array.isArray(items) ? items : []).some(
    (item) => item?.viewPerspective === APPOINTMENT_PERSPECTIVE.SELLER,
  );

export const selectAppointments = (items, { perspective, type } = {}) =>
  (Array.isArray(items) ? items : []).filter(
    (item) =>
      item?.viewPerspective === perspective &&
      (!type || type === "all" || item?.viewType === type),
  );

export const countAppointmentsByStatus = (items, status) =>
  items.filter((item) => hasStatus(item, status)).length;

export const getAppointmentRingRows = (items) =>
  APPOINTMENT_RING_STATUSES.map(({ status, color }) => ({
    key: status,
    label: getAppointmentStatusMeta(status).label,
    color,
    count: countAppointmentsByStatus(items, status),
  }));

export const filterAppointments = (
  items,
  { scope, status, keyword, sort = APPOINTMENT_SORT.NEWEST } = {},
) => {
  const normalizedKeyword = String(keyword || "")
    .trim()
    .toLocaleLowerCase("vi-VN");

  return items
    .filter((item) => {
      if (scope === APPOINTMENT_SCOPE.OPEN && !isOpenAppointment(item)) return false;
      if (scope === APPOINTMENT_SCOPE.HISTORY && isOpenAppointment(item)) return false;
      if (!hasStatus(item, status)) return false;

      return (
        !normalizedKeyword ||
        String(item?.counterpartyName || "")
          .toLocaleLowerCase("vi-VN")
          .includes(normalizedKeyword)
      );
    })
    .sort((left, right) =>
      sort === APPOINTMENT_SORT.OLDEST
        ? getSortTime(left) - getSortTime(right)
        : getSortTime(right) - getSortTime(left),
    );
};

// Gom lịch theo ngày hẹn (giờ Việt Nam), mỗi ngày xếp theo giờ sớm nhất trước.
export const groupAppointmentsByDay = (items) => {
  const groups = new Map();

  items.forEach((item) => {
    const scheduledAt = getScheduledAt(item);
    const dayKey = scheduledAt ? toVietnamDayKey(scheduledAt) : "";
    if (!dayKey) return;

    groups.set(dayKey, [...(groups.get(dayKey) || []), item]);
  });

  groups.forEach((dayItems) =>
    dayItems.sort(
      (left, right) =>
        new Date(getScheduledAt(left)).getTime() -
        new Date(getScheduledAt(right)).getTime(),
    ),
  );

  return groups;
};

/*
 * Ô lịch tháng bắt đầu từ thứ Hai; ô ngoài tháng là null. month: 0-11.
 */
export const buildMonthDayKeys = (year, month) => {
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth
      ? `${year}-${pad(month + 1)}-${pad(day)}`
      : null;
  });
};

export const getCheckInSummary = (item) => {
  if (!isInspection(item)) return null;

  const isBuyer = item?.viewPerspective === APPOINTMENT_PERSPECTIVE.BUYER;
  return {
    self: Boolean(isBuyer ? item?.buyerCheckedIn : item?.sellerCheckedIn),
    partner: Boolean(isBuyer ? item?.sellerCheckedIn : item?.buyerCheckedIn),
  };
};

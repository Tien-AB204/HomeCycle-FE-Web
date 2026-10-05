/*
 * Ngày/giờ hiển thị theo giờ Việt Nam, không phụ thuộc múi giờ đặt trên máy.
 */
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

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" theo giờ Việt Nam; chuỗi rỗng khi giá trị không phải ngày hợp lệ.
export const toVietnamDayKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : VIETNAM_DAY_FORMAT.format(date);
};

export const formatVietnamTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--:--" : VIETNAM_TIME_FORMAT.format(date);
};

// "YYYY-MM-DD" → "DD/MM" hoặc "DD/MM/YYYY".
export const formatDayKey = (dayKey, { withYear = true } = {}) => {
  const [year, month, day] = String(dayKey || "").split("-");
  if (!day) return "";
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
};

// count ngày gần nhất tính đến hôm nay, cũ nhất trước. Việt Nam không đổi giờ theo mùa.
export const getRecentVietnamDayKeys = (nowMs, count) =>
  Array.from({ length: count }, (_, index) =>
    toVietnamDayKey(nowMs - (count - 1 - index) * DAY_MS),
  );

export const getVietnamDayStartIso = (dayKey) =>
  new Date(`${dayKey}T00:00:00+07:00`).toISOString();

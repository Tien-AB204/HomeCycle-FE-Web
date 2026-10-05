import { parseServerDate } from "./serverClock.js";

const LOCALE = "vi-VN";
const TIME_ZONE = "Asia/Ho_Chi_Minh";
const EMPTY = "—";

const toDate = (value) => {
  const ms = parseServerDate(value);
  return ms === null ? null : new Date(ms);
};

export const formatNumber = (value, fallback = EMPTY) => {
  const amount = Number(value);

  return value !== null && value !== undefined && value !== "" &&
    Number.isFinite(amount)
    ? amount.toLocaleString(LOCALE)
    : fallback;
};

export const formatCurrency = (value, fallback = EMPTY) => {
  const amount = formatNumber(value, "");
  return amount ? `${amount} đ` : fallback;
};

export const formatDate = (value, fallback = EMPTY) => {
  const date = toDate(value);

  return date
    ? new Intl.DateTimeFormat(LOCALE, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: TIME_ZONE,
      }).format(date)
    : fallback;
};

export const formatDateTime = (value, fallback = EMPTY) => {
  const date = toDate(value);

  return date
    ? new Intl.DateTimeFormat(LOCALE, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIME_ZONE,
      }).format(date)
    : fallback;
};

/*
 * Thời gian còn lại dạng đồng hồ: "mm:ss", hoặc "h:mm:ss" khi còn từ 1 giờ.
 */
export const formatRemainingTime = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (part) => String(part).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

import { toVietnamDayKey } from "../../utils/vietnamDate.js";

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const isIncoming = (direction) => {
  const normalized = String(direction ?? "").trim().toLowerCase();
  return normalized === "0" || normalized === "in";
};

// Tỷ lệ khả dụng / tạm giữ trên tổng tiền trong ví (phần trăm, làm tròn 1 chữ số).
export const getBalanceShares = (available, hold) => {
  const availableAmount = Math.max(0, toAmount(available));
  const holdAmount = Math.max(0, toAmount(hold));
  const total = availableAmount + holdAmount;

  if (!total) return { total: 0, availablePercent: 0, holdPercent: 0 };

  const availablePercent = Math.round((availableAmount / total) * 1000) / 10;
  return {
    total,
    availablePercent,
    holdPercent: Math.round((100 - availablePercent) * 10) / 10,
  };
};

/*
 * Hạn mức rút trong ngày. limit = null nghĩa là gói hiện tại không giới hạn
 * tổng tiền rút theo ngày.
 */
export const getQuotaUsage = (quota) => {
  if (!quota) return null;

  const limit =
    quota.dailyWithdrawalLimit === null || quota.dailyWithdrawalLimit === undefined
      ? null
      : toAmount(quota.dailyWithdrawalLimit);
  const used = toAmount(quota.usedDailyLimitAmount);

  return {
    used,
    limit,
    remaining:
      quota.remainingDailyLimitAmount === null ||
      quota.remainingDailyLimitAmount === undefined
        ? null
        : toAmount(quota.remainingDailyLimitAmount),
    percent: limit ? Math.min(100, Math.round((used / limit) * 1000) / 10) : null,
    reserved: toAmount(quota.activeReservedAmount),
    countLimit: quota.dailyWithdrawalCountLimit ?? null,
    countUsed: quota.usedDailyWithdrawalCount ?? 0,
    countRemaining: quota.remainingDailyWithdrawalCount ?? null,
    minimum: toAmount(quota.minimumWithdrawalAmount),
    maximum: toAmount(quota.maximumWithdrawalAmount),
    resetAt: quota.resetAt || null,
  };
};

/*
 * Cộng tiền vào / ra theo ngày (giờ Việt Nam) từ các dòng sao kê. Đây là biến
 * động số dư, không phải doanh thu hay lợi nhuận.
 */
export const buildDailyFlow = (ledgerItems, dayKeys) => {
  const totals = new Map(dayKeys.map((dayKey) => [dayKey, { in: 0, out: 0 }]));

  (Array.isArray(ledgerItems) ? ledgerItems : []).forEach((item) => {
    const bucket = totals.get(toVietnamDayKey(item?.createdAt));
    if (!bucket) return;

    const amount = Math.abs(toAmount(item?.amount));
    if (isIncoming(item?.direction)) bucket.in += amount;
    else bucket.out += amount;
  });

  return dayKeys.map((dayKey) => ({ dayKey, ...totals.get(dayKey) }));
};

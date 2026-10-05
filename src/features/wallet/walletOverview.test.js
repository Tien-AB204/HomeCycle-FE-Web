import assert from "node:assert/strict";
import test from "node:test";
import {
  getRecentVietnamDayKeys,
  getVietnamDayStartIso,
} from "../../utils/vietnamDate.js";
import {
  buildDailyFlow,
  getBalanceShares,
  getQuotaUsage,
} from "./walletOverview.js";

test("splits the wallet total into available and hold shares", () => {
  assert.deepEqual(getBalanceShares(7800000, 1200000), {
    total: 9000000,
    availablePercent: 86.7,
    holdPercent: 13.3,
  });
  assert.deepEqual(getBalanceShares(0, 0), {
    total: 0,
    availablePercent: 0,
    holdPercent: 0,
  });
});

test("reads daily withdrawal usage, with or without a limit", () => {
  const usage = getQuotaUsage({
    dailyWithdrawalLimit: 10000000,
    usedDailyLimitAmount: 1200000,
    remainingDailyLimitAmount: 8800000,
    dailyWithdrawalCountLimit: 3,
    usedDailyWithdrawalCount: 1,
    remainingDailyWithdrawalCount: 2,
    activeReservedAmount: 1200000,
  });
  assert.equal(usage.percent, 12);
  assert.equal(usage.remaining, 8800000);
  assert.equal(usage.countRemaining, 2);

  const unlimited = getQuotaUsage({ dailyWithdrawalLimit: null, usedDailyLimitAmount: 500000 });
  assert.equal(unlimited.limit, null);
  assert.equal(unlimited.percent, null);
  assert.equal(getQuotaUsage(null), null);
});

test("sums money in and out per Vietnam day", () => {
  const now = Date.parse("2026-10-05T10:00:00Z");
  const days = getRecentVietnamDayKeys(now, 3);
  assert.deepEqual(days, ["2026-10-03", "2026-10-04", "2026-10-05"]);
  assert.equal(getVietnamDayStartIso("2026-10-03"), "2026-10-02T17:00:00.000Z");

  const flow = buildDailyFlow(
    [
      { createdAt: "2026-10-04T18:30:00Z", direction: "In", amount: 1800000 },
      { createdAt: "2026-10-05T01:00:00Z", direction: 1, amount: 1200000 },
      { createdAt: "2026-10-03T02:00:00Z", direction: "Out", amount: 20000 },
      { createdAt: "2026-09-20T02:00:00Z", direction: "In", amount: 999 },
    ],
    days,
  );
  assert.deepEqual(flow, [
    { dayKey: "2026-10-03", in: 0, out: 20000 },
    { dayKey: "2026-10-04", in: 0, out: 0 },
    { dayKey: "2026-10-05", in: 1800000, out: 1200000 },
  ]);
});

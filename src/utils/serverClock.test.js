import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCurrency,
  formatDateTime,
  formatRemainingTime,
} from "./formatter.js";
import { parseServerDate, serverNow, syncServerClock } from "./serverClock.js";

test("treats server timestamps without a zone as UTC", () => {
  assert.equal(
    parseServerDate("2026-10-04T08:00:00"),
    Date.UTC(2026, 9, 4, 8, 0, 0),
  );
  assert.equal(
    parseServerDate("2026-10-04T15:00:00+07:00"),
    Date.UTC(2026, 9, 4, 8, 0, 0),
  );
  assert.equal(parseServerDate(""), null);
  assert.equal(parseServerDate("not a date"), null);
});

test("follows the server clock only when the drift is noticeable", () => {
  syncServerClock(new Date(Date.now() + 500).toUTCString());
  assert.ok(Math.abs(serverNow() - Date.now()) < 50);

  syncServerClock(new Date(Date.now() + 5 * 60_000).toUTCString());
  assert.ok(serverNow() - Date.now() > 4 * 60_000);

  syncServerClock(undefined);
  assert.ok(serverNow() - Date.now() > 4 * 60_000);

  // Header Date cũ của response trong cache không được kéo lệch đồng hồ.
  syncServerClock(new Date(Date.now() - 2 * 24 * 3600_000).toUTCString());
  assert.ok(serverNow() - Date.now() > 4 * 60_000);

  syncServerClock(new Date().toUTCString());
  assert.ok(Math.abs(serverNow() - Date.now()) < 50);
});

test("formats money, Vietnam time and remaining time", () => {
  assert.equal(formatCurrency(1500000), "1.500.000 đ");
  assert.equal(formatCurrency(null), "—");
  assert.equal(formatDateTime("2026-10-04T08:05:00Z"), "15:05 04/10/2026");
  assert.equal(formatRemainingTime(65_000), "01:05");
  assert.equal(formatRemainingTime(3_725_000), "1:02:05");
  assert.equal(formatRemainingTime(-1), "00:00");
});

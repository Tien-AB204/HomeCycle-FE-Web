import assert from "node:assert/strict";
import test from "node:test";
import { APPOINTMENT_STATUS } from "../../constants/appointments.js";
import {
  APPOINTMENT_SCOPE,
  APPOINTMENT_SORT,
  buildMonthDayKeys,
  countAppointmentsByStatus,
  filterAppointments,
  getCheckInSummary,
  groupAppointmentsByDay,
  hasSellerAppointments,
  selectAppointments,
  toVietnamDayKey,
} from "./appointmentCalendarStats.js";

const items = [
  { appointmentId: "a", appointmentStatus: 1, inspectionDate: "2026-10-05T02:00:00Z", counterpartyName: "Kho An Phát", viewType: "inspections", viewPerspective: "buyer", buyerCheckedIn: true, sellerCheckedIn: false },
  { appointmentId: "b", appointmentStatus: 0, collectionDate: "2026-10-05T07:30:00Z", counterpartyName: "Minh Anh", viewType: "collections", viewPerspective: "buyer" },
  { appointmentId: "c", appointmentStatus: 2, inspectionDate: "2026-10-03T01:30:00Z", counterpartyName: "Hoàng Gia", viewType: "inspections", viewPerspective: "buyer", buyerCheckedIn: true, sellerCheckedIn: true },
  { appointmentId: "d", appointmentStatus: "Cancelled", inspectionDate: "2026-10-04T18:00:00Z", counterpartyName: "Phương Nam", viewType: "inspections", viewPerspective: "buyer" },
  { appointmentId: "e", appointmentStatus: 5, inspectionDate: "2026-10-05T03:30:00Z", counterpartyName: "Minh Khang", viewType: "inspections", viewPerspective: "seller", buyerCheckedIn: true, sellerCheckedIn: false },
];

test("selects by perspective and type", () => {
  assert.equal(hasSellerAppointments(items), true);
  assert.equal(selectAppointments(items, { perspective: "buyer", type: "all" }).length, 4);
  assert.equal(selectAppointments(items, { perspective: "buyer", type: "collections" }).length, 1);
});

test("counts statuses and filters by scope, keyword and sort", () => {
  const buyer = selectAppointments(items, { perspective: "buyer" });
  assert.equal(countAppointmentsByStatus(buyer, APPOINTMENT_STATUS.CANCELLED), 1);

  assert.deepEqual(
    filterAppointments(buyer, { scope: APPOINTMENT_SCOPE.OPEN }).map((item) => item.appointmentId),
    ["b", "a"],
  );
  assert.deepEqual(
    filterAppointments(buyer, { scope: APPOINTMENT_SCOPE.HISTORY, sort: APPOINTMENT_SORT.OLDEST })
      .map((item) => item.appointmentId),
    ["c", "d"],
  );
  assert.deepEqual(
    filterAppointments(buyer, { keyword: "minh" }).map((item) => item.appointmentId),
    ["b"],
  );
});

test("groups by Vietnam day, not the machine time zone", () => {
  // 18:00 UTC ngày 04/10 là 01:00 ngày 05/10 ở Việt Nam.
  assert.equal(toVietnamDayKey("2026-10-04T18:00:00Z"), "2026-10-05");

  const groups = groupAppointmentsByDay(selectAppointments(items, { perspective: "buyer" }));
  assert.deepEqual(groups.get("2026-10-05").map((item) => item.appointmentId), ["d", "a", "b"]);
  assert.deepEqual(groups.get("2026-10-03").map((item) => item.appointmentId), ["c"]);
});

test("builds a Monday-first month grid", () => {
  const cells = buildMonthDayKeys(2026, 9);
  // 01/10/2026 là thứ Năm: ba ô trống đầu tuần.
  assert.deepEqual(cells.slice(0, 4), [null, null, null, "2026-10-01"]);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells.filter(Boolean).length, 31);
});

test("reads check-in for the viewer and the partner", () => {
  assert.deepEqual(getCheckInSummary(items[0]), { self: true, partner: false });
  assert.deepEqual(getCheckInSummary(items[4]), { self: false, partner: true });
  assert.equal(getCheckInSummary(items[1]), null);
});

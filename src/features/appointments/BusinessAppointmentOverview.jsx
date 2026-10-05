import { useMemo, useState } from "react";
import {
  APPOINTMENT_PERSPECTIVE,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE,
  getAppointmentStatusMeta,
} from "../../constants/appointments";
import { dedupeAddressText } from "../../utils/addressText";
import {
  MetricTile,
  SegmentedControl,
  StatusRing,
  WorkspaceHeader,
  WorkspacePanel,
} from "../business-workspace/WorkspaceWidgets";
import {
  APPOINTMENT_RING_STATUSES,
  APPOINTMENT_SCOPE,
  APPOINTMENT_SORT,
  buildMonthDayKeys,
  countAppointmentsByStatus,
  filterAppointments,
  formatVietnamTime,
  getAppointmentRingRows,
  getCheckInSummary,
  getScheduledAt,
  groupAppointmentsByDay,
  hasSellerAppointments,
  isInspection,
  selectAppointments,
  toVietnamDayKey,
} from "./appointmentCalendarStats";

const PAGE_SIZE = 10;
const LIST_ID = "business-appointment-list";
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả lịch" },
  { value: APPOINTMENT_TYPE.INSPECTION, label: "Kiểm định" },
  { value: APPOINTMENT_TYPE.COLLECTION, label: "Thu gom" },
];

const PERSPECTIVE_OPTIONS = [
  { value: APPOINTMENT_PERSPECTIVE.BUYER, label: "Lịch đơn mua" },
  { value: APPOINTMENT_PERSPECTIVE.SELLER, label: "Lịch đơn bán" },
];

const SCOPE_OPTIONS = [
  { value: APPOINTMENT_SCOPE.ALL, label: "Tất cả" },
  { value: APPOINTMENT_SCOPE.OPEN, label: "Đang diễn ra" },
  { value: APPOINTMENT_SCOPE.HISTORY, label: "Lịch sử" },
];

const getTypeLabel = (item) => (isInspection(item) ? "Kiểm định" : "Thu gom");

const getAddress = (item) =>
  dedupeAddressText(
    item.inspectionAddress || item.pickupAddress || item.deliveryAddress,
  ) || "Chưa có địa chỉ";

const formatDayKey = (dayKey) => dayKey.split("-").reverse().join("/");

const formatScheduledAt = (item) => {
  const scheduledAt = getScheduledAt(item);
  return scheduledAt
    ? `${formatDayKey(toVietnamDayKey(scheduledAt))} · ${formatVietnamTime(scheduledAt)}`
    : "Chưa có thời gian";
};

const parseDayKey = (dayKey) => {
  const [year, month] = dayKey.split("-").map(Number);
  return { year, month: month - 1 };
};

const StatusBadge = ({ status }) => {
  const meta = getAppointmentStatusMeta(status);
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.className}`}
    >
      {meta.label}
    </span>
  );
};

const EventChip = ({ item }) => (
  <span
    className={[
      "block truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-bold",
      isInspection(item)
        ? "bg-[#537DA9]/15 text-[#3F6690]"
        : "bg-success/15 text-success",
    ].join(" ")}
  >
    {formatVietnamTime(getScheduledAt(item))} {getTypeLabel(item)}
  </span>
);

export default function BusinessAppointmentOverview({
  items,
  loading,
  error,
  onOpenDetail,
}) {
  const [todayKey] = useState(() => toVietnamDayKey(Date.now()));
  const [perspective, setPerspective] = useState(APPOINTMENT_PERSPECTIVE.BUYER);
  const [type, setType] = useState("all");
  const [monthCursor, setMonthCursor] = useState(() => parseDayKey(todayKey));
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [scope, setScope] = useState(APPOINTMENT_SCOPE.ALL);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState(APPOINTMENT_SORT.NEWEST);
  const [pageNumber, setPageNumber] = useState(1);

  const showPerspective = hasSellerAppointments(items);
  const activePerspective = showPerspective
    ? perspective
    : APPOINTMENT_PERSPECTIVE.BUYER;
  const rows = useMemo(
    () => selectAppointments(items, { perspective: activePerspective, type }),
    [activePerspective, items, type],
  );
  const byDay = useMemo(() => groupAppointmentsByDay(rows), [rows]);
  const filteredRows = useMemo(
    () => filterAppointments(rows, { scope, status, keyword, sort }),
    [keyword, rows, scope, sort, status],
  );
  const monthCells = useMemo(
    () => buildMonthDayKeys(monthCursor.year, monthCursor.month),
    [monthCursor],
  );
  const selectedItems = byDay.get(selectedDay) || [];

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const hasFilter =
    scope !== APPOINTMENT_SCOPE.ALL || status !== "" || keyword;

  const changeMonth = (delta) => {
    const next = new Date(Date.UTC(monthCursor.year, monthCursor.month + delta, 1));
    const nextCursor = { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    setMonthCursor(nextCursor);
    setSelectedDay(buildMonthDayKeys(nextCursor.year, nextCursor.month).find(Boolean));
  };

  const goToday = () => {
    setMonthCursor(parseDayKey(todayKey));
    setSelectedDay(todayKey);
  };

  const resetFilters = () => {
    setScope(APPOINTMENT_SCOPE.ALL);
    setStatus("");
    setKeyword("");
    setPageNumber(1);
  };

  const showStatus = (nextStatus) => {
    setScope(APPOINTMENT_SCOPE.ALL);
    setStatus(nextStatus);
    setPageNumber(1);
    document
      .getElementById(LIST_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl space-y-5 px-4 pb-14 pt-7 sm:px-6">
      <WorkspaceHeader
        title="Lịch hẹn của tôi"
        description="Chuẩn bị kiểm định và thu gom theo lịch đã thống nhất."
      >
        {showPerspective && (
          <SegmentedControl
            label="Vai trò trong giao dịch"
            options={PERSPECTIVE_OPTIONS}
            value={activePerspective}
            onChange={(value) => {
              setPerspective(value);
              resetFilters();
            }}
          />
        )}
        <SegmentedControl
          label="Loại lịch"
          options={TYPE_OPTIONS}
          value={type}
          onChange={(value) => {
            setType(value);
            resetFilters();
          }}
        />
      </WorkspaceHeader>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error"
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          role="status"
          className="rounded-xl border border-border bg-white p-12 text-center font-semibold text-textLight"
        >
          Đang tải lịch hẹn...
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile
              label="Tổng lịch"
              value={rows.length}
              caption="Theo loại lịch đã chọn"
              highlighted
              active={status === "" && scope === APPOINTMENT_SCOPE.ALL}
              onClick={() => showStatus("")}
            />
            <MetricTile
              label={getAppointmentStatusMeta(APPOINTMENT_STATUS.PENDING).label}
              value={countAppointmentsByStatus(rows, APPOINTMENT_STATUS.PENDING)}
              caption="Đề xuất đang chờ phản hồi"
              tone="text-warning"
              active={status === APPOINTMENT_STATUS.PENDING}
              onClick={() => showStatus(APPOINTMENT_STATUS.PENDING)}
            />
            <MetricTile
              label={getAppointmentStatusMeta(APPOINTMENT_STATUS.CONFIRMED).label}
              value={countAppointmentsByStatus(rows, APPOINTMENT_STATUS.CONFIRMED)}
              caption="Chuẩn bị theo thời gian đã hẹn"
              tone="text-[#3F6690]"
              active={status === APPOINTMENT_STATUS.CONFIRMED}
              onClick={() => showStatus(APPOINTMENT_STATUS.CONFIRMED)}
            />
            <MetricTile
              label={getAppointmentStatusMeta(APPOINTMENT_STATUS.IN_PROGRESS).label}
              value={countAppointmentsByStatus(rows, APPOINTMENT_STATUS.IN_PROGRESS)}
              caption="Theo dõi cuộc hẹn hiện tại"
              tone="text-primary"
              active={status === APPOINTMENT_STATUS.IN_PROGRESS}
              onClick={() => showStatus(APPOINTMENT_STATUS.IN_PROGRESS)}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <WorkspacePanel
              title="Lịch hẹn theo tháng"
              description="Chọn ngày để xem lịch trong ngày · Giờ Việt Nam"
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  aria-label="Tháng trước"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-textLight transition hover:border-primary/40 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    chevron_left
                  </span>
                </button>
                <strong className="min-w-[130px] text-center text-sm font-black text-text">
                  Tháng {monthCursor.month + 1} / {monthCursor.year}
                </strong>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  aria-label="Tháng sau"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-textLight transition hover:border-primary/40 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    chevron_right
                  </span>
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs font-black text-text transition hover:border-primary/40 hover:text-primary"
                >
                  Hôm nay
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-textLight">
                {WEEKDAYS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthCells.map((dayKey, index) => {
                  if (!dayKey) {
                    return <div key={`blank-${index}`} aria-hidden="true" />;
                  }

                  const dayItems = byDay.get(dayKey) || [];
                  const isSelected = dayKey === selectedDay;

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => setSelectedDay(dayKey)}
                      aria-pressed={isSelected}
                      aria-label={`${formatDayKey(dayKey)}, ${dayItems.length} lịch`}
                      className={[
                        "flex min-h-14 flex-col gap-1 rounded-lg border p-1.5 text-left transition sm:min-h-[84px]",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/70 hover:border-primary/40",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                          dayKey === todayKey ? "bg-primary text-white" : "text-text",
                        ].join(" ")}
                      >
                        {Number(dayKey.slice(8))}
                      </span>
                      <span className="hidden min-w-0 space-y-0.5 sm:block">
                        {dayItems.slice(0, 2).map((item) => (
                          <EventChip
                            key={`${item.appointmentId}-${item.viewType}`}
                            item={item}
                          />
                        ))}
                        {dayItems.length > 2 && (
                          <span className="block text-[10px] font-bold text-textLight">
                            +{dayItems.length - 2} lịch
                          </span>
                        )}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-black text-primary sm:hidden">
                          {dayItems.length} lịch
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-bold text-textLight">
                <span className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-[3px] bg-[#537DA9]" aria-hidden="true" />
                  Kiểm định
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-[3px] bg-success" aria-hidden="true" />
                  Thu gom
                </span>
              </div>

              <h3 className="mt-5 border-t border-border pt-4 text-sm font-black text-text">
                Lịch ngày {formatDayKey(selectedDay)}
              </h3>
              {selectedItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-textLight">
                  Không có lịch vào ngày này.
                </p>
              ) : (
                <div className="mt-2 divide-y divide-border">
                  {selectedItems.map((item) => (
                    <div
                      key={`${item.appointmentId}-${item.viewType}`}
                      className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-start gap-3 py-3"
                    >
                      <time className="text-sm font-black tabular-nums text-text">
                        {formatVietnamTime(getScheduledAt(item))}
                      </time>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-text">
                          {getTypeLabel(item)} ·{" "}
                          {item.counterpartyName || "Người dùng HomeCycle"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-textLight">
                          {getAddress(item)}
                        </p>
                        <div className="mt-1.5">
                          <StatusBadge status={item.appointmentStatus} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(item)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-black text-primary transition hover:border-primary hover:bg-primary/10"
                      >
                        Xem lịch
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </WorkspacePanel>

            <WorkspacePanel
              title="Cơ cấu trạng thái lịch"
              description="Theo loại lịch đã chọn · không đổi khi chọn ngày"
            >
              <StatusRing
                rows={getAppointmentRingRows(rows)}
                unit="lịch hẹn"
                activeKey={status}
                onSelect={showStatus}
              />
            </WorkspacePanel>
          </div>

          <WorkspacePanel
            id={LIST_ID}
            title="Lịch đang diễn ra & lịch sử"
            description="Theo thời gian hẹn · không giới hạn theo ngày chọn trên lịch tháng"
          >
            <SegmentedControl
              label="Phạm vi lịch hẹn"
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={(value) => {
                setScope(value);
                setPageNumber(1);
              }}
            />

            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(220px,1fr)_200px_170px_auto]">
              <label className="relative min-w-0">
                <span className="sr-only">Tìm đối tác</span>
                <span
                  className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-textLight"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPageNumber(1);
                  }}
                  placeholder="Tìm theo tên đối tác"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-text outline-none focus:border-primary focus:bg-white"
                />
              </label>

              <select
                aria-label="Trạng thái lịch"
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value === "" ? "" : Number(event.target.value),
                  );
                  setPageNumber(1);
                }}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold text-textLight outline-none focus:border-primary"
              >
                <option value="">Tất cả trạng thái</option>
                {APPOINTMENT_RING_STATUSES.map(({ status: value }) => (
                  <option key={value} value={value}>
                    {getAppointmentStatusMeta(value).label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Thứ tự thời gian"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold text-textLight outline-none focus:border-primary"
              >
                <option value={APPOINTMENT_SORT.NEWEST}>Gần nhất trước</option>
                <option value={APPOINTMENT_SORT.OLDEST}>Sớm nhất trước</option>
              </select>

              {hasFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-lg px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <div className="hidden grid-cols-[150px_minmax(220px,1.5fr)_130px_minmax(150px,1fr)_96px] items-center gap-3 bg-background px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-textLight lg:grid">
                <span>Thời gian / loại</span>
                <span>Đối tác & địa điểm</span>
                <span>Trạng thái</span>
                <span>Điểm danh</span>
                <span className="sr-only">Thao tác</span>
              </div>

              {pageRows.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-textLight">
                  Không có lịch phù hợp.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {pageRows.map((item) => {
                    const checkIn = getCheckInSummary(item);

                    return (
                      <article
                        key={`${item.appointmentId}-${item.viewPerspective}-${item.viewType}`}
                        className="grid gap-2 px-4 py-3.5 transition hover:bg-background lg:grid-cols-[150px_minmax(220px,1.5fr)_130px_minmax(150px,1fr)_96px] lg:items-center lg:gap-3"
                      >
                        <div>
                          <p className="text-sm font-black tabular-nums text-text">
                            {formatScheduledAt(item)}
                          </p>
                          <p className="mt-0.5 text-xs text-textLight">
                            {getTypeLabel(item)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-text">
                            {item.counterpartyName || "Người dùng HomeCycle"}
                          </p>
                          <p
                            className="mt-0.5 truncate text-xs text-textLight"
                            title={getAddress(item)}
                          >
                            {getAddress(item)}
                          </p>
                        </div>

                        <div>
                          <StatusBadge status={item.appointmentStatus} />
                        </div>

                        <div className="text-xs">
                          {checkIn ? (
                            <>
                              <p
                                className={`font-bold ${
                                  checkIn.self ? "text-success" : "text-textLight"
                                }`}
                              >
                                Bạn {checkIn.self ? "đã" : "chưa"} điểm danh
                              </p>
                              <p className="mt-0.5 text-textLight">
                                Đối tác {checkIn.partner ? "đã" : "chưa"} điểm danh
                              </p>
                            </>
                          ) : (
                            <p className="text-textLight">Không áp dụng</p>
                          )}
                        </div>

                        <div className="lg:text-right">
                          <button
                            type="button"
                            onClick={() => onOpenDetail(item)}
                            className="rounded-lg border border-primary bg-white px-3 py-1.5 text-xs font-black text-primary transition hover:bg-primary hover:text-white"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-textLight">
                {filteredRows.length} lịch phù hợp · Trang {currentPage} / {totalPages}
              </span>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPageNumber(currentPage - 1)}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPageNumber(currentPage + 1)}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </WorkspacePanel>
        </>
      )}
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { adminAppointmentHistoryApi } from "../../../services/apis/adminHistoryApi";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  enumKey,
  formatDayKey,
  formatTime,
  pillTone,
  todayKey,
  vnDayKey,
  vnDayStartIso,
} from "./operationsPresentation";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MAX_PAGES = 5;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

// Lịch hiệu lực: không gồm đề xuất đổi lịch chưa chấp nhận và lịch cũ đã bị thay thế.
const isEffective = (item) =>
  enumKey(item.appointmentStatus, "appointment") !== "Proposed" &&
  item.cancellationReason !== "Rescheduled";

const monthKeyOf = (year, month) => `${year}-${String(month + 1).padStart(2, "0")}`;

export default function AppointmentCalendar({ onOpenHistory, onOpenDetail }) {
  const today = todayKey();
  const [cursor, setCursor] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  }));
  const [selectedDay, setSelectedDay] = useState(today);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [state, setState] = useState({ loading: true, error: "", items: [] });

  const grid = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    const weeks = Math.ceil((lead + daysInMonth) / 7);
    const start = new Date(first.getTime() - lead * 86400000);
    const days = Array.from({ length: weeks * 7 }, (_, index) => {
      const date = new Date(start.getTime() + index * 86400000);
      return { key: date.toISOString().slice(0, 10), inMonth: date.getUTCMonth() === cursor.month, day: date.getUTCDate() };
    });
    return { days, from: days[0].key, toExclusive: new Date(start.getTime() + weeks * 7 * 86400000).toISOString().slice(0, 10) };
  }, [cursor]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const collected = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const result = await adminAppointmentHistoryApi.getAppointments({
          scheduledFrom: vnDayStartIso(grid.from),
          scheduledTo: vnDayStartIso(grid.toExclusive),
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          pageNumber: page,
          pageSize: 100,
          signal: controller.signal,
        });
        collected.push(...(result.items || []));
        if (page >= (result.totalPages || 1)) break;
      }
      return collected;
    };

    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    load()
      .then((items) => setState({ loading: false, error: "", items: items.filter(isEffective) }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, error: "Không thể tải lịch hẹn của tháng này.", items: [] });
      });

    return () => controller.abort();
  }, [grid, typeFilter, statusFilter]);

  const byDay = useMemo(() => {
    const map = new Map();
    state.items.forEach((item) => {
      const key = vnDayKey(item.scheduledAt);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    map.forEach((list) => list.sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt))));
    return map;
  }, [state.items]);

  const monthKey = monthKeyOf(cursor.year, cursor.month);
  const monthCount = state.items.filter((item) => vnDayKey(item.scheduledAt).startsWith(monthKey)).length;
  const chosen = byDay.get(selectedDay) || [];

  const moveMonth = (delta) => {
    const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    setSelectedDay(`${monthKeyOf(next.getUTCFullYear(), next.getUTCMonth())}-01`);
  };

  const goToday = () => {
    setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
    setSelectedDay(today);
  };

  return (
    <section className="panel calendar-panel">
      <div className="row">
        <div>
          <h2>Lịch hẹn trên hệ thống</h2>
          <p className="muted">Lịch tháng theo ngày hẹn · Kiểm định và thu gom.</p>
        </div>
        <button type="button" className="text" onClick={() => onOpenHistory("appointments")}>
          Tra cứu lịch hẹn →
        </button>
      </div>

      <div className="calendar-toolbar">
        <div className="month">Tháng {cursor.month + 1} / {cursor.year}</div>
        <button type="button" aria-label="Tháng trước" onClick={() => moveMonth(-1)}>‹</button>
        <button type="button" onClick={goToday}>Tháng hiện tại</button>
        <button type="button" aria-label="Tháng sau" onClick={() => moveMonth(1)}>›</button>
        <select aria-label="Loại lịch" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="">Tất cả loại lịch</option>
          {Object.entries(APPOINTMENT_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select aria-label="Trạng thái lịch" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {["Scheduled", "InProgress", "Completed", "Cancelled"].map((key) => (
            <option key={key} value={key}>{APPOINTMENT_STATUS_LABELS[key]}</option>
          ))}
        </select>
      </div>

      <div className="legend">
        <span><i className="dot" />Kiểm định</span>
        <span><i className="dot collection" />Thu gom</span>
        <span>“Quá hạn”: đã qua mốc xử lý</span>
        <span>{state.loading ? "Đang tải lịch..." : `${monthCount} lịch trong tháng theo bộ lọc`}</span>
      </div>

      {state.error && <div className="notice error" role="alert">{state.error}</div>}

      <div className="calendar-layout">
        <div>
          <div className="calendar">
            {WEEKDAYS.map((label) => <div className="weekday" key={label}>{label}</div>)}
            {grid.days.map(({ key, inMonth, day }) => {
              const items = byDay.get(key) || [];
              const classes = ["day", inMonth ? "" : "outside", key === today ? "today" : "", key === selectedDay ? "chosen" : ""]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  type="button"
                  key={key}
                  className={classes}
                  aria-label={`${formatDayKey(key)}, ${items.length} lịch hẹn`}
                  onClick={() => setSelectedDay(key)}
                >
                  <span className="date">{day}</span>
                  {items.slice(0, 2).map((item) => {
                    const status = enumKey(item.appointmentStatus, "appointment");
                    const type = enumKey(item.appointmentType, "appointmentType");
                    const eventClass = [
                      "event",
                      type === "Collection" ? "collection" : "",
                      item.isOverdue ? "late" : "",
                      status === "Completed" || status === "Cancelled" ? "ended" : "",
                    ].filter(Boolean).join(" ");
                    return (
                      <span className={eventClass} key={item.appointmentId}>
                        {formatTime(item.scheduledAt)}{" "}
                        {item.isOverdue ? "Quá hạn · " : status === "Cancelled" ? "Hủy · " : ""}
                        {APPOINTMENT_TYPE_LABELS[type] || "Lịch hẹn"}
                      </span>
                    );
                  })}
                  {items.length > 2 && <span className="eventmore">+{items.length - 2} lịch</span>}
                </button>
              );
            })}
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            Chỉ hiển thị lịch hiệu lực; loại đề xuất đổi lịch chưa chấp nhận và lịch cũ đã thay thế. Chọn ngày để xem đầy đủ.
          </p>
        </div>

        <aside className="day-detail" aria-live="polite">
          <h3>{formatDayKey(selectedDay)}{selectedDay === today ? " · Hôm nay" : ""}</h3>
          <p className="muted">{chosen.length} lịch theo bộ lọc</p>
          {chosen.length === 0 ? (
            <div className="empty">Không có lịch hẹn.</div>
          ) : (
            chosen.map((item) => {
              const status = enumKey(item.appointmentStatus, "appointment");
              const type = enumKey(item.appointmentType, "appointmentType");
              return (
                <div className="scheduleitem" key={item.appointmentId}>
                  <span className={`pill${item.isOverdue ? " red" : ""}`}>
                    {formatTime(item.scheduledAt)} · {APPOINTMENT_TYPE_LABELS[type] || "Lịch hẹn"}
                  </span>
                  <strong>{item.productName || "Sản phẩm HomeCycle"}</strong>
                  <span className="muted">{item.orderCode || "Chưa có mã đơn"}</span>
                  <p>
                    <span className={`pill ${pillTone(status)}`}>{APPOINTMENT_STATUS_LABELS[status] || "Chưa xác định"}</span>
                    {item.isOverdue && <> <span className="pill red">Quá hạn</span></>}
                  </p>
                  {item.location && <p className="muted">{item.location}</p>}
                  <button type="button" className="text" onClick={() => onOpenDetail("appointment", item)}>
                    Xem chi tiết →
                  </button>
                </div>
              );
            })
          )}
        </aside>
      </div>
    </section>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { ROLES, STATUSES, countBy, percent } from "./userAdminPresentation";

const fmt = (value) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const dayLabel = (value, offset = 0) => {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};
const isCanceled = (error) => error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

function BarRow({ label, count, total, color }) {
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <strong>{fmt(count)} tài khoản</strong>
      </div>
      <div className="bar">
        <i style={{ width: `${total ? (count / total) * 100 : 0}%`, background: color }} aria-hidden="true" />
      </div>
      <span className="num">{percent(count, total)}</span>
    </div>
  );
}

function TrendChart({ previous, current, previousStart, currentStart }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const days = Math.max(current.length, 2);
  const h = 235;
  const left = 34;
  const right = 14;
  const top = 15;
  const bottom = 30;
  const max = Math.max(1, ...previous, ...current);
  const ceiling = Math.ceil(max / 2) * 2;
  const x = (index) => left + (index * (width - left - right)) / (days - 1);
  const y = (value) => h - bottom - (value / ceiling) * (h - top - bottom);
  const sum = (values) => values.reduce((total, value) => total + value, 0);

  return (
    <div ref={ref}>
      <svg className="chart" viewBox={`0 0 ${width} ${h}`} role="img" aria-label={`Đăng ký mới, kỳ trước ${sum(previous)}, kỳ hiện tại ${sum(current)}`}>
        {[0, ceiling / 2, ceiling].map((value) => (
          <g key={value}>
            <line className="gridline" x1={left} y1={y(value)} x2={width - right} y2={y(value)} />
            <text x={left - 8} y={y(value) + 4} textAnchor="end">{value}</text>
          </g>
        ))}
        {[
          [previous, "previous", "Kỳ trước", previousStart],
          [current, "", "Kỳ hiện tại", currentStart],
        ].map(([values, className, name, start]) => (
          <g key={name}>
            <path className={className} d={values.map((value, index) => `${index ? "L" : "M"}${x(index)},${y(value)}`).join(" ")} />
            {values.map((value, index) =>
              value > 0 ? (
                <circle key={index} className={className} cx={x(index)} cy={y(value)} r="3">
                  <title>{`${name} · ${dayLabel(start, index)}: ${value} đăng ký`}</title>
                </circle>
              ) : null,
            )}
          </g>
        ))}
        {[0, Math.floor((days - 1) / 2), days - 1].map((index, position) => (
          <text key={position} x={x(index)} y={h - 7} textAnchor={position === 0 ? "start" : position === 2 ? "end" : "middle"}>
            Ngày {index + 1}
          </text>
        ))}
      </svg>
    </div>
  );
}

function RegistrationTrend() {
  const [days, setDays] = useState(30);
  const [forecastDays, setForecastDays] = useState(7);
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => setState((current) => ({ ...current, loading: true, error: "" })));
    adminDashboardApi
      .getRegistrationTrend({ days, forecastDays, signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (!isCanceled(error)) setState({ loading: false, data: null, error: "Không thể tải xu hướng đăng ký." });
      });
    return () => controller.abort();
  }, [days, forecastDays]);

  const data = state.data;
  const daily = (Array.isArray(data?.dailyRegistrations) ? data.dailyRegistrations : []).map((item) => Number(item.count) || 0);
  const previous = daily.slice(0, days);
  const current = daily.slice(days, days * 2);
  const before = Number(data?.previousPeriodRegistrations) || 0;
  const now = Number(data?.currentPeriodRegistrations) || 0;
  const change = Number(data?.registrationChange) || now - before;
  const growth = data?.growthPercent;

  let direction = "Không thay đổi";
  if (growth === null || growth === undefined) {
    direction = now === 0 && before === 0 ? "Không thay đổi" : "Kỳ trước = 0 · không tính % tăng trưởng";
  } else if (Number(growth) !== 0) {
    direction = `${Number(growth) < 0 ? "Giảm" : "Tăng"} ${fmt(Math.abs(Number(growth)))}% so với kỳ trước`;
  }

  return (
    <section className="panel trend">
      <div className="panel-header">
        <div>
          <h2>Đăng ký mới theo ngày</h2>
          <p className="muted">So sánh hai kỳ cùng độ dài · không gồm hôm nay</p>
        </div>
        <div className="trend-tools">
          <label>
            Kỳ thống kê
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              {[7, 14, 30].map((value) => <option key={value} value={value}>{value} ngày</option>)}
            </select>
          </label>
          <label>
            Ước tính tiếp theo
            <select value={forecastDays} onChange={(event) => setForecastDays(Number(event.target.value))}>
              {[7, 14, 30].map((value) => <option key={value} value={value}>{value} ngày</option>)}
            </select>
          </label>
        </div>
      </div>

      {state.error && <div className="empty">{state.error}</div>}
      {!state.error && !data && <div className="empty">Đang tải dữ liệu...</div>}
      {!state.error && data && (
        <>
          <div className="trend-metrics" style={{ opacity: state.loading ? 0.5 : 1 }}>
            {[
              ["Kỳ trước", fmt(before)],
              ["Kỳ hiện tại", fmt(now)],
              ["Thay đổi", `${change > 0 ? "+" : ""}${fmt(change)}`],
              ["Trung bình / ngày", fmt(data.averageDailyRegistrations)],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="muted">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="legend">
            <span><i className="dot secondary" />Kỳ trước {dayLabel(data.previousPeriodStart)}–{dayLabel(data.currentPeriodStart, -1)} · nét đứt</span>
            <span><i className="dot" />Kỳ hiện tại {dayLabel(data.currentPeriodStart)}–{dayLabel(data.currentPeriodEndExclusive, -1)} · nét liền</span>
          </div>
          <TrendChart previous={previous} current={current} previousStart={data.previousPeriodStart} currentStart={data.currentPeriodStart} />
          <div className="snapshot" style={{ margin: "10px 0 0" }}>
            <span>Trục ngang: ngày thứ n trong kỳ · Trục dọc: số đăng ký</span>
            <span>{direction}</span>
          </div>
          <p className="section-note">
            Ước tính {fmt(data.forecast?.estimatedRegistrations)} đăng ký trong {data.forecast?.days || forecastDays} ngày tiếp theo, từ trung bình kỳ gần nhất; không phải mục tiêu cam kết.
          </p>
        </>
      )}
    </section>
  );
}

export default function UsersOverviewTab() {
  const [state, setState] = useState({ loading: true, all: null, personal: null, business: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    Promise.all([
      adminDashboardApi.getUserOverview({ signal }),
      adminDashboardApi.getUserOverview({ role: "Personal", signal }).catch(() => null),
      adminDashboardApi.getUserOverview({ role: "Business", signal }).catch(() => null),
    ])
      .then(([all, personal, business]) => {
        if (signal.aborted) return;
        setState({ loading: false, all, personal, business, error: "" });
      })
      .catch((error) => {
        if (!isCanceled(error)) setState((current) => ({ ...current, loading: false, error: "Không thể tải thống kê người dùng." }));
      });
    return () => controller.abort();
  }, []);

  const { all, personal, business } = state;
  const total = Number(all?.totalAccounts) || 0;
  const pendingCustomers =
    countBy(personal?.byStatus, "status", "Pending", 0) + countBy(business?.byStatus, "status", "Pending", 0);
  const suspended = Number(all?.suspendedAccounts) || countBy(all?.byStatus, "status", "Suspended", 2);

  return (
    <section>
      <div className="heading">
        <div>
          <h1>Tổng quan người dùng</h1>
          <p className="muted">Thống kê cả 4 vai trò: Cá nhân, Doanh nghiệp, Kiểm duyệt viên và Quản trị viên.</p>
        </div>
      </div>

      {state.error && <div className="empty">{state.error}</div>}
      {!state.error && (
        <>
          <div className="kpis" aria-live="polite">
            <article className="kpi">
              <p className="muted">Tổng tài khoản</p>
              <span className="value">{state.loading ? "…" : fmt(total)}</span>
              <p className="muted">Tất cả vai trò và trạng thái</p>
            </article>
            <article className="kpi pending">
              <p className="muted">Tài khoản khách hàng chờ kích hoạt</p>
              <span className="value">{state.loading ? "…" : fmt(pendingCustomers)}</span>
            </article>
            <article className="kpi suspended">
              <p className="muted">Đang tạm khóa</p>
              <span className="value">{state.loading ? "…" : fmt(suspended)}</span>
              <p className="muted">Tài khoản hiện đang bị tạm khóa</p>
            </article>
          </div>

          <div className="two-col">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Tài khoản theo vai trò</h2>
                  <p className="muted">Số tài khoản · tỷ lệ trên toàn hệ thống</p>
                </div>
              </div>
              {ROLES.map(([role, label], index) => (
                <BarRow key={role} label={label} count={countBy(all?.byRole, "role", role, index + 1)} total={total} color="var(--teal)" />
              ))}
            </section>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Tài khoản theo trạng thái</h2>
                  <p className="muted">Số tài khoản · tỷ lệ trên toàn hệ thống</p>
                </div>
              </div>
              {STATUSES.map(([status, label, color], index) => (
                <BarRow key={status} label={label} count={countBy(all?.byStatus, "status", status, index)} total={total} color={color} />
              ))}
              <p className="section-note">“Đang hoạt động” là trạng thái tài khoản; bao gồm tài khoản đã xóa mềm trong tổng.</p>
            </section>
          </div>
        </>
      )}

      <RegistrationTrend />
    </section>
  );
}

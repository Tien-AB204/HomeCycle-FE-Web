import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { completedPeriod, formatDayKey } from "../operations/operationsPresentation";
import { money } from "./subscriptionPackageModel";

const num = (value) => Number(value || 0).toLocaleString("vi-VN");
const isCanceled = (error) => error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

function Ranking({ rows, moneyMode = false }) {
  if (!rows.length) return <div className="no-data">Chưa có dữ liệu.</div>;
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(1, ...rows.map((row) => row.value));
  return rows.map((row) => (
    <div key={row.id}>
      <div className="bar-title">
        <span>{row.name}</span>
        <strong>{moneyMode ? money(row.value) : `${num(row.value)} tài khoản`}</strong>
      </div>
      <div className="plain-track"><i style={{ width: `${(row.value / max) * 100}%` }} /></div>
      {moneyMode && (
        <p className="note">
          {total ? `${((row.value / total) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% doanh thu trong kỳ` : "Chưa có doanh thu trong kỳ"}
        </p>
      )}
    </div>
  ));
}

function RevenueChart({ bins }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!bins.length) return <div ref={ref} className="no-data">Chưa có dữ liệu trong kỳ.</div>;

  const h = 230;
  const left = 65;
  const right = 20;
  const top = 15;
  const bottom = 40;
  const max = Math.max(10000, ...bins.map((bin) => bin.value));
  const ceiling = Math.ceil(max / 10000) * 10000;
  const slot = (width - left - right) / bins.length;
  const y = (value) => h - bottom - (value / ceiling) * (h - bottom - top);
  const barWidth = Math.min(45, slot * 0.65);
  const ticks =
    bins.length <= 6
      ? bins.map((_, index) => index)
      : [...new Set([0, Math.floor((bins.length - 1) / 3), Math.floor(((bins.length - 1) * 2) / 3), bins.length - 1])];

  return (
    <div ref={ref}>
      <svg className="chart" viewBox={`0 0 ${width} ${h}`} role="img" aria-label="Doanh thu gói theo thời gian">
        {[0, ceiling / 2, ceiling].map((value) => (
          <g key={value}>
            <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="var(--line)" />
            <text x={left - 9} y={y(value) + 4} textAnchor="end">{num(value)}</text>
          </g>
        ))}
        {bins.map((bin, index) => (
          <rect key={bin.from} x={left + slot * (index + 0.5) - barWidth / 2} y={y(bin.value)} width={barWidth} height={h - bottom - y(bin.value)} rx="3" fill="var(--green)">
            <title>{`${formatDayKey(bin.from)} → trước ${formatDayKey(bin.to)}: ${money(bin.value)}`}</title>
          </rect>
        ))}
        {ticks.map((index) => (
          <text key={index} x={left + slot * (index + 0.5)} y={h - 12} textAnchor="middle">
            {`${bins[index].from.slice(8, 10)}/${bins[index].from.slice(5, 7)}`}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function SubscriptionStatsTab() {
  const [days, setDays] = useState(30);
  const [group, setGroup] = useState("Week");
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const period = useMemo(() => completedPeriod(days), [days]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => setState((current) => ({ ...current, loading: true, error: "" })));
    adminDashboardApi
      .getSubscriptionDashboard({ from: period.from, to: period.to, groupBy: group, signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (!isCanceled(error)) setState({ loading: false, data: null, error: "Không thể tải thống kê gói đăng ký lúc này." });
      });
    return () => controller.abort();
  }, [period, group]);

  const data = state.data;
  const packages = Array.isArray(data?.packages) ? data.packages : [];
  const purchases = packages.reduce((sum, item) => sum + (Number(item.paidSubscriptions) || 0), 0);
  const revenue = Number(data?.revenue) || 0;
  const bins = (Array.isArray(data?.revenueSeries) ? data.revenueSeries : []).map((point) => ({
    from: String(point.from).slice(0, 10),
    to: String(point.toExclusive).slice(0, 10),
    value: Number(point.amount) || 0,
  }));

  return (
    <section>
      <p className="scope">Thống kê gói Doanh nghiệp. Hệ thống chưa tách số liệu riêng cho gói Cá nhân.</p>
      {state.error && <div className="no-data">{state.error}</div>}
      {!state.error && !data && <div className="no-data">Đang tải dữ liệu...</div>}
      {data && (
        <div style={{ opacity: state.loading ? 0.55 : 1 }}>
          <div className="stats">
            <article className="metric">
              <p className="label">Doanh nghiệp đang dùng gói</p>
              <div className="value">{num(data.activeBusinessCount)}</div>
              <p className="caption">Tài khoản có gói còn hiệu lực tại thời điểm xem</p>
            </article>
            <article className="metric blue">
              <p className="label">Lượt mua gói trong kỳ</p>
              <div className="value">{num(purchases)}</div>
              <p className="caption">Lượt đăng ký đã thanh toán thành công trong kỳ</p>
            </article>
            <article className="metric">
              <p className="label">Doanh thu gói trong kỳ</p>
              <div className="value">{money(revenue)}</div>
              <p className="caption">Phí gói đã ghi nhận vào ví doanh thu nền tảng</p>
            </article>
          </div>

          <div className="periodbar">
            <label>
              Kỳ thống kê
              <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                <option value={30}>30 ngày đã hoàn tất</option>
                <option value={7}>7 ngày đã hoàn tất</option>
              </select>
            </label>
            <label>
              Gom biểu đồ
              <select value={group} onChange={(event) => setGroup(event.target.value)}>
                <option value="Week">Theo tuần</option>
                <option value="Day">Theo ngày</option>
              </select>
            </label>
            <span className="muted">{formatDayKey(period.from)} → trước {formatDayKey(period.to)} · UTC+7</span>
          </div>

          <div className="grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Doanh nghiệp đang dùng theo gói</h2>
                  <p className="muted">Tài khoản có gói còn hiệu lực · mỗi tài khoản tính một lần trong từng gói</p>
                </div>
              </div>
              <Ranking rows={packages.map((item) => ({ id: item.packageId, name: item.name, value: Number(item.activeBusinessCount) || 0 }))} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Doanh thu theo gói</h2>
                  <p className="muted">Tỷ trọng doanh thu trong kỳ đã chọn</p>
                </div>
              </div>
              <Ranking moneyMode rows={packages.map((item) => ({ id: item.packageId, name: item.name, value: Number(item.revenue) || 0 }))} />
            </section>
          </div>

          <section className="panel trend-panel">
            <div className="panel-head">
              <div>
                <h2>Doanh thu gói theo thời gian</h2>
                <p className="muted">Phí đã thanh toán thành công vào ví doanh thu nền tảng</p>
              </div>
            </div>
            <RevenueChart bins={bins} />
            <div className="chart-caption">
              <span>Đơn vị: đồng · UTC+7</span>
              <span>{revenue ? `Tổng ${money(revenue)}` : "Không có phí gói được ghi nhận trong kỳ"}</span>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { TRANSACTION_TYPE_LABELS } from "../../finance/financePresentation";
import {
  completedPeriod,
  countOf,
  formatDayKey,
  shiftDayKey,
} from "../operations/operationsPresentation";
import { formatCompact, millions, money } from "./financeFormat";

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const INFLOW_LABELS = {
  DepositPayment: "Đặt cọc",
  FullPaymentExcludingGhn: "Thanh toán toàn bộ, không gồm GHN",
  GhnShippingCollected: "Phí GHN đã thu",
  SubscriptionPayment: "Thanh toán gói bằng PayOS",
  OtherPayOs: "Khoản PayOS khác",
};

const MOVEMENT_LABELS = {
  OrderRefundOrderFlow: "Hoàn tiền cho người mua",
  OrderRefundAfterDispute: "Hoàn tiền sau tranh chấp",
  PayoutReleaseNormal: "Giải ngân cho người bán",
  PayoutReleaseAfterDispute: "Giải ngân sau tranh chấp",
};

const PAYMENT_METHOD_NAMES = { PayOS: "PayOS", Internal_Wallet: "Ví nội bộ", Unknown: "Chưa xác định", Unspecified: "Chưa xác định" };

const PAYMENT_STATES = [
  ["Pending", "Chờ thanh toán", "var(--amber)"],
  ["Completed", "Đã hoàn tất", "#2f7b64"],
  ["Failed", "Thất bại", "var(--red)"],
  ["Refunded", "Đã hoàn tiền", "var(--blue)"],
  ["PartiallyRefunded", "Hoàn tiền một phần", "var(--teal)"],
  ["Expired", "Đã hết hạn", "#8a969d"],
  ["Cancelled", "Đã hủy", "var(--red)"],
];

function FlowChart({ series }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(600);

  useLayoutEffect(() => {
    const element = boxRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(245, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = 235;
  const left = 38;
  const right = 12;
  const top = 26;
  const bottom = 35;
  const inflow = series.map((point) => millions(point.inflow));
  const outflow = series.map((point) => millions(point.outflow));
  const max = Math.max(0.1, ...inflow, ...outflow);
  const ceiling = Math.ceil(max * 2) / 2;
  const plot = width - left - right;
  const step = series.length ? plot / series.length : plot;
  const barWidth = Math.max(2, Math.min(24, (step - 8) / 2));
  const y = (value) => height - bottom - (value / ceiling) * (height - top - bottom);
  const stride = Math.max(1, Math.ceil(series.length / (width < 420 ? 3 : 6)));

  return (
    <div ref={boxRef}>
      {series.length === 0 ? (
        <div className="empty">Chưa có dữ liệu trong kỳ.</div>
      ) : (
        <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tiền vào và tiền ra bên ngoài theo kỳ">
          <text x={left} y="13">Triệu ₫</text>
          {[0, ceiling / 2, ceiling].map((value) => (
            <g key={value}>
              <line className="grid" x1={left} y1={y(value)} x2={width - right} y2={y(value)} />
              <text x={left - 7} y={y(value) + 4} textAnchor="end">{formatCompact(value)}</text>
            </g>
          ))}
          {series.map((point, index) => (
            <g key={point.from}>
              {[[inflow[index], "var(--teal)", "Tiền vào"], [outflow[index], "var(--blue)", "Tiền ra"]].map(([value, color, label], column) => {
                const x = left + (index + 0.5) * step + (column - 1) * barWidth;
                return (
                  <g key={label}>
                    <rect x={x} y={y(value)} width={Math.max(1, barWidth - 2)} height={(value / ceiling) * (height - top - bottom)} rx="2" fill={color}>
                      <title>{`${formatDayKey(point.from)} → trước ${formatDayKey(point.toExclusive)}: ${label} ${money(Math.round(value * 1000000))}`}</title>
                    </rect>
                    {series.length <= 6 && value > 0 && (
                      <text x={x + barWidth / 2 - 1} y={y(value) - 6} textAnchor="middle">{formatCompact(value)}</text>
                    )}
                  </g>
                );
              })}
              {index % stride === 0 && (
                <text x={left + (index + 0.5) * step} y={height - 10} textAnchor="middle">{formatDayKey(point.from).slice(0, 5)}</text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

function AmountBars({ rows }) {
  const visible = rows.filter((row) => Number(row.amount) > 0);
  if (!visible.length) return <div className="empty">Chưa có dữ liệu trong kỳ.</div>;
  const max = Math.max(1, ...visible.map((row) => Number(row.amount)));
  return visible.map((row) => (
    <div className="finance-barrow" key={row.key}>
      <span>{row.label}</span>
      <div className="bar-track"><i style={{ width: `${(Number(row.amount) / max) * 100}%` }} /></div>
      <span className="num">{money(row.amount)}</span>
    </div>
  ));
}

export default function FinanceActivityTab() {
  const [periodDays, setPeriodDays] = useState(30);
  const [groupBy, setGroupBy] = useState("Week");
  const [state, setState] = useState({ loading: true, error: "", overview: null, cashFlow: null, revenue: null, payments: null });
  const period = useMemo(() => completedPeriod(periodDays), [periodDays]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const params = { from: period.from, to: period.to, signal };
    void Promise.resolve().then(() => setState((current) => ({ ...current, loading: true, error: "" })));
    Promise.all([
      adminDashboardApi.getFinanceOverview(params),
      adminDashboardApi.getFinanceCashFlow({ ...params, groupBy }),
      adminDashboardApi.getFinanceRevenue(params),
      adminDashboardApi.getPayments({ signal }).catch(() => null),
    ])
      .then(([overview, cashFlow, revenue, payments]) =>
        setState({ loading: false, error: "", overview, cashFlow, revenue, payments }),
      )
      .catch((error) => {
        if (isCanceled(error)) return;
        setState((current) => ({ ...current, loading: false, error: "Không thể tải số liệu tài chính trong kỳ." }));
      });
    return () => controller.abort();
  }, [period, groupBy]);

  const activity = state.overview?.activity || {};
  const inflowSources = Array.isArray(state.cashFlow?.inflowSources) ? state.cashFlow.inflowSources : [];
  const movements = Array.isArray(state.cashFlow?.internalMovements) ? state.cashFlow.internalMovements : [];
  const series = Array.isArray(state.cashFlow?.series) ? state.cashFlow.series : [];
  const totalRevenue = Number(state.revenue?.totalRevenue) || 0;
  const revenuePayOs = Number(inflowSources.find((item) => item.key === "SubscriptionPayment")?.amount) || 0;
  const methods = Array.isArray(state.payments?.paymentMethodPerformance) ? state.payments.paymentMethodPerformance : [];
  const statusDistribution = state.payments?.currentStatusDistribution;
  const paymentTotal = PAYMENT_STATES.reduce((sum, [key]) => sum + countOf(statusDistribution, key), 0);

  const donutStops = PAYMENT_STATES.reduce(
    (result, [key, , color]) => {
      const count = countOf(statusDistribution, key);
      if (!count || !paymentTotal) return result;
      const to = result.angle + (count / paymentTotal) * 360;
      return { angle: to, stops: [...result.stops, `${color} ${result.angle}deg ${to}deg`] };
    },
    { angle: 0, stops: [] },
  ).stops;

  return (
    <section>
      <div className="section-title">
        <h2>Dòng tiền & doanh thu trong kỳ</h2>
        <span className="muted">Ngày nghiệp vụ · UTC+7</span>
      </div>
      <div className="period">
        <label>
          Kỳ báo cáo
          <select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))}>
            <option value={30}>30 ngày đã hoàn tất</option>
            <option value={7}>7 ngày đã hoàn tất</option>
          </select>
        </label>
        <label>
          Nhóm biểu đồ
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
            <option value="Week">Theo tuần</option>
            <option value="Day">Theo ngày</option>
          </select>
        </label>
        <span className="muted">Không thay đổi số dư ở tab Tổng quan</span>
      </div>
      <p className="period-caption">
        {formatDayKey(period.from)} → trước {formatDayKey(period.to)} · {periodDays} ngày hoàn tất
        {state.loading ? " · Đang tải..." : ""}
      </p>
      {state.error && <div className="notice error">{state.error}</div>}

      <div className="kpis financial-kpis">
        {[
          ["Tiền vào bên ngoài", activity.externalInflow, "Tiền người dùng trả qua PayOS trong kỳ: đặt cọc, thanh toán đơn (gồm phí GHN) và gói dịch vụ."],
          ["Tiền ra bên ngoài", activity.externalOutflow, "Tiền đã chuyển ra ngoài cho người dùng từ các yêu cầu rút hoàn tất trong kỳ."],
          ["Doanh thu nền tảng", totalRevenue, "Phí gói dịch vụ đã ghi nhận trong kỳ, gồm trả qua PayOS và ví nội bộ."],
        ].map(([label, value, caption]) => (
          <article className="kpi" key={label}>
            <p className="muted">{label}</p>
            <strong className="value">{money(value)}</strong>
            <p className="muted">{caption}</p>
          </article>
        ))}
      </div>

      <div className="payment-strip">
        <article className="payment-card">
          <p className="payment-label">Thanh toán thành công</p>
          <strong className="payment-value">{money(activity.processedPaymentAmount)}</strong>
          <p className="muted">Tổng thanh toán thành công qua PayOS và ví nội bộ trong kỳ; gồm khoản sau đó đã hoàn tiền.</p>
        </article>
        <article className="payment-card">
          <p className="payment-label">Hoàn tiền vào ví</p>
          <strong className="payment-value">{money(activity.refundedAmount)}</strong>
          <p className="muted">Tiền hoàn cho người mua vào ví HomeCycle trong kỳ. Đây là dịch chuyển nội bộ.</p>
        </article>
        <article className="payment-card">
          <p className="payment-label">Thanh toán thất bại</p>
          <strong className="payment-value">{money(activity.createdFailedPaymentAmount)}</strong>
          <p className="muted">Giá trị yêu cầu thanh toán tạo trong kỳ và hiện có trạng thái thất bại; không phải tiền đã chi.</p>
        </article>
      </div>

      <div className="split">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Tiền vào / tiền ra bên ngoài</h2>
              <p className="muted">Đơn vị: triệu đồng · theo ngày hoàn tất</p>
            </div>
          </div>
          <div className="legend">
            <span><i className="dot" />Tiền vào PayOS</span>
            <span><i className="dot blue" />Rút tiền đã hoàn tất</span>
          </div>
          <FlowChart series={series} />
          <p className="footnote">Hoàn tiền vào ví và giải ngân cho người bán là dịch chuyển nội bộ, không nằm trong tiền ra bên ngoài.</p>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Doanh thu nền tảng</h2>
              <p className="muted">Phí gói dịch vụ đã ghi nhận trong kỳ</p>
            </div>
          </div>
          <div className="revenue-amount">{money(totalRevenue)}</div>
          <div className="summaryrow"><span>Thanh toán gói bằng PayOS</span><strong>{money(revenuePayOs)}</strong></div>
          <div className="summaryrow"><span>Thanh toán gói bằng ví</span><strong>{money(Math.max(totalRevenue - revenuePayOs, 0))}</strong></div>
          <div className="notice-warn">Không tính phí GHN, ký quỹ đơn, tiền người dùng hoặc GMV vào doanh thu nền tảng.</div>
          <p className="footnote">Tiền vào/ra và doanh thu có phạm vi khác nhau; không cộng chúng thành tổng thu nhập.</p>
        </section>
      </div>

      <div className="split payment-analysis">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Thanh toán theo phương thức</h2>
              <p className="muted">Toàn bộ thanh toán hiện có · không phụ thuộc kỳ báo cáo</p>
            </div>
          </div>
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th>Phương thức</th><th className="num">Tổng</th><th className="num">Đã thanh toán</th><th className="num">Thất bại</th><th className="num">Tỷ lệ</th></tr>
              </thead>
              <tbody>
                {methods.length === 0 ? (
                  <tr><td colSpan={5} className="empty">Chưa có thanh toán.</td></tr>
                ) : (
                  methods.map((item) => (
                    <tr key={item.method}>
                      <td><strong>{PAYMENT_METHOD_NAMES[item.method] || item.method}</strong></td>
                      <td className="num">{item.totalCount}</td>
                      <td className="num">{item.paidCount}</td>
                      <td className="num">{item.failedCount}</td>
                      <td className="num">{item.successRate === null || item.successRate === undefined ? "—" : `${formatCompact(item.successRate)}%`}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="footnote">Tỷ lệ = đã thanh toán / (đã thanh toán + thất bại). “Đã thanh toán” gồm khoản có thời điểm thanh toán, kể cả sau đó hoàn tiền.</p>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Thanh toán theo trạng thái</h2>
              <p className="muted">Trạng thái hiện tại · không phụ thuộc kỳ báo cáo</p>
            </div>
          </div>
          <div className="payment-donut-layout">
            <div
              className="payment-donut"
              role="img"
              aria-label={`${paymentTotal} thanh toán`}
              style={{ background: donutStops.length ? `conic-gradient(${donutStops.join(",")})` : "#edf1f3" }}
            >
              <div><strong>{paymentTotal}</strong><span>thanh toán</span></div>
            </div>
            <div className="payment-state-list">
              {PAYMENT_STATES.map(([key, label, color]) => {
                const count = countOf(statusDistribution, key);
                return (
                  <div key={key}>
                    <span><i style={{ background: color }} />{label}</span>
                    <strong>{count}</strong>
                    <small>{paymentTotal ? `${formatCompact((count / paymentTotal) * 100)}%` : "0%"}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <details className="panel">
        <summary>Phân tích nguồn tiền vào & dịch chuyển nội bộ</summary>
        <div className="split">
          <section>
            <h3>Nguồn tiền vào bên ngoài</h3>
            <AmountBars rows={inflowSources.map((item) => ({ key: item.key, label: INFLOW_LABELS[item.key] || item.label, amount: item.amount }))} />
            <p className="footnote">Phí GHN đã nằm trong tổng tiền vào. Phí gói tại đây chỉ là phần trả bằng PayOS.</p>
          </section>
          <section>
            <h3>Dịch chuyển bên trong HomeCycle</h3>
            <AmountBars
              rows={movements.map((item) => ({
                key: item.key,
                label: MOVEMENT_LABELS[item.key] || TRANSACTION_TYPE_LABELS[item.key] || item.label,
                amount: item.amount,
              }))}
            />
          </section>
        </div>
      </details>

      <p className="page-end">Kỳ {formatDayKey(period.from)} – {formatDayKey(shiftDayKey(period.to, -1))}; số liệu từ hệ thống.</p>
    </section>
  );
}

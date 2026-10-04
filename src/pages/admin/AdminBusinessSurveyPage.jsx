import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/admin/redesign/hc-business.css";
import { completedPeriod, formatDayKey } from "../../features/admin/operations/operationsPresentation";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const MODELS = [
  ["HouseholdBusiness", "Hộ kinh doanh"],
  ["Enterprise", "Doanh nghiệp"],
];
const PROFILE_STATUSES = [
  ["Pending", "Chờ duyệt", "var(--amber)"],
  ["Approved", "Đã duyệt", "var(--green)"],
  ["Rejected", "Đã từ chối", "var(--red)"],
];
const ACCOUNT_STATUSES = [
  ["Active", "Đang hoạt động"],
  ["Pending", "Chờ kích hoạt"],
  ["Suspended", "Tạm khóa"],
  ["Deleted", "Đã xóa"],
];
const EMPTY_FILTERS = { businessModel: "", profileStatus: "", userStatus: "" };
const ORDER_DAYS = 30;

const num = (value) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const pct = (count, total) => (total ? `${num((count / total) * 100)}%` : "—");
const isCanceled = (error) => error?.name === "CanceledError" || error?.code === "ERR_CANCELED";
const countOf = (items, key) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => String(item?.key).toLowerCase() === key.toLowerCase())
    .reduce((sum, item) => sum + (Number(item?.count) || 0), 0);
const formatStamp = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

function Bars({ rows, denominator, color = "var(--green)" }) {
  if (!rows.length) return <div className="empty">Chưa có dữ liệu trong phạm vi đang chọn.</div>;
  return rows.map((row) => (
    <div className="barrow" key={row.key}>
      <div className="barlabel">
        <span>{row.label}</span>
        <span className="num">{num(row.count)} hồ sơ</span>
      </div>
      <div className="bar">
        <i style={{ width: `${denominator ? (row.count / denominator) * 100 : 0}%`, background: row.color || color }} />
      </div>
      <span className="barpercent">{pct(row.count, denominator)}</span>
    </div>
  ));
}

function Basis({ group, total }) {
  return (
    <div className="basis">
      <span>Có dữ liệu <strong>{num(group?.respondentCount)}/{num(total)}</strong></span>
      <span>Thiếu <strong>{num(group?.missingResponseCount)}</strong></span>
      <span>Không hợp lệ <strong>{num(group?.invalidResponseBusinessCount)}</strong></span>
    </div>
  );
}

const demandRows = (group) =>
  (Array.isArray(group?.items) ? group.items : [])
    .map((item) => ({ key: item.key, label: item.label || item.key, count: Number(item.businessCount) || 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));

function GrowthChart({ series }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(250, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!series.length) return <div ref={ref} className="empty">Chưa có dữ liệu trong kỳ.</div>;

  const h = 215;
  const l = 35;
  const r = 12;
  const t = 20;
  const b = 30;
  const values = series.map((bin) => Number(bin.registeredCount) || 0);
  const ceiling = Math.max(1, ...values);
  const gap = (width - l - r) / series.length;
  const y = (value) => h - b - (value / ceiling) * (h - t - b);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div ref={ref}>
      <svg className="chart" viewBox={`0 0 ${width} ${h}`} role="img" aria-label={`${total} tài khoản doanh nghiệp đăng ký trong kỳ`}>
        <text x={l} y="12">Tài khoản</text>
        {[0, ceiling].map((value) => (
          <g key={value}>
            <line className="grid" x1={l} y1={y(value)} x2={width - r} y2={y(value)} />
            <text x={l - 8} y={y(value) + 4} textAnchor="end">{value}</text>
          </g>
        ))}
        {series.map((bin, index) => {
          const x = l + gap * (index + 0.5);
          const barWidth = Math.min(34, gap * 0.5);
          const value = values[index];
          const from = String(bin.from).slice(0, 10);
          return (
            <g key={from}>
              <rect x={x - barWidth / 2} y={y(value)} width={barWidth} height={(value / ceiling) * (h - t - b)} rx="3" fill="var(--blue)">
                <title>{`${formatDayKey(from)} → trước ${formatDayKey(String(bin.toExclusive).slice(0, 10))}: ${value} đăng ký`}</title>
              </rect>
              <text x={x} y={h - 9} textAnchor="middle">{`${from.slice(8, 10)}/${from.slice(5, 7)}`}</text>
              {value > 0 && <text x={x} y={y(value) - 6} textAnchor="middle">{value}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AdminBusinessSurveyPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [growthDays, setGrowthDays] = useState(30);
  const [state, setState] = useState({ loading: true, overview: null, demand: null, error: "" });
  const [orders, setOrders] = useState({ loading: true, data: null });
  const surveyRef = useRef(null);
  const growthPeriod = useMemo(() => completedPeriod(growthDays), [growthDays]);
  const orderPeriod = useMemo(() => completedPeriod(ORDER_DAYS), []);

  useEffect(() => {
    const controller = new AbortController();
    const params = {
      businessModel: filters.businessModel || undefined,
      profileStatus: filters.profileStatus || undefined,
      userStatus: filters.userStatus || undefined,
      signal: controller.signal,
    };
    void Promise.resolve().then(() => setState((current) => ({ ...current, loading: true, error: "" })));
    Promise.all([
      adminDashboardApi.getBusinessOverview({ ...params, from: growthPeriod.from, to: growthPeriod.to, groupBy: "Week" }),
      adminDashboardApi.getBusinessDemand(params),
    ])
      .then(([overview, demand]) => setState({ loading: false, overview, demand, error: "" }))
      .catch((error) => {
        if (!isCanceled(error)) setState((current) => ({ ...current, loading: false, error: "Không thể tải dữ liệu doanh nghiệp." }));
      });
    return () => controller.abort();
  }, [filters, growthPeriod]);

  useEffect(() => {
    const controller = new AbortController();
    adminDashboardApi
      .getBusinessPerformance({ from: orderPeriod.from, to: orderPeriod.to, groupBy: "Week", signal: controller.signal })
      .then((data) => setOrders({ loading: false, data }))
      .catch((error) => {
        if (!isCanceled(error)) setOrders({ loading: false, data: null });
      });
    return () => controller.abort();
  }, [orderPeriod]);

  const { overview, demand } = state;
  const total = Number(overview?.totalBusinessAccounts) || 0;
  const profiles = Number(overview?.withProfileCount) || 0;
  const noProfile = Number(overview?.withoutProfileCount) || Math.max(0, total - profiles);
  const surveyed = Number(overview?.withSurveyCount) || 0;
  const pendingProfiles = countOf(overview?.byProfileStatus, "Pending");
  const products = demandRows(demand?.productTypes);
  const services = demandRows(demand?.serviceCities);
  const targets = demandRows(demand?.targetCities);
  const extraGroups = [
    ["Mức hư hại", demand?.damageLevels],
    ["Tình trạng chức năng", demand?.functionalityStatuses],
    ["Quy mô thu mua", demand?.procurementScales],
    ["Phường phục vụ", demand?.serviceWards],
  ].filter(([, group]) => Array.isArray(group?.items) && group.items.length > 0);
  const growthSeries = Array.isArray(overview?.growthSeries) ? overview.growthSeries : [];
  const registered = growthSeries.reduce((sum, bin) => sum + (Number(bin.registeredCount) || 0), 0);
  const activeNow = growthSeries.reduce((sum, bin) => sum + (Number(bin.currentlyActiveCount) || 0), 0);
  const suspendedNow = growthSeries.reduce((sum, bin) => sum + (Number(bin.currentlySuspendedCount) || 0), 0);

  const orderData = orders.data;
  const orderTotal = Number(orderData?.createdBusinessOrderCount) || 0;
  const rateCount = (rate) => (rate === null || rate === undefined ? 0 : Math.round((Number(rate) * orderTotal) / 100));
  const rateText = (rate) => (rate === null || rate === undefined ? "—" : `${num(rate)}%`);

  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const dim = { opacity: state.loading && overview ? 0.55 : 1 };

  return (
    <div className="hc-admin hc-business">
      <main className="content">
        <div className="heading">
          <div>
            <h1>Doanh nghiệp & nhu cầu khảo sát</h1>
            <p className="sub">Một trang theo dõi hồ sơ, độ phủ dữ liệu và nhu cầu đã khai báo.</p>
          </div>
        </div>

        <div className="toolbar">
          <label>
            Mô hình kinh doanh
            <select value={filters.businessModel} onChange={(event) => setFilter("businessModel", event.target.value)}>
              <option value="">Tất cả mô hình</option>
              {MODELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Trạng thái hồ sơ
            <select value={filters.profileStatus} onChange={(event) => setFilter("profileStatus", event.target.value)}>
              <option value="">Tất cả hồ sơ</option>
              {PROFILE_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Trạng thái tài khoản
            <select value={filters.userStatus} onChange={(event) => setFilter("userStatus", event.target.value)}>
              <option value="">Tất cả tài khoản</option>
              {ACCOUNT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} disabled={!hasFilters}>Xóa bộ lọc</button>
        </div>
        <p className="scope-label">
          {overview?.generatedAtUtc ? `Cập nhật ${formatStamp(overview.generatedAtUtc)} · ` : ""}
          Bộ lọc áp dụng cho hồ sơ, khảo sát và xu hướng đăng ký
        </p>

        {state.error && <div className="empty">{state.error}</div>}
        {!state.error && !overview && <div className="empty">Đang tải dữ liệu...</div>}
        {!state.error && overview && (
          <div style={dim}>
            <div className="kpis profile-kpis" aria-live="polite">
              <article className="kpi">
                <p className="sub">Tài khoản doanh nghiệp</p>
                <strong className="value">{num(total)}</strong>
                <p className="sub">Toàn bộ tài khoản theo bộ lọc</p>
              </article>
              <article className="kpi">
                <p className="sub">Đã có hồ sơ</p>
                <strong className="value">{num(profiles)}</strong>
                <p className="sub">{num(noProfile)} tài khoản chưa có hồ sơ</p>
              </article>
              <article className="kpi">
                <p className="sub">Có dữ liệu khảo sát</p>
                <strong className="value">{pct(surveyed, profiles)}</strong>
                <div className="meter"><span style={{ width: `${profiles ? (surveyed / profiles) * 100 : 0}%` }} /></div>
                <p className="sub">{num(surveyed)}/{num(profiles)} hồ sơ · không đồng nghĩa trả lời đầy đủ</p>
              </article>
            </div>

            <div className="pair">
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <h2>Trạng thái hồ sơ</h2>
                    <p className="sub">Tỷ lệ trên số tài khoản đã có hồ sơ</p>
                  </div>
                  <span className="pill">{num(profiles)} hồ sơ</span>
                </div>
                <Bars
                  rows={PROFILE_STATUSES.map(([key, label, color]) => ({ key, label, color, count: countOf(overview.byProfileStatus, key) }))}
                  denominator={profiles}
                />
                <p className="note">
                  Tài khoản hiện tại: {num(countOf(overview.byUserStatus, "Active"))} hoạt động · {num(countOf(overview.byUserStatus, "Suspended"))} tạm khóa ·{" "}
                  {num(countOf(overview.byUserStatus, "Pending"))} chờ kích hoạt · {num(countOf(overview.byUserStatus, "Deleted"))} đã xóa.
                </p>
              </section>
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <h2>Hồ sơ cần duyệt & bổ sung</h2>
                    <p className="sub">Hồ sơ chờ duyệt, thiếu thông tin hoặc chưa khai báo nhu cầu</p>
                  </div>
                </div>
                {[
                  ["Hồ sơ chờ duyệt", pendingProfiles, "Cần xem xét trạng thái xác minh"],
                  ["Tài khoản chưa có hồ sơ", noProfile, "Chưa có dữ liệu để phân tích hồ sơ"],
                  ["Hồ sơ chưa có dữ liệu khảo sát", Math.max(0, profiles - surveyed), "Cần bổ sung thông tin nhu cầu"],
                ].map(([label, value, caption]) => (
                  <div className="actionrow" key={label}>
                    <div>
                      {label}
                      <span className="sub">{caption}</span>
                    </div>
                    <strong>{num(value)}</strong>
                  </div>
                ))}
                <p className="note">Các nhóm có thể trùng nhau; không cộng thành tổng số doanh nghiệp cần xử lý.</p>
              </section>
            </div>
          </div>
        )}

        <section className="business-orders">
          <div className="section-title">
            <h2>Đơn hàng có doanh nghiệp tham gia</h2>
            <span className="sub">{formatDayKey(orderPeriod.from)}–{formatDayKey(completedPeriod(1).from)} · {ORDER_DAYS} ngày đã hoàn tất</span>
          </div>
          <p className="sub order-scope">Đơn được tạo trong kỳ, có doanh nghiệp là người mua hoặc người bán. Không áp dụng bộ lọc hồ sơ phía trên.</p>
          {!orderData && <div className="empty">{orders.loading ? "Đang tải dữ liệu..." : "Không thể tải dữ liệu đơn hàng."}</div>}
          {orderData && (
            <div className="kpis" aria-live="polite">
              <article className="kpi">
                <p className="sub">Tổng đơn hàng</p>
                <strong className="value">{num(orderTotal)}</strong>
                <p className="sub">Mỗi đơn được tính một lần, kể cả khi hai bên đều là doanh nghiệp.</p>
              </article>
              <article className="kpi">
                <p className="sub">Tỷ lệ đơn bị hủy</p>
                <strong className="value">{rateText(orderData.cancellationRate)}</strong>
                <p className="sub">{num(rateCount(orderData.cancellationRate))}/{num(orderTotal)} đơn đang có trạng thái đã hủy.</p>
              </article>
              <article className="kpi">
                <p className="sub">Tỷ lệ đơn có tranh chấp</p>
                <strong className="value">{rateText(orderData.disputeRate)}</strong>
                <p className="sub">{num(rateCount(orderData.disputeRate))}/{num(orderTotal)} đơn đã có tranh chấp, gồm cả tranh chấp đã giải quyết.</p>
              </article>
            </div>
          )}
        </section>

        {demand && (
          <div style={dim}>
            <div className="section-title">
              <h2>Nhu cầu nổi bật đã ghi nhận</h2>
              <span className="sub">Dữ liệu hiện tại · không phải nhu cầu phát sinh trong kỳ</span>
            </div>
            <div className="pair">
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <h2>Loại sản phẩm quan tâm</h2>
                    <p className="sub">Số hồ sơ có khai báo từng loại sản phẩm</p>
                  </div>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      const details = surveyRef.current;
                      if (!details) return;
                      details.open = true;
                      details.scrollIntoView({
                        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                        block: "start",
                      });
                    }}
                  >
                    Xem đầy đủ ↓
                  </button>
                </div>
                <Basis group={demand.productTypes} total={profiles} />
                <Bars rows={products.slice(0, 4)} denominator={Number(demand.productTypes?.respondentCount) || 0} />
              </section>
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <h2>Thành phố phục vụ</h2>
                    <p className="sub">Phạm vi phục vụ đã khai báo</p>
                  </div>
                </div>
                <Basis group={demand.serviceCities} total={profiles} />
                <Bars rows={services.slice(0, 5)} denominator={Number(demand.serviceCities?.respondentCount) || 0} />
              </section>
            </div>
            <p className="notice">
              Tỷ lệ tính trên hồ sơ có trả lời từng nhóm, không phải toàn bộ tài khoản. Một hồ sơ có thể chọn nhiều đáp án nên tổng tỷ lệ có thể vượt 100%.
            </p>

            <details className="panel" ref={surveyRef}>
              <summary>Chi tiết mức độ đầy đủ & các nhóm khảo sát</summary>
              <section style={{ marginTop: 18 }}>
                <h3>Tất cả loại sản phẩm được khai báo</h3>
                <div className="all-products">
                  {products.length ? (
                    products.map((row) => (
                      <div className="product-summary" key={row.key}>
                        <span>{row.label}</span>
                        <strong>{num(row.count)} hồ sơ</strong>
                        <span className="product-percent">{pct(row.count, Number(demand.productTypes?.respondentCount) || 0)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="empty">Chưa có dữ liệu trong phạm vi đang chọn.</div>
                  )}
                </div>
              </section>
              <div className="pair">
                <section>
                  <h3>Thành phố mục tiêu thu mua</h3>
                  <Basis group={demand.targetCities} total={profiles} />
                  <Bars rows={targets} denominator={Number(demand.targetCities?.respondentCount) || 0} />
                </section>
                <section>
                  <h3>Cơ cấu mô hình kinh doanh</h3>
                  <Bars rows={MODELS.map(([key, label]) => ({ key, label, count: countOf(overview?.byBusinessModel, key) }))} denominator={profiles} />
                  <p className="note">Mẫu số là hồ sơ hiện có; tài khoản chưa có hồ sơ không được gán mô hình.</p>
                </section>
              </div>
              {extraGroups.length > 0 && (
                <div className="pair">
                  {extraGroups.map(([title, group]) => (
                    <section key={title}>
                      <h3>{title}</h3>
                      <Basis group={group} total={profiles} />
                      <Bars rows={demandRows(group)} denominator={Number(group.respondentCount) || 0} />
                    </section>
                  ))}
                </div>
              )}
              {extraGroups.length < 4 && (
                <p className="note">Các nhóm mức hư hại, tình trạng chức năng, quy mô thu mua và phường phục vụ chỉ hiển thị khi có dữ liệu.</p>
              )}
            </details>
          </div>
        )}

        {overview && (
          <details className="panel">
            <summary>Xu hướng đăng ký doanh nghiệp</summary>
            <div className="expand-controls">
              <label>
                Kỳ đăng ký
                <select value={growthDays} onChange={(event) => setGrowthDays(Number(event.target.value))}>
                  <option value={30}>30 ngày đã hoàn tất</option>
                  <option value={7}>7 ngày đã hoàn tất</option>
                </select>
              </label>
              <span className="sub">{formatDayKey(growthPeriod.from)} → trước {formatDayKey(growthPeriod.to)} · gom theo tuần</span>
            </div>
            <div className="legend"><span><i className="dot blue" />Tài khoản đăng ký mới</span></div>
            <GrowthChart series={growthSeries} />
            <p className="note">{num(registered)} tài khoản đăng ký trong kỳ · hiện {num(activeNow)} hoạt động và {num(suspendedNow)} tạm khóa.</p>
            <p className="note">Ngày tạo tài khoản quyết định kỳ đăng ký. Trạng thái tài khoản là trạng thái hiện tại, không phải trạng thái tại thời điểm quá khứ.</p>
          </details>
        )}
      </main>
    </div>
  );
}

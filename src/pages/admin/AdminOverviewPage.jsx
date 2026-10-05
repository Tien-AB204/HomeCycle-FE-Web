import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/admin/redesign/hc-overview.css";
import { CompactBars, GroupedBarChart, RingChart } from "../../features/admin/redesign/HcCharts";
import {
  completedPeriod,
  countOf,
  formatDateTime,
  formatDayKey,
} from "../../features/admin/operations/operationsPresentation";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const num = (value) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const money = (value) => `${num(value)} ₫`;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const DEFINITIONS = [
  ["newCustomers", "customers", "Khách hàng mới", "Tài khoản Cá nhân và Doanh nghiệp tạo trong kỳ. Tính theo vai trò hiện tại, bao gồm tài khoản đã khóa hoặc xóa."],
  ["newListings", "posts", "Bài đăng mới", "Bài được tạo trong kỳ, không phải số bài đang hoạt động."],
  ["completedOrders", "completed", "Đơn hoàn tất", "Đơn đang ở trạng thái hoàn tất và có ngày hoàn tất trong kỳ; có thể được tạo ở kỳ trước."],
  ["completedGmv", "gmv", "Giá trị giao dịch", "Tổng tiền cuối cùng của đơn hoàn tất trong kỳ, gồm phí vận chuyển cấu hình. Đây là giá trị mua bán, không phải doanh thu nền tảng."],
  ["platformRevenue", "revenue", "Doanh thu HomeCycle", "Phí gói dịch vụ hoàn tất được ghi nhận vào ví doanh thu nền tảng trong kỳ, gồm thanh toán qua PayOS và ví."],
];

const ORDER_RING = [
  ["Pending", "Chờ xử lý", "var(--muted)"],
  ["Processing", "Đang xử lý", "var(--teal)"],
  ["Completed", "Hoàn tất", "var(--green)"],
  ["Disputing", "Tranh chấp", "var(--amber)"],
  ["Cancelled", "Đã hủy", "var(--red)"],
];

const APPOINTMENT_RING = [
  ["Scheduled", "Đã thống nhất", "var(--blue)"],
  ["InProgress", "Đang diễn ra", "var(--teal)"],
  ["Completed", "Đã hoàn tất", "var(--green)"],
  ["Cancelled", "Đã hủy", "var(--red)"],
  ["Expired", "Đã hết hạn", "var(--muted)"],
];

const POST_STATES = [
  ["Active", "Đang hoạt động", "var(--green)"],
  ["Suspended", "Bị đình chỉ", "var(--red)"],
  ["Closed", "Đã đóng", "var(--teal)"],
  ["Deleted", "Đã xóa", "var(--muted)"],
];

const ROLES = [
  ["Personal", "Cá nhân", "var(--teal)"],
  ["Business", "Doanh nghiệp", "var(--blue)"],
  ["Moderator", "Kiểm duyệt viên", "var(--amber)"],
  ["Admin", "Quản trị viên", "var(--muted)"],
];

const roleCount = (list, field, key) =>
  (Array.isArray(list) ? list : [])
    .filter((item) => String(item?.[field]).toLowerCase() === key.toLowerCase())
    .reduce((sum, item) => sum + (Number(item?.count) || 0), 0);

const sumDaily = (daily, from, toExclusive) =>
  daily.filter((item) => item.date >= from && item.date < toExclusive).reduce((sum, item) => sum + item.count, 0);

export default function AdminOverviewPage() {
  const basisRef = useRef(null);
  const [snapshot, setSnapshot] = useState({ loading: true, users: null, listings: null, orders: null, appointments: null, error: "" });
  const [periodDays, setPeriodDays] = useState(30);
  const [groupBy, setGroupBy] = useState("Week");
  const [periodData, setPeriodData] = useState({ loading: true, overview: null, customers: [], error: "" });
  const [basis, setBasis] = useState(null);
  const period = useMemo(() => completedPeriod(periodDays), [periodDays]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    Promise.all([
      adminDashboardApi.getUserOverview({ signal }).catch(() => null),
      adminDashboardApi.getListingMonitorOverview({}, { signal }).catch(() => null),
      adminDashboardApi.getOrders({ signal }).catch(() => null),
      adminDashboardApi.getAppointments({ signal }).catch(() => null),
    ])
      .then(([users, listings, orders, appointments]) =>
        setSnapshot({
          loading: false,
          users,
          listings,
          orders,
          appointments,
          error: users || listings || orders || appointments ? "" : "Không thể tải quy mô hiện tại.",
        }),
      )
      .catch((error) => {
        if (!isCanceled(error)) setSnapshot((current) => ({ ...current, loading: false, error: "Không thể tải quy mô hiện tại." }));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    void Promise.resolve().then(() => setPeriodData((current) => ({ ...current, loading: true, error: "" })));
    Promise.all([
      adminDashboardApi.getAdminOverview({ from: period.from, to: period.to, groupBy, signal }),
      adminDashboardApi.getRegistrationTrend({ role: "Personal", days: periodDays, forecastDays: 7, signal }).catch(() => null),
      adminDashboardApi.getRegistrationTrend({ role: "Business", days: periodDays, forecastDays: 7, signal }).catch(() => null),
    ])
      .then(([overview, personal, business]) => {
        const customers = [personal, business]
          .flatMap((trend) => (Array.isArray(trend?.dailyRegistrations) ? trend.dailyRegistrations : []))
          .map((item) => ({ date: String(item.date).slice(0, 10), count: Number(item.count) || 0 }));
        setPeriodData({ loading: false, overview, customers, error: "" });
      })
      .catch((error) => {
        if (!isCanceled(error)) setPeriodData((current) => ({ ...current, loading: false, error: "Không thể tải kết quả trong kỳ." }));
      });
    return () => controller.abort();
  }, [period, periodDays, groupBy]);

  useEffect(() => {
    const dialog = basisRef.current;
    if (!dialog) return;
    if (basis && !dialog.open) dialog.showModal();
    if (!basis && dialog.open) dialog.close();
  }, [basis]);

  const { users, listings, orders, appointments } = snapshot;
  const sell = Number(listings?.sellCount) || 0;
  const buy = Number(listings?.buyCount) || 0;
  const postRows = POST_STATES.map(([key, label, color]) => ({
    key,
    label,
    color,
    count: countOf(listings?.sellStatusDistribution, key) + countOf(listings?.buyStatusDistribution, key),
  }));
  const postTotal = Number(listings?.totalCount) || postRows.reduce((sum, row) => sum + row.count, 0);
  const orderRows = ORDER_RING.map(([key, label, color]) => ({ key, label, color, count: countOf(orders?.currentStatusDistribution, key) }));
  const totalOrders = Number(orders?.totalOrders) || orderRows.reduce((sum, row) => sum + row.count, 0);
  const appointmentRows = APPOINTMENT_RING.map(([key, label, color]) => ({ key, label, color, count: countOf(appointments?.currentStatusDistribution, key) }));
  const effectiveAppointments = appointmentRows.reduce((sum, row) => sum + row.count, 0);
  const roleRows = ROLES.map(([key, label, color]) => ({ key, label, color, count: roleCount(users?.byRole, "role", key) }));
  const totalAccounts = Number(users?.totalAccounts) || 0;
  const statusText = [
    ["Active", "đang hoạt động"],
    ["Pending", "chờ kích hoạt"],
    ["Suspended", "tạm khóa"],
  ]
    .map(([key, label]) => `${num(roleCount(users?.byStatus, "status", key))} ${label}`)
    .join(" · ");

  const overview = periodData.overview;
  const kpis = overview?.kpis || {};
  const listingDaily = (Array.isArray(listings?.growthSeries) ? listings.growthSeries : []).map((item) => ({
    date: String(item.date).slice(0, 10),
    count: (Number(item.sellCount) || 0) + (Number(item.buyCount) || 0) + (Number(item.unknownPostTypeCount) || 0),
  }));
  const orderSeries = Array.isArray(overview?.orderSeries) ? overview.orderSeries : [];
  const bins = orderSeries.map((point, index) => {
    const from = String(point.from).slice(0, 10);
    const reportedEnd = String(point.toExclusive || "").slice(0, 10);
    // Phòng trường hợp mốc kết thúc không hợp lệ: dùng mốc bắt đầu của cột kế tiếp.
    const toExclusive =
      reportedEnd > from ? reportedEnd : String(orderSeries[index + 1]?.from || period.to).slice(0, 10);
    const revenue = Number(overview?.revenueSeries?.[index]?.amount) || 0;
    return {
      from,
      last: toExclusive,
      created: Number(point.createdCount) || 0,
      completed: Number(point.completedCount) || 0,
      gmv: Number(point.gmv) || 0,
      revenue,
      customers: sumDaily(periodData.customers, from, toExclusive),
      posts: sumDaily(listingDaily, from, toExclusive),
    };
  });
  const gmvTotal = Number(kpis.completedGmv?.value) || 0;
  const revenueTotal = Number(kpis.platformRevenue?.value) || 0;

  return (
    <div className="hc-admin hc-overview">
      <main className="content">
        <div className="heading">
          <div>
            <h1>Tổng quan hệ thống</h1>
            <p className="muted">Quy mô hiện tại và kết quả hoạt động của hệ thống.</p>
          </div>
        </div>
        {snapshot.error && <div className="notice error">{snapshot.error}</div>}

        <section>
          <div className="stats">
            <article className="metric">
              <p className="label">Tổng tài khoản</p>
              <div className="value">{num(totalAccounts)}</div>
              <p className="caption">Cá nhân, Doanh nghiệp, Kiểm duyệt viên, Admin</p>
            </article>
            <article className="metric blue">
              <p className="label">Tổng bài đã đăng</p>
              <div className="value">{num(postTotal)}</div>
              <p className="caption">{num(sell)} tin bán · {num(buy)} tin mua</p>
            </article>
            <article className="metric">
              <p className="label">Tổng đơn hàng</p>
              <div className="value">{num(totalOrders)}</div>
              <p className="caption">Tất cả trạng thái</p>
            </article>
            <article className="metric blue">
              <p className="label">Lịch hẹn hiệu lực</p>
              <div className="value">{num(effectiveAppointments)}</div>
              <p className="caption">Kiểm định và thu gom</p>
            </article>
          </div>
          <div className="stats operation-stats">
            <article className="metric">
              <p className="label">Đơn đang hoạt động</p>
              <div className="value">{num(orders?.activeOrderCount)}</div>
              <p className="caption">Chờ xử lý, đang xử lý hoặc có tranh chấp</p>
            </article>
            <article className="metric blue">
              <p className="label">Lịch hẹn hôm nay</p>
              <div className="value">{num(appointments?.todayCount)}</div>
              <p className="caption">Kiểm định và thu gom trong ngày</p>
            </article>
          </div>

          <div className="ov-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Đơn hàng theo trạng thái</h2>
                  <p className="muted">Toàn bộ {num(totalOrders)} đơn hàng</p>
                </div>
                <Link to="/admin/dashboard/orders">Xem đơn hàng →</Link>
              </div>
              <RingChart rows={orderRows} total={totalOrders} unit="đơn hàng" />
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Lịch hẹn theo trạng thái</h2>
                  <p className="muted">{num(effectiveAppointments)} lịch hiệu lực</p>
                </div>
                <Link to="/admin/dashboard/orders">Xem lịch hẹn →</Link>
              </div>
              <RingChart rows={appointmentRows} total={effectiveAppointments} unit="lịch hẹn" />
            </section>
          </div>

          <div className="ov-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Bài đăng đang ở trạng thái nào?</h2>
                  <p className="muted">Toàn bộ bài đã đăng · không gồm nháp</p>
                </div>
                <Link to="/admin/dashboard/posts">Xem bài đăng →</Link>
              </div>
              <div className="post-types">
                <div className="type-chip">Tin bán<strong>{num(sell)}</strong></div>
                <div className="type-chip blue">Tin mua<strong>{num(buy)}</strong></div>
              </div>
              <CompactBars rows={postRows} total={postTotal} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Tài khoản theo vai trò</h2>
                  <p className="muted">Toàn bộ {num(totalAccounts)} tài khoản</p>
                </div>
                <Link to="/admin/dashboard/users">Xem người dùng →</Link>
              </div>
              <CompactBars rows={roleRows} total={totalAccounts} />
              <p className="note">{statusText}. “Đang hoạt động” là trạng thái tài khoản.</p>
            </section>
          </div>
        </section>

        <section className="period-section">
          <div className="section-head">
            <h2>Kết quả trong kỳ</h2>
            <span className="muted">So sánh với kỳ liền trước cùng số ngày</span>
          </div>
          <div className="periodbar">
            <label>
              Kỳ thống kê
              <select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))}>
                <option value={30}>30 ngày đã hoàn tất</option>
                <option value={7}>7 ngày đã hoàn tất</option>
              </select>
            </label>
            <label>
              Gom biểu đồ
              <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
                <option value="Week">Theo tuần</option>
                <option value="Day">Theo ngày</option>
              </select>
            </label>
            <span className="muted">
              {formatDayKey(period.from)} → trước {formatDayKey(period.to)} · UTC+7{periodData.loading ? " · Đang tải..." : ""}
            </span>
          </div>
          {periodData.error && <div className="notice error">{periodData.error}</div>}

          <div className="stats period-stats">
            {DEFINITIONS.map(([key, , label, description]) => {
              const metric = kpis[key] || {};
              const isMoney = key === "completedGmv" || key === "platformRevenue";
              const value = Number(metric.value) || 0;
              const previous = Number(metric.previousValue) || 0;
              const change = metric.changePercent;
              const tone = change === null || change === undefined ? "" : change > 0 ? "up" : change < 0 ? "down" : "";
              return (
                <article className="metric" key={key}>
                  <p className="label">{label}</p>
                  <div className="value">{isMoney ? money(value) : num(value)}</div>
                  <div className={`delta ${tone}`}>
                    {change === null || change === undefined
                      ? `Kỳ trước: ${isMoney ? money(previous) : num(previous)}`
                      : change === 0
                        ? "Không đổi so với kỳ trước"
                        : `${change > 0 ? "↑" : "↓"} ${num(Math.abs(change))}% so với kỳ trước`}
                  </div>
                  <button type="button" className="basis-link" onClick={() => setBasis({ label, description })}>Cách tính</button>
                </article>
              );
            })}
          </div>

          <div className="ov-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Đơn mới & đơn hoàn tất</h2>
                  <p className="muted">Số đơn theo thời gian</p>
                </div>
                <Link to="/admin/dashboard/orders">Chi tiết →</Link>
              </div>
              <div className="legend">
                <span><i className="dot" style={{ background: "var(--blue)" }} />Đơn tạo mới</span>
                <span><i className="dot" style={{ background: "var(--green)" }} />Đơn hoàn tất</span>
              </div>
              <GroupedBarChart rows={bins} series={[{ key: "created", label: "Đơn tạo mới", color: "var(--blue)" }, { key: "completed", label: "Đơn hoàn tất", color: "var(--green)" }]} />
              <p className="note">Đơn hoàn tất có thể được tạo từ kỳ trước.</p>
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Khách hàng mới & bài đăng mới</h2>
                  <p className="muted">Số lượng theo ngày tạo</p>
                </div>
              </div>
              <div className="legend">
                <span><i className="dot" style={{ background: "var(--blue)" }} />Khách hàng mới</span>
                <span><i className="dot" />Bài đăng mới</span>
              </div>
              <GroupedBarChart rows={bins} series={[{ key: "customers", label: "Khách hàng mới", color: "var(--blue)" }, { key: "posts", label: "Bài đăng mới", color: "var(--teal)" }]} />
              <p className="note">Khách hàng gồm Cá nhân và Doanh nghiệp; không gồm Admin, Kiểm duyệt viên.</p>
            </section>
          </div>

          <div className="ov-grid financial">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Giá trị giao dịch hoàn tất</h2>
                  <p className="muted">GMV · Giá trị mua bán giữa người dùng</p>
                </div>
                <Link to="/admin/dashboard/finance?tab=finance">Chi tiết →</Link>
              </div>
              <div className="chart-total">{money(gmvTotal)}</div>
              <GroupedBarChart rows={bins} moneyChart series={[{ key: "gmv", label: "Giá trị giao dịch hoàn tất", color: "var(--teal)" }]} />
              <p className="note">Gồm phí vận chuyển trong tổng tiền đơn; không phải doanh thu HomeCycle.</p>
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Doanh thu HomeCycle</h2>
                  <p className="muted">Phí gói dịch vụ đã ghi nhận</p>
                </div>
                <Link to="/admin/dashboard/finance?tab=finance">Chi tiết →</Link>
              </div>
              <div className="chart-total">{money(revenueTotal)}</div>
              <GroupedBarChart rows={bins} moneyChart series={[{ key: "revenue", label: "Doanh thu HomeCycle", color: "var(--green)" }]} />
              <p className="note">Không cộng ký quỹ đơn hoặc phí GHN tạm giữ vào doanh thu.</p>
            </section>
          </div>
        </section>

        <p className="foot">
          Số liệu vận hành kinh doanh từ hệ thống{overview?.generatedAtUtc ? ` · cập nhật ${formatDateTime(overview.generatedAtUtc)}` : ""}; không thể hiện tình trạng máy chủ hoặc số người đang online.
        </p>

        <dialog ref={basisRef} onClose={() => setBasis(null)}>
          {basis && (
            <>
              <div className="modalhead">
                <h2>{basis.label}</h2>
                <button type="button" onClick={() => setBasis(null)}>Đóng</button>
              </div>
              <div className="modalbody">
                <p>{basis.description}</p>
                <p>So sánh với kỳ liền trước cùng số ngày. Khi kỳ trước bằng 0, không tính phần trăm tăng trưởng.</p>
              </div>
            </>
          )}
        </dialog>
      </main>
    </div>
  );
}

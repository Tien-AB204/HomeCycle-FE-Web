import { useEffect, useMemo, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import AppointmentCalendar from "./AppointmentCalendar";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  DELIVERY_METHOD_LABELS,
  EFFECTIVE_APPOINTMENT_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_ORDER,
  PAYMENT_METHOD_LABELS,
  completedPeriod,
  countOf,
  formatDateTime,
  formatDayKey,
  formatMoney,
  formatNumber,
  formatPercent,
  shiftDayKey,
} from "./operationsPresentation";

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const ORDER_STATUS_COLORS = {
  Completed: "var(--green)",
  Disputing: "var(--red)",
};

const APPOINTMENT_STATUS_COLORS = {
  Completed: "var(--green)",
  Cancelled: "var(--red)",
  Expired: "var(--amber)",
};

function MethodRows({ rows, total, unit, onSelect }) {
  return rows.map(({ key, label, count }) => {
    const percent = total ? (count / total) * 100 : 0;

    return (
      <div className="methodrow" key={key}>
        <div className="row">
          {onSelect && count ? (
            <button type="button" className="text" onClick={() => onSelect(key)}>
              {label} →
            </button>
          ) : (
            <span>{label}</span>
          )}
          <strong>
            {formatNumber(count)} {unit} · {formatPercent(count, total)}
          </strong>
        </div>
        <div className="track">
          <div className="fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  });
}

export default function OperationsOverview({ onOpenHistory, onOpenDetail }) {
  const [periodDays, setPeriodDays] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", orders: null, appointments: null });

  const period = useMemo(() => completedPeriod(periodDays), [periodDays]);

  useEffect(() => {
    const controller = new AbortController();
    const params = { from: period.from, to: period.to, groupBy: "Week", signal: controller.signal };

    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );

    Promise.all([
      adminDashboardApi.getOrders(params),
      adminDashboardApi.getAppointments(params),
    ])
      .then(([orders, appointments]) =>
        setState({ loading: false, error: "", orders, appointments }),
      )
      .catch((error) => {
        if (isCanceled(error)) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: "Không thể tải số liệu đơn hàng và lịch hẹn.",
        }));
      });

    return () => controller.abort();
  }, [period, refreshKey]);

  const { orders, appointments } = state;
  const orderStatuses = orders?.currentStatusDistribution;
  const totalOrders = Number(orders?.totalOrders) || 0;
  const appointmentStatuses = appointments?.currentStatusDistribution;
  const effectiveTotal = EFFECTIVE_APPOINTMENT_STATUSES.reduce(
    (sum, key) => sum + countOf(appointmentStatuses, key),
    0,
  );
  const periodLabel = `${formatDayKey(period.from)} – ${formatDayKey(shiftDayKey(period.to, -1))} · UTC+7 · Không gồm hôm nay`;

  const deliveryRows = ["GhnDelivery", "SellerDelivers", "BuyerPickUp"].map((key) => ({
    key,
    label: DELIVERY_METHOD_LABELS[key],
    count: countOf(orders?.deliveryMethodDistribution, key),
  }));
  const deliveryTotal = Number(orders?.createdInPeriodCount) || 0;

  const paymentRows = ["PayOS", "Internal_Wallet", "Unspecified"].map((key) => ({
    key,
    label: PAYMENT_METHOD_LABELS[key],
    count: countOf(orders?.paymentMethodDistribution, key),
  }));
  const paymentTotal = paymentRows.reduce((sum, row) => sum + row.count, 0);

  const tradeSeries = Array.isArray(orders?.tradeSeries) ? orders.tradeSeries : [];
  const seriesMax = Math.max(
    1,
    ...tradeSeries.flatMap((point) => [Number(point.createdCount) || 0, Number(point.completedCount) || 0]),
  );
  const scheduledTypes = Array.isArray(appointments?.appointmentTypeDistribution)
    ? appointments.appointmentTypeDistribution
    : [];
  const scheduledTotal = scheduledTypes.reduce((sum, item) => sum + (Number(item.count) || 0), 0);

  const stats = [
    { label: "Tổng đơn trên hệ thống", value: totalOrders, caption: "Tất cả trạng thái", action: () => onOpenHistory("orders") },
    { label: "Đơn đang hoạt động", value: orders?.activeOrderCount, caption: "Chờ, xử lý hoặc tranh chấp" },
    {
      label: "Đơn đã hủy",
      value: countOf(orderStatuses, "Cancelled"),
      caption: "Trạng thái hiện tại · Toàn hệ thống",
      action: () => onOpenHistory("orders", { status: "Cancelled" }),
    },
    { label: "Lịch hẹn hôm nay", value: appointments?.todayCount, caption: "Theo ngày hẹn · Không gồm lịch hủy" },
    { label: "Lịch hẹn sắp tới", value: appointments?.upcomingCount, caption: "Đã thống nhất, giờ hẹn sau hiện tại" },
  ];

  return (
    <section>
      <div className="header row">
        <div>
          <div className="eyebrow">VẬN HÀNH GIAO DỊCH</div>
          <h1>Đơn hàng & lịch hẹn</h1>
          <p className="muted">
            Nắm tình trạng giao dịch, kiểm tra việc tồn đọng và theo dõi lịch kiểm định / thu gom.
          </p>
        </div>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={state.loading}>
          {state.loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      <div className="notice">
        Số liệu từ hệ thống
        {orders?.generatedAtUtc ? ` · Cập nhật ${formatDateTime(orders.generatedAtUtc)} (UTC+7)` : ""}.
      </div>

      {state.error && <div className="notice error" role="alert">{state.error}</div>}

      <div className="stats">
        {stats.map((item) => (
          <div className="metric" key={item.label}>
            <div className="label">{item.label}</div>
            <div className="value">{orders || appointments ? formatNumber(item.value) : "—"}</div>
            <div className="muted">{item.caption}</div>
            {item.action && (
              <button type="button" className="text" onClick={item.action}>
                Xem →
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="split">
        <section className="panel">
          <div className="row">
            <h2>Tình trạng đơn hàng</h2>
            <button type="button" className="text" onClick={() => onOpenHistory("orders")}>
              Tra cứu đơn hàng →
            </button>
          </div>
          <p className="muted">Trạng thái hiện tại của toàn bộ đơn; không phụ thuộc kỳ báo cáo.</p>
          {ORDER_STATUS_ORDER.map((key) => {
            const count = countOf(orderStatuses, key);
            return (
              <div className="barrow" key={key}>
                <span>{ORDER_STATUS_LABELS[key]}</span>
                <div className="track">
                  <div
                    className="fill"
                    style={{
                      width: `${totalOrders ? (count / totalOrders) * 100 : 0}%`,
                      background: ORDER_STATUS_COLORS[key] || "var(--teal)",
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="text"
                  onClick={() => onOpenHistory("orders", { status: key })}
                >
                  {formatNumber(count)}
                </button>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <h2>Cần chú ý</h2>
          <p className="muted">
            Quá hạn dựa trên mốc xử lý của lịch; không chỉ so giờ hẹn. Các nhóm có thể chồng lặp.
          </p>
          {[
            {
              label: "Đơn đang tranh chấp",
              count: countOf(orderStatuses, "Disputing"),
              danger: true,
              action: () => onOpenHistory("orders", { hasActiveDispute: "yes" }),
            },
            {
              label: "Lịch quá hạn, cần kiểm tra",
              count: appointments?.overdueCount,
              danger: true,
              action: () => onOpenHistory("appointments", { isOverdue: "yes" }),
            },
            {
              label: "Đề xuất đổi lịch chưa chấp nhận",
              count: appointments?.rescheduleProposalCount,
              action: () => onOpenHistory("appointments", { status: "Proposed" }),
            },
          ].map((item) => (
            <div className={`attention${item.danger ? " danger" : ""}`} key={item.label}>
              <div>
                {item.label}
                <br />
                <button type="button" className="text" onClick={item.action}>
                  Tra cứu →
                </button>
              </div>
              <strong>{formatNumber(item.count)}</strong>
            </div>
          ))}
        </section>
      </div>

      <div className="row methodheading">
        <div>
          <h2>Giao nhận & thanh toán theo kỳ</h2>
          <span className="muted">{periodLabel}</span>
        </div>
        <label className="muted">
          Kỳ báo cáo
          <select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))}>
            <option value={30}>30 ngày đã hoàn tất</option>
            <option value={7}>7 ngày đã hoàn tất</option>
          </select>
        </label>
      </div>

      <div className="split">
        <section className="panel">
          <h2>Phương thức giao nhận</h2>
          <p className="muted">Đơn tạo trong kỳ · Cách giao nhận mới nhất.</p>
          <MethodRows
            rows={deliveryRows}
            total={deliveryTotal}
            unit="đơn"
            onSelect={(key) =>
              onOpenHistory("orders", {
                deliveryMethod: key,
                from: period.from,
                to: shiftDayKey(period.to, -1),
              })
            }
          />
          <div className="methodfooter">Tổng {formatNumber(deliveryTotal)} đơn tạo trong kỳ.</div>
        </section>

        <section className="panel">
          <h2>Phương thức thanh toán</h2>
          <p className="muted">Lượt thanh toán thành công · Đặt cọc và toàn bộ.</p>
          <MethodRows rows={paymentRows} total={paymentTotal} unit="lượt" />
          <div className="methodfooter">
            Tổng {formatNumber(paymentTotal)} lượt. Gồm các lượt sau đó hoàn tiền.
          </div>
        </section>
      </div>

      <AppointmentCalendar onOpenHistory={onOpenHistory} onOpenDetail={onOpenDetail} />

      <section className="panel appointment-status">
        <div className="row">
          <div>
            <h2>Lịch hẹn theo trạng thái</h2>
            <p className="muted">Toàn bộ lịch hiệu lực · Trạng thái hiện tại.</p>
          </div>
          <div className="appointment-total">
            {formatNumber(effectiveTotal)} <small>lịch hiệu lực</small>
          </div>
        </div>
        <div className="appointment-status-grid">
          {EFFECTIVE_APPOINTMENT_STATUSES.map((key) => {
            const count = countOf(appointmentStatuses, key);
            const percent = effectiveTotal ? (count / effectiveTotal) * 100 : 0;
            return (
              <div className="methodrow" key={key}>
                <div className="row">
                  <span>{APPOINTMENT_STATUS_LABELS[key]}</span>
                  <button
                    type="button"
                    className="text"
                    onClick={() => onOpenHistory("appointments", { status: key })}
                  >
                    <strong>
                      {formatNumber(count)} lịch · {formatPercent(count, effectiveTotal)}
                    </strong>
                  </button>
                </div>
                <div className="track">
                  <div
                    className="fill"
                    style={{ width: `${percent}%`, background: APPOINTMENT_STATUS_COLORS[key] || "var(--teal)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <details className="fold">
        <summary>Báo cáo theo kỳ — xem khi cần phân tích</summary>
        <div className="row">
          <p className="muted">
            Ngày tạo đơn và ngày hoàn tất được thống kê riêng. Kỳ không tác động số liệu hiện tại hoặc lịch tháng.
          </p>
          <span className="muted">Dùng kỳ đã chọn ở phần Giao nhận & thanh toán phía trên.</span>
        </div>
        <p className="muted">{periodLabel}</p>
        <div className="periodstats">
          <div>
            <span className="muted">Đơn tạo trong kỳ</span>
            <strong>{formatNumber(orders?.createdInPeriodCount)}</strong>
          </div>
          <div>
            <span className="muted">Đơn hiện hoàn tất, hoàn tất trong kỳ</span>
            <strong>{formatNumber(orders?.completedInPeriodCount)}</strong>
          </div>
          <div>
            <span className="muted">GMV hoàn tất</span>
            <strong>{formatMoney(orders?.gmv ?? 0)}</strong>
          </div>
        </div>
        <h3>Đơn tạo mới và hoàn tất theo tuần</h3>
        <div className="legend">
          <span><i className="dot" />Tạo mới</span>
          <span><i className="dot" style={{ background: "var(--green)" }} />Hoàn tất</span>
        </div>
        {tradeSeries.length === 0 ? (
          <div className="empty">Chưa có dữ liệu trong kỳ.</div>
        ) : (
          <div className="weekbars">
            {tradeSeries.map((point) => {
              const created = Number(point.createdCount) || 0;
              const completed = Number(point.completedCount) || 0;
              return (
                <div className="week" key={point.from}>
                  <div className="pair">
                    <div className="column" style={{ height: `${(created / seriesMax) * 85}px` }}>
                      <span>{created}</span>
                    </div>
                    <div className="column second" style={{ height: `${(completed / seriesMax) * 85}px` }}>
                      <span>{completed}</span>
                    </div>
                  </div>
                  <div className="weeklabel">{formatDayKey(point.from).slice(0, 5)}</div>
                </div>
              );
            })}
          </div>
        )}
        <p className="muted" style={{ marginTop: 14 }}>
          Số lịch có ngày hẹn trong kỳ: <strong>{formatNumber(scheduledTotal)}</strong>
          {scheduledTypes.map((item) => (
            <span key={item.key}>
              {" · "}
              {APPOINTMENT_TYPE_LABELS[item.key] || item.label} {formatNumber(item.count)}
            </span>
          ))}
          . Tra cứu lịch sử theo ngày hẹn để đối chiếu.
        </p>
        <p className="muted" style={{ marginTop: 18 }}>
          GMV là giá trị giao dịch của các đơn hiện đã hoàn tất trong kỳ; không phải doanh thu HomeCycle. Số lịch theo
          kỳ dựa trên thời điểm hẹn. Không lấy hoàn tất trong kỳ / đơn tạo trong kỳ làm tỷ lệ chuyển đổi.
        </p>
      </details>
    </section>
  );
}

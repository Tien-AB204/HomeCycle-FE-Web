import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { Tooltip } from "antd";
import {
  DashboardDonutChart,
  DashboardLineChart,
} from "../../components/admin/AdminDashboardCharts";
import DashboardPeriodControls from "../../components/admin/DashboardPeriodControls";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const ORDER_STATUS_LABELS = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  disputing: "Đang tranh chấp",
  returned: "Đã hoàn trả",
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatNumber = (value) => {
  const number = toFiniteNumber(value);
  return number === null
    ? "—"
    : new Intl.NumberFormat("vi-VN").format(number);
};

const formatMoney = (value) => {
  const number = toFiniteNumber(value);
  return number === null
    ? "—"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(number);
};

const formatCompactMoney = (value) => {
  const number = toFiniteNumber(value);
  return number === null
    ? "—"
    : new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(number);
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

const formatDate = (value) => {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "—";
};

const validatePeriod = (from, to) => {
  if (Boolean(from) !== Boolean(to)) {
    return "Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.";
  }

  if (!from && !to) {
    return "";
  }

  const days = Math.round(
    (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) /
      86400000,
  );

  if (days < 1 || days > 366) {
    return "Khoảng thời gian phải từ 1 đến 366 ngày.";
  }

  return "";
};

const EMPTY_PERIOD = { from: "", to: "", groupBy: "Day" };

const LoadingBlock = ({ className = "" }) => (
  <span
    className={[
      "inline-block animate-pulse rounded-lg bg-background",
      className,
    ].join(" ")}
  />
);

function InfoTip({ text }) {
  return (
    <Tooltip title={text}>
      <span
        className="material-symbols-outlined cursor-help align-middle text-[16px] text-textLight"
        aria-label={text}
      >
        info
      </span>
    </Tooltip>
  );
}

function KpiCard({ label, metric, formatter, loading, tip }) {
  const changePercent = toFiniteNumber(metric?.changePercent);
  const change = toFiniteNumber(metric?.change);
  const isUp = (change ?? 0) > 0;
  const isDown = (change ?? 0) < 0;

  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.055)]">
      <p className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.1em] text-textLight">
        {label}
        {tip && <InfoTip text={tip} />}
      </p>

      <p className="mt-2 text-2xl font-black text-text">
        {loading ? (
          <LoadingBlock className="h-8 w-24" />
        ) : (
          formatter(metric?.value)
        )}
      </p>

      {!loading && metric && (
        <p
          className={[
            "mt-1 text-xs font-bold",
            isUp ? "text-success" : isDown ? "text-error" : "text-textLight",
          ].join(" ")}
        >
          {changePercent === null
            ? `Kỳ trước: ${formatter(metric.previousValue)}`
            : `${isUp ? "▲" : isDown ? "▼" : "•"} ${Math.abs(changePercent).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% so với kỳ trước`}
        </p>
      )}
    </article>
  );
}

function BacklogItem({ icon, label, value, amount, to, tone = "text-text", loading }) {
  const count = toFiniteNumber(value);

  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 transition hover:border-primary/40 hover:bg-background"
    >
      <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-text">
        <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>

      <span className="shrink-0 text-right">
        {loading ? (
          <LoadingBlock className="h-6 w-10" />
        ) : (
          <>
            <span className={`block text-lg font-black ${count > 0 ? tone : "text-textLight"}`}>
              {formatNumber(count)}
            </span>
            {amount !== undefined && count > 0 && (
              <span className="block text-xs font-semibold text-textLight">
                {formatMoney(amount)}
              </span>
            )}
          </>
        )}
      </span>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [draft, setDraft] = useState(EMPTY_PERIOD);
  const [period, setPeriod] = useState(EMPTY_PERIOD);
  const [periodError, setPeriodError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState({
    requestKey: "",
    data: null,
    error: "",
  });

  const requestKey = [
    requestVersion,
    period.from,
    period.to,
    period.groupBy,
  ].join("|");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    adminDashboardApi
      .getAdminOverview({
        from: period.from || undefined,
        to: period.to || undefined,
        groupBy: period.groupBy,
        signal: controller.signal,
      })
      .then((data) => {
        if (active) {
          setState({ requestKey, data, error: "" });
        }
      })
      .catch((error) => {
        if (
          !active ||
          error?.name === "CanceledError" ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }

        setState({
          requestKey,
          data: null,
          error: "Không thể tải dữ liệu tổng quan lúc này.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey, period.from, period.to, period.groupBy]);

  const loading = state.requestKey !== requestKey;
  const data = state.data;
  const kpis = data?.kpis;
  const snapshot = data?.snapshot;
  const missingAmountCount = toFiniteNumber(
    data?.dataQuality?.completedOrdersMissingAmountCount,
  );

  const moneySeries = (Array.isArray(data?.orderSeries) ? data.orderSeries : []).map(
    (point) => ({
      from: point.from,
      gmv: point.gmv,
      revenue:
        (Array.isArray(data?.revenueSeries) ? data.revenueSeries : []).find(
          (item) => item.from === point.from,
        )?.amount ?? 0,
    }),
  );

  const topCategories = Array.isArray(data?.topCategoriesByGmv)
    ? data.topCategoriesByGmv
    : [];

  const applyPeriod = (event) => {
    event.preventDefault();
    const message = validatePeriod(draft.from, draft.to);

    if (message) {
      setPeriodError(message);
      return;
    }

    setPeriodError("");
    setPeriod({ ...draft });
  };

  const resetPeriod = () => {
    setDraft(EMPTY_PERIOD);
    setPeriod(EMPTY_PERIOD);
    setPeriodError("");
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              Trung tâm điều hành
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Tổng quan hệ thống
            </h2>

            {!loading && data?.period && (
              <p className="mt-2 text-sm font-semibold text-white/75">
                Kỳ {formatDate(data.period.from)} – {formatDate(data.period.toExclusive)} (không gồm ngày cuối)
                {data.period.isPartialPeriod ? " · kỳ đang diễn ra" : ""}
                {data.generatedAtUtc
                  ? ` · cập nhật ${formatDateTime(data.generatedAtUtc)}`
                  : ""}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setRequestVersion((current) => current + 1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            Làm mới
          </button>
        </div>
      </div>

      <DashboardPeriodControls
        draft={draft}
        onChange={setDraft}
        onApply={applyPeriod}
        onReset={resetPeriod}
        error={periodError}
      />

      {state.error && !loading && (
        <div
          role="alert"
          className="rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm font-semibold text-error"
        >
          {state.error}
        </div>
      )}

      {!loading && missingAmountCount > 0 && (
        <div
          role="status"
          className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-3 text-sm font-semibold text-text"
        >
          {formatNumber(missingAmountCount)} đơn hoàn tất trong kỳ chưa có tổng tiền nên chưa được tính vào giá trị giao dịch.
        </div>
      )}

      <div>
        <h3 className="mb-3 text-base font-black text-text">
          Kết quả trong kỳ
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Khách hàng mới"
            metric={kpis?.newCustomers}
            formatter={formatNumber}
            loading={loading}
            tip="Tài khoản Cá nhân và Doanh nghiệp được tạo trong kỳ."
          />
          <KpiCard
            label="Bài đăng mới"
            metric={kpis?.newListings}
            formatter={formatNumber}
            loading={loading}
          />
          <KpiCard
            label="Đơn hoàn tất"
            metric={kpis?.completedOrders}
            formatter={formatNumber}
            loading={loading}
          />
          <KpiCard
            label="Giá trị giao dịch"
            metric={kpis?.completedGmv}
            formatter={formatMoney}
            loading={loading}
            tip="Tổng giá trị các đơn hoàn tất trong kỳ (GMV), gồm phí vận chuyển; không phải doanh thu của HomeCycle."
          />
          <KpiCard
            label="Doanh thu nền tảng"
            metric={kpis?.platformRevenue}
            formatter={formatMoney}
            loading={loading}
            tip="Phí gói đăng ký đã thu trong kỳ."
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-1 text-base font-black text-text">
          Cần xử lý hiện tại
          <InfoTip text="Số liệu tại thời điểm hiện tại, không phụ thuộc kỳ đã chọn." />
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BacklogItem
            icon="gavel"
            label="Tranh chấp chưa xử lý"
            value={snapshot?.unresolvedDisputes}
            to="/admin/dashboard/disputes"
            tone="text-error"
            loading={loading}
          />
          <BacklogItem
            icon="schedule"
            label="Đơn quá hạn chuyển tiền"
            value={snapshot?.overdueReleaseOrders?.count}
            amount={snapshot?.overdueReleaseOrders?.amount}
            to="/admin/finance-management"
            tone="text-error"
            loading={loading}
          />
          <BacklogItem
            icon="hourglass_top"
            label="Thanh toán treo quá hạn"
            value={snapshot?.stalePendingPayments?.count}
            amount={snapshot?.stalePendingPayments?.amount}
            to="/admin/dashboard/payments"
            tone="text-warning"
            loading={loading}
          />
          <BacklogItem
            icon="flag"
            label="Bài đăng đang bị báo cáo"
            value={snapshot?.currentlyReportedListingCount}
            to="/admin/posts/reported"
            tone="text-warning"
            loading={loading}
          />
          <BacklogItem
            icon="inventory_2"
            label="Đơn đang hoạt động"
            value={snapshot?.activeOrders}
            to="/admin/dashboard/orders"
            tone="text-primary"
            loading={loading}
          />
          <BacklogItem
            icon="event"
            label="Lịch hẹn hôm nay"
            value={snapshot?.todayAppointments}
            to="/admin/dashboard/appointments"
            tone="text-primary"
            loading={loading}
          />
          <BacklogItem
            icon="storefront"
            label="Hồ sơ doanh nghiệp chờ duyệt"
            value={snapshot?.pendingBusinessVerificationCount}
            to="/admin/dashboard/businesses/overview"
            tone="text-warning"
            loading={loading}
          />
          <BacklogItem
            icon="badge"
            label="Xác minh cá nhân chờ duyệt"
            value={snapshot?.pendingPersonalVerificationCount}
            to="/admin/dashboard/users"
            tone="text-warning"
            loading={loading}
          />
        </div>
      </div>

      {!loading && data && (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardLineChart
              title="Đơn hàng theo kỳ"
              description="Số đơn được tạo và số đơn hoàn tất."
              rows={data.orderSeries}
              series={[
                { key: "createdCount", label: "Đơn tạo", className: "text-textLight" },
                { key: "completedCount", label: "Đơn hoàn tất", className: "text-primary" },
              ]}
            />

            <DashboardLineChart
              title="Giá trị giao dịch và doanh thu theo kỳ"
              description="Giá trị đơn hoàn tất và doanh thu phí gói đăng ký."
              rows={moneySeries}
              series={[
                { key: "gmv", label: "Giá trị giao dịch", className: "text-primary" },
                { key: "revenue", label: "Doanh thu", className: "text-success" },
              ]}
              valueFormatter={formatMoney}
              axisValueFormatter={formatCompactMoney}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardDonutChart
              title="Trạng thái đơn tạo trong kỳ"
              description="Trạng thái hiện tại của các đơn được tạo trong kỳ."
              rows={data.createdOrderStatusDistribution}
              getLabel={(item) =>
                ORDER_STATUS_LABELS[String(item?.key || "").toLowerCase()] ||
                item?.label ||
                "Chưa xác định"
              }
            />

            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
              <h3 className="text-lg font-black text-text">
                Danh mục có giá trị giao dịch cao nhất
              </h3>
              <p className="mt-1 text-sm text-textLight">
                Tối đa 5 danh mục, tính theo giá trị đơn hoàn tất trong kỳ.
              </p>

              {topCategories.length === 0 ? (
                <p className="mt-6 text-sm font-semibold text-textLight">
                  Chưa có đơn hoàn tất trong kỳ.
                </p>
              ) : (
                <ol className="mt-4 divide-y divide-border">
                  {topCategories.map((category, index) => (
                    <li
                      key={category.categoryId || category.name || index}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-black text-primary">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-text">
                            {category.name || "Chưa phân loại"}
                          </span>
                          <span className="block text-xs text-textLight">
                            {formatNumber(category.completedOrderCount)} đơn hoàn tất
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-black text-text">
                        {formatMoney(category.gmv)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  DashboardHorizontalBarChart,
  DashboardLineChart,
} from "../../../components/admin/AdminDashboardCharts";
import { FinanceAmountBarChart } from "../../../components/admin/AdminFinanceCharts";
import DashboardPeriodControls from "../../../components/admin/DashboardPeriodControls";
import {
  DEFAULT_DASHBOARD_PERIOD,
  formatDashboardDate,
  validateDashboardPeriod,
} from "../../../utils/dashboardPeriod";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatCompactMoney = (value) =>
  `${new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)} ₫`;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const normalizeId = (value) => String(value ?? "").trim().toLowerCase();

const KpiCard = ({ label, value, hint, loading, valueClassName = "text-text" }) => (
  <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">{label}</p>
    <p className={`mt-3 text-3xl font-black ${valueClassName}`}>
      {loading ? (
        <span className="inline-block h-9 w-24 animate-pulse rounded-lg bg-background" />
      ) : (
        value
      )}
    </p>
    {hint && <p className="mt-2 text-xs leading-5 text-textLight">{hint}</p>}
  </article>
);

export default function SubscriptionAnalyticsPanel({ packages = [] }) {
  const [draft, setDraft] = useState(DEFAULT_DASHBOARD_PERIOD);
  const [period, setPeriod] = useState(DEFAULT_DASHBOARD_PERIOD);
  const [periodError, setPeriodError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState({ requestKey: "", data: null, error: "" });

  const requestKey = JSON.stringify([period, requestVersion]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    adminDashboardApi
      .getSubscriptionDashboard({
        from: period.from || undefined,
        to: period.to || undefined,
        groupBy: period.groupBy,
        signal: controller.signal,
      })
      .then((data) => {
        if (active) setState({ requestKey, data, error: "" });
      })
      .catch((error) => {
        if (!active || isCanceled(error)) return;
        setState({
          requestKey,
          data: null,
          error: "Không thể tải thống kê gói đăng ký lúc này.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [period, requestKey]);

  const loading = state.requestKey !== requestKey;
  const data = state.data;

  const applyPeriod = (event) => {
    event.preventDefault();
    const message = validateDashboardPeriod(draft.from, draft.to);
    if (message) {
      setPeriodError(message);
      return;
    }
    setPeriodError("");
    setPeriod({ ...draft });
    setRequestVersion((current) => current + 1);
  };

  const resetPeriod = () => {
    setDraft(DEFAULT_DASHBOARD_PERIOD);
    setPeriod(DEFAULT_DASHBOARD_PERIOD);
    setPeriodError("");
    setRequestVersion((current) => current + 1);
  };

  // Join by PackageId only; the package name from the dashboard is a display fallback.
  const packageRows = useMemo(() => {
    const byId = new Map(
      (Array.isArray(packages) ? packages : []).map((pkg) => [normalizeId(pkg.packageId), pkg]),
    );

    return (Array.isArray(data?.packages) ? data.packages : []).map((metric) => {
      const matched = byId.get(normalizeId(metric.packageId));
      return {
        packageId: metric.packageId,
        name: matched?.name || metric.name || "—",
        code: matched?.code || "",
        isActive: matched ? Boolean(matched.isActive) : Boolean(metric.isActive),
        activeBusinessCount: metric.activeBusinessCount,
        paidSubscriptions: metric.paidSubscriptions,
        revenue: metric.revenue,
      };
    });
  }, [data, packages]);

  const revenueRows = Array.isArray(data?.revenueSeries) ? data.revenueSeries : [];
  const revenueAllZero =
    revenueRows.length > 0 && revenueRows.every((point) => !(Number(point?.amount) || 0));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Doanh nghiệp đang có gói"
          value={formatNumber(data?.activeBusinessCount)}
          hint="Số tài khoản doanh nghiệp hiện có gói còn hiệu lực. Đây là trạng thái hiện tại, không phụ thuộc kỳ phân tích."
          loading={loading}
          valueClassName="text-primary"
        />

        <KpiCard
          label="Doanh thu gói đăng ký trong kỳ"
          value={formatMoney(data?.revenue)}
          hint="Tổng phí gói đăng ký doanh nghiệp đã thanh toán thành công vào doanh thu nền tảng trong kỳ phân tích."
          loading={loading}
          valueClassName="text-success"
        />
      </div>

      <section className="space-y-4 rounded-3xl border border-primary/15 bg-primary/[0.025] p-4 sm:p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">KỲ PHÂN TÍCH</p>
          <h3 className="mt-1 text-xl font-black text-text">Doanh thu và hiệu quả từng gói</h3>
          <p className="mt-1 text-sm text-textLight">
            Khoảng thời gian áp dụng cho doanh thu, lượt thanh toán và biểu đồ trong phần này; cách nhóm chỉ đổi cách gom điểm trên biểu đồ. Mặc định 30 ngày đã hoàn tất gần nhất, không gồm hôm nay.
          </p>
        </div>

        <DashboardPeriodControls
          draft={draft}
          onChange={setDraft}
          onApply={applyPeriod}
          onReset={resetPeriod}
          error={periodError}
        />

        {!loading && data?.period && (
          <div className="rounded-xl border border-primary/10 bg-white px-4 py-3 text-xs leading-5 text-textLight">
            Kỳ đang áp dụng: <strong className="text-text">{formatDashboardDate(data.period.from)}</strong>
            {" → trước "}
            <strong className="text-text">{formatDashboardDate(data.period.toExclusive)}</strong>
            {" · UTC+7"}
            {!period.from && " · Mặc định 30 ngày đã hoàn tất gần nhất, không gồm hôm nay"}
          </div>
        )}

        {state.error && !loading && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm font-semibold text-error">
            <span>{state.error}</span>
            <button
              type="button"
              onClick={() => setRequestVersion((current) => current + 1)}
              className="rounded-lg border border-error bg-white px-3 py-1.5 text-xs font-black text-error"
            >
              Thử lại
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <span className="block h-64 w-full animate-pulse rounded-2xl bg-background" />
            <span className="block h-40 w-full animate-pulse rounded-2xl bg-background" />
          </div>
        ) : (
          data && (
            <>
              {revenueAllZero ? (
                <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
                  <h3 className="text-lg font-black text-text">Doanh thu gói đăng ký theo kỳ</h3>
                  <div className="mt-5 flex min-h-64 items-center justify-center rounded-xl bg-background text-sm font-semibold text-textLight">
                    Không có khoản thanh toán gói đăng ký nào trong kỳ này.
                  </div>
                </section>
              ) : (
                <DashboardLineChart
                  title="Doanh thu gói đăng ký theo kỳ"
                  description="Phí gói đăng ký doanh nghiệp thanh toán thành công, nhóm theo thời điểm giao dịch hoàn tất."
                  rows={revenueRows}
                  series={[{ key: "amount", label: "Doanh thu gói", className: "text-success" }]}
                  valueFormatter={formatMoney}
                  axisValueFormatter={formatCompactMoney}
                />
              )}

              <div className="grid gap-6 xl:grid-cols-2">
                <DashboardHorizontalBarChart
                  title="Doanh nghiệp đang dùng theo gói"
                  description="Số tài khoản doanh nghiệp hiện có gói còn hiệu lực, theo từng gói (trạng thái hiện tại, không phụ thuộc kỳ)."
                  rows={packageRows.map((row) => ({
                    key: row.packageId,
                    label: row.name,
                    count: row.activeBusinessCount,
                  }))}
                  getLabel={(item) => item.label}
                />

                <FinanceAmountBarChart
                  title="Doanh thu theo gói trong kỳ"
                  description="Phí gói đăng ký thanh toán thành công trong kỳ, theo từng gói doanh nghiệp."
                  rows={packageRows.map((row) => ({
                    key: row.packageId,
                    label: row.name,
                    amount: row.revenue,
                  }))}
                  getLabel={(item) => item.label}
                />
              </div>

              <section className="rounded-2xl border border-border bg-white shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-lg font-black text-text">Hiệu quả theo gói doanh nghiệp</h3>
                  <p className="mt-1 text-sm text-textLight">
                    “Doanh nghiệp đang dùng” là trạng thái hiện tại; “Lượt thanh toán” và “Doanh thu” tính trong kỳ đã chọn.
                  </p>
                </div>

                {packageRows.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm font-semibold text-textLight">
                    Chưa có gói doanh nghiệp nào để thống kê.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-background text-xs font-black uppercase tracking-wide text-textLight">
                        <tr>
                          <th className="px-5 py-3">Gói</th>
                          <th className="px-5 py-3">Trạng thái gói</th>
                          <th className="px-5 py-3 text-right">Doanh nghiệp đang dùng</th>
                          <th className="px-5 py-3 text-right">Lượt thanh toán trong kỳ</th>
                          <th className="px-5 py-3 text-right">Doanh thu trong kỳ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {packageRows.map((row) => (
                          <tr key={row.packageId}>
                            <td className="px-5 py-3">
                              <p className="font-bold text-text">{row.name}</p>
                              {row.code && (
                                <p className="mt-0.5 text-xs text-textLight">Mã gói: {row.code}</p>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                  row.isActive
                                    ? "bg-success/10 text-success"
                                    : "bg-textLight/10 text-textLight"
                                }`}
                              >
                                {row.isActive ? "Đang hoạt động" : "Đã tắt"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-text">
                              {formatNumber(row.activeBusinessCount)}
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-text">
                              {formatNumber(row.paidSubscriptions)}
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-success">
                              {formatMoney(row.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )
        )}
      </section>
    </div>
  );
}

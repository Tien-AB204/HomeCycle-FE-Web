import { useEffect, useState } from "react";
import {
  DashboardDonutChart,
  DashboardHorizontalBarChart,
  DashboardLineChart,
} from "../../components/admin/AdminDashboardCharts";
import { FinanceAmountBarChart } from "../../components/admin/AdminFinanceCharts";
import DashboardPeriodControls from "../../components/admin/DashboardPeriodControls";
import {
  DEFAULT_DASHBOARD_PERIOD,
  formatDashboardDate,
  validateDashboardPeriod,
} from "../../utils/dashboardPeriod";

const POST_STATUS_LABELS = {
  draft: "Bản nháp",
  active: "Đang hoạt động",
  suspended: "Bị đình chỉ",
  closed: "Đã đóng",
  deleted: "Đã xóa",
  unspecified: "Chưa xác định",
};

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const statusLabel = (item) =>
  POST_STATUS_LABELS[normalize(item?.key || item?.label)] || "Chưa xác định";

const categoryLabel = (item) =>
  normalize(item?.name) === "unspecified" ? "Chưa phân loại" : item?.name || "Chưa phân loại";

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("vi-VN").format(number)
    : "—";
};

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const KpiCard = ({ label, value, hint, loading, valueClassName = "text-text" }) => (
  <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">{label}</p>
    <p className={`mt-3 text-3xl font-black ${valueClassName}`}>
      {loading ? (
        <span className="inline-block h-9 w-20 animate-pulse rounded-lg bg-background" />
      ) : (
        value
      )}
    </p>
    {hint && <p className="mt-2 text-xs leading-5 text-textLight">{hint}</p>}
  </article>
);

export default function ListingDashboardPanel({ loadDashboard }) {
  const [draft, setDraft] = useState(DEFAULT_DASHBOARD_PERIOD);
  const [period, setPeriod] = useState(DEFAULT_DASHBOARD_PERIOD);
  const [periodError, setPeriodError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState({ requestKey: "", data: null, error: "" });

  const requestKey = JSON.stringify([period, requestVersion]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    loadDashboard({
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
          error: "Không thể tải tổng quan bài đăng lúc này.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadDashboard, period, requestKey]);

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

  const supplyRows = Array.isArray(data?.supplyDemandSeries) ? data.supplyDemandSeries : [];
  const supplyAllZero =
    supplyRows.length > 0 &&
    supplyRows.every(
      (point) => !(Number(point?.newListings) || 0) && !(Number(point?.completedOrders) || 0),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Bài đăng đang bị báo cáo"
          value={formatNumber(data?.currentlyReportedListingCount)}
          hint="Số bài đăng hiện còn báo cáo chưa giải quyết. Đây là trạng thái hiện tại, không phụ thuộc kỳ phân tích."
          loading={loading}
          valueClassName="text-error"
        />

        <KpiCard
          label="Bài đăng mới trong kỳ"
          value={formatNumber(data?.newListingCount)}
          hint="Số bài đăng được tạo trong kỳ phân tích."
          loading={loading}
          valueClassName="text-primary"
        />
      </div>

      <section className="space-y-4 rounded-3xl border border-primary/15 bg-primary/[0.025] p-4 sm:p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">KỲ PHÂN TÍCH</p>
          <h3 className="mt-1 text-xl font-black text-text">Bài đăng và nhu cầu theo kỳ</h3>
          <p className="mt-1 text-sm text-textLight">
            Khoảng thời gian áp dụng cho các chỉ số/biểu đồ trong phần này; cách nhóm chỉ đổi cách gom điểm trên biểu đồ. Mặc định 30 ngày đã hoàn tất gần nhất, không gồm hôm nay.
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
          <div className="grid gap-4 sm:grid-cols-2">
            <span className="block h-64 w-full animate-pulse rounded-2xl bg-background" />
            <span className="block h-64 w-full animate-pulse rounded-2xl bg-background" />
          </div>
        ) : (
          data && (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                <DashboardDonutChart
                  title="Trạng thái hiện tại của bài đăng tạo trong kỳ"
                  description="Bài đăng tạo trong kỳ, phân theo trạng thái hiện tại. HomeCycle không có bước duyệt bài; “Đang hoạt động” không có nghĩa là đã được duyệt."
                  rows={data.statusDistribution}
                  getLabel={statusLabel}
                />

                {supplyAllZero ? (
                  <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
                    <h3 className="text-lg font-black text-text">Bài đăng mới và đơn hoàn tất theo kỳ</h3>
                    <div className="mt-5 flex min-h-64 items-center justify-center rounded-xl bg-background text-sm font-semibold text-textLight">
                      Không có bài đăng mới hay đơn hoàn tất nào trong kỳ này.
                    </div>
                  </section>
                ) : (
                  <DashboardLineChart
                    title="Bài đăng mới và đơn hoàn tất theo kỳ"
                    description="Nguồn cung (bài đăng mới theo ngày tạo) so với nhu cầu đã chốt (đơn hoàn tất theo ngày hoàn tất)."
                    rows={supplyRows}
                    series={[
                      { key: "newListings", label: "Bài đăng mới", className: "text-primary" },
                      { key: "completedOrders", label: "Đơn hoàn tất", className: "text-success" },
                    ]}
                  />
                )}
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <DashboardHorizontalBarChart
                  title="Danh mục có nhiều bài đăng nhất"
                  description="Tối đa 10 danh mục theo số bài đăng tạo trong kỳ."
                  rows={(data.topCategoriesByListings || []).map((item) => ({
                    key: item.categoryId || "unspecified",
                    label: categoryLabel(item),
                    count: item.listingCount,
                  }))}
                  getLabel={(item) => item.label}
                  hideZero
                />

                <FinanceAmountBarChart
                  title="Danh mục có giá trị giao dịch cao nhất"
                  description="Tối đa 10 danh mục theo tổng tiền cuối cùng của đơn hoàn tất trong kỳ; là giá trị mua bán giữa người dùng, không phải doanh thu HomeCycle."
                  rows={(data.topCategoriesByGmv || []).map((item) => ({
                    key: item.categoryId || "unspecified",
                    label: `${categoryLabel(item)} · ${formatNumber(item.completedOrderCount)} đơn`,
                    amount: item.gmv,
                  }))}
                  getLabel={(item) => item.label}
                />
              </div>
            </>
          )
        )}
      </section>
    </div>
  );
}

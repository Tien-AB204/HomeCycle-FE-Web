import { useCallback, useEffect, useState } from "react";
import {
  DashboardDonutChart,
  DashboardLineChart,
} from "../../components/admin/AdminDashboardCharts";
import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import { POST_SECTION_TABS } from "../../constants/adminSections";
import ListingMonitorFilters from "../../features/admin/posts/ListingMonitorFilters";
import {
  EMPTY_LISTING_FILTERS,
  formatDateOnly,
  formatListingDateTime,
  getListingStatusLabel,
} from "../../features/admin/posts/listingMonitorPresentation";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const formatNumber = (value) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("vi-VN").format(value);

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

function KpiCard({ label, value, note, tone = "text-text" }) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-black ${tone}`}>{formatNumber(value)}</p>
      {note && <p className="mt-2 text-xs leading-5 text-textLight">{note}</p>}
    </article>
  );
}

function CategoryBars({ categories }) {
  const rows = Array.isArray(categories) ? categories : [];
  const maxValue = Math.max(
    1,
    ...rows.map((item) => Math.max(item.sellCount || 0, item.buyCount || 0)),
  );

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
      <h3 className="text-lg font-black text-text">Bài đăng theo danh mục</h3>
      <p className="mt-1 text-sm text-textLight">Số bài bán và bài mua của từng danh mục.</p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm font-semibold text-textLight">Chưa có dữ liệu.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {rows.map((item) => (
            <div key={item.categoryId || item.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-bold text-text">
                  {item.name === "Unspecified" || !item.name ? "Chưa xác định" : item.name}
                </span>
                <span className="shrink-0 text-xs font-semibold text-textLight">
                  Bán {formatNumber(item.sellCount)} · Mua {formatNumber(item.buyCount)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-background">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${((item.sellCount || 0) / maxValue) * 100}%` }} />
                </div>
                <div className="h-2 rounded-full bg-background">
                  <div className="h-2 rounded-full bg-warning" style={{ width: `${((item.buyCount || 0) / maxValue) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
          <p className="flex gap-4 text-xs text-textLight">
            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-primary" /> Bán</span>
            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-warning" /> Mua</span>
          </p>
        </div>
      )}
    </section>
  );
}

export default function AdminPostOverviewPage() {
  const [filters, setFilters] = useState({ ...EMPTY_LISTING_FILTERS });
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  const handleFiltersChange = useCallback((next) => setFilters(next), []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    adminDashboardApi
      .getListingMonitorOverview(filters, { signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, data: null, error: "Không thể tải tổng quan bài đăng." });
      });
    return () => controller.abort();
  }, [filters, requestVersion]);

  const data = state.data;
  const growthRows = (Array.isArray(data?.growthSeries) ? data.growthSeries : []).map(
    (item) => ({ from: item.date, sellCount: item.sellCount, buyCount: item.buyCount }),
  );

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <AdminSectionTabs ariaLabel="Khu vực Bài đăng" items={POST_SECTION_TABS} />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">VẬN HÀNH</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Tổng quan bài đăng</h2>
            <p className="mt-2 text-sm text-white/75">
              Bài đăng hiện có (không gồm bản nháp) theo bộ lọc đang chọn.
              {data?.generatedAtUtc ? ` Cập nhật ${formatListingDateTime(data.generatedAtUtc)}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRequestVersion((current) => current + 1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            Làm mới
          </button>
        </div>
      </div>

      <ListingMonitorFilters value={filters} onChange={handleFiltersChange} showPostType />

      {state.error && (
        <div role="alert" className="rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm font-semibold text-error">
          {state.error}
        </div>
      )}

      {state.loading && !data && (
        <p className="text-sm font-semibold text-textLight">Đang tải tổng quan bài đăng...</p>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Tổng bài đăng"
              value={data.totalCount}
              note={`${formatNumber(data.activeCount)} đang hoạt động · ${formatNumber(data.inactiveCount)} không hoạt động`}
            />
            <KpiCard label="Bài bán" value={data.sellCount} tone="text-primary" />
            <KpiCard label="Bài mua" value={data.buyCount} tone="text-warning" />
            <KpiCard
              label="Bài bị báo cáo"
              value={data.currentlyReportedListingCount}
              note="Có báo cáo chưa giải quyết"
              tone={data.currentlyReportedListingCount > 0 ? "text-error" : "text-text"}
            />
          </div>

          {data.unknownPostTypeCount > 0 && (
            <div role="status" className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-3 text-sm font-semibold text-text">
              {formatNumber(data.unknownPostTypeCount)} bài chưa xác định loại mua/bán, nên tổng bài đăng lớn hơn số bài bán cộng bài mua.
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardDonutChart
              title="Trạng thái bài bán"
              description="Tỷ lệ tính trên tổng bài bán."
              rows={data.sellStatusDistribution}
              getLabel={(item) => getListingStatusLabel(item.key)}
            />
            <DashboardDonutChart
              title="Trạng thái bài mua"
              description="Tỷ lệ tính trên tổng bài mua."
              rows={data.buyStatusDistribution}
              getLabel={(item) => getListingStatusLabel(item.key)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardLineChart
              title="Bài đăng mới theo ngày"
              description={
                data.growthPeriod
                  ? `30 ngày đã hoàn tất, ${formatDateOnly(data.growthPeriod.from)} – ${formatDateOnly(data.growthPeriod.toExclusive, -1)}; đếm ngày tạo của các bài hiện có, không phải tăng trưởng ròng.`
                  : "30 ngày đã hoàn tất gần nhất."
              }
              rows={growthRows}
              series={[
                { key: "sellCount", label: "Bài bán", className: "text-primary" },
                { key: "buyCount", label: "Bài mua", className: "text-warning" },
              ]}
            />
            <CategoryBars categories={data.categories} />
          </div>
        </>
      )}
    </section>
  );
}

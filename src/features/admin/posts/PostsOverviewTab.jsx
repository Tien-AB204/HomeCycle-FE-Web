import { useEffect, useMemo, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { formatDayKey } from "../operations/operationsPresentation";
import { GroupedBarChart } from "../redesign/HcCharts";
import PostTable from "./PostTable";
import { POST_STATES, countOf, isCanceled, num, pct } from "./postsAdminPresentation";

const SERIES = [
  { key: "sell", label: "Tin bán mới", color: "var(--teal)" },
  { key: "buy", label: "Tin mua mới", color: "var(--blue)" },
];

const addDays = (dayKey, days) => {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

function Metric({ label, value, caption, tone = "" }) {
  return (
    <article className={`metric ${tone}`}>
      <p className="label">{label}</p>
      <div className="value">{num(value)}</div>
      <small>{caption}</small>
    </article>
  );
}

export default function PostsOverviewTab({ onOpenList, onOpenPost }) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [latest, setLatest] = useState({ loading: true, items: [] });
  const [days, setDays] = useState(30);
  const [group, setGroup] = useState("week");

  useEffect(() => {
    const controller = new AbortController();
    adminDashboardApi
      .getListingMonitorOverview({}, { signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (!isCanceled(error)) setState({ loading: false, data: null, error: "Không thể tải tổng quan bài đăng." });
      });
    adminDashboardApi
      .getListingMonitorItems({ SortBy: "Newest", PageNumber: 1, PageSize: 5 }, { signal: controller.signal })
      .then((page) => setLatest({ loading: false, items: Array.isArray(page?.items) ? page.items : [] }))
      .catch((error) => {
        if (!isCanceled(error)) setLatest({ loading: false, items: [] });
      });
    return () => controller.abort();
  }, []);

  const data = state.data;
  const total = Number(data?.totalCount) || 0;
  const sell = Number(data?.sellCount) || 0;
  const buy = Number(data?.buyCount) || 0;
  const statusRows = POST_STATES.map(([key, label, color]) => ({
    key,
    label,
    color,
    sell: countOf(data?.sellStatusDistribution, key),
    buy: countOf(data?.buyStatusDistribution, key),
  }));

  // BE trả cố định 30 ngày đã hoàn tất theo ngày; 7 ngày và gom tuần tính ở giao diện.
  const period = useMemo(() => {
    const series = (Array.isArray(data?.growthSeries) ? data.growthSeries : [])
      .map((point) => ({ date: String(point.date).slice(0, 10), sell: Number(point.sellCount) || 0, buy: Number(point.buyCount) || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);
    const step = group === "week" ? 7 : 1;
    const rows = [];
    for (let index = 0; index < series.length; index += step) {
      const chunk = series.slice(index, index + step);
      rows.push({
        from: chunk[0].date,
        last: chunk[chunk.length - 1].date,
        sell: chunk.reduce((sum, point) => sum + point.sell, 0),
        buy: chunk.reduce((sum, point) => sum + point.buy, 0),
      });
    }
    const from = series[0]?.date;
    const to = series.length ? addDays(series[series.length - 1].date, 1) : "";
    return {
      rows,
      from,
      to,
      sell: series.reduce((sum, point) => sum + point.sell, 0),
      buy: series.reduce((sum, point) => sum + point.buy, 0),
    };
  }, [data, days, group]);

  return (
    <section>
      <div className="heading">
        <div>
          <h1>Tổng quan bài đăng</h1>
          <p className="muted">Thống kê tin bán, tin mua và trạng thái hiện tại.</p>
        </div>
      </div>

      {state.error && <div className="empty">{state.error}</div>}
      {!state.error && !data && <div className="empty">Đang tải dữ liệu...</div>}
      {data && (
        <>
          <div className="stats" aria-live="polite">
            <Metric label="Tổng bài đã đăng" value={total} caption="Toàn hệ thống · không gồm nháp" />
            <Metric label="Tin bán" value={sell} caption="Bài đăng chào bán sản phẩm" />
            <Metric label="Tin mua" value={buy} caption="Bài đăng tìm mua sản phẩm" tone="blue" />
            <Metric label="Bài có báo cáo chưa giải quyết" value={data.currentlyReportedListingCount} caption="Mỗi bài chỉ tính một lần" tone="red" />
          </div>

          <div className="grid">
            <section className="panel">
              <div className="panel-head">
                <h2>Bài đăng theo trạng thái</h2>
                <span className="chip">Toàn hệ thống</span>
              </div>
              {statusRows.map((row) => {
                const count = row.sell + row.buy;
                return (
                  <div className="barrow" key={row.key}>
                    <div className="barlabel">
                      <button type="button" className="text" onClick={() => onOpenList({ Status: row.key })}>{row.label}</button>
                      <strong>{num(count)} bài</strong>
                    </div>
                    <div className="track"><i style={{ width: `${total ? (count / total) * 100 : 0}%`, background: row.color }} /></div>
                    <span className="percent">{pct(count, total)}</span>
                  </div>
                );
              })}
              <p className="note">Không gồm bản nháp. Bài đã đóng không đồng nghĩa đã bán thành công.</p>
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Tin bán & tin mua</h2>
                <span className="chip">Toàn hệ thống</span>
              </div>
              <div className="type-split">
                {[
                  ["Sell", "Tin bán", sell],
                  ["Buy", "Tin mua", buy],
                ].map(([key, label, count]) => (
                  <button type="button" key={key} onClick={() => onOpenList({ PostType: key })}>
                    <span>{label}<small>{pct(count, total)} tổng bài đăng</small></span>
                    <strong>{num(count)}</strong>
                  </button>
                ))}
              </div>
              <div className="tablewrap" style={{ marginTop: 18 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Trạng thái</th>
                      <th className="right">Tin bán</th>
                      <th className="right">Tin mua</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td className="right">{num(row.sell)}</td>
                        <td className="right">{num(row.buy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="period-section">
            <div className="section-head"><h2>Bài đăng mới theo kỳ</h2></div>
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
                  <option value="week">Theo tuần</option>
                  <option value="day">Theo ngày</option>
                </select>
              </label>
              {period.from && <span className="muted">{formatDayKey(period.from)} → trước {formatDayKey(period.to)} · UTC+7</span>}
            </div>
            <div className="period-summary">
              <Metric label="Tin bán mới trong kỳ" value={period.sell} caption="Bài chào bán được tạo trong kỳ" />
              <Metric label="Tin mua mới trong kỳ" value={period.buy} caption="Bài tìm mua được tạo trong kỳ" tone="blue" />
            </div>
            <div className="grid">
              <section className="panel">
                <h2>Tin bán mới & tin mua mới</h2>
                <div className="legend">
                  <span><i className="dot" />Tin bán mới</span>
                  <span><i className="dot" style={{ background: "var(--blue)" }} />Tin mua mới</span>
                </div>
                <GroupedBarChart rows={period.rows} series={SERIES} height={250} />
                <p className="note">Số tin bán và tin mua được tạo trong từng ngày hoặc tuần, tính trên bài hiện không phải bản nháp.</p>
              </section>
            </div>
          </section>
        </>
      )}

      <section className="panel preview">
        <div className="section-head">
          <h2>Bài đăng mới nhất</h2>
          <button type="button" className="text" onClick={() => onOpenList({})}>Xem tất cả →</button>
        </div>
        {latest.loading ? <div className="empty">Đang tải dữ liệu...</div> : <PostTable rows={latest.items} onOpen={onOpenPost} />}
      </section>
    </section>
  );
}

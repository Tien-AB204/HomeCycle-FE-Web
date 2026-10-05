import { useLayoutEffect, useRef, useState } from "react";

const num = (value) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const money = (value) => `${num(value)} ₫`;
const pct = (count, total) =>
  total ? `${(count / total * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "—";
const shortDate = (dayKey) => (dayKey ? `${dayKey.slice(8, 10)}/${dayKey.slice(5, 7)}` : "");

function useWidth(min = 260) {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(min, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [min]);
  return [ref, width];
}

/*
 * Biểu đồ cột nhóm theo kỳ (chép từ hàm chart() của bản mô phỏng).
 * rows: [{ from, last, [series.key]: number }]
 */
export function GroupedBarChart({ rows, series, moneyChart = false, height = 225 }) {
  const [ref, width] = useWidth();
  const left = moneyChart ? 55 : 38;
  const right = 18;
  const top = 22;
  const bottom = 35;

  if (!rows.length) {
    return <div ref={ref} className="empty">Chưa có dữ liệu trong kỳ.</div>;
  }

  const max = Math.max(1, ...rows.flatMap((row) => series.map((item) => Number(row[item.key]) || 0)));
  const unit = max > 100000 ? 100000 : 10000;
  const ceiling = moneyChart ? Math.ceil(max / unit) * unit : Math.ceil(max / 2) * 2;
  const slot = (width - left - right) / rows.length;
  const y = (value) => height - bottom - (value * (height - top - bottom)) / ceiling;
  const axisLabel = (value) => (moneyChart ? (ceiling >= 1000000 ? num(value / 1000000) : num(value / 1000)) : num(value));
  const barWidth = Math.max(2, Math.min(25, slot / (series.length + 1)));
  const ticks =
    rows.length <= 6
      ? rows.map((_, index) => index)
      : [...new Set([0, Math.floor((rows.length - 1) / 3), Math.floor(((rows.length - 1) * 2) / 3), rows.length - 1])];

  return (
    <div ref={ref}>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${series.map((item) => item.label).join(" và ")} theo thời gian`}>
        <text x={left} y="12">{moneyChart ? (ceiling >= 1000000 ? "Triệu đồng" : "Nghìn đồng") : "Số lượng"}</text>
        {[0, ceiling / 2, ceiling].map((value) => (
          <g key={value}>
            <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="var(--line)" />
            <text x={left - 8} y={y(value) + 4} textAnchor="end">{axisLabel(value)}</text>
          </g>
        ))}
        {rows.map((row, index) =>
          series.map((item, column) => {
            const value = Number(row[item.key]) || 0;
            const x = left + slot * (index + 0.5) + (column - (series.length - 1) / 2) * barWidth - barWidth / 2;
            return (
              <rect key={`${row.from}-${item.key}`} x={x} y={y(value)} width={Math.max(1, barWidth - 2)} height={height - bottom - y(value)} rx="2" fill={item.color}>
                <title>{`${shortDate(row.from)}–${shortDate(row.last || row.from)} · ${item.label}: ${moneyChart ? money(value) : num(value)}`}</title>
              </rect>
            );
          }),
        )}
        {ticks.map((index) => (
          <text key={index} x={left + slot * (index + 0.5)} y={height - 10} textAnchor="middle">{shortDate(rows[index].from)}</text>
        ))}
      </svg>
    </div>
  );
}

// Vòng tròn có tổng ở giữa và chú giải (conic-gradient như bản mô phỏng).
export function RingChart({ rows, total, unit }) {
  const stops = rows
    .filter((row) => row.count > 0 && total > 0)
    .reduce(
      (result, row) => {
        const to = result.angle + (row.count / total) * 360;
        return { angle: to, stops: [...result.stops, `${row.color} ${result.angle}deg ${to}deg`] };
      },
      { angle: 0, stops: [] },
    ).stops;

  return (
    <div className="donut-layout">
      <div
        className="ring"
        role="img"
        aria-label={`${total} ${unit}: ${rows.map((row) => `${row.label} ${row.count}`).join(", ")}`}
        style={{ background: stops.length ? `conic-gradient(${stops.join(",")})` : "#edf1f3" }}
      >
        <div className="ring-inner">
          <strong>{num(total)}</strong>
          <span>{unit}</span>
        </div>
      </div>
      <div className="ring-legend">
        {rows.map((row) => (
          <div className="ring-row" key={row.key}>
            <span><i className="dot" style={{ background: row.color }} />{row.label}</span>
            <strong>{num(row.count)}</strong>
            <span>{pct(row.count, total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Thanh ngang gọn: nhãn + số ở trên, thanh và phần trăm ở dưới.
export function CompactBars({ rows, total, unit = "", onSelect }) {
  if (!rows.length) return <div className="empty">Chưa có dữ liệu.</div>;
  return rows.map((row) => (
    <div className="ov-barrow" key={row.key}>
      <div className="barlabel">
        {onSelect ? (
          <button type="button" className="text" style={{ padding: 0, fontSize: 12 }} onClick={() => onSelect(row.key)}>{row.label}</button>
        ) : (
          <span>{row.label}</span>
        )}
        <strong>{num(row.count)}{unit ? ` ${unit}` : ""}</strong>
      </div>
      <div className="ov-track">
        <i style={{ width: `${total ? (row.count / total) * 100 : 0}%`, background: row.color || "var(--teal)" }} />
      </div>
      <span className="percent">{pct(row.count, total)}</span>
    </div>
  ));
}

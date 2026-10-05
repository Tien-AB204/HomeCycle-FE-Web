/*
 * Khối giao diện dùng chung cho các trang Đơn hàng / Lịch hẹn / Ví của tài
 * khoản doanh nghiệp: thẻ số liệu, vòng trạng thái và nút chọn nhóm.
 */

const formatPercent = (count, total) =>
  total
    ? `${((count / total) * 100).toLocaleString("vi-VN", {
        maximumFractionDigits: 1,
      })}%`
    : "0%";

export function WorkspaceHeader({ title, description, children }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          Không gian doanh nghiệp
        </p>
        <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-textLight">{description}</p>
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  );
}

export function MetricTile({
  label,
  value,
  caption,
  highlighted = false,
  active = false,
  tone = "text-text",
  onClick,
}) {
  const className = [
    "min-w-0 rounded-2xl border p-4 text-left transition sm:p-5",
    highlighted
      ? "border-primary/20 bg-primary/5"
      : "border-border bg-white",
    active ? "ring-2 ring-primary/40" : "",
    onClick ? "hover:border-primary/40 hover:shadow-sm" : "",
  ].join(" ");

  const content = (
    <>
      <span className="block text-xs font-bold text-textLight">{label}</span>
      <strong
        className={`mt-2 block truncate text-2xl font-black tabular-nums sm:text-[28px] ${tone}`}
      >
        {value}
      </strong>
      {caption && (
        <span className="mt-1 block text-[11px] font-semibold text-textLight">
          {caption}
        </span>
      )}
    </>
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={className}
    >
      {content}
    </button>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-xl bg-primary/10 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={[
            "rounded-lg px-3.5 py-1.5 text-xs font-black transition",
            value === option.value
              ? "bg-white text-primary shadow-sm"
              : "text-textLight hover:text-primary",
          ].join(" ")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/*
 * rows: [{ key, label, color, count }]. Bấm một dòng chú giải để lọc danh
 * sách theo trạng thái đó.
 */
export function StatusRing({ rows, unit, activeKey, onSelect }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const stops = rows
    .filter((row) => row.count > 0)
    .reduce(
      (result, row) => {
        const end = result.angle + (row.count / total) * 360;
        return {
          angle: end,
          stops: [...result.stops, `${row.color} ${result.angle}deg ${end}deg`],
        };
      },
      { angle: 0, stops: [] },
    ).stops;

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[176px_minmax(0,1fr)]">
      <div
        role="img"
        aria-label={`${total} ${unit}: ${rows
          .map((row) => `${row.label} ${row.count}`)
          .join(", ")}`}
        className="mx-auto grid h-44 w-44 place-items-center rounded-full"
        style={{
          background: stops.length
            ? `conic-gradient(${stops.join(",")})`
            : "#edf2ef",
        }}
      >
        <div className="grid h-32 w-32 place-content-center rounded-full bg-white text-center">
          <strong className="text-3xl font-black tabular-nums text-text">
            {total}
          </strong>
          <span className="text-xs font-semibold text-textLight">{unit}</span>
        </div>
      </div>

      <div className="grid gap-1">
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => onSelect?.(row.key)}
            aria-pressed={activeKey === row.key}
            className={[
              "flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-background",
              activeKey === row.key ? "bg-background" : "",
            ].join(" ")}
          >
            <span className="flex min-w-0 items-center gap-2 font-semibold text-text">
              <i
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: row.color }}
                aria-hidden="true"
              />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <strong className="text-text">{row.count}</strong>
              <small className="ml-2 text-textLight">
                {formatPercent(row.count, total)}
              </small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function WorkspacePanel({ title, description, aside, children, id }) {
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-56 rounded-2xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-text">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-textLight">{description}</p>
          )}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

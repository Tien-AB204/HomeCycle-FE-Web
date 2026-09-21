const GROUP_OPTIONS = [
  { value: "Day", label: "Mỗi ngày" },
  { value: "Week", label: "Mỗi tuần" },
  { value: "Month", label: "Mỗi tháng" },
];

const inputClassName =
  "mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary";

export default function DashboardPeriodControls({
  draft,
  onChange,
  onApply,
  onReset,
  error,
}) {
  return (
    <form
      onSubmit={onApply}
      className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.04)]"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">Từ ngày</span>
          <input
            type="date"
            value={draft.from}
            onChange={(event) => onChange({ ...draft, from: event.target.value })}
            className={inputClassName}
          />
        </label>

        <label>
          <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">Đến ngày</span>
          <input
            type="date"
            value={draft.to}
            onChange={(event) => onChange({ ...draft, to: event.target.value })}
            className={inputClassName}
          />
        </label>

        <label>
          <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">Nhóm biểu đồ theo</span>
          <select
            value={draft.groupBy}
            onChange={(event) => onChange({ ...draft, groupBy: event.target.value })}
            className={inputClassName}
          >
            {GROUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90"
        >
          Áp dụng kỳ
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-black text-text transition hover:bg-background"
        >
          Mặc định kỳ
        </button>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
    </form>
  );
}

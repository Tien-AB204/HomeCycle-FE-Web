import { formatRemainingTime } from "../../utils/formatter";

const WARNING_THRESHOLD_MS = 60_000;

const TONE_CLASSES = {
  normal: "border-primary/25 bg-primary/5 text-primary",
  warning: "border-warning/30 bg-warning/10 text-warning",
  expired: "border-error/25 bg-error/5 text-error",
};

/*
 * Khối đếm ngược theo kết quả của useDeadlineCountdown.
 * compact: bản gọn một dòng khi chi tiết đã nằm ở chỗ khác.
 */
export default function DeadlineBanner({
  countdown,
  label,
  expiredText,
  note,
  compact = false,
  className = "",
}) {
  if (!countdown?.hasDeadline || countdown.remainingMs === null) {
    return null;
  }

  const { isExpired, remainingMs } = countdown;
  const isWarning = !isExpired && remainingMs <= WARNING_THRESHOLD_MS;
  const tone = isExpired ? "expired" : isWarning ? "warning" : "normal";

  return (
    <div
      role="timer"
      aria-live={isExpired || isWarning ? "polite" : "off"}
      className={`rounded-xl border ${TONE_CLASSES[tone]} ${
        compact ? "inline-flex px-3 py-1.5" : "px-4 py-3"
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: compact ? 16 : 20 }}
          aria-hidden="true"
        >
          {isExpired ? "error" : "schedule"}
        </span>
        <p className={`font-bold ${compact ? "text-xs" : "text-sm"}`}>
          {isExpired ? (
            expiredText
          ) : (
            <>
              {label}:{" "}
              <span className="font-black tabular-nums">
                {formatRemainingTime(remainingMs)}
              </span>
            </>
          )}
        </p>
      </div>

      {note && !isExpired && !compact && (
        <p className="mt-1 text-xs leading-5 text-textLight">{note}</p>
      )}
    </div>
  );
}

/*
 * Nhãn đếm ngược nhỏ cho thẻ trong danh sách, dùng với useServerNowTicker.
 */
export function DeadlineChip({
  remainingMs,
  label = "Còn",
  expiredText = "Đã hết hạn",
  className = "",
}) {
  if (remainingMs === null || remainingMs === undefined) {
    return null;
  }

  const isExpired = remainingMs <= 0;
  const isWarning = !isExpired && remainingMs <= WARNING_THRESHOLD_MS;
  const tone = isExpired ? "expired" : isWarning ? "warning" : "normal";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${TONE_CLASSES[tone]} ${className}`}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 14 }}
        aria-hidden="true"
      >
        {isExpired ? "error" : "schedule"}
      </span>
      {isExpired ? expiredText : `${label} ${formatRemainingTime(remainingMs)}`}
    </span>
  );
}

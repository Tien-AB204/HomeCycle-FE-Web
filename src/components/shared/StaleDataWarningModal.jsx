import { useEffect, useId, useRef } from "react";

export default function StaleDataWarningModal({
  open,
  title = "Thông tin vừa được cập nhật",
  message,
  changedFields = [],
  onAcknowledge,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const acknowledgeButtonRef = useRef(null);

  useEffect(() => {
    if (open) {
      acknowledgeButtonRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-warning/20 bg-white shadow-[0_26px_80px_rgba(24,63,65,0.28)]"
      >
        <div className="flex items-start gap-4 px-6 pb-5 pt-6">
          <span
            className="material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-[26px] text-warning"
            aria-hidden="true"
          >
            warning
          </span>

          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black text-text">
              {title}
            </h2>
            <p
              id={descriptionId}
              className="mt-2 text-sm leading-6 text-textLight"
            >
              {message}
            </p>

            {changedFields.length > 0 && (
              <div className="mt-4 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wide text-warning">
                  Nội dung đã thay đổi
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm font-semibold text-warning">
                  {changedFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-border bg-background px-6 py-4">
          <button
            ref={acknowledgeButtonRef}
            type="button"
            onClick={onAcknowledge}
            className="min-w-24 rounded-xl bg-warning px-5 py-2.5 text-sm font-black text-white transition hover:bg-warning focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
          >
            OK
          </button>
        </div>
      </section>
    </div>
  );
}

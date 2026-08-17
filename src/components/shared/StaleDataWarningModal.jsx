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
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#102F31]/55 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_26px_80px_rgba(24,63,65,0.28)]"
      >
        <div className="flex items-start gap-4 px-6 pb-5 pt-6">
          <span
            className="material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[26px] text-amber-700"
            aria-hidden="true"
          >
            warning
          </span>

          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black text-[#183F41]">
              {title}
            </h2>
            <p
              id={descriptionId}
              className="mt-2 text-sm leading-6 text-[#5F7473]"
            >
              {message}
            </p>

            {changedFields.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wide text-amber-800">
                  Nội dung đã thay đổi
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm font-semibold text-amber-900">
                  {changedFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-[#E2ECE9] bg-[#F8FBFA] px-6 py-4">
          <button
            ref={acknowledgeButtonRef}
            type="button"
            onClick={onAcknowledge}
            className="min-w-24 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            OK
          </button>
        </div>
      </section>
    </div>
  );
}

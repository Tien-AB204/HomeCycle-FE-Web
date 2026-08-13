export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  tone = "danger",
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) {
    return null;
  }

  const isDanger = tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#102F31]/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D6E5E1] bg-white shadow-[0_24px_70px_rgba(24,63,65,0.22)]"
      >
        <div className="flex items-start gap-4 px-6 pb-5 pt-6">
          <span
            className={`material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[25px] ${
              isDanger
                ? "bg-[#FFF0EE] text-[#B7352D]"
                : "bg-[#EAF6F0] text-[#28784F]"
            }`}
            aria-hidden="true"
          >
            {isDanger ? "visibility_off" : "visibility"}
          </span>

          <div className="min-w-0">
            <h2 id="confirm-action-title" className="text-lg font-black text-[#183F41]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#68807F]">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#E2ECE9] bg-[#F8FBFA] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-[#BDD2CE] bg-white px-4 py-2.5 text-sm font-black text-[#315F61] transition hover:bg-[#EEF6F4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? "bg-[#B7352D] hover:bg-[#942B25]"
                : "bg-[#28784F] hover:bg-[#1F6340]"
            }`}
          >
            {busy && (
              <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">
                progress_activity
              </span>
            )}
            {busy ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

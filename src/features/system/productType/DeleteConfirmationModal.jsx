export default function DeleteConfirmationModal({
  title,
  message,
  confirmText = "Xóa",
  onCancel,
  onConfirm,
  confirming = false,
  error = "",
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !confirming
        ) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirmation-title"
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined rounded-full bg-error/10 p-2 text-error">
              warning
            </span>

            <div>
              <h3
                id="delete-confirmation-title"
                className="text-lg font-bold text-text"
              >
                {title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-textLight">
                {message}
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 whitespace-pre-line rounded-lg border border-error/20 bg-error/10 p-4 text-sm text-error"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-background px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex items-center gap-2 rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition hover:bg-error disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming && (
              <span className="material-symbols-outlined animate-spin text-[18px]">
                refresh
              </span>
            )}

            {confirming
              ? "Đang xóa..."
              : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
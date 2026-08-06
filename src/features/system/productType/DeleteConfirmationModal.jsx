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
            <span className="material-symbols-outlined rounded-full bg-red-100 p-2 text-red-600">
              warning
            </span>

            <div>
              <h3
                id="delete-confirmation-title"
                className="text-lg font-bold text-gray-800"
              >
                {title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {message}
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
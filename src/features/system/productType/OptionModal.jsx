import { useState } from "react";

const normalizeValue = (value) => {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi");
};

export default function OptionModal({
  attributeName = "",
  editingOption = null,
  existingOptions = [],
  defaultDisplayOrder = 1,
  onClose,
  onSubmit,
  submitting = false,
  serverError = "",
}) {
  const isEditing = Boolean(
    editingOption?.optionId,
  );

  const [form, setForm] = useState(
    () => ({
      optionValue:
        editingOption?.optionValue ||
        "",
      displayOrder:
        editingOption?.displayOrder ??
        defaultDisplayOrder,
    }),
  );

  const [
    clientError,
    setClientError,
  ] = useState("");

  const handleFieldChange = (
    event,
  ) => {
    const { name, value } =
      event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setClientError("");
  };

  const validateForm = () => {
    const optionValue =
      form.optionValue.trim();

    if (!optionValue) {
      return "Vui lòng nhập giá trị tùy chọn.";
    }

    const normalizedOptionValue =
      normalizeValue(optionValue);

    const hasDuplicate =
      existingOptions.some(
        (option) => {
          if (
            option.optionId ===
            editingOption?.optionId
          ) {
            return false;
          }

          return (
            normalizeValue(
              option.optionValue,
            ) ===
            normalizedOptionValue
          );
        },
      );

    if (hasDuplicate) {
      return "Giá trị tùy chọn không được trùng nhau.";
    }

    const displayOrder = Number(
      form.displayOrder,
    );

    if (
      !Number.isInteger(displayOrder) ||
      displayOrder < 0
    ) {
      return "Thứ tự hiển thị phải là số nguyên không âm.";
    }

    return "";
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      setClientError(
        validationError,
      );

      return;
    }

    setClientError("");

    await onSubmit({
      optionValue:
        form.optionValue.trim(),
      displayOrder: Number(
        form.displayOrder,
      ),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="option-modal-title"
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div>
            <h3
              id="option-modal-title"
              className="text-xl font-bold text-gray-800"
            >
              {isEditing
                ? "Chỉnh sửa tùy chọn"
                : "Thêm tùy chọn"}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Thuộc tính:{" "}
              <span className="font-medium text-gray-700">
                {attributeName}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng cửa sổ"
            className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            {(clientError ||
              serverError) && (
              <div
                role="alert"
                className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {clientError ||
                  serverError}
              </div>
            )}

            <div>
              <label
                htmlFor="option-value"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Giá trị tùy chọn{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <input
                id="option-value"
                name="optionValue"
                type="text"
                value={
                  form.optionValue
                }
                onChange={
                  handleFieldChange
                }
                disabled={submitting}
                maxLength={150}
                autoFocus
                placeholder="Ví dụ: 65 inch"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="option-display-order"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Thứ tự hiển thị{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <input
                id="option-display-order"
                name="displayOrder"
                type="number"
                min={0}
                step={1}
                value={
                  form.displayOrder
                }
                onChange={
                  handleFieldChange
                }
                disabled={submitting}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  refresh
                </span>
              )}

              {submitting
                ? isEditing
                  ? "Đang lưu..."
                  : "Đang thêm..."
                : isEditing
                  ? "Lưu thay đổi"
                  : "Thêm tùy chọn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
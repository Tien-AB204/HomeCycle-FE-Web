import { useState } from "react";

const getInitialFormData = (
  editingCategory,
) => {
  return {
    categoryName:
      editingCategory?.categoryName ||
      "",
    description:
      editingCategory?.description ||
      "",
    isActive:
      editingCategory?.isActive ??
      true,
  };
};

export default function CategoryModal({
  onClose,
  onSubmit,
  editingCategory = null,
  submitting = false,
  serverError = "",
}) {
  const [formData, setFormData] =
    useState(() =>
      getInitialFormData(
        editingCategory,
      ),
    );

  const [
    validationError,
    setValidationError,
  ] = useState("");

  const isEditing =
    Boolean(editingCategory);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData(
      (currentFormData) => ({
        ...currentFormData,
        [name]: value,
      }),
    );

    if (validationError) {
      setValidationError("");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const categoryName =
      formData.categoryName.trim();

    const description =
      formData.description.trim();

    if (!categoryName) {
      setValidationError(
        "Vui lòng nhập tên danh mục.",
      );

      return;
    }

    onSubmit({
      categoryName,
      description,
      isActive:
        formData.isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h3
          id="category-modal-title"
          className="mb-4 text-lg font-bold text-text"
        >
          {isEditing
            ? "Chỉnh sửa danh mục"
            : "Thêm danh mục mới"}
        </h3>

        {(validationError ||
          serverError) && (
          <div
            role="alert"
            className="mb-4 whitespace-pre-line rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error"
          >
            {validationError ||
              serverError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="category-name"
              className="mb-1 block text-sm font-medium text-text"
            >
              Tên danh mục{" "}
              <span className="text-error">
                *
              </span>
            </label>

            <input
              id="category-name"
              name="categoryName"
              type="text"
              required
              autoFocus
              disabled={submitting}
              value={
                formData.categoryName
              }
              onChange={handleChange}
              placeholder="Ví dụ: Đồ điện lạnh"
              className="w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-background"
            />
          </div>

          <div>
            <label
              htmlFor="category-description"
              className="mb-1 block text-sm font-medium text-text"
            >
              Mô tả
            </label>

            <textarea
              id="category-description"
              name="description"
              rows={4}
              disabled={submitting}
              value={
                formData.description
              }
              onChange={handleChange}
              placeholder="Mô tả ngắn về danh mục..."
              className="w-full resize-none rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-background"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-textLight transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-w-28 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  refresh
                </span>
              )}

              {submitting
                ? isEditing
                  ? "Đang cập nhật..."
                  : "Đang tạo..."
                : isEditing
                  ? "Cập nhật"
                  : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

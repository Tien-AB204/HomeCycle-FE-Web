import { useState } from "react";

const getInitialFormData = (
  editingBrand,
) => {
  return {
    brandName:
      editingBrand?.brandName || "",
    description:
      editingBrand?.description || "",
    isActive:
      editingBrand?.isActive ?? true,
  };
};

export default function BrandModal({
  onClose,
  onSubmit,
  editingBrand = null,
  submitting = false,
  serverError = "",
}) {
  const [formData, setFormData] =
    useState(() =>
      getInitialFormData(
        editingBrand,
      ),
    );

  const [
    validationError,
    setValidationError,
  ] = useState("");

  const isEditing =
    Boolean(editingBrand);

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

    const brandName =
      formData.brandName.trim();

    const description =
      formData.description.trim();

    if (!brandName) {
      setValidationError(
        "Vui lòng nhập tên thương hiệu.",
      );

      return;
    }

    onSubmit({
      brandName,
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
        aria-labelledby="brand-modal-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h3
          id="brand-modal-title"
          className="mb-4 text-lg font-bold text-gray-800"
        >
          {isEditing
            ? "Chỉnh sửa thương hiệu"
            : "Thêm thương hiệu mới"}
        </h3>

        {(validationError ||
          serverError) && (
          <div
            role="alert"
            className="mb-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
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
              htmlFor="brand-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Tên thương hiệu{" "}
              <span className="text-red-500">
                *
              </span>
            </label>

            <input
              id="brand-name"
              name="brandName"
              type="text"
              required
              autoFocus
              disabled={submitting}
              value={formData.brandName}
              onChange={handleChange}
              placeholder="Ví dụ: Samsung"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="brand-description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Mô tả
            </label>

            <textarea
              id="brand-description"
              name="description"
              rows={4}
              disabled={submitting}
              value={
                formData.description
              }
              onChange={handleChange}
              placeholder="Mô tả ngắn về thương hiệu..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-w-28 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
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

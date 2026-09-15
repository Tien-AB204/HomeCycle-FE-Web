import {
  useEffect,
  useState,
} from "react";

const TARGET_TYPE_OPTIONS = [
  { value: "Order", label: "Đơn hàng" },
  { value: "Review", label: "Đánh giá" },
  { value: "Post", label: "Bài đăng" },
  { value: "Appointment", label: "Lịch hẹn" },
];

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

const getInitialFormData = (
  editingCategory,
) => ({
  code:
    editingCategory?.code || "",
  name:
    editingCategory?.name || "",
  description:
    editingCategory?.description || "",
  targetTypes: Array.isArray(
    editingCategory?.targetTypes,
  )
    ? editingCategory.targetTypes
    : [],
});

export default function DisputeCategoryModal({
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

  useEffect(() => {
    const handleKeyDown = (
      event,
    ) => {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  }, [onClose, submitting]);

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      }),
    );

    if (validationError) {
      setValidationError("");
    }
  };

  const toggleTargetType = (
    value,
  ) => {
    setFormData((current) => {
      const has =
        current.targetTypes.includes(
          value,
        );

      return {
        ...current,
        targetTypes: has
          ? current.targetTypes.filter(
              (item) =>
                item !== value,
            )
          : [
              ...current.targetTypes,
              value,
            ],
      };
    });

    if (validationError) {
      setValidationError("");
    }
  };

  const handleSubmit = (
    event,
  ) => {
    event.preventDefault();

    const code = formData.code
      .trim()
      .toUpperCase();

    const name =
      formData.name.trim();

    const description =
      formData.description.trim();

    if (!isEditing) {
      if (!code) {
        setValidationError(
          "Vui lòng nhập mã danh mục.",
        );

        return;
      }

      if (!CODE_PATTERN.test(code)) {
        setValidationError(
          "Mã chỉ được chứa chữ, số và dấu gạch dưới, bắt đầu bằng chữ cái.",
        );

        return;
      }
    }

    if (!name) {
      setValidationError(
        "Vui lòng nhập tên danh mục.",
      );

      return;
    }

    if (
      formData.targetTypes
        .length === 0
    ) {
      setValidationError(
        "Vui lòng chọn ít nhất một đối tượng áp dụng.",
      );

      return;
    }

    if (isEditing) {
      onSubmit({
        name,
        description,
        targetTypes:
          formData.targetTypes,
      });
    } else {
      onSubmit({
        code,
        name,
        description,
        targetTypes:
          formData.targetTypes,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
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
        aria-labelledby="dispute-category-modal-title"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h3
          id="dispute-category-modal-title"
          className="mb-4 text-lg font-bold text-text"
        >
          {isEditing
            ? "Chỉnh sửa danh mục tranh chấp"
            : "Tạo danh mục tranh chấp"}
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
              htmlFor="dispute-category-code"
              className="mb-1 block text-sm font-medium text-text"
            >
              Mã{" "}
              <span className="text-error">
                *
              </span>
            </label>

            <input
              id="dispute-category-code"
              name="code"
              type="text"
              required
              autoFocus={!isEditing}
              disabled={
                submitting ||
                isEditing
              }
              value={formData.code}
              onChange={handleChange}
              placeholder="Ví dụ: WRONG_ACCESSORIES"
              className="w-full rounded-lg border border-border px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-background disabled:text-textLight"
            />

            {isEditing && (
              <p className="mt-1 text-xs text-textLight">
                Mã danh mục không thể thay đổi sau khi tạo.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="dispute-category-name"
              className="mb-1 block text-sm font-medium text-text"
            >
              Tên{" "}
              <span className="text-error">
                *
              </span>
            </label>

            <input
              id="dispute-category-name"
              name="name"
              type="text"
              required
              autoFocus={isEditing}
              disabled={submitting}
              value={formData.name}
              onChange={handleChange}
              placeholder="Ví dụ: Sai phụ kiện"
              className="w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-background"
            />
          </div>

          <div>
            <label
              htmlFor="dispute-category-description"
              className="mb-1 block text-sm font-medium text-text"
            >
              Mô tả
            </label>

            <textarea
              id="dispute-category-description"
              name="description"
              rows={3}
              disabled={submitting}
              value={
                formData.description
              }
              onChange={handleChange}
              placeholder="Mô tả ngắn về danh mục tranh chấp..."
              className="w-full resize-none rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-background"
            />
          </div>

          <div>
            <p className="mb-1.5 block text-sm font-medium text-text">
              Áp dụng cho{" "}
              <span className="text-error">
                *
              </span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              {TARGET_TYPE_OPTIONS.map(
                (option) => {
                  const checked =
                    formData.targetTypes.includes(
                      option.value,
                    );

                  return (
                    <label
                      key={
                        option.value
                      }
                      className={[
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                        checked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-text",
                        submitting
                          ? "cursor-not-allowed opacity-60"
                          : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={
                          checked
                        }
                        disabled={
                          submitting
                        }
                        onChange={() =>
                          toggleTargetType(
                            option.value,
                          )
                        }
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />

                      {
                        option.label
                      }
                    </label>
                  );
                },
              )}
            </div>
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

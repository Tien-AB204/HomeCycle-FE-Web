import { useState } from "react";

const createClientId = () => {
  return (
    Date.now().toString() +
    "-" +
    Math.random()
      .toString(16)
      .slice(2)
  );
};

const createEmptyOption = () => ({
  clientId: createClientId(),
  optionValue: "",
});

const normalizeValue = (value) => {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi");
};

export default function AttributeModal({
  editingAttribute = null,
  defaultDisplayOrder = 1,
  onClose,
  onSubmit,
  submitting = false,
  serverError = "",
}) {
  const isEditing = Boolean(
    editingAttribute?.attributeId,
  );

  const [form, setForm] = useState(
    () => ({
      attributeName:
        editingAttribute?.attributeName ||
        "",
      dataType:
        editingAttribute?.dataType ||
        "Text",
      unit:
        editingAttribute?.unit || "",
      displayOrder:
        editingAttribute?.displayOrder ??
        defaultDisplayOrder,
      isFilterable:
        editingAttribute?.isFilterable ??
        true,
      isRequired:
        editingAttribute?.isRequired ??
        true,
      inputMode:
        editingAttribute?.inputMode ||
        "OptionOnly",
      options: isEditing
        ? []
        : [createEmptyOption()],
    }),
  );

  const [
    clientError,
    setClientError,
  ] = useState("");

  const handleFieldChange = (
    event,
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setClientError("");
  };

  const handleOptionChange = (
    optionId,
    value,
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      options:
        currentForm.options.map(
          (option) =>
            option.clientId === optionId
              ? {
                  ...option,
                  optionValue: value,
                }
              : option,
        ),
    }));

    setClientError("");
  };

  const handleAddOption = () => {
    setForm((currentForm) => ({
      ...currentForm,
      options: [
        ...currentForm.options,
        createEmptyOption(),
      ],
    }));

    setClientError("");
  };

  const handleRemoveOption = (
    optionId,
  ) => {
    if (form.options.length <= 1) {
      setClientError(
        "Thuộc tính phải có ít nhất một tùy chọn.",
      );

      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      options:
        currentForm.options.filter(
          (option) =>
            option.clientId !==
            optionId,
        ),
    }));

    setClientError("");
  };

  const validateForm = () => {
    if (
      form.attributeName.trim()
        .length < 2
    ) {
      return "Tên thuộc tính phải có ít nhất 2 ký tự.";
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

    if (isEditing) {
      return "";
    }

    if (form.options.length === 0) {
      return "Thuộc tính phải có ít nhất một tùy chọn.";
    }

    const optionValues =
      form.options.map((option) =>
        normalizeValue(
          option.optionValue,
        ),
      );

    if (
      optionValues.some(
        (optionValue) =>
          !optionValue,
      )
    ) {
      return "Vui lòng nhập đầy đủ giá trị tùy chọn.";
    }

    if (
      new Set(optionValues).size !==
      optionValues.length
    ) {
      return "Các giá trị tùy chọn không được trùng nhau.";
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

    const payload = {
      attributeName:
        form.attributeName.trim(),
      dataType: form.dataType,
      unit: form.unit.trim(),
      displayOrder: Number(
        form.displayOrder,
      ),
      isFilterable:
        form.isFilterable,
      isRequired: form.isRequired,
      inputMode: form.inputMode,
    };

    if (!isEditing) {
      payload.options =
        form.options.map(
          (option, optionIndex) => ({
            optionValue:
              option.optionValue.trim(),
            displayOrder:
              optionIndex + 1,
          }),
        );
    }

    await onSubmit(payload);
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
        aria-labelledby="attribute-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h3
              id="attribute-modal-title"
              className="text-xl font-bold text-text"
            >
              {isEditing
                ? "Chỉnh sửa thuộc tính"
                : "Thêm thuộc tính mới"}
            </h3>

            <p className="mt-1 text-sm text-textLight">
              {isEditing
                ? "Cập nhật cấu hình thuộc tính. Các tùy chọn được quản lý riêng."
                : "Tạo thuộc tính cùng các tùy chọn ban đầu."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng cửa sổ"
            className="rounded-md p-2 text-textLight transition hover:bg-background hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {(clientError ||
              serverError) && (
              <div
                role="alert"
                className="whitespace-pre-line rounded-lg border border-error/20 bg-error/10 p-4 text-sm text-error"
              >
                {clientError ||
                  serverError}
              </div>
            )}

            <div>
              <label
                htmlFor="attribute-name"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Tên thuộc tính{" "}
                <span className="text-error">
                  *
                </span>
              </label>

              <input
                id="attribute-name"
                name="attributeName"
                type="text"
                value={
                  form.attributeName
                }
                onChange={
                  handleFieldChange
                }
                disabled={submitting}
                maxLength={150}
                placeholder="Ví dụ: Kích thước màn hình"
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="attribute-data-type"
                  className="mb-1.5 block text-sm font-medium text-text"
                >
                  Kiểu dữ liệu
                </label>

                <input
                  id="attribute-data-type"
                  type="text"
                  value={form.dataType}
                  disabled
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-textLight"
                />
              </div>

              <div>
                <label
                  htmlFor="attribute-input-mode"
                  className="mb-1.5 block text-sm font-medium text-text"
                >
                  Chế độ nhập
                </label>

                <input
                  id="attribute-input-mode"
                  type="text"
                  value={form.inputMode}
                  disabled
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-textLight"
                />
              </div>

              <div>
                <label
                  htmlFor="attribute-display-order"
                  className="mb-1.5 block text-sm font-medium text-text"
                >
                  Thứ tự{" "}
                  <span className="text-error">
                    *
                  </span>
                </label>

                <input
                  id="attribute-display-order"
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
                  className="w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="attribute-unit"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Đơn vị
              </label>

              <input
                id="attribute-unit"
                name="unit"
                type="text"
                value={form.unit}
                onChange={
                  handleFieldChange
                }
                disabled={submitting}
                maxLength={50}
                placeholder="Ví dụ: inch, W, kg hoặc để trống"
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
              />
            </div>

            <div className="flex flex-wrap gap-5 rounded-lg border border-border p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="isRequired"
                  checked={
                    form.isRequired
                  }
                  onChange={
                    handleFieldChange
                  }
                  disabled={submitting}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />

                Bắt buộc nhập
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="isFilterable"
                  checked={
                    form.isFilterable
                  }
                  onChange={
                    handleFieldChange
                  }
                  disabled={submitting}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />

                Cho phép lọc
              </label>
            </div>

            {isEditing ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
                API cập nhật Attribute không thay đổi Option. Các tùy chọn hiện tại sẽ được giữ nguyên.
              </div>
            ) : (
              <section className="border-t border-border pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-text">
                      Tùy chọn ban đầu
                    </h4>

                    <p className="mt-1 text-xs text-textLight">
                      Attribute dạng OptionOnly phải có ít nhất một tùy chọn.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleAddOption
                    }
                    disabled={submitting}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add
                    </span>

                    Thêm tùy chọn
                  </button>
                </div>

                <div className="space-y-2">
                  {form.options.map(
                    (
                      option,
                      optionIndex,
                    ) => (
                      <div
                        key={
                          option.clientId
                        }
                        className="flex items-center gap-2"
                      >
                        <span className="w-7 text-center text-xs font-medium text-textLight">
                          {optionIndex + 1}
                        </span>

                        <input
                          type="text"
                          value={
                            option.optionValue
                          }
                          onChange={(
                            event,
                          ) =>
                            handleOptionChange(
                              option.clientId,
                              event.target
                                .value,
                            )
                          }
                          disabled={
                            submitting
                          }
                          aria-label={
                            "Tùy chọn " +
                            (optionIndex +
                              1)
                          }
                          placeholder="Nhập giá trị tùy chọn"
                          className="min-w-0 flex-1 rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveOption(
                              option.clientId,
                            )
                          }
                          disabled={
                            submitting ||
                            form.options
                              .length <=
                              1
                          }
                          aria-label={
                            "Xóa tùy chọn " +
                            (optionIndex +
                              1)
                          }
                          className="rounded-md p-2 text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:text-border"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            close
                          </span>
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border bg-background px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  refresh
                </span>
              )}

              {submitting
                ? isEditing
                  ? "Đang lưu..."
                  : "Đang tạo..."
                : isEditing
                  ? "Lưu thay đổi"
                  : "Tạo thuộc tính"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
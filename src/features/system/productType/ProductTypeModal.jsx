import { useState } from "react";

const createClientId = () => {
  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
};

const createEmptyOption = () => ({
  clientId: createClientId(),
  optionValue: "",
});

const createEmptyAttribute = () => ({
  clientId: createClientId(),
  attributeName: "",
  unit: "",
  dataType: "Text",
  inputMode: "OptionOnly",
  isFilterable: true,
  isRequired: true,
  options: [createEmptyOption()],
});

const normalizeValue = (value) => {
  return value
    .trim()
    .toLocaleLowerCase("vi");
};

export default function ProductTypeModal({
  categories = [],
  editingProductType = null,
  onClose,
  onSubmit,
  submitting = false,
  serverError = "",
}) {
  const isEditing = Boolean(
    editingProductType?.productTypeId,
  );

  const [form, setForm] = useState(
    () => ({
      categoryId:
        editingProductType?.categoryId ||
        categories[0]?.categoryId ||
        "",
      productTypeName:
        editingProductType?.productTypeName ||
        "",
      description:
        editingProductType?.description ||
        "",
      isActive:
        editingProductType?.isActive ??
        true,
      attributes: [
        createEmptyAttribute(),
      ],
    }),
  );

  const [clientError, setClientError] =
    useState("");

  const handleBaseFieldChange = (
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

  const handleAttributeChange = (
    attributeId,
    field,
    value,
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      attributes:
        currentForm.attributes.map(
          (attribute) =>
            attribute.clientId ===
            attributeId
              ? {
                  ...attribute,
                  [field]: value,
                }
              : attribute,
        ),
    }));

    setClientError("");
  };

  const handleAddAttribute = () => {
    setForm((currentForm) => ({
      ...currentForm,
      attributes: [
        ...currentForm.attributes,
        createEmptyAttribute(),
      ],
    }));

    setClientError("");
  };

  const handleRemoveAttribute = (
    attributeId,
  ) => {
    if (form.attributes.length <= 1) {
      setClientError(
        "ProductType phải có ít nhất một thuộc tính.",
      );

      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      attributes:
        currentForm.attributes.filter(
          (attribute) =>
            attribute.clientId !==
            attributeId,
        ),
    }));

    setClientError("");
  };

  const handleOptionChange = (
    attributeId,
    optionId,
    value,
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      attributes:
        currentForm.attributes.map(
          (attribute) => {
            if (
              attribute.clientId !==
              attributeId
            ) {
              return attribute;
            }

            return {
              ...attribute,
              options:
                attribute.options.map(
                  (option) =>
                    option.clientId ===
                    optionId
                      ? {
                          ...option,
                          optionValue:
                            value,
                        }
                      : option,
                ),
            };
          },
        ),
    }));

    setClientError("");
  };

  const handleAddOption = (
    attributeId,
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      attributes:
        currentForm.attributes.map(
          (attribute) =>
            attribute.clientId ===
            attributeId
              ? {
                  ...attribute,
                  options: [
                    ...attribute.options,
                    createEmptyOption(),
                  ],
                }
              : attribute,
        ),
    }));

    setClientError("");
  };

  const handleRemoveOption = (
    attributeId,
    optionId,
  ) => {
    const selectedAttribute =
      form.attributes.find(
        (attribute) =>
          attribute.clientId ===
          attributeId,
      );

    if (
      !selectedAttribute ||
      selectedAttribute.options.length <=
        1
    ) {
      setClientError(
        "Mỗi thuộc tính phải có ít nhất một lựa chọn.",
      );

      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      attributes:
        currentForm.attributes.map(
          (attribute) =>
            attribute.clientId ===
            attributeId
              ? {
                  ...attribute,
                  options:
                    attribute.options.filter(
                      (option) =>
                        option.clientId !==
                        optionId,
                    ),
                }
              : attribute,
        ),
    }));

    setClientError("");
  };

  const validateCreateAttributes = () => {
    if (form.attributes.length === 0) {
      return "ProductType phải có ít nhất một thuộc tính.";
    }

    const attributeNames =
      form.attributes.map(
        (attribute) =>
          normalizeValue(
            attribute.attributeName,
          ),
      );

    if (
      attributeNames.some(
        (attributeName) =>
          !attributeName,
      )
    ) {
      return "Vui lòng nhập tên cho tất cả thuộc tính.";
    }

    if (
      new Set(attributeNames).size !==
      attributeNames.length
    ) {
      return "Tên thuộc tính không được trùng nhau.";
    }

    for (
      let index = 0;
      index < form.attributes.length;
      index += 1
    ) {
      const attribute =
        form.attributes[index];

      if (attribute.options.length === 0) {
        return `Thuộc tính "${attribute.attributeName}" phải có ít nhất một lựa chọn.`;
      }

      const optionValues =
        attribute.options.map((option) =>
          normalizeValue(
            option.optionValue,
          ),
        );

      if (
        optionValues.some(
          (optionValue) => !optionValue,
        )
      ) {
        return `Vui lòng nhập đầy đủ lựa chọn cho thuộc tính "${attribute.attributeName}".`;
      }

      if (
        new Set(optionValues).size !==
        optionValues.length
      ) {
        return `Các lựa chọn của thuộc tính "${attribute.attributeName}" không được trùng nhau.`;
      }
    }

    return "";
  };

  const validateForm = () => {
    if (!form.categoryId) {
      return "Vui lòng chọn danh mục.";
    }

    if (
      form.productTypeName.trim()
        .length < 2
    ) {
      return "Tên loại sản phẩm phải có ít nhất 2 ký tự.";
    }

    if (!form.description.trim()) {
      return "Vui lòng nhập mô tả loại sản phẩm.";
    }

    if (isEditing) {
      return "";
    }

    return validateCreateAttributes();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      setClientError(validationError);
      return;
    }

    setClientError("");

    if (isEditing) {
      await onSubmit({
        productTypeName:
          form.productTypeName.trim(),
        description:
          form.description.trim(),
        isActive: form.isActive,
      });

      return;
    }

    await onSubmit({
      categoryId: form.categoryId,
      productTypeName:
        form.productTypeName.trim(),
      description:
        form.description.trim(),
      attributes: form.attributes.map(
        (attribute) => ({
          attributeName:
            attribute.attributeName.trim(),
          dataType: "Text",
          unit: attribute.unit.trim(),
          isFilterable:
            attribute.isFilterable,
          isRequired:
            attribute.isRequired,
          inputMode: "OptionOnly",
          options:
            attribute.options.map(
              (option) => ({
                optionValue:
                  option.optionValue.trim(),
              }),
            ),
        }),
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
        aria-labelledby="product-type-modal-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3
              id="product-type-modal-title"
              className="text-xl font-bold text-text"
            >
              {isEditing
                ? "Chỉnh sửa loại sản phẩm"
                : "Thêm loại sản phẩm mới"}
            </h3>

            <p className="mt-1 text-sm text-textLight">
              {isEditing
                ? "Cập nhật tên, mô tả và trạng thái loại sản phẩm."
                : "Tạo ProductType cùng các thuộc tính và lựa chọn ban đầu."}
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
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
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

            <section className="rounded-lg border border-border p-4">
              <h4 className="mb-4 font-semibold text-text">
                Thông tin loại sản phẩm
              </h4>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="product-type-category"
                    className="mb-1.5 block text-sm font-medium text-text"
                  >
                    Danh mục{" "}
                    <span className="text-error">
                      *
                    </span>
                  </label>

                  <select
                    id="product-type-category"
                    name="categoryId"
                    value={form.categoryId}
                    onChange={
                      handleBaseFieldChange
                    }
                    disabled={
                      submitting ||
                      isEditing
                    }
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-background"
                  >
                    <option value="">
                      Chọn danh mục
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.categoryId
                          }
                          value={
                            category.categoryId
                          }
                        >
                          {
                            category.categoryName
                          }
                        </option>
                      ),
                    )}
                  </select>

                  {isEditing && (
                    <p className="mt-1 text-xs text-textLight">
                      API hiện không hỗ trợ
                      thay đổi danh mục.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="product-type-name"
                    className="mb-1.5 block text-sm font-medium text-text"
                  >
                    Tên loại sản phẩm{" "}
                    <span className="text-error">
                      *
                    </span>
                  </label>

                  <input
                    id="product-type-name"
                    name="productTypeName"
                    type="text"
                    value={
                      form.productTypeName
                    }
                    onChange={
                      handleBaseFieldChange
                    }
                    disabled={submitting}
                    maxLength={150}
                    placeholder="Ví dụ: Máy lọc không khí"
                    className="w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="product-type-description"
                    className="mb-1.5 block text-sm font-medium text-text"
                  >
                    Mô tả{" "}
                    <span className="text-error">
                      *
                    </span>
                  </label>

                  <textarea
                    id="product-type-description"
                    name="description"
                    value={form.description}
                    onChange={
                      handleBaseFieldChange
                    }
                    disabled={submitting}
                    rows={3}
                    maxLength={1000}
                    placeholder="Mô tả ngắn về loại sản phẩm..."
                    className="w-full resize-y rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
                  />
                </div>

                {isEditing && (
                  <div className="md:col-span-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={
                          form.isActive
                        }
                        onChange={
                          handleBaseFieldChange
                        }
                        disabled={submitting}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />

                      <span>
                        <span className="block text-sm font-medium text-text">
                          Đang hoạt động
                        </span>

                        <span className="block text-xs text-textLight">
                          Bỏ chọn để ẩn loại
                          sản phẩm khỏi hệ
                          thống.
                        </span>
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </section>

            {!isEditing && (
              <section>
                <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="font-semibold text-text">
                      Thuộc tính sản phẩm
                    </h4>

                    <p className="mt-1 text-xs text-textLight">
                      Hiện tại sử dụng kiểu
                      Text và lựa chọn cố
                      định OptionOnly.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleAddAttribute
                    }
                    disabled={submitting}
                    className="flex items-center gap-1 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add
                    </span>

                    Thêm thuộc tính
                  </button>
                </div>

                <div className="space-y-4">
                  {form.attributes.map(
                    (
                      attribute,
                      attributeIndex,
                    ) => (
                      <div
                        key={
                          attribute.clientId
                        }
                        className="rounded-lg border border-border bg-background p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h5 className="font-semibold text-text">
                            Thuộc tính{" "}
                            {attributeIndex +
                              1}
                          </h5>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveAttribute(
                                attribute.clientId,
                              )
                            }
                            disabled={
                              submitting ||
                              form.attributes
                                .length <= 1
                            }
                            title="Xóa thuộc tính"
                            className="rounded-md p-1.5 text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:text-border"
                          >
                            <span className="material-symbols-outlined text-[19px]">
                              delete
                            </span>
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`attribute-name-${attribute.clientId}`}
                              className="mb-1.5 block text-sm font-medium text-text"
                            >
                              Tên thuộc tính{" "}
                              <span className="text-error">
                                *
                              </span>
                            </label>

                            <input
                              id={`attribute-name-${attribute.clientId}`}
                              type="text"
                              value={
                                attribute.attributeName
                              }
                              onChange={(
                                event,
                              ) =>
                                handleAttributeChange(
                                  attribute.clientId,
                                  "attributeName",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              placeholder="Ví dụ: Công nghệ lọc"
                              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`attribute-unit-${attribute.clientId}`}
                              className="mb-1.5 block text-sm font-medium text-text"
                            >
                              Đơn vị
                            </label>

                            <input
                              id={`attribute-unit-${attribute.clientId}`}
                              type="text"
                              value={
                                attribute.unit
                              }
                              onChange={(
                                event,
                              ) =>
                                handleAttributeChange(
                                  attribute.clientId,
                                  "unit",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              placeholder="Có thể để trống"
                              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-5">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                            <input
                              type="checkbox"
                              checked={
                                attribute.isRequired
                              }
                              onChange={(
                                event,
                              ) =>
                                handleAttributeChange(
                                  attribute.clientId,
                                  "isRequired",
                                  event.target
                                    .checked,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />

                            Bắt buộc nhập
                          </label>

                          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                            <input
                              type="checkbox"
                              checked={
                                attribute.isFilterable
                              }
                              onChange={(
                                event,
                              ) =>
                                handleAttributeChange(
                                  attribute.clientId,
                                  "isFilterable",
                                  event.target
                                    .checked,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />

                            Cho phép lọc
                          </label>
                        </div>

                        <div className="mt-5 border-t border-border pt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-text">
                              Các lựa chọn
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                handleAddOption(
                                  attribute.clientId,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[17px]">
                                add
                              </span>

                              Thêm lựa chọn
                            </button>
                          </div>

                          <div className="space-y-2">
                            {attribute.options.map(
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
                                  <span className="w-6 text-center text-xs font-medium text-textLight">
                                    {optionIndex +
                                      1}
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
                                        attribute.clientId,
                                        option.clientId,
                                        event
                                          .target
                                          .value,
                                      )
                                    }
                                    disabled={
                                      submitting
                                    }
                                    placeholder="Giá trị lựa chọn"
                                    aria-label={`Lựa chọn ${optionIndex + 1} của thuộc tính ${attributeIndex + 1}`}
                                    className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-background"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveOption(
                                        attribute.clientId,
                                        option.clientId,
                                      )
                                    }
                                    disabled={
                                      submitting ||
                                      attribute
                                        .options
                                        .length <=
                                        1
                                    }
                                    title="Xóa lựa chọn"
                                    className="rounded-md p-1.5 text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:text-border"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      close
                                    </span>
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
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
              disabled={
                submitting ||
                categories.length === 0
              }
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
                  : "Tạo loại sản phẩm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
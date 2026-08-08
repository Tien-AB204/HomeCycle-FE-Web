const normalizeUnit = (unit) => {
  const value = String(unit || "").trim();

  return value.toLowerCase() === "string" ? "" : value;
};

const DynamicAttributeFields = ({
  attributes,
  values,
  errors,
  loading,
  loadError,
  disabled,
  onChange,
}) => {
  if (loading) {
    return (
      <div
        role="status"
        className="grid gap-4 sm:grid-cols-2"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-lg bg-[#BAC2C1]/20"
          />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {loadError}
      </div>
    );
  }

  if (!Array.isArray(attributes) || attributes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#BAC2C1] bg-[#f8fafa] p-5 text-sm text-[#547B7D]">
        Loại sản phẩm này chưa có thuộc tính bổ sung.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {attributes.map((attribute) => {
        const fieldValue = values[attribute.attributeId] || {};
        const options = Array.isArray(attribute.options)
          ? attribute.options
          : [];
        const dataType = String(attribute.dataType || "Text")
          .trim()
          .toLowerCase();
        const inputMode = String(attribute.inputMode || "")
          .trim()
          .toLowerCase();
        const usesOptions =
          options.length > 0 || inputMode === "optiononly";
        const unit = normalizeUnit(attribute.unit);
        const fieldId = `post-attribute-${attribute.attributeId}`;
        const error = errors[attribute.attributeId] || "";

        return (
          <label key={attribute.attributeId} className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#172830]">
              {attribute.attributeName}
              {unit && (
                <span className="font-normal text-[#547B7D]">
                  {` (${unit})`}
                </span>
              )}
              {attribute.isRequired && (
                <span className="ml-1 text-red-600">*</span>
              )}
            </span>

            {usesOptions ? (
              <select
                id={fieldId}
                value={fieldValue.optionId || ""}
                onChange={(event) =>
                  onChange(
                    attribute.attributeId,
                    "optionId",
                    event.target.value,
                  )
                }
                disabled={disabled || options.length === 0}
                aria-invalid={Boolean(error)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#172830] outline-none transition focus:border-[#2B5659] focus:ring-1 focus:ring-[#2B5659] disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">
                  {options.length > 0
                    ? `Chọn ${attribute.attributeName.toLowerCase()}`
                    : "Chưa có lựa chọn"}
                </option>
                {options.map((option) => (
                  <option key={option.optionId} value={option.optionId}>
                    {option.optionValue}
                  </option>
                ))}
              </select>
            ) : dataType === "boolean" ? (
              <select
                id={fieldId}
                value={fieldValue.valueBoolean ?? ""}
                onChange={(event) =>
                  onChange(
                    attribute.attributeId,
                    "valueBoolean",
                    event.target.value,
                  )
                }
                disabled={disabled}
                aria-invalid={Boolean(error)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#172830] outline-none focus:border-[#2B5659] focus:ring-1 focus:ring-[#2B5659] disabled:bg-gray-100"
              >
                <option value="">Chọn giá trị</option>
                <option value="true">Có</option>
                <option value="false">Không</option>
              </select>
            ) : dataType === "number" ? (
              <input
                id={fieldId}
                type="number"
                value={fieldValue.valueNumber ?? ""}
                onChange={(event) =>
                  onChange(
                    attribute.attributeId,
                    "valueNumber",
                    event.target.value,
                  )
                }
                disabled={disabled}
                aria-invalid={Boolean(error)}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2B5659] focus:ring-1 focus:ring-[#2B5659] disabled:bg-gray-100"
              />
            ) : (
              <input
                id={fieldId}
                type="text"
                value={fieldValue.valueText || ""}
                onChange={(event) =>
                  onChange(
                    attribute.attributeId,
                    "valueText",
                    event.target.value,
                  )
                }
                disabled={disabled}
                aria-invalid={Boolean(error)}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2B5659] focus:ring-1 focus:ring-[#2B5659] disabled:bg-gray-100"
              />
            )}

            {error && (
              <span className="mt-1 block text-xs text-red-600">
                {error}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
};

export default DynamicAttributeFields;

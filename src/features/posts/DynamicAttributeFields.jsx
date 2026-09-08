const normalizeUnit = (unit) => {
  const value = String(unit || "").trim();

  return value.toLowerCase() === "string" ? "" : value;
};

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition placeholder:text-textLight hover:border-primary focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-background disabled:text-textLight";

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
      <div role="status" className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-xl bg-border/30"
          />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error"
      >
        {loadError}
      </div>
    );
  }

  if (!Array.isArray(attributes) || attributes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-textLight">
        Loại sản phẩm này chưa có thuộc tính bổ sung.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
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
            <span className="mb-1.5 block text-sm font-bold text-text">
              {attribute.attributeName}
              {unit && (
                <span className="font-normal text-textLight">
                  {` (${unit})`}
                </span>
              )}
              {attribute.isRequired && (
                <span className="ml-1 text-error">*</span>
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
                className={fieldClassName}
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
                className={fieldClassName}
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
                className={fieldClassName}
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
                className={fieldClassName}
              />
            )}

            {error && (
              <span
                role="alert"
                className="mt-1 block text-xs text-error"
              >
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

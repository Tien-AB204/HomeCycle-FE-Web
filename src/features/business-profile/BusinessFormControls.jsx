export const businessInputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-text outline-none transition placeholder:text-textLight focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-background";

export const BusinessField = ({
  id,
  label,
  required = false,
  as = "input",
  children,
  className = "",
  ...props
}) => {
  const Control = as;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight"
      >
        {label}
        {required && (
          <span className="text-error">
            {" "}*
          </span>
        )}
      </label>

      <Control
        id={id}
        required={required}
        className={businessInputClass}
        {...props}
      >
        {children}
      </Control>
    </div>
  );
};

export const BusinessFileField = ({
  id,
  label,
  required = false,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  onChange,
  currentUrl = "",
  helpText = "JPG, PNG, WEBP hoặc PDF; tối đa 5MB.",
}) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight"
    >
      {label}
      {required && (
        <span className="text-error">
          {" "}*
        </span>
      )}
    </label>

    <input
      id={id}
      type="file"
      accept={accept}
      onChange={onChange}
      className="block w-full rounded-xl border border-border bg-white text-sm text-textLight file:mr-4 file:border-0 file:bg-primary/10 file:px-4 file:py-3 file:font-bold file:text-primary hover:file:bg-primary/20"
    />

    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-textLight">
      <span>{helpText}</span>
      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-primary hover:underline"
        >
          Xem tệp hiện tại
        </a>
      )}
    </div>
  </div>
);

export const BusinessSectionIntro = ({
  icon,
  title,
  description,
}) => (
  <div className="mb-6 flex items-start gap-3 border-b border-border pb-5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <span className="material-symbols-outlined">
        {icon}
      </span>
    </div>

    <div>
      <h2 className="text-lg font-black text-text">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-textLight">
        {description}
      </p>
    </div>
  </div>
);

export const FormMessage = ({
  error,
  success,
}) => (
  <>
    {error && (
      <div
        role="alert"
        className="mb-5 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
      >
        {error}
      </div>
    )}

    {success && (
      <div
        role="status"
        aria-live="polite"
        className="mb-5 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
      >
        {success}
      </div>
    )}
  </>
);

export const SaveButton = ({
  isSaving,
  children = "LƯU THAY ĐỔI",
}) => (
  <button
    type="submit"
    disabled={isSaving}
    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isSaving ? "ĐANG LƯU..." : children}
  </button>
);

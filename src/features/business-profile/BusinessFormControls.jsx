export const businessInputClass =
  "w-full rounded-xl border border-[#CDDED9] bg-white px-3 py-3 text-sm text-[#183436] outline-none transition placeholder:text-[#9AAEAC] focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10 disabled:cursor-not-allowed disabled:bg-[#F5F8F7]";

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
        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-[#607B7A]"
      >
        {label}
        {required && (
          <span className="text-red-500">
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
      className="mb-1.5 block text-xs font-black uppercase tracking-wide text-[#607B7A]"
    >
      {label}
      {required && (
        <span className="text-red-500">
          {" "}*
        </span>
      )}
    </label>

    <input
      id={id}
      type="file"
      accept={accept}
      onChange={onChange}
      className="block w-full rounded-xl border border-[#CDDED9] bg-white text-sm text-[#68807F] file:mr-4 file:border-0 file:bg-[#E2F0ED] file:px-4 file:py-3 file:font-bold file:text-[#285E62] hover:file:bg-[#D2E8E3]"
    />

    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A9290]">
      <span>{helpText}</span>
      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-[#2F6F9F] hover:underline"
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
  <div className="mb-6 flex items-start gap-3 border-b border-[#DCE8E5] pb-5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E2F0ED] text-[#285E62]">
      <span className="material-symbols-outlined">
        {icon}
      </span>
    </div>

    <div>
      <h2 className="text-lg font-black text-[#183F41]">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[#68807F]">
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
        className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {error}
      </div>
    )}

    {success && (
      <div
        aria-live="polite"
        className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
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
    className="rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isSaving ? "ĐANG LƯU..." : children}
  </button>
);

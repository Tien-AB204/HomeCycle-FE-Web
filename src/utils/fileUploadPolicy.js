export const FILE_UPLOAD_CONTEXT = Object.freeze({
  AVATAR: "Avatar",
  IDENTITY_DOCUMENT: "IdentityDocument",
});

const normalizeExtensions = (extensions) =>
  Array.from(
    new Set(
      (Array.isArray(extensions) ? extensions : [])
        .map((extension) => {
          const value = String(extension || "")
            .trim()
            .toLowerCase();

          if (!value) {
            return "";
          }

          return value.startsWith(".")
            ? value
            : `.${value}`;
        })
        .filter(Boolean),
    ),
  );

const getFileExtension = (fileName) => {
  const value = String(fileName || "")
    .trim()
    .toLowerCase();

  const dotIndex = value.lastIndexOf(".");

  return dotIndex >= 0
    ? value.slice(dotIndex)
    : "";
};

export const formatFileSize = (bytes) => {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size <= 0) {
    return "";
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const getFileUploadRule = (
  policy,
  context,
) => {
  const normalizedContext = String(context || "")
    .trim()
    .toLowerCase();

  const rule = policy?.config?.rules?.find(
    (item) =>
      String(item?.context || "")
        .trim()
        .toLowerCase() === normalizedContext,
  );

  const maxFileSizeBytes =
    Number(rule?.maxFileSizeBytes);

  const allowedExtensions =
    normalizeExtensions(
      rule?.allowedExtensions,
    );

  if (
    !rule ||
    !Number.isFinite(maxFileSizeBytes) ||
    maxFileSizeBytes <= 0 ||
    allowedExtensions.length === 0
  ) {
    throw new Error(
      `Máy chủ chưa trả quy định tải tệp hợp lệ cho ${context}.`,
    );
  }

  return {
    context: rule.context || context,
    maxFileSizeBytes,
    allowedExtensions,
  };
};

export const getFileUploadAccept = (rule) =>
  rule?.allowedExtensions?.join(",") || "";

export const getFileUploadDescription = (
  rule,
) => {
  if (!rule) {
    return "Chưa tải được quy định định dạng và dung lượng tệp.";
  }

  const formats = rule.allowedExtensions
    .map((extension) =>
      extension
        .replace(/^\./, "")
        .toUpperCase(),
    )
    .join(", ");

  return `Hỗ trợ ${formats}; tối đa ${formatFileSize(
    rule.maxFileSizeBytes,
  )}.`;
};

export const validateFileAgainstRule = (
  file,
  rule,
  label,
  { required = false } = {},
) => {
  if (!file) {
    return required
      ? `Vui lòng chọn ${String(label || "tệp").toLowerCase()}.`
      : "";
  }

  if (!rule) {
    return "Chưa tải được quy định tải tệp từ hệ thống. Vui lòng thử lại.";
  }

  if (file.size <= 0) {
    return `${label} không có dữ liệu.`;
  }

  if (file.size > rule.maxFileSizeBytes) {
    return `${label} vượt quá dung lượng tối đa ${formatFileSize(
      rule.maxFileSizeBytes,
    )}.`;
  }

  const extension =
    getFileExtension(file.name);

  if (
    !extension ||
    !rule.allowedExtensions.includes(
      extension,
    )
  ) {
    const formats =
      rule.allowedExtensions
        .map((item) =>
          item
            .replace(/^\./, "")
            .toUpperCase(),
        )
        .join(", ");

    return `${label} không đúng định dạng. Chỉ chấp nhận ${formats}.`;
  }

  return "";
};
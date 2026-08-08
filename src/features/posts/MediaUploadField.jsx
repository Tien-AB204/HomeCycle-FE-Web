import { useRef, useState } from "react";

const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const getFileKey = (file) => {
  return `${file.name}:${file.size}:${file.lastModified}`;
};

const formatFileSize = (size) => {
  if (!Number.isFinite(size)) {
    return "";
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const MediaUploadField = ({ files, error, disabled, onChange }) => {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState("");

  const handleFilesSelected = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(
      (file) =>
        ACCEPTED_FILE_TYPES.includes(file.type) &&
        file.size <= MAX_FILE_SIZE,
    );

    if (validFiles.length !== selectedFiles.length) {
      setLocalError(
        "Chỉ chấp nhận JPG, PNG, WEBP và mỗi ảnh không vượt quá 10 MB.",
      );
    } else {
      setLocalError("");
    }

    const existingKeys = new Set(files.map(getFileKey));
    const uniqueFiles = validFiles.filter(
      (file) => !existingKeys.has(getFileKey(file)),
    );
    const nextFiles = [...files, ...uniqueFiles].slice(0, MAX_FILE_COUNT);

    if (files.length + uniqueFiles.length > MAX_FILE_COUNT) {
      setLocalError(`Mỗi bài đăng được chọn tối đa ${MAX_FILE_COUNT} ảnh.`);
    }

    onChange(nextFiles);
    event.target.value = "";
  };

  const removeFile = (fileKey) => {
    onChange(files.filter((file) => getFileKey(file) !== fileKey));
    setLocalError("");
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFilesSelected}
        disabled={disabled}
        className="sr-only"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_FILE_COUNT}
        className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#BAC2C1] bg-[#f8fafa] px-5 py-8 text-center transition hover:border-[#2B5659] hover:bg-[#eef4f4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="text-4xl" aria-hidden="true">
          🖼️
        </span>
        <span className="mt-3 text-sm font-bold text-[#172830]">
          Chọn ảnh sản phẩm
        </span>
        <span className="mt-1 text-xs text-[#547B7D]">
          JPG, PNG hoặc WEBP · Tối đa 5 ảnh · 10 MB mỗi ảnh
        </span>
      </button>

      {(localError || error) && (
        <p className="mt-2 text-xs text-red-600">
          {localError || error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => {
            const fileKey = getFileKey(file);

            return (
              <li
                key={fileKey}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#BAC2C1]/40 bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#172830]">
                    {index + 1}. {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#547B7D]">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(fileKey)}
                  disabled={disabled}
                  aria-label={`Xóa ảnh ${file.name}`}
                  className="shrink-0 rounded-md px-2 py-1 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  Xóa
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MediaUploadField;

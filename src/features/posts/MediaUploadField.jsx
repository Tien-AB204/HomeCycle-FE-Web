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
        className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#9FBFBA] bg-gradient-to-br from-[#F8FBFA] to-[#EDF4F8] px-5 py-7 text-center transition hover:border-[#4F8588] hover:from-white hover:to-[#F1F7F5] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E4F1EE] text-[#2F686C] transition group-hover:bg-[#D8EBE7]"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
            />
          </svg>
        </span>
        <span className="mt-3 text-sm font-black text-[#183F41]">
          Tải ảnh sản phẩm
        </span>
        <span className="mt-1 text-xs leading-5 text-[#68807F]">
          JPG, PNG hoặc WEBP · Tối đa 5 ảnh · 10 MB mỗi ảnh
        </span>
        <span className="mt-3 rounded-full border border-[#BFD3CE] bg-white px-3 py-1 text-[11px] font-bold text-[#4F8588]">
          Đã chọn {files.length}/{MAX_FILE_COUNT}
        </span>
      </button>

      {(localError || error) && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {localError || error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {files.map((file, index) => {
            const fileKey = getFileKey(file);

            return (
              <li
                key={fileKey}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE8E5] bg-[#F8FBFA] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E4F1EE] text-xs font-black text-[#2F686C]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#183F41]">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#68807F]">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(fileKey)}
                  disabled={disabled}
                  aria-label={`Xóa ảnh ${file.name}`}
                  className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
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

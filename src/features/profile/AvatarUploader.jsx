import {
  useRef,
  useState,
} from "react";
import { userService } from "../../services/userService";

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const getApiErrorMessage = (
  error,
  fallbackMessage,
) => {
  const responseData =
    error?.response?.data;

  const validationMessage =
    responseData?.errors
      ? Object.values(
          responseData.errors,
        )
          .flat()
          .find(Boolean)
      : "";

  return (
    validationMessage ||
    responseData?.message ||
    responseData?.error?.message ||
    error?.message ||
    fallbackMessage
  );
};

const validateAvatar = (file) => {
  if (!file) {
    return "Vui lòng chọn ảnh đại diện.";
  }

  if (
    !ACCEPTED_IMAGE_TYPES.includes(
      file.type,
    )
  ) {
    return "Ảnh đại diện chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Ảnh đại diện không được vượt quá 5MB.";
  }

  return "";
};

export default function AvatarUploader({
  avatarUrl,
  displayName,
  fallbackInitial,
  onUpdated,
}) {
  const inputRef = useRef(null);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const displayedAvatarUrl =
    selectedFile
      ? previewUrl
      : avatarUrl;

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = (
    event,
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    const validationError =
      validateAvatar(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setSelectedFile(file);
      setPreviewUrl(
        typeof reader.result === "string"
          ? reader.result
          : "",
      );
      setError("");
    };

    reader.onerror = () => {
      setError(
        "Không thể đọc file ảnh đã chọn.",
      );
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const validationError =
      validateAvatar(selectedFile);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const response =
        await userService.updateAvatar(
          selectedFile,
        );

      if (
        !response?.isSuccess ||
        typeof response?.data !==
          "string" ||
        !response.data
      ) {
        throw new Error(
          response?.error?.message ||
            "Cập nhật ảnh đại diện thất bại.",
        );
      }

      const newAvatarUrl =
        response.data;

      if (
        typeof onUpdated ===
        "function"
      ) {
        onUpdated(newAvatarUrl);
      }

      resetSelection();
    } catch (uploadError) {
      setError(
        getApiErrorMessage(
          uploadError,
          "Cập nhật ảnh đại diện thất bại. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative">
        {displayedAvatarUrl ? (
          <img
            src={displayedAvatarUrl}
            alt={`Ảnh đại diện của ${
              displayName ||
              "người dùng"
            }`}
            className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_8px_24px_rgba(24,63,65,0.14)]"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#4F8588] to-[#2F6F9F] text-3xl font-black text-white shadow-[0_8px_24px_rgba(24,63,65,0.14)]">
            {fallbackInitial}
          </div>
        )}

        <label
          htmlFor="profile-avatar-input"
          title="Thay đổi ảnh đại diện"
          className={`absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#4F8588] text-white shadow transition hover:bg-[#356A70] ${
            isUploading
              ? "pointer-events-none opacity-60"
              : "cursor-pointer"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            photo_camera
          </span>

          <span className="sr-only">
            Chọn ảnh đại diện
          </span>
        </label>

        <input
          ref={inputRef}
          id="profile-avatar-input"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={isUploading}
          className="sr-only"
        />
      </div>

      {selectedFile && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={resetSelection}
            disabled={isUploading}
            className="rounded-lg border border-[#9FBFBA] px-3 py-1.5 text-xs font-bold text-[#526E6D] hover:bg-[#F5F9F8] disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="rounded-lg bg-[#4F8588] px-3 py-1.5 text-xs font-black text-white hover:bg-[#356A70] disabled:opacity-60"
          >
            {isUploading
              ? "ĐANG TẢI..."
              : "LƯU ẢNH"}
          </button>
        </div>
      )}

      <p className="mt-2 text-center text-[11px] text-[#829796]">
        JPG, PNG hoặc WEBP; tối đa
        5MB
      </p>

      {error && (
        <p
          role="alert"
          className="mt-2 text-center text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
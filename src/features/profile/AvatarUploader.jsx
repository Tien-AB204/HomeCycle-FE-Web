import {
  useRef,
  useState,
} from "react";
import { userService } from "../../services/userService";
import avatarPlaceholder from "../../assets/brand/user-avatar-placeholder.svg";

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
  onUpdated,
  updateAvatar =
    userService.updateAvatar,
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

  const [imageFailed, setImageFailed] =
    useState(false);

  const displayedAvatarUrl =
    selectedFile
      ? previewUrl
      : avatarUrl;

  const [trackedAvatarUrl, setTrackedAvatarUrl] =
    useState(displayedAvatarUrl);

  // Reset trạng thái lỗi khi ảnh hiển thị đổi (chọn ảnh mới/đổi user) -
  // điều chỉnh state ngay trong render thay vì dùng effect.
  if (displayedAvatarUrl !== trackedAvatarUrl) {
    setTrackedAvatarUrl(displayedAvatarUrl);
    setImageFailed(false);
  }

  const showPlaceholder =
    !displayedAvatarUrl || imageFailed;

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
        await updateAvatar(
          selectedFile,
        );

      if (response?.isSuccess === false) {
        throw new Error(
          response?.error?.message ||
            "Cập nhật ảnh đại diện thất bại.",
        );
      }

      const responseData =
        response?.data ?? response;

      const newAvatarUrl =
        typeof responseData === "string"
          ? responseData
          : responseData?.avatarUrl ||
            responseData?.url ||
            previewUrl;

      if (!newAvatarUrl) {
        throw new Error(
          "Máy chủ chưa trả về ảnh đại diện mới.",
        );
      }

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
        <img
          src={showPlaceholder ? avatarPlaceholder : displayedAvatarUrl}
          alt={`Ảnh đại diện của ${
            displayName ||
            "người dùng"
          }`}
          referrerPolicy={showPlaceholder ? undefined : "no-referrer"}
          onError={
            showPlaceholder
              ? undefined
              : () => setImageFailed(true)
          }
          className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_8px_24px_rgba(23,40,48,0.14)]"
        />

        <label
          htmlFor="profile-avatar-input"
          title="Thay đổi ảnh đại diện"
          className={`absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow transition hover:bg-primary/90 ${
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
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-textLight hover:bg-background disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {isUploading
              ? "ĐANG TẢI..."
              : "LƯU ẢNH"}
          </button>
        </div>
      )}

      <p className="mt-2 text-center text-[11px] text-textLight">
        JPG, PNG hoặc WEBP; tối đa
        5MB
      </p>

      {error && (
        <p
          role="alert"
          className="mt-2 text-center text-xs text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

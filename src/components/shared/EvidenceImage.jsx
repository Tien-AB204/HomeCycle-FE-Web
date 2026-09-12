import { useState } from "react";

/*
 * Ảnh bằng chứng/giấy tờ từ xa (CCCD, minh chứng kiểm định, minh chứng
 * tranh chấp, tài liệu doanh nghiệp...). KHÔNG tự tạo ảnh thay thế khi
 * lỗi tải (không dùng silhouette avatar, không suy diễn có bằng chứng
 * khi ảnh không tải được) - chỉ báo trạng thái "Không thể tải ảnh"
 * bằng tiếng Việt, không lộ URL gốc ra giao diện.
 */
const EvidenceImage = ({
  src,
  alt,
  onOpen,
  bordered = true,
  objectFit = "cover",
  className = "h-32 w-48",
}) => {
  const [failed, setFailed] = useState(false);
  const [trackedSrc, setTrackedSrc] = useState(src);

  // Reset trạng thái lỗi khi src đổi - điều chỉnh ngay trong render thay
  // vì dùng effect (tránh lint set-state-in-effect).
  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setFailed(false);
  }

  const chromeClassName = bordered
    ? "rounded border border-border shadow-sm"
    : "";

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-background text-center text-textLight ${
          bordered ? "rounded border border-dashed border-border" : ""
        } ${className}`}
      >
        <span className="material-symbols-outlined text-2xl" aria-hidden="true">
          {src ? "broken_image" : "image"}
        </span>
        <span className="px-2 text-xs">
          {src ? "Không thể tải ảnh" : "Chưa có ảnh"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      onClick={onOpen ? () => onOpen(src) : undefined}
      className={`${objectFit === "contain" ? "object-contain" : "object-cover"} ${chromeClassName} ${
        onOpen ? "cursor-pointer transition-opacity hover:opacity-80" : ""
      } ${className}`}
    />
  );
};

export default EvidenceImage;

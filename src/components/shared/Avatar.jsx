import { useState } from "react";
import avatarPlaceholder from "../../assets/brand/user-avatar-placeholder.svg";

/**
 * Ảnh đại diện người dùng dùng chung toàn app.
 * Ảnh gốc hợp lệ (kể cả avatar Google) hiển thị bình thường; thiếu/lỗi tải
 * luôn rơi về ảnh mặc định cố định local (không dùng chữ cái đầu tên,
 * không gọi dịch vụ sinh avatar bên ngoài).
 */
const Avatar = ({ src, alt = "", className = "h-10 w-10" }) => {
  const [failed, setFailed] = useState(false);
  const [trackedSrc, setTrackedSrc] = useState(src);

  // Reset trạng thái lỗi khi src đổi (đổi user/đổi ảnh) - điều chỉnh state
  // ngay trong render, không dùng effect, để tránh lint set-state-in-effect.
  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setFailed(false);
  }

  const showFallback = !src || failed;

  return (
    <img
      src={showFallback ? avatarPlaceholder : src}
      alt={alt}
      referrerPolicy={showFallback ? undefined : "no-referrer"}
      onError={showFallback ? undefined : () => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  );
};

export default Avatar;

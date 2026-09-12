import { useState } from "react";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";

/*
 * Ảnh sản phẩm/bài đăng (Sell) từ xa. Thiếu ảnh hoặc tải lỗi đều hiện
 * cùng một trạng thái trung tính (biểu trưng HomeCycle) - không phải
 * ảnh vỡ, không phải silhouette avatar.
 */
const PostThumbnail = ({
  src,
  alt = "",
  objectFit = "cover",
  emptyText = "",
  errorText = "Không thể tải ảnh",
  className = "h-full w-full",
}) => {
  const [failed, setFailed] = useState(false);
  const [trackedSrc, setTrackedSrc] = useState(src);

  // Reset trạng thái lỗi khi src đổi - điều chỉnh ngay trong render thay
  // vì dùng effect (tránh lint set-state-in-effect).
  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setFailed(false);
  }

  if (!src || failed) {
    const message = failed ? errorText : emptyText;

    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-background ${className}`}
      >
        <img src={homeCycleMark} alt="" className="h-8 w-8 rounded-lg" />
        {message && (
          <p className="text-center text-sm font-semibold text-textLight">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${objectFit === "contain" ? "object-contain" : "object-cover"} ${className}`}
    />
  );
};

export default PostThumbnail;

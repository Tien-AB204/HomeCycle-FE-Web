/*
 * Backend tự tính isPriority (chủ tin đang có gói trả phí còn hạn); giao
 * diện chỉ hiển thị.
 */
const isPriorityPost = (post) =>
  post?.isPriority === true ||
  String(post?.priorityStatus ?? "").toUpperCase() === "PRIORITIZED";

/*
 * Nhãn nhỏ trên thẻ tin.
 */
export default function PriorityBadge({ post, className = "" }) {
  if (!isPriorityPost(post)) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#C8951A] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm ${className}`}
      title="Tin được ưu tiên vì chủ tin đang dùng gói trả phí"
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 12 }}
        aria-hidden="true"
      >
        star
      </span>
      Ưu tiên
    </span>
  );
}

/*
 * Dòng giải thích ở trang chi tiết tin.
 */
export function PriorityNotice({ post, className = "" }) {
  if (!isPriorityPost(post)) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-[#C8951A]/35 bg-[#FBF5E6] px-3 py-2 text-sm font-semibold text-[#7A5A10] ${className}`}
    >
      <span
        className="material-symbols-outlined text-[#C8951A]"
        style={{ fontSize: 18 }}
        aria-hidden="true"
      >
        star
      </span>
      Bài viết này được ưu tiên vì chủ tin đang dùng gói trả phí.
    </div>
  );
}

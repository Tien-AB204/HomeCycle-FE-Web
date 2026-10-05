import { formatDateTime } from "../../utils/formatter";
import { getSafeProblemDetail } from "../../utils/safeErrorMessage";

/*
 * Tin hệ thống của phiên (chốt giá, tạo/sửa hợp đồng, thanh toán...) hiện
 * thành một dòng giữa khung chat thay vì bong bóng của người gửi.
 * Nội dung không phải tiếng Việt thì thay bằng câu mặc định.
 */
export default function ChatSystemMessage({ text, createdAt, fallback = "Cập nhật phiên thương lượng." }) {
  const content = getSafeProblemDetail(String(text || "").trim()) || fallback;

  return (
    <div className="flex justify-center px-2">
      <p
        title={createdAt ? formatDateTime(createdAt) : undefined}
        className="max-w-[90%] rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-center text-xs font-semibold leading-5 text-textLight shadow-sm"
      >
        {content}
      </p>
    </div>
  );
}

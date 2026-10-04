import { formatCurrency } from "../../utils/formatter";
import { HIGH_VALUE_THRESHOLD_VND } from "../../utils/highValue";

/*
 * Cảnh báo hàng giá trị cao khi bỏ qua kiểm định. Có onToggleAcknowledge thì
 * hiện ô "đã hiểu" (dành cho người mua).
 */
export default function HighValueWarning({
  totalAmount,
  acknowledged = false,
  onToggleAcknowledge,
  disabled = false,
  className = "",
}) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-warning/30 bg-warning/10 p-4 sm:p-5 ${className}`}
    >
      <p className="flex items-center gap-2 font-black text-warning">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20 }}
          aria-hidden="true"
        >
          warning
        </span>
        Hàng giá trị cao
      </p>
      <p className="mt-2 text-sm leading-6 text-text">
        Tổng giá trị hợp đồng là {formatCurrency(totalAmount)}, trên{" "}
        {formatCurrency(HIGH_VALUE_THRESHOLD_VND)}. HomeCycle khuyến nghị nên
        kiểm định trước khi nhận hàng.
      </p>
      <p className="mt-1 text-sm leading-6 text-text">
        Nếu bỏ qua kiểm định, nền tảng không cam kết giải quyết đầy đủ tranh
        chấp và không cam kết hoàn 100% giá trị đơn hàng khi sản phẩm hư hỏng
        hoặc sai khác so với mô tả.
      </p>
      {onToggleAcknowledge && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-bold text-text">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={onToggleAcknowledge}
            disabled={disabled}
            className="h-4 w-4 accent-primary"
          />
          Tôi đã hiểu và vẫn chọn không kiểm định
        </label>
      )}
    </div>
  );
}

import { useState } from "react";
import { maskMiddleValue } from "../../utils/maskMiddleValue";

/*
 * Ô hiển thị/nhập giá trị nhạy cảm (số CCCD, số tài khoản ngân hàng...).
 * Chế độ xem: chỉ hiện 3 ký tự đầu + 3 ký tự cuối, còn lại che bằng "•".
 * Chế độ sửa: mặc định che toàn bộ (type="password"), có thể bấm hiện.
 * Nút hiện/ẩn chỉ đổi cách hiển thị - KHÔNG bao giờ đổi giá trị thật
 * (value/onChange luôn thao tác trên chuỗi gốc, không qua bước che).
 */

const RevealToggle = ({ revealed, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={revealed ? "Ẩn giá trị" : "Hiện giá trị đầy đủ"}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-textLight transition hover:text-primary"
  >
    <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
      {revealed ? "visibility_off" : "visibility"}
    </span>
  </button>
);

const SensitiveField = ({
  id,
  label,
  name,
  value,
  onChange,
  readOnly = false,
  required = false,
  autoComplete,
  inputMode,
  placeholder = "",
}) => {
  const [revealed, setRevealed] = useState(false);
  const stringValue = String(value || "");
  const toggleRevealed = () => setRevealed((current) => !current);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-black text-textLight"
      >
        {label}
        {required && <span className="text-error"> *</span>}
      </label>

      {readOnly ? (
        <div className="relative">
          <input
            id={id}
            type="text"
            readOnly
            value={
              stringValue
                ? revealed
                  ? stringValue
                  : maskMiddleValue(stringValue)
                : ""
            }
            placeholder={stringValue ? "" : "Chưa có dữ liệu"}
            className="w-full cursor-default rounded-xl border border-border bg-background px-3 py-3 pr-10 font-mono text-sm tracking-widest text-textLight outline-none"
          />
          {stringValue && (
            <RevealToggle revealed={revealed} onToggle={toggleRevealed} />
          )}
        </div>
      ) : (
        <div className="relative">
          <input
            id={id}
            name={name}
            type={revealed ? "text" : "password"}
            value={value}
            onChange={onChange}
            required={required}
            autoComplete={autoComplete}
            inputMode={inputMode}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border bg-white px-3 py-3 pr-10 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <RevealToggle revealed={revealed} onToggle={toggleRevealed} />
        </div>
      )}
    </div>
  );
};

export default SensitiveField;

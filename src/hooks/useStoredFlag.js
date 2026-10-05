import { useCallback, useState } from "react";

const readFlag = (key) => {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/*
 * Cờ bật/tắt nhớ trong localStorage của trình duyệt (ví dụ danh sách đang thu
 * gọn). Không lưu được (chế độ riêng tư, bị chặn) thì chỉ giữ trong phiên này.
 */
export default function useStoredFlag(key) {
  const [value, setValue] = useState(() => readFlag(key));

  const update = useCallback(
    (next) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Chỉ áp dụng cho lần xem này.
      }
    },
    [key],
  );

  return [value, update];
}

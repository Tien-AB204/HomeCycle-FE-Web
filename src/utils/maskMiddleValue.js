/*
 * Che phần giữa của một giá trị nhạy cảm (số CCCD, số tài khoản...),
 * chỉ giữ lại 3 ký tự đầu và 3 ký tự cuối để hiển thị ở chế độ xem.
 */
export const maskMiddleValue = (value) => {
  const stringValue = String(value || "");

  if (stringValue.length <= 6) {
    return "•".repeat(stringValue.length);
  }

  return `${stringValue.slice(0, 3)}${"•".repeat(
    stringValue.length - 6,
  )}${stringValue.slice(-3)}`;
};

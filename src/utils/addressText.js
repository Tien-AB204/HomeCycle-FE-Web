/*
 * Ghép địa chỉ từ các phần (số nhà/đường, phường, quận, tỉnh). Địa chỉ chi
 * tiết người dùng nhập thường đã có sẵn phường/tỉnh, nên phần nào đã nằm
 * trong địa chỉ thì bỏ qua để không lặp lại.
 */
const normalize = (value) =>
  String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");

export const joinAddressParts = (parts) => {
  const result = [];

  (Array.isArray(parts) ? parts : []).forEach((part) => {
    const text = String(part || "").trim();
    if (!text) return;

    const key = normalize(text);
    if (result.some((existing) => normalize(existing).includes(key))) return;

    result.push(text);
  });

  return result.join(", ");
};

/*
 * Bỏ các đoạn lặp trong một chuỗi địa chỉ đã lưu, ví dụ
 * "65 Lê Lợi, Phường A, TP B, Phường A, TP B" → "65 Lê Lợi, Phường A, TP B".
 */
export const dedupeAddressText = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  const seen = new Set();

  return text
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => {
      const key = normalize(segment);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
};

/*
 * Ghép địa chỉ từ các phần (số nhà/đường, phường, quận, tỉnh). Địa chỉ chi
 * tiết người dùng nhập thường đã có sẵn phường/tỉnh, nên phần nào đã nằm
 * trong địa chỉ thì bỏ qua để không lặp lại.
 */
const normalize = (value) =>
  String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");

// So theo từng đoạn giữa các dấu phẩy, không so chuỗi con: "Phường 1" khác
// "Phường 10", "Quận 1" khác "Quận 10".
const toSegments = (text) =>
  String(text || "")
    .split(",")
    .map(normalize)
    .filter(Boolean);

export const joinAddressParts = (parts) => {
  const result = [];
  const seen = new Set();

  (Array.isArray(parts) ? parts : []).forEach((part) => {
    const text = String(part || "").trim();
    const segments = toSegments(text);
    if (!segments.length || segments.every((segment) => seen.has(segment))) return;

    result.push(text);
    segments.forEach((segment) => seen.add(segment));
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

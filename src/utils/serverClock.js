/*
 * Đồng hồ đếm ngược phải bám giờ server: giờ máy người dùng có thể lệch vài
 * phút so với Backend, trong khi hạn phản hồi/thanh toán chỉ tính bằng phút.
 *
 * Độ lệch lấy từ header Date của response. Trình duyệt chỉ đọc được header
 * này khi Backend expose nó qua CORS (Access-Control-Expose-Headers: Date);
 * nếu không đọc được thì giữ độ lệch 0 và dùng giờ máy.
 */
let serverOffsetMs = 0;

/*
 * Header Date chỉ chính xác tới giây và đến chậm theo độ trễ mạng nên bỏ qua
 * độ lệch nhỏ để đồng hồ không nhảy qua lại.
 */
export const syncServerClock = (dateHeader) => {
  const serverMs = Date.parse(String(dateHeader ?? ""));

  if (!Number.isFinite(serverMs)) {
    return;
  }

  const offset = serverMs - Date.now();
  serverOffsetMs = Math.abs(offset) < 2000 ? 0 : offset;
};

export const serverNow = () => Date.now() + serverOffsetMs;

/*
 * Backend trả thời gian UTC; chuỗi thiếu múi giờ vẫn được hiểu là UTC thay vì
 * giờ máy.
 */
export const parseServerDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const hasTime = text.includes("T") || text.includes(" ");
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(text);
  const ms = Date.parse(hasTime && !hasZone ? `${text}Z` : text);

  return Number.isFinite(ms) ? ms : null;
};

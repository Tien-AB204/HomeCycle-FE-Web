export const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

// Biểu đồ dòng tiền hiển thị theo triệu đồng.
export const millions = (value) => Number(value || 0) / 1000000;

export const formatCompact = (value) =>
  Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

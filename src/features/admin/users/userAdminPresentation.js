export const ROLES = [
  ["Personal", "Cá nhân"],
  ["Business", "Doanh nghiệp"],
  ["Moderator", "Kiểm duyệt viên"],
  ["Admin", "Quản trị viên"],
];

export const STATUSES = [
  ["Pending", "Chờ kích hoạt", "var(--amber)", "amber"],
  ["Active", "Đang hoạt động", "var(--teal)", "green"],
  ["Suspended", "Tạm khóa", "var(--red)", "red"],
  ["Deleted", "Đã xóa", "var(--muted)", "gray"],
];

const key = (value) => String(value ?? "").trim().toLowerCase();

const findEntry = (list, value) => list.find(([name]) => key(name) === key(value));

export const roleLabel = (value) => findEntry(ROLES, value)?.[1] || "Chưa xác định";
export const statusLabel = (value) => findEntry(STATUSES, value)?.[1] || "Chưa xác định";
export const statusTone = (value) => findEntry(STATUSES, value)?.[3] || "gray";

// Đếm theo danh sách {role|status, count} của BE (enum có thể là tên hoặc số).
export const countBy = (items, field, value, index) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => key(item?.[field]) === key(value) || Number(item?.[field]) === index)
    .reduce((sum, item) => sum + (Number(item?.count) || 0), 0);

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

export const percent = (count, total) =>
  total ? `${((count / total) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "0%";

export const getAvailableAction = (account, currentUserId) => {
  const accountId = String(account?.userId || "").trim();
  const role = key(account?.role);
  const status = key(account?.status);

  if (accountId && accountId === currentUserId) return { type: "", label: "Tài khoản hiện tại" };
  if (role === "admin") return { type: "", label: "Được bảo vệ" };
  if (status === "active") return { type: "lock", label: "Khóa tài khoản" };
  if (status === "suspended") return { type: "unlock", label: "Mở khóa" };
  return { type: "", label: "Không có thao tác" };
};

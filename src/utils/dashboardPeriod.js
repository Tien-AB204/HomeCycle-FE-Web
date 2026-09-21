export const DEFAULT_DASHBOARD_PERIOD = Object.freeze({
  from: "",
  to: "",
  groupBy: "Day",
});

export const validateDashboardPeriod = (from, to) => {
  if (Boolean(from) !== Boolean(to)) {
    return "Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.";
  }
  if (!from && !to) return "";
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 1 || days > 366) {
    return "Khoảng thời gian phải từ 1 đến 366 ngày.";
  }
  return "";
};

export const formatDashboardDate = (value) => {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "—";
};

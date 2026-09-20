const toTimestamp = (value) => {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const timestamp = Date.parse(String(value ?? ""));
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const getMonthKey = (value) => {
  const timestamp = toTimestamp(value);

  if (timestamp === null) return "";

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

export const getAvailableMonthOptions = (
  items,
  getValue = (item) => item?.createdAt,
) => {
  const source = Array.isArray(items) ? items : [];
  const months = new Map();

  source.forEach((item) => {
    const value = getValue(item);
    const key = getMonthKey(value);

    if (!key || months.has(key)) return;

    const date = new Date(value);
    months.set(key, {
      key,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  });

  return [...months.values()].sort((left, right) =>
    right.key.localeCompare(left.key),
  );
};

export const filterItemsByMonth = (
  items,
  monthKey,
  getValue = (item) => item?.createdAt,
) => {
  const source = Array.isArray(items) ? items : [];

  if (!monthKey) return source;

  return source.filter(
    (item) => getMonthKey(getValue(item)) === monthKey,
  );
};

export const sortItemsByDate = (
  items,
  direction = "newest",
  getValue = (item) => item?.createdAt,
) => {
  const source = Array.isArray(items) ? items : [];

  return [...source].sort((left, right) => {
    const leftTime = toTimestamp(getValue(left));
    const rightTime = toTimestamp(getValue(right));

    if (leftTime === null && rightTime === null) return 0;
    if (leftTime === null) return 1;
    if (rightTime === null) return -1;

    return direction === "oldest"
      ? leftTime - rightTime
      : rightTime - leftTime;
  });
};

export default sortItemsByDate;

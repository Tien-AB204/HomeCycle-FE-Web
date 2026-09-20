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

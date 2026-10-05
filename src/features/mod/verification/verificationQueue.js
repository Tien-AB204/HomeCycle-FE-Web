/*
 * Điều hướng trong hàng đợi hồ sơ chờ duyệt theo đúng thứ tự đang hiển thị
 * (đã tìm kiếm, lọc tháng, sắp xếp).
 */
export const getProfileId = (profile) =>
  profile?.businessProfileId || profile?.personalProfileId || profile?.id || "";

// Vị trí 1-based của hồ sơ đang xem; 0 khi hồ sơ không nằm trong danh sách đang hiển thị.
export const getQueuePosition = (ids, currentId) => ids.indexOf(currentId) + 1;

export const getNeighborId = (ids, currentId, offset) => {
  if (!ids.length) return null;
  const index = ids.indexOf(currentId);
  if (index < 0) return offset > 0 ? ids[0] : ids[ids.length - 1];
  return ids[index + offset] ?? null;
};

// Sau khi duyệt/từ chối: sang hồ sơ kế tiếp, hết thì lùi về hồ sơ trước, không còn thì null.
export const getNextAfterReview = (ids, reviewedId) => {
  const index = ids.indexOf(reviewedId);
  const remaining = ids.filter((id) => id !== reviewedId);
  if (!remaining.length) return null;
  if (index < 0) return remaining[0];
  return remaining[Math.min(index, remaining.length - 1)];
};

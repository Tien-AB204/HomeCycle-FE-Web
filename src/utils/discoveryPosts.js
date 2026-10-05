const normalizeId = (value) => String(value ?? "").trim().toLowerCase();

/*
 * Bỏ tin của người dùng hiện tại khỏi danh sách khám phá, trừ khi họ chọn
 * hiện tin của mình.
 */
export const filterDiscoveryPosts = (
  posts,
  currentUserId,
  showOwnPostsInDiscovery,
) => {
  const items = Array.isArray(posts) ? posts : [];
  const userId = normalizeId(currentUserId);

  if (showOwnPostsInDiscovery || !userId) {
    return items;
  }

  return items.filter((post) => normalizeId(post?.ownerId) !== userId);
};

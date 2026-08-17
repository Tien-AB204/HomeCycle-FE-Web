export const POST_CATALOG_CHANGED_EVENT =
  "homecycle:post-catalog-changed";
export const POST_CATALOG_STORAGE_KEY =
  "homecycle:post-catalog-version";

export const notifyPostCatalogChanged = ({
  postId = "",
  reason = "updated",
} = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  const detail = {
    eventId:
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random()}`,
    postId: String(postId || ""),
    reason,
    changedAt: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent(POST_CATALOG_CHANGED_EVENT, { detail }),
  );

  try {
    window.localStorage.setItem(
      POST_CATALOG_STORAGE_KEY,
      JSON.stringify(detail),
    );
  } catch {
    // Custom event vẫn đồng bộ được trong tab hiện tại nếu storage bị chặn.
  }
};

export const isPostCatalogStorageEvent = (event) =>
  event?.key === POST_CATALOG_STORAGE_KEY;

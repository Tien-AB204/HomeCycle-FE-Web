const STORAGE_PREFIX = "homecycle:business-survey:";
const FRESH_SNAPSHOT_DURATION = 60_000;

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getStorageKey = (userId) => {
  const normalizedUserId = String(userId || "").trim();

  return normalizedUserId
    ? `${STORAGE_PREFIX}${normalizedUserId}`
    : "";
};

export const saveBusinessSurveySnapshot = (userId, survey) => {
  const storage = getStorage();
  const storageKey = getStorageKey(userId);

  if (!storage || !storageKey || !survey) {
    return;
  }

  try {
    storage.setItem(
      storageKey,
      JSON.stringify({
        survey,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Snapshot là tối ưu UI; lỗi storage không được làm sai kết quả lưu API.
  }
};

export const getBusinessSurveySnapshot = (userId) => {
  const storage = getStorage();
  const storageKey = getStorageKey(userId);

  if (!storage || !storageKey) {
    return null;
  }

  try {
    const snapshot = JSON.parse(storage.getItem(storageKey));

    if (
      !snapshot?.survey ||
      !Number.isFinite(snapshot.savedAt)
    ) {
      return null;
    }

    return snapshot;
  } catch {
    return null;
  }
};

export const isFreshBusinessSurveySnapshot = (
  snapshot,
  now = Date.now(),
) => {
  return Boolean(
    snapshot?.survey &&
      Number.isFinite(snapshot.savedAt) &&
      now - snapshot.savedAt >= 0 &&
      now - snapshot.savedAt <= FRESH_SNAPSHOT_DURATION,
  );
};

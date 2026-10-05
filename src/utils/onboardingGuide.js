/*
 * Backend không có cờ "đăng nhập lần đầu" nên Web tự nhớ theo từng userId
 * trên trình duyệt. Chỉ tự hiện cho tài khoản mới; tài khoản cũ vẫn xem lại
 * được ở trang Hướng dẫn.
 */
const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const storageKey = (userId) => `homecycle.guideSeen.${userId}`;

export const isNewAccount = (joinedAt, now = Date.now()) => {
  const time = new Date(String(joinedAt ?? "")).getTime();
  // Không đọc được ngày tham gia thì coi như mới để không bỏ sót hướng dẫn.
  if (!joinedAt || Number.isNaN(time)) return true;
  return now - time <= NEW_ACCOUNT_WINDOW_MS;
};

export const hasSeenGuide = (userId) => {
  try {
    return window.localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    // Không đọc được bộ nhớ thì không làm phiền người dùng.
    return true;
  }
};

export const markGuideSeen = (userId) => {
  try {
    window.localStorage.setItem(storageKey(userId), "1");
  } catch {
    // Lần sau sẽ hiện lại; không ảnh hưởng luồng chính.
  }
};

export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const USER_KEY = "user";

const SESSION_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY];

const clearStorageKeys = (storage) => {
  SESSION_KEYS.forEach((key) => storage.removeItem(key));
};

/*
 * sessionStorage giữ phiên "không ghi nhớ" (riêng theo tab, mất khi đóng
 * tab/trình duyệt); localStorage giữ phiên "ghi nhớ đăng nhập" (còn sau khi
 * khởi động lại trình duyệt). Ưu tiên đọc sessionStorage trước vì đó là
 * phiên cụ thể của chính tab này - nếu tab này không có, mới rơi về phiên
 * lâu dài trong localStorage.
 */
export const getActiveAuthStorage = () =>
  sessionStorage.getItem(REFRESH_TOKEN_KEY) ? sessionStorage : localStorage;

export const getStoredAccessToken = () =>
  getActiveAuthStorage().getItem(ACCESS_TOKEN_KEY) || "";

export const getStoredRefreshToken = () =>
  getActiveAuthStorage().getItem(REFRESH_TOKEN_KEY) || "";

export const getStoredUserRaw = () => getActiveAuthStorage().getItem(USER_KEY);

export const writeAuthSession = ({ accessToken, refreshToken, user, rememberMe }) => {
  const targetStorage = rememberMe ? localStorage : sessionStorage;
  const otherStorage = rememberMe ? sessionStorage : localStorage;

  /*
   * Không để một phiên cũ còn sót lại ở storage kia - tránh tình trạng
   * cả hai storage cùng có token (đọc lẫn lộn phiên nào là phiên hiện tại).
   */
  clearStorageKeys(otherStorage);

  targetStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  targetStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  targetStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const updateStoredUser = (user) => {
  getActiveAuthStorage().setItem(USER_KEY, JSON.stringify(user));
};

export const updateStoredTokens = (accessToken, refreshToken) => {
  const storage = getActiveAuthStorage();
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearAuthStorages = () => {
  clearStorageKeys(localStorage);
  clearStorageKeys(sessionStorage);
};

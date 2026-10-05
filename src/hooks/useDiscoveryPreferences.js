import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "homecycle.discovery.showOwnPosts";
const CHANGE_EVENT = "homecycle:discovery-preferences-changed";

const readShowOwnPosts = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // Không đọc được lựa chọn đã lưu thì giữ mặc định: ẩn tin của mình.
    return false;
  }
};

const subscribe = (onChange) => {
  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
};

/*
 * Mặc định trang chủ và tìm kiếm không hiện tin của chính người dùng; lựa
 * chọn lưu trên trình duyệt và đồng bộ giữa các tab.
 */
export const useDiscoveryPreferences = () => {
  const showOwnPostsInDiscovery = useSyncExternalStore(
    subscribe,
    readShowOwnPosts,
    () => false,
  );

  const setShowOwnPostsInDiscovery = useCallback((value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    } catch {
      // Trình duyệt chặn lưu trữ: lựa chọn chỉ không được ghi nhớ.
    }

    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { showOwnPostsInDiscovery, setShowOwnPostsInDiscovery };
};

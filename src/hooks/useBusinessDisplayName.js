import { useEffect, useState } from "react";
import publicProfileApi from "../services/apis/publicProfileApi";
import { useAuth } from "./useAuth";

// Mỗi người dùng chỉ tải hồ sơ công khai một lần trong phiên trình duyệt.
const nameCache = new Map();

const loadBusinessName = (userId) => {
  if (!nameCache.has(userId)) {
    nameCache.set(
      userId,
      publicProfileApi
        .getProfile(userId)
        .then((profile) =>
          profile.kind === "business" ? profile.businessName || "" : "",
        )
        .catch((error) => {
          // Hồ sơ không công khai (404/403) thì nhớ luôn; lỗi mạng mới thử lại.
          const status = Number(error?.response?.status);
          if (status !== 404 && status !== 403) nameCache.delete(userId);
          return "";
        }),
    );
  }

  return nameCache.get(userId);
};

/*
 * Danh sách tin của Backend chỉ có username của người đăng. Với tin của
 * doanh nghiệp, lấy tên doanh nghiệp từ hồ sơ công khai (API cần đăng nhập,
 * nên khách vẫn thấy username).
 */
export const useBusinessDisplayName = (userId, enabled = true) => {
  const { isAuthenticated } = useAuth();
  const id = String(userId || "").trim();
  const shouldLoad = Boolean(enabled && isAuthenticated && id);
  const [state, setState] = useState({ id: "", name: "" });

  useEffect(() => {
    if (!shouldLoad) {
      return undefined;
    }

    let active = true;

    loadBusinessName(id).then((name) => {
      if (active) setState({ id, name });
    });

    return () => {
      active = false;
    };
  }, [id, shouldLoad]);

  return shouldLoad && state.id === id ? state.name : "";
};

export default useBusinessDisplayName;

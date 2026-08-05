import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import authApi from "../services/apis/authApi";
import { normalizeRole } from "../utils/authUtils";
import AuthContext from "./auth-context";

const TOKEN_REFRESH_THRESHOLD_SECONDS = 60;

let sessionBootstrapPromise = null;

const normalizeUser = (userData) => {
  if (
    !userData ||
    typeof userData !== "object"
  ) {
    return null;
  }

  const normalizedRole = normalizeRole(
    userData.role,
  );

  return {
    ...userData,
    role: normalizedRole,
  };
};

const getStoredUser = () => {
  try {
    const rawUser =
      localStorage.getItem("user");

    if (!rawUser) {
      return null;
    }

    const parsedUser =
      JSON.parse(rawUser);

    const normalizedUser =
      normalizeUser(parsedUser);

    if (!normalizedUser) {
      localStorage.removeItem("user");
      return null;
    }

    if (
      normalizedUser.role !==
      parsedUser.role
    ) {
      localStorage.setItem(
        "user",
        JSON.stringify(normalizedUser),
      );
    }

    return normalizedUser;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

const clearStoredSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

const getAuthResponseData = (
  authResult,
) => {
  return authResult?.data || authResult || {};
};

const decodeJwtPayload = (token) => {
  try {
    const segments = token.split(".");

    if (segments.length !== 3) {
      return null;
    }

    const base64Url = segments[1];

    const base64 = base64Url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(
        Math.ceil(
          base64Url.length / 4,
        ) * 4,
        "=",
      );

    const binaryString =
      window.atob(base64);

    const bytes = Uint8Array.from(
      binaryString,
      (character) =>
        character.charCodeAt(0),
    );

    const json = new TextDecoder().decode(
      bytes,
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
};

const shouldRefreshAccessToken = (
  accessToken,
) => {
  if (!accessToken) {
    return true;
  }

  const payload =
    decodeJwtPayload(accessToken);

  if (
    !payload ||
    typeof payload.exp !== "number"
  ) {
    return true;
  }

  const currentTime =
    Math.floor(Date.now() / 1000);

  return (
    payload.exp <=
    currentTime +
      TOKEN_REFRESH_THRESHOLD_SECONDS
  );
};

const initializeStoredSession = () => {
  /*
   * Dùng chung một Promise để tránh gọi refresh hai lần
   * khi React StrictMode chạy lại effect trong development.
   */
  if (!sessionBootstrapPromise) {
    sessionBootstrapPromise = (async () => {
      const storedUser =
        getStoredUser();

      const accessToken =
        localStorage.getItem(
          "accessToken",
        );

      const refreshToken =
        localStorage.getItem(
          "refreshToken",
        );

      if (
        !storedUser ||
        !refreshToken
      ) {
        clearStoredSession();
        return null;
      }

      if (
        !shouldRefreshAccessToken(
          accessToken,
        )
      ) {
        return storedUser;
      }

      try {
        const refreshResult =
          await authApi.refreshToken(
            refreshToken,
          );

        const responseData =
          getAuthResponseData(
            refreshResult,
          );

        const newAccessToken =
          responseData?.accessToken;

        const newRefreshToken =
          responseData?.refreshToken;

        if (
          !newAccessToken ||
          !newRefreshToken
        ) {
          throw new Error(
            "Refresh token response không hợp lệ.",
          );
        }

        localStorage.setItem(
          "accessToken",
          newAccessToken,
        );

        localStorage.setItem(
          "refreshToken",
          newRefreshToken,
        );

        return storedUser;
      } catch {
        clearStoredSession();
        return null;
      }
    })().finally(() => {
      sessionBootstrapPromise = null;
    });
  }

  return sessionBootstrapPromise;
};

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [
    isAuthInitializing,
    setIsAuthInitializing,
  ] = useState(true);

  /**
   * Kiểm tra và khôi phục session khi mở ứng dụng.
   */
  useEffect(() => {
    let isActive = true;

    initializeStoredSession()
      .then((storedUser) => {
        if (isActive) {
          setUser(storedUser);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsAuthInitializing(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  /**
   * Lưu session và chuẩn hóa role trước khi lưu.
   */
  const saveSession = useCallback(
    ({
      user: userData,
      accessToken,
      refreshToken,
    }) => {
      const normalizedUser =
        normalizeUser(userData);

      if (!normalizedUser) {
        throw new Error(
          "Không nhận được thông tin người dùng.",
        );
      }

      if (!accessToken) {
        throw new Error(
          "Không nhận được access token.",
        );
      }

      if (!refreshToken) {
        throw new Error(
          "Không nhận được refresh token.",
        );
      }

      localStorage.setItem(
        "accessToken",
        accessToken,
      );

      localStorage.setItem(
        "refreshToken",
        refreshToken,
      );

      localStorage.setItem(
        "user",
        JSON.stringify(normalizedUser),
      );

      setUser(normalizedUser);

      return normalizedUser;
    },
    [],
  );

  /**
   * Đăng nhập bằng email và mật khẩu.
   */
  const login = useCallback(
    async (email, password) => {
      const normalizedEmail =
        email.trim().toLowerCase();

      const authResult =
        await authApi.login({
          email: normalizedEmail,
          password,
        });

      const responseData =
        getAuthResponseData(
          authResult,
        );

      const accessToken =
        responseData?.accessToken ||
        authResult?.accessToken ||
        responseData?.token ||
        authResult?.token ||
        "";

      const refreshToken =
        responseData?.refreshToken ||
        authResult?.refreshToken ||
        responseData?.refresh_token ||
        authResult?.refresh_token ||
        "";

      const userInfo =
        responseData?.user ||
        authResult?.user || {
          userId:
            responseData?.userId || "",
          email:
            responseData?.email ||
            normalizedEmail,
          username:
            responseData?.username ||
            normalizedEmail,
          role:
            responseData?.role || "",
        };

      return saveSession({
        user: userInfo,
        accessToken,
        refreshToken,
      });
    },
    [saveSession],
  );

  /**
   * Đồng bộ user sau khi cập nhật hồ sơ.
   */
  const updateUser = useCallback(
    (updates) => {
      if (
        !updates ||
        typeof updates !== "object"
      ) {
        return;
      }

      setUser((currentUser) => {
        if (!currentUser) {
          return currentUser;
        }

        const updatedUser =
          normalizeUser({
            ...currentUser,
            ...updates,
          });

        if (!updatedUser) {
          return currentUser;
        }

        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser),
        );

        return updatedUser;
      });
    },
    [],
  );

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
  }, []);

  /**
   * Nhận sự kiện hết phiên từ axiosClient.
   */
  useEffect(() => {
    const handleSessionExpired = () => {
      clearStoredSession();
      setUser(null);
      setIsAuthInitializing(false);
    };

    window.addEventListener(
      "auth:session-expired",
      handleSessionExpired,
    );

    return () => {
      window.removeEventListener(
        "auth:session-expired",
        handleSessionExpired,
      );
    };
  }, []);

  /**
   * Đồng bộ session giữa nhiều tab.
   */
  useEffect(() => {
    const handleStorageChange = (
      event,
    ) => {
      const sessionKeys = [
        "user",
        "accessToken",
        "refreshToken",
      ];

      if (
        event.key &&
        !sessionKeys.includes(
          event.key,
        )
      ) {
        return;
      }

      const storedUser =
        getStoredUser();

      const storedAccessToken =
        localStorage.getItem(
          "accessToken",
        );

      const storedRefreshToken =
        localStorage.getItem(
          "refreshToken",
        );

      if (
        !storedUser ||
        !storedAccessToken ||
        !storedRefreshToken
      ) {
        setUser(null);
        return;
      }

      setUser(storedUser);
    };

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
    };
  }, []);

  const isAuthenticated = Boolean(
    !isAuthInitializing &&
      user &&
      localStorage.getItem(
        "accessToken",
      ) &&
      localStorage.getItem(
        "refreshToken",
      ),
  );

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isAuthInitializing,
      login,
      logout,
      saveSession,
      updateUser,
    }),
    [
      user,
      isAuthenticated,
      isAuthInitializing,
      login,
      logout,
      saveSession,
      updateUser,
    ],
  );

  if (isAuthInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          role="status"
          className="flex items-center gap-3 text-[#244f4d]"
        >
          <span className="material-symbols-outlined animate-spin text-3xl">
            refresh
          </span>

          <span className="font-medium">
            Đang khôi phục phiên đăng nhập...
          </span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
};
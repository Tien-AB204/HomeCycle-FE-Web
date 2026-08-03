import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import authApi from "../services/apis/authApi";
import AuthContext from "./auth-context";

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");

    return rawUser ? JSON.parse(rawUser) : null;
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);

  const saveAuth = useCallback(
    ({
      user: userData,
      accessToken,
      refreshToken,
    }) => {
      if (!userData) {
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
        JSON.stringify(userData),
      );

      setUser(userData);
    },
    [],
  );

  const login = useCallback(
    async (email, password) => {
      const authResult = await authApi.login({
        email,
        password,
      });

      /*
       * Hỗ trợ cả hai response format:
       *
       * 1. {
       *      user,
       *      accessToken,
       *      refreshToken
       *    }
       *
       * 2. {
       *      data: {
       *        user,
       *        accessToken,
       *        refreshToken
       *      }
       *    }
       */
      const responseData =
        authResult?.data || authResult;

      const userInfo =
        authResult?.user ||
        responseData?.user ||
        responseData;

      const accessToken =
        authResult?.accessToken ||
        responseData?.accessToken ||
        authResult?.token ||
        responseData?.token ||
        "";

      const refreshToken =
        authResult?.refreshToken ||
        responseData?.refreshToken ||
        authResult?.refresh_token ||
        responseData?.refresh_token ||
        "";

      saveAuth({
        user: userInfo,
        accessToken,
        refreshToken,
      });

      return userInfo;
    },
    [saveAuth],
  );

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
  }, []);

  useEffect(() => {
    /*
     * axiosClient phát sự kiện này khi:
     * - Không có refresh token.
     * - Refresh token hết hạn.
     * - Refresh API thất bại.
     */
    const handleSessionExpired = () => {
      clearStoredSession();
      setUser(null);
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

  useEffect(() => {
    /*
     * Đồng bộ đăng nhập/đăng xuất giữa nhiều tab.
     */
    const handleStorageChange = (event) => {
      if (
        event.key !== "user" &&
        event.key !== "accessToken" &&
        event.key !== "refreshToken"
      ) {
        return;
      }

      const storedAccessToken =
        localStorage.getItem("accessToken");

      const storedRefreshToken =
        localStorage.getItem("refreshToken");

      const storedUser = getStoredUser();

      if (
        !storedAccessToken ||
        !storedRefreshToken ||
        !storedUser
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
    user &&
      localStorage.getItem("accessToken") &&
      localStorage.getItem("refreshToken"),
  );

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      logout,
    }),
    [
      user,
      isAuthenticated,
      login,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
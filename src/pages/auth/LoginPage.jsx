import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import authApi from "../../services/apis/authApi";
import { getHomePathByRole } from "../../utils/authUtils";

const GOOGLE_CLIENT_ID = String(
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
).trim();

const GOOGLE_SCRIPT_ID = "google-identity-services-script";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const getSafeReturnPath = (from) => {
  let returnPath = "";

  if (typeof from === "string") {
    returnPath = from;
  } else if (from && typeof from === "object") {
    returnPath = `${from.pathname || ""}${from.search || ""}${from.hash || ""}`;
  }

  if (
    !returnPath.startsWith("/") ||
    returnPath.startsWith("//") ||
    returnPath.startsWith("/auth/")
  ) {
    return "";
  }

  return returnPath;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogleTokens } = useAuth();
  const returnPath = getSafeReturnPath(location.state?.from);

  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);
  const [loading, setLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const googleCredentialHandlerRef = useRef(null);

  const handleGoogleCredentialResponse = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;

    if (!idToken) {
      setErrorMessage(
        "Không nhận được thông tin xác thực từ Google. Vui lòng thử lại.",
      );
      return;
    }

    setGoogleLoading(true);
    setErrorMessage("");

    try {
      const response = await authApi.googleLogin(idToken);

      /*
       * Backend hiện trả Ok({ Message: Result<GoogleAuthResponseDto> })
       * bất kể thành công/thất bại (không set mã lỗi HTTP tương ứng) -
       * phải tự kiểm tra isSuccess bên trong "message" thay vì dựa vào
       * axios reject.
       */
      const wrapped = response?.message ?? response;

      if (wrapped?.isSuccess === false) {
        setErrorMessage(
          "Đăng nhập bằng Google thất bại. Vui lòng thử lại.",
        );
        return;
      }

      const data = wrapped?.data ?? wrapped;

      if (data?.isNewUser) {
        if (!data?.externalRegisterToken) {
          setErrorMessage(
            "Không thể tiếp tục đăng ký từ Google. Vui lòng thử lại.",
          );
          return;
        }

        navigate("/auth/register", {
          state: {
            google: {
              registrationToken: data.externalRegisterToken,
            },
          },
        });
        return;
      }

      if (!data?.accessToken || !data?.refreshToken) {
        setErrorMessage(
          "Máy chủ không trả về thông tin đăng nhập hợp lệ.",
        );
        return;
      }

      const loggedInUser = loginWithGoogleTokens(
        data.accessToken,
        data.refreshToken,
      );

      navigate(
        returnPath || getHomePathByRole(loggedInUser?.role),
        { replace: true },
      );
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      setErrorMessage(
        "Đăng nhập bằng Google thất bại. Vui lòng thử lại.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    googleCredentialHandlerRef.current = handleGoogleCredentialResponse;
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    let cancelled = false;

    const initialize = () => {
      if (cancelled || !window.google?.accounts?.id) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (credentialResponse) => {
          void googleCredentialHandlerRef.current?.(credentialResponse);
        },
      });

      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text: "continue_with",
            locale: "vi",
            width: 320,
          },
        );
      }
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      initialize();
    } else {
      const script = document.createElement("script");
      script.id = GOOGLE_SCRIPT_ID;
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = initialize;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const loggedInUser =
        await login(email, password);

      navigate(
        returnPath ||
          getHomePathByRole(
            loggedInUser?.role,
          ),
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "Lỗi đăng nhập:",
        error,
      );

      const status = error?.response?.status;
      const nextErrorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error
          ?.message ||
        error?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.";

      if (error?.response && Number(status) < 500) {
        setErrorMessage(nextErrorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
          Chào mừng trở lại
        </p>
        <h2 className="mt-2 text-3xl font-black text-text">
          Đăng nhập vào tài khoản của bạn
        </h2>
        <p className="mt-2 text-sm leading-6 text-textLight">
          Tiếp tục quản lý tin đăng, thương lượng và các giao dịch của bạn.
        </p>

        {returnPath && (
          <p className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-primary">
            Vui lòng đăng nhập để tiếp tục thao tác bạn vừa chọn.
          </p>
        )}
      </div>

      <form
        onSubmit={handleLogin}
        className="space-y-5"
      >
        {errorMessage && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
            <p className="leading-5">{errorMessage}</p>
          </div>
        )}
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-xs font-black tracking-wide text-textLight"
          >
            ĐỊA CHỈ EMAIL
          </label>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-textLight">
              mail
            </span>

            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage("");
              }}
              placeholder="Nhập địa chỉ email của bạn..."
              className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-xs font-black tracking-wide text-textLight"
          >
            MẬT KHẨU
          </label>

          <div className="relative">
            <input
              id="login-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage("");
              }}
              placeholder="Nhập mật khẩu của bạn..."
              className="w-full rounded-xl border border-border bg-background px-3 py-3 pr-10 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (currentValue) =>
                    !currentValue,
                )
              }
              aria-label={
                showPassword
                  ? "Ẩn mật khẩu"
                  : "Hiện mật khẩu"
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textLight hover:text-textLight"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword
                  ? "visibility"
                  : "visibility_off"}
              </span>
            </button>
          </div>

          <div className="mt-2 flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-xs font-bold text-primary hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 font-black text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "ĐANG ĐĂNG NHẬP..."
            : "ĐĂNG NHẬP"}
        </button>

        <div className="relative flex items-center justify-center py-2">
          <hr className="w-full border-border" />

          <span className="absolute bg-white px-3 text-xs font-medium text-textLight">
            HOẶC TIẾP TỤC VỚI
          </span>
        </div>

        {GOOGLE_CLIENT_ID ? (
          <div className="relative flex w-full justify-center">
            <div ref={googleButtonRef} />

            {googleLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 text-sm font-bold text-primary">
                Đang xử lý...
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled
            title="Chưa cấu hình đăng nhập Google (thiếu VITE_GOOGLE_CLIENT_ID)."
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-sm font-bold text-textLight opacity-60"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt=""
              className="h-4 w-4"
            />
            Google (chưa cấu hình)
          </button>
        )}
      </form>

      <div className="mt-7 border-t border-border pt-5 text-center text-sm text-textLight">
        Bạn chưa có tài khoản?{" "}
        <Link
          to="/auth/register"
          className="font-bold text-primary hover:underline"
        >
          Đăng ký tài khoản
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;

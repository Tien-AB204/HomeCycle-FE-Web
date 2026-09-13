import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import authApi from "../../services/apis/authApi";
import { decodeJwtPayload, getHomePathByRole } from "../../utils/authUtils";

const GOOGLE_CLIENT_ID = String(
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
).trim();

const GOOGLE_SCRIPT_ID = "google-identity-services-script";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleScriptLoadPromise = null;

/*
 * Dùng chung một Promise ở module-level (giống sessionBootstrapPromise của
 * AuthContext) thay vì gán trực tiếp script.onload trong effect. React 18
 * StrictMode chạy effect hai lần lúc dev: lần chạy đầu tạo thẻ script rồi
 * bị cleanup (cancelled = true) trước khi script tải xong; lần chạy thứ
 * hai thấy thẻ script đã tồn tại nhưng chưa tải xong nên gọi initialize()
 * ngay lập tức và bỏ cuộc do window.google chưa sẵn sàng - không bao giờ
 * thử lại khi script tải xong, vì onload lúc đó chỉ gọi closure đã bị huỷ
 * của lần chạy đầu. Dùng addEventListener("load") (không ghi đè onload)
 * để mỗi lần effect chạy đều tự đăng ký callback riêng và tự kiểm tra
 * cancelled của chính nó.
 */
const loadGoogleIdentityScript = () => {
  if (googleScriptLoadPromise) {
    return googleScriptLoadPromise;
  }

  googleScriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Không tải được Google Identity Services.")),
          { once: true },
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Không tải được Google Identity Services.")),
      { once: true },
    );
    document.body.appendChild(script);
  });

  return googleScriptLoadPromise;
};

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
  const [rememberMe, setRememberMe] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleIconFailed, setGoogleIconFailed] = useState(false);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(320);
  const googleButtonWrapperRef = useRef(null);
  const googleButtonRef = useRef(null);
  const googleCredentialHandlerRef = useRef(null);
  const googleInitializedRef = useRef(false);

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

      /*
       * Backend hiện không cập nhật AvatarUrl từ Google cho tài khoản đã
       * tồn tại (chỉ dùng payload.Picture khi tạo user mới) - nên
       * /personal-profiles/me có thể chưa có avatar dù đăng nhập Google
       * thật. Chỉ SAU KHI Backend đã xác nhận đăng nhập thành công, giải
       * mã claim "picture" chuẩn OIDC từ chính idToken Google vừa dùng
       * (chỉ để hiển thị, không dùng để xác thực/phân quyền) làm avatar
       * tạm cho phiên này - không tự tạo/suy đoán URL nào khác.
       */
      const googleIdTokenPayload = decodeJwtPayload(idToken);
      const googleAvatarUrl = String(
        googleIdTokenPayload?.picture || "",
      ).trim();

      const loggedInUser = loginWithGoogleTokens(
        data.accessToken,
        data.refreshToken,
        rememberMe,
        googleAvatarUrl,
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

  /*
   * Đo chiều rộng thật của khung chứa để nút Google (GIS chỉ nhận width là
   * số px cố định, không hỗ trợ "100%") luôn vừa khít layout hiện tại thay
   * vì một con số cố định có thể tràn trên màn hình hẹp. Giới hạn trong
   * khoảng GIS hỗ trợ (200-400px).
   */
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonWrapperRef.current) {
      return undefined;
    }

    const element = googleButtonWrapperRef.current;

    const updateWidth = () => {
      const measuredWidth = element.getBoundingClientRect().width;
      const clampedWidth = Math.round(
        Math.min(400, Math.max(200, measuredWidth || 320)),
      );

      setGoogleButtonWidth((current) =>
        current === clampedWidth ? current : clampedWidth,
      );
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    let cancelled = false;

    const renderGoogleButton = () => {
      if (
        cancelled ||
        !window.google?.accounts?.id ||
        !googleButtonRef.current
      ) {
        return;
      }

      if (!googleInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (credentialResponse) => {
            void googleCredentialHandlerRef.current?.(credentialResponse);
          },
        });

        googleInitializedRef.current = true;
      }

      /*
       * renderButton() luôn thêm nút mới vào container thay vì tự thay
       * thế - phải xoá nội dung cũ trước khi vẽ lại ở độ rộng mới (khi
       * người dùng đổi kích thước cửa sổ).
       */
      googleButtonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
          locale: "vi",
          logo_alignment: "left",
          width: googleButtonWidth,
        },
      );
    };

    loadGoogleIdentityScript()
      .then(renderGoogleButton)
      .catch(() => {
        // Bỏ qua - nếu script Google không tải được, khu vực nút sẽ trống
        // thay vì làm vỡ trang.
      });

    return () => {
      cancelled = true;
    };
  }, [googleButtonWidth]);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const loggedInUser =
        await login(email, password, rememberMe);

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

          <div className="mt-2 flex items-center justify-between">
            <label
              htmlFor="login-remember-me"
              className="flex items-center gap-2 text-xs font-bold text-textLight"
            >
              <input
                id="login-remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(
                    event.target.checked,
                  )
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/30"
              />
              Ghi nhớ đăng nhập
            </label>

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
            {/*
             * GIS không có API để một nút tự thiết kế kích hoạt luồng xác
             * thực - dùng đúng nút Google thật (renderButton), chỉ tuỳ
             * biến khung chứa xung quanh (căn giữa, giới hạn độ rộng theo
             * layout hiện tại).
             */}
            <div
              ref={googleButtonWrapperRef}
              className="w-full max-w-[400px]"
            >
              <div ref={googleButtonRef} />
            </div>

            {googleLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 text-sm font-bold text-primary">
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
            {!googleIconFailed && (
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt=""
                onError={() => setGoogleIconFailed(true)}
                className="h-4 w-4"
              />
            )}
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

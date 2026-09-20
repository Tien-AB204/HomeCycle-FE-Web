import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import googleLogo from "../../assets/brand/google-logo.svg";
import { useAuth } from "../../hooks/useAuth";
import authApi from "../../services/apis/authApi";
import { decodeJwtPayload, getHomePathByRole } from "../../utils/authUtils";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  validateEmail,
  validatePassword,
} from "../../utils/formValidation";

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
  const passwordResetSuccess = location.state?.passwordReset === true;

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
  const googleCredentialHandlerRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const googleLoadingWatchdogRef = useRef(null);

  const clearGoogleLoadingWatchdog = () => {
    if (googleLoadingWatchdogRef.current) {
      window.clearTimeout(googleLoadingWatchdogRef.current);
      googleLoadingWatchdogRef.current = null;
    }
  };

  const handleGoogleCredentialResponse = async (credentialResponse) => {
    /*
     * Đã có phản hồi thật từ Google (dù có credential hay không) - không
     * cần watchdog nữa, từ đây vòng đời loading do chính hàm này quản lý.
     */
    clearGoogleLoadingWatchdog();

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

  useEffect(() => {
    return () => {
      clearGoogleLoadingWatchdog();
    };
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    let cancelled = false;

    const initializeGoogleIdentity = () => {
      if (
        cancelled ||
        !window.google?.accounts?.id ||
        googleInitializedRef.current
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (credentialResponse) => {
          void googleCredentialHandlerRef.current?.(credentialResponse);
        },
      });

      googleInitializedRef.current = true;
    };

    loadGoogleIdentityScript()
      .then(initializeGoogleIdentity)
      .catch(() => {
        // Bỏ qua - nếu script Google không tải được, click vào nút sẽ báo
        // "đang tải" thay vì làm vỡ trang.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Nút hiển thị là nút HomeCycle thật (không phải renderButton()/overlay ẩn
   * của Google) - click gọi thẳng google.accounts.id.prompt() để mở UI chọn
   * tài khoản Google. Đây chỉ là hành động "kích hoạt hiển thị"; ID token
   * thật vẫn luôn đến qua callback đã đăng ký ở initialize() phía trên
   * (handleGoogleCredentialResponse), không đọc/suy luận gì từ prompt().
   */
  const handleGoogleButtonClick = () => {
    if (googleLoading) {
      return;
    }

    if (!window.google?.accounts?.id || !googleInitializedRef.current) {
      setErrorMessage(
        "Dịch vụ đăng nhập Google đang được tải, vui lòng thử lại sau giây lát.",
      );
      return;
    }

    setErrorMessage("");
    setGoogleLoading(true);

    /*
     * GIS cảnh báo (console) rằng isNotDisplayed()/isSkippedMoment()/
     * isDismissedMoment() có thể không còn được gọi đáng tin cậy khi FedCM
     * bắt buộc - nếu Google không bao giờ gọi lại callback này (quan sát
     * được ngay cả ở thời điểm hiện tại), nút không được phép kẹt mãi ở
     * "Đang xử lý...". Đặt một watchdog timeout làm lưới an toàn cuối
     * cùng; bị huỷ ngay khi có phản hồi thật (moment hợp lệ hoặc credential
     * thật đến qua handleGoogleCredentialResponse).
     */
    clearGoogleLoadingWatchdog();
    googleLoadingWatchdogRef.current = window.setTimeout(() => {
      googleLoadingWatchdogRef.current = null;
      setGoogleLoading(false);
    }, 10000);

    window.google.accounts.id.prompt((notification) => {
      const isNotDisplayed =
        typeof notification?.isNotDisplayed === "function" &&
        notification.isNotDisplayed();

      const isSkipped =
        typeof notification?.isSkippedMoment === "function" &&
        notification.isSkippedMoment();

      if (isNotDisplayed || isSkipped) {
        /*
         * Google không hiển thị được UI chọn tài khoản (vd trình duyệt
         * chặn bên thứ ba, người dùng vừa tắt gần đây...) - không phải lỗi
         * hệ thống, chỉ đơn giản chưa có gì để làm tiếp. Trả nút về trạng
         * thái bình thường để có thể bấm thử lại, không hiện thông báo lỗi
         * kỹ thuật của Google.
         */
        clearGoogleLoadingWatchdog();
        setGoogleLoading(false);
        return;
      }

      const isDismissed =
        typeof notification?.isDismissedMoment === "function" &&
        notification.isDismissedMoment();

      if (isDismissed) {
        const dismissedReason =
          typeof notification.getDismissedReason === "function"
            ? notification.getDismissedReason()
            : "";

        /*
         * "credential_returned" nghĩa là Google đã trả về ID token -
         * handleGoogleCredentialResponse sẽ tự xử lý tiếp (kể cả tắt
         * loading và huỷ watchdog). Mọi lý do dismiss khác (người dùng tự
         * đóng UI...) không phải sự cố hệ thống - chỉ cần trả nút về
         * trạng thái bình thường.
         */
        if (dismissedReason !== "credential_returned") {
          clearGoogleLoadingWatchdog();
          setGoogleLoading(false);
        }
      }
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const cleanEmail =
      email.trim();

    const emailValidationError =
      validateEmail(cleanEmail);

    if (emailValidationError) {
      setErrorMessage(
        emailValidationError,
      );
      return;
    }

    const passwordValidationError =
      validatePassword(password);

    if (passwordValidationError) {
      setErrorMessage(
        passwordValidationError,
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const loggedInUser =
        await login(
          cleanEmail,
          password,
          rememberMe,
        );

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

        {passwordResetSuccess && (
          <div
            role="status"
            className="mt-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              check_circle
            </span>
            <p className="leading-5">
              Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.
            </p>
          </div>
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
              maxLength={EMAIL_MAX_LENGTH}
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
              maxLength={PASSWORD_MAX_LENGTH}
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
          <button
            type="button"
            onClick={handleGoogleButtonClick}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-sm font-bold text-text shadow-sm transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            <img src={googleLogo} alt="" className="h-4 w-4" />
            {googleLoading ? "Đang xử lý..." : "Đăng nhập bằng Google"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Chưa cấu hình đăng nhập Google (thiếu VITE_GOOGLE_CLIENT_ID)."
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-sm font-bold text-textLight opacity-60"
          >
            <img src={googleLogo} alt="" className="h-4 w-4" />
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

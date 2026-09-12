import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import authApi from "../../services/apis/authApi";
import { decodeJwtPayload } from "../../utils/authUtils";

const STEPS = {
  EMAIL: "EMAIL",
  OTP: "OTP",
  PASSWORD: "PASSWORD",
};

const RESEND_COOLDOWN_SECONDS = 60;

const getApiErrorMessage = (
  error,
  fallbackMessage,
) => {
  const validationErrors =
    error?.response?.data?.errors;

  const firstValidationError =
    validationErrors
      ? Object.values(
          validationErrors,
        ).flat()[0]
      : "";

  return (
    firstValidationError ||
    error?.response?.data?.message ||
    error?.response?.data?.error
      ?.message ||
    error?.message ||
    fallbackMessage
  );
};

const StepIndicator = ({ step }) => {
  const currentStep =
    step === STEPS.EMAIL
      ? 1
      : step === STEPS.OTP
        ? 2
        : 3;

  const labels = [
    "Email",
    "Xác thực",
    "Mật khẩu",
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-center">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex items-center"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                item <= currentStep
                  ? "bg-primary text-white"
                  : "bg-background text-textLight"
              }`}
            >
              {item}
            </div>

            {item < 3 && (
              <div
                className={`mx-2 h-0.5 w-12 ${
                  item < currentStep
                    ? "bg-primary"
                    : "bg-background"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 text-center text-xs font-bold text-textLight">
        {labels.map((label) => (
          <span key={label}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

const RegisterBusinessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveSession } = useAuth();

  /*
   * Đến từ đăng nhập Google (tài khoản mới): registrationToken đã có
   * sẵn, bỏ qua bước gửi/xác thực OTP và vào thẳng bước tạo mật khẩu.
   */
  const googleRegistration =
    location.state?.google?.registrationToken
      ? location.state.google
      : null;

  const googleEmail = googleRegistration
    ? String(
        decodeJwtPayload(googleRegistration.registrationToken)
          ?.email || "",
      )
    : "";

  const isGoogleRegistration = Boolean(googleRegistration);

  const [step, setStep] =
    useState(
      googleRegistration ? STEPS.PASSWORD : STEPS.EMAIL,
    );

  const [email, setEmail] =
    useState(googleEmail);

  const [otp, setOtp] =
    useState("");

  const [
    registrationToken,
    setRegistrationToken,
  ] = useState(
    googleRegistration?.registrationToken || "",
  );

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loadingAction,
    setLoadingAction,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    resendCooldown,
    setResendCooldown,
  ] = useState(0);

  const isLoading =
    loadingAction !== "";

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timerId =
      window.setInterval(() => {
        setResendCooldown(
          (currentValue) =>
            Math.max(
              currentValue - 1,
              0,
            ),
        );
      }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [resendCooldown]);

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const handleSendOtp = async (
    event,
  ) => {
    event.preventDefault();
    clearMessages();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Vui lòng nhập địa chỉ email.",
      );
      return;
    }

    setLoadingAction("SEND_OTP");

    try {
      const response =
        await authApi.sendOtp(
          normalizedEmail,
        );

      setEmail(normalizedEmail);
      setOtp("");
      setRegistrationToken("");
      setResendCooldown(
        RESEND_COOLDOWN_SECONDS,
      );

      setSuccessMessage(
        response?.message ||
          "Mã OTP đã được gửi đến email của bạn.",
      );

      setStep(STEPS.OTP);
    } catch (sendOtpError) {
      const errorCode =
        sendOtpError?.response?.data
          ?.code;

      if (
        errorCode ===
        "AUTH_EMAIL_EXISTS"
      ) {
        setError(
          "Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.",
        );
      } else {
        setError(
          getApiErrorMessage(
            sendOtpError,
            "Không thể gửi mã OTP. Vui lòng thử lại.",
          ),
        );
      }
    } finally {
      setLoadingAction("");
    }
  };

  const handleResendOtp = async () => {
    if (
      resendCooldown > 0 ||
      isLoading
    ) {
      return;
    }

    clearMessages();
    setLoadingAction("RESEND_OTP");

    try {
      const response =
        await authApi.sendOtp(email);

      setOtp("");
      setRegistrationToken("");
      setResendCooldown(
        RESEND_COOLDOWN_SECONDS,
      );

      setSuccessMessage(
        response?.message ||
          "Mã OTP mới đã được gửi.",
      );
    } catch (resendError) {
      setError(
        getApiErrorMessage(
          resendError,
          "Không thể gửi lại mã OTP. Vui lòng thử lại.",
        ),
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleVerifyOtp = async (
    event,
  ) => {
    event.preventDefault();
    clearMessages();

    const normalizedOtp =
      otp.trim();

    if (
      !/^\d{6}$/.test(
        normalizedOtp,
      )
    ) {
      setError(
        "Mã OTP phải gồm đúng 6 chữ số.",
      );
      return;
    }

    setLoadingAction("VERIFY_OTP");

    try {
      const response =
        await authApi.verifyOtp({
          email,
          otp: normalizedOtp,
        });

      if (
        !response?.success ||
        !response?.registrationToken
      ) {
        throw new Error(
          response?.message ||
            "Không nhận được registration token từ máy chủ.",
        );
      }

      setRegistrationToken(
        response.registrationToken,
      );

      setSuccessMessage(
        response?.message ||
          "Email đã được xác thực thành công.",
      );

      setStep(STEPS.PASSWORD);
    } catch (verifyError) {
      setError(
        getApiErrorMessage(
          verifyError,
          "Mã OTP không đúng hoặc đã hết hạn.",
        ),
      );
    } finally {
      setLoadingAction("");
    }
  };

  const handleChangeEmail = () => {
    clearMessages();

    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setRegistrationToken("");
    setResendCooldown(0);
    setStep(STEPS.EMAIL);
  };

  const validatePassword = () => {
    if (!registrationToken) {
      return "Phiên xác thực email không hợp lệ. Vui lòng xác thực lại.";
    }

    if (password.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (
      password !== confirmPassword
    ) {
      return "Mật khẩu xác nhận không khớp.";
    }

    return "";
  };

  const handleRegister = async (
    event,
  ) => {
    event.preventDefault();
    clearMessages();

    const validationError =
      validatePassword();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoadingAction("REGISTER");

    try {
      const response =
        await authApi.registerBusiness({
          password,
          registrationToken,
        });

      if (
        response?.success === false
      ) {
        throw new Error(
          response?.message ||
            response?.error?.message ||
            "Đăng ký tài khoản doanh nghiệp thất bại.",
        );
      }

      const responseData =
        response?.data || response;

      const accessToken =
        responseData?.accessToken;

      const refreshToken =
        responseData?.refreshToken;

      if (
        !accessToken ||
        !refreshToken
      ) {
        throw new Error(
          "Máy chủ không trả về đầy đủ thông tin đăng nhập.",
        );
      }

      const businessUser = {
        userId:
          responseData?.userId || "",
        username:
          responseData?.username ||
          email,
        email:
          responseData?.email ||
          email,
        role:
          responseData?.role ||
          "Business",

        /*
         * Đây là trạng thái tạm thời trên frontend.
         * Sau này sẽ thay bằng trạng thái từ API hồ sơ doanh nghiệp.
         */
        businessProfileStatus:
          "NotSubmitted",
      };

      saveSession({
        user: businessUser,
        accessToken,
        refreshToken,
      });

      navigate("/", {
        replace: true,
        state: {
          registrationSuccess: true,
          message:
            response?.message ||
            responseData?.message ||
            "Đăng ký tài khoản doanh nghiệp thành công.",
        },
      });
    } catch (registerError) {
      setError(
        getApiErrorMessage(
          registerError,
          "Đăng ký thất bại. Vui lòng thử lại.",
        ),
      );
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl animate-fade-in">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Tài khoản doanh nghiệp</p>
        <h1 className="mt-2 text-3xl font-black text-text">
          Đăng ký tài khoản doanh nghiệp
        </h1>

        <p className="mt-2 text-sm leading-6 text-textLight">
          Tạo tài khoản để tìm kiếm và
          khám phá các tin đăng trên
          HomeCycle.
        </p>
      </div>

      <StepIndicator step={step} />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          aria-live="polite"
          className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          {successMessage}
        </div>
      )}

      {step === STEPS.EMAIL && (
        <form
          onSubmit={handleSendOtp}
          className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6"
        >
          <div>
            <label
              htmlFor="business-email"
              className="mb-1.5 block text-xs font-black text-textLight"
            >
              Email doanh nghiệp
              <span className="text-error">
                {" "}*
              </span>
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-textLight">
                mail
              </span>

              <input
                id="business-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                required
                autoComplete="email"
                placeholder="Nhập email doanh nghiệp"
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-primary py-3 font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction ===
            "SEND_OTP"
              ? "ĐANG GỬI OTP..."
              : "GỬI MÃ OTP"}
          </button>

          <p className="text-center text-sm text-textLight">
            Bạn đã có tài khoản?{" "}
            <Link
              to="/auth/login"
              className="font-bold text-primary hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </form>
      )}

      {step === STEPS.OTP && (
        <form
          onSubmit={handleVerifyOtp}
          className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6"
        >
          <div className="text-center">
            <h2 className="text-lg font-black text-text">
              Xác thực email
            </h2>

            <p className="mt-2 text-sm text-textLight">
              Mã OTP gồm 6 chữ số đã
              được gửi đến:
            </p>

            <p className="mt-1 break-all text-sm font-black text-primary">
              {email}
            </p>
          </div>

          <div>
            <label
              htmlFor="business-otp"
              className="mb-1.5 block text-xs font-black text-textLight"
            >
              Mã OTP
              <span className="text-error">
                {" "}*
              </span>
            </label>

            <input
              id="business-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6),
                )
              }
              required
              placeholder="Nhập 6 chữ số"
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-xl font-black tracking-[0.5em] text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <button
            type="submit"
            disabled={
              isLoading ||
              otp.length !== 6
            }
            className="w-full rounded-xl bg-primary py-3 font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction ===
            "VERIFY_OTP"
              ? "ĐANG XÁC THỰC..."
              : "XÁC THỰC OTP"}
          </button>

          <div className="flex flex-col items-center gap-3 text-sm">
            <button
              type="button"
              onClick={
                handleResendOtp
              }
              disabled={
                isLoading ||
                resendCooldown > 0
              }
              className="font-bold text-primary disabled:cursor-not-allowed disabled:text-textLight"
            >
              {resendCooldown > 0
                ? `Gửi lại OTP sau ${resendCooldown}s`
                : "Gửi lại mã OTP"}
            </button>

            <button
              type="button"
              onClick={
                handleChangeEmail
              }
              disabled={isLoading}
              className="text-textLight hover:text-primary"
            >
              Thay đổi email
            </button>
          </div>
        </form>
      )}

      {step ===
        STEPS.PASSWORD && (
        <form
          onSubmit={handleRegister}
          className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6"
        >
          <div>
            <h2 className="text-lg font-black text-text">
              Tạo mật khẩu
            </h2>

            <p className="mt-1 text-sm text-textLight">
              {isGoogleRegistration ? (
                <>
                  Tiếp tục đăng ký với email Google{" "}
                  <span className="font-bold text-primary">
                    {email || "đã liên kết"}
                  </span>
                  .
                </>
              ) : (
                <>
                  Email{" "}
                  <span className="font-bold text-primary">
                    {email}
                  </span>{" "}
                  đã được xác thực.
                </>
              )}
            </p>
          </div>

          <div>
            <label
              htmlFor="business-password"
              className="mb-1.5 block text-xs font-black text-textLight"
            >
              Mật khẩu
              <span className="text-error">
                {" "}*
              </span>
            </label>

            <div className="relative">
              <input
                id="business-password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-xl border border-border bg-background py-3 pl-3 pr-11 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
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
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-textLight hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword
                    ? "visibility_off"
                    : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="business-confirm-password"
              className="mb-1.5 block text-xs font-black text-textLight"
            >
              Xác nhận mật khẩu
              <span className="text-error">
                {" "}*
              </span>
            </label>

            <input
              id="business-confirm-password"
              name="confirmPassword"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-primary">
            Sau khi đăng ký, bạn có thể
            tìm kiếm và xem tin ngay.
            Hoàn thiện hồ sơ doanh nghiệp
            sau để sử dụng đầy đủ chức
            năng.
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-primary py-3 font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction ===
            "REGISTER"
              ? "ĐANG TẠO TÀI KHOẢN..."
              : "ĐĂNG KÝ DOANH NGHIỆP"}
          </button>

          <button
            type="button"
            onClick={
              handleChangeEmail
            }
            disabled={isLoading}
            className="w-full text-sm text-textLight hover:text-primary disabled:opacity-60"
          >
            Sử dụng email khác
          </button>
        </form>
      )}
    </div>
  );
};

export default RegisterBusinessPage;
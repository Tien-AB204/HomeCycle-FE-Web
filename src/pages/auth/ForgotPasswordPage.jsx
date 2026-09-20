import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import authApi from "../../services/apis/authApi";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  validateEmail,
  validatePassword,
} from "../../utils/formValidation";
import {
  getSafeProblemDetail,
  getSafeValidationMessage,
} from "../../utils/safeErrorMessage";

const OTP_LENGTH = 6;

const STEP = Object.freeze({
  EMAIL: "email",
  RESET: "reset",
});

const getSafeErrorMessage = (error, fallback) => {
  const responseData = error?.response?.data;

  return (
    getSafeValidationMessage(responseData?.errors) ||
    getSafeProblemDetail(responseData?.error?.message) ||
    getSafeProblemDetail(responseData?.message) ||
    fallback
  );
};

const validateOtp = (value) => {
  if (!value) {
    return "Vui lòng nhập mã OTP.";
  }

  if (!/^[0-9]{6}$/.test(value)) {
    return "Mã OTP phải gồm đúng 6 chữ số.";
  }

  return "";
};

const inputClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10";

const labelClassName =
  "mb-1.5 block text-xs font-black tracking-wide text-textLight";

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClassName} pr-10 disabled:cursor-not-allowed disabled:opacity-60`}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-textLight hover:text-textLight"
        >
          <span className="material-symbols-outlined text-[20px]">
            {visible ? "visibility" : "visibility_off"}
          </span>
        </button>
      </div>
    </div>
  );
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const busy = sendingOtp || resetting;

  const sendOtp = async () => {
    const normalizedEmail = email.trim();
    const emailError = validateEmail(normalizedEmail);

    if (emailError) {
      setErrorMessage(emailError);
      return false;
    }

    setSendingOtp(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      await authApi.forgotPassword({ email: normalizedEmail });
      setEmail(normalizedEmail);
      setNoticeMessage(
        `Mã OTP đã được gửi đến ${normalizedEmail}. Mã có hiệu lực trong 5 phút.`,
      );
      return true;
    } catch (error) {
      setErrorMessage(
        getSafeErrorMessage(
          error,
          "Không thể gửi mã OTP. Vui lòng thử lại.",
        ),
      );
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    const sent = await sendOtp();

    if (sent) {
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep(STEP.RESET);
    }
  };

  const handleResendOtp = async () => {
    if (busy) {
      return;
    }

    await sendOtp();
  };

  const handleChangeEmail = () => {
    if (busy) {
      return;
    }

    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setNoticeMessage("");
    setStep(STEP.EMAIL);
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    const validationError =
      validateOtp(otp) ||
      validatePassword(newPassword) ||
      (!confirmPassword
        ? "Vui lòng nhập lại mật khẩu mới."
        : confirmPassword !== newPassword
          ? "Mật khẩu xác nhận không khớp."
          : "");

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setResetting(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      await authApi.resetPassword({
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      logout();

      navigate("/auth/login", {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (error) {
      setErrorMessage(
        getSafeErrorMessage(
          error,
          "Không thể đặt lại mật khẩu. Vui lòng kiểm tra mã OTP và thử lại.",
        ),
      );
    } finally {
      setResetting(false);
    }
  };

  const renderMessages = () => (
    <>
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            aria-hidden="true"
          >
            error
          </span>
          <p className="whitespace-pre-line leading-5">{errorMessage}</p>
        </div>
      )}

      {noticeMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            aria-hidden="true"
          >
            mark_email_read
          </span>
          <p className="leading-5">{noticeMessage}</p>
        </div>
      )}
    </>
  );

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
          Bảo mật tài khoản
        </p>

        <h2 className="mt-2 text-3xl font-black text-text">
          Khôi phục mật khẩu
        </h2>

        <p className="mt-2 text-sm leading-6 text-textLight">
          {step === STEP.EMAIL
            ? "Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu."
            : "Nhập mã OTP đã nhận qua email và mật khẩu mới của bạn."}
        </p>
      </div>

      {step === STEP.EMAIL ? (
        <form onSubmit={handleSendOtp} className="space-y-5">
          {renderMessages()}

          <div>
            <label htmlFor="forgot-email" className={labelClassName}>
              ĐỊA CHỈ EMAIL
            </label>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-textLight">
                mail
              </span>

              <input
                id="forgot-email"
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
                disabled={busy}
                className={`${inputClassName} pl-10 disabled:cursor-not-allowed disabled:opacity-60`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3 font-black text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingOtp ? "ĐANG GỬI..." : "GỬI MÃ OTP"}
          </button>

          <Link
            to="/auth/login"
            className="flex w-full items-center justify-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <span
              className="material-symbols-outlined text-[18px]"
              aria-hidden="true"
            >
              arrow_back
            </span>
            Quay lại đăng nhập
          </Link>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5">
          {renderMessages()}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="text-xs font-bold text-textLight">Email đang khôi phục</p>
              <p className="truncate font-bold text-text">{email}</p>
            </div>

            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={busy}
              className="text-xs font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              Đổi email
            </button>
          </div>

          <div>
            <label htmlFor="forgot-otp" className={labelClassName}>
              MÃ OTP
            </label>

            <input
              id="forgot-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={OTP_LENGTH}
              required
              value={otp}
              onChange={(event) => {
                setOtp(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, OTP_LENGTH),
                );
                setErrorMessage("");
              }}
              placeholder="Nhập 6 chữ số"
              disabled={busy}
              className={`${inputClassName} tracking-[0.3em] disabled:cursor-not-allowed disabled:opacity-60`}
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-textLight">
              <span>Mã OTP có hiệu lực trong 5 phút.</span>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={busy}
                className="font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingOtp ? "Đang gửi lại..." : "Gửi lại mã"}
              </button>
            </div>
          </div>

          <PasswordField
            id="forgot-new-password"
            label="MẬT KHẨU MỚI"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setErrorMessage("");
            }}
            placeholder="Từ 6 đến 50 ký tự"
            disabled={busy}
          />

          <PasswordField
            id="forgot-confirm-password"
            label="XÁC NHẬN MẬT KHẨU MỚI"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setErrorMessage("");
            }}
            placeholder="Nhập lại mật khẩu mới"
            disabled={busy}
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3 font-black text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetting ? "ĐANG ĐẶT LẠI..." : "ĐẶT LẠI MẬT KHẨU"}
          </button>

          <Link
            to="/auth/login"
            className="flex w-full items-center justify-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <span
              className="material-symbols-outlined text-[18px]"
              aria-hidden="true"
            >
              arrow_back
            </span>
            Quay lại đăng nhập
          </Link>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authApi from "../../services/apis/authApi";

const STEPS = {
  EMAIL: "EMAIL",
  OTP: "OTP",
  BASIC: "BASIC",
  OPTIONAL: "OPTIONAL",
  SUCCESS: "SUCCESS",
};

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const INITIAL_FORM = {
  username: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  phoneNumber: "",

  representativeCode: "",
  representativeName: "",
  representativeDob: "",
  representativeAddress: "",

  bankCode: "",
  bankName: "",
  accountNumber: "",
  accountName: "",

  avatarFile: null,
  frontIdCardFile: null,
  backIdCardFile: null,
};

const getApiErrorMessage = (
  error,
  fallbackMessage,
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    fallbackMessage
  );
};

const validateImage = (file, label) => {
  if (!file) {
    return "";
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `${label} chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `${label} không được vượt quá 5MB.`;
  }

  return "";
};

const TextInput = ({
  id,
  label,
  name,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder = "",
  autoComplete,
  minLength,
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-bold text-slate-800"
      >
        {label}

        {required && (
          <span className="text-red-500"> *</span>
        )}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-[#244f4d] focus:outline-none focus:ring-1 focus:ring-[#244f4d]"
      />
    </div>
  );
};

const FileInput = ({
  id,
  label,
  name,
  onChange,
  description,
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-bold text-slate-800"
      >
        {label}
      </label>

      <input
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="block w-full rounded-md border border-slate-300 bg-white text-sm text-slate-600 file:mr-4 file:border-0 file:bg-[#e6f2f1] file:px-4 file:py-2.5 file:font-medium file:text-[#244f4d] hover:file:bg-[#d7ebe9]"
      />

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
};

const RegisterPersonalPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [
    registrationToken,
    setRegistrationToken,
  ] = useState("");

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [loadingAction, setLoadingAction] =
    useState("");
  const [error, setError] = useState("");
  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");
  const [
    resendCooldown,
    setResendCooldown,
  ] = useState(0);
  const [
    registeredUser,
    setRegisteredUser,
  ] = useState(null);

  const isLoading = loadingAction !== "";

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setResendCooldown((currentValue) =>
        Math.max(currentValue - 1, 0),
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

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    const file = files?.[0] || null;

    const labels = {
      avatarFile: "Ảnh đại diện",
      frontIdCardFile: "Ảnh CCCD mặt trước",
      backIdCardFile: "Ảnh CCCD mặt sau",
    };

    const validationError = validateImage(
      file,
      labels[name],
    );

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");

    setForm((currentForm) => ({
      ...currentForm,
      [name]: file,
    }));
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    clearMessages();

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Vui lòng nhập địa chỉ email.",
      );
      return;
    }

    setLoadingAction("SEND_OTP");

    try {
      const response =
        await authApi.sendOtp(normalizedEmail);

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
        sendOtpError?.response?.data?.code;

      if (errorCode === "AUTH_EMAIL_EXISTS") {
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
    if (resendCooldown > 0 || isLoading) {
      return;
    }

    clearMessages();
    setLoadingAction("RESEND_OTP");

    try {
      const response =
        await authApi.sendOtp(email);

      setOtp("");
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

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    clearMessages();

    const normalizedOtp = otp.trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
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
        response.message ||
          "Email đã được xác thực thành công.",
      );
      setStep(STEPS.BASIC);
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

  const validateBasicInformation = () => {
    if (!registrationToken) {
      return "Phiên xác thực email không hợp lệ. Vui lòng xác thực lại OTP.";
    }

    if (form.username.trim().length < 3) {
      return "Tên đăng nhập phải có ít nhất 3 ký tự.";
    }

    if (!form.fullName.trim()) {
      return "Vui lòng nhập họ và tên.";
    }

    if (form.password.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (
      form.password !== form.confirmPassword
    ) {
      return "Mật khẩu và xác nhận mật khẩu không khớp.";
    }

    if (
      !/^[0-9]{9,11}$/.test(
        form.phoneNumber.trim(),
      )
    ) {
      return "Số điện thoại phải gồm từ 9 đến 11 chữ số.";
    }

    return "";
  };

  const handleContinueToOptional = (
    event,
  ) => {
    event.preventDefault();
    clearMessages();

    const validationError =
      validateBasicInformation();

    if (validationError) {
      setError(validationError);
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      representativeName:
        currentForm.representativeName ||
        currentForm.fullName,
      accountName:
        currentForm.accountName ||
        currentForm.fullName,
    }));

    setStep(STEPS.OPTIONAL);
  };

  const appendOptionalText = (
    payload,
    fieldName,
    value,
  ) => {
    const normalizedValue = value?.trim();

    if (normalizedValue) {
      payload.append(
        fieldName,
        normalizedValue,
      );
    }
  };

  const createRegistrationPayload = (
    includeOptionalInformation,
  ) => {
    const payload = new FormData();

    /*
     * Bốn thông tin bắt buộc.
     */
    payload.append(
      "Username",
      form.username.trim(),
    );
    payload.append(
      "Password",
      form.password,
    );
    payload.append(
      "FullName",
      form.fullName.trim(),
    );
    payload.append(
      "PhoneNumber",
      form.phoneNumber.trim(),
    );

    if (!includeOptionalInformation) {
      return payload;
    }

    /*
     * Chỉ append field tùy chọn khi có dữ liệu.
     */
    appendOptionalText(
      payload,
      "RepresentativeCode",
      form.representativeCode,
    );

    appendOptionalText(
      payload,
      "RepresentativeName",
      form.representativeName,
    );

    appendOptionalText(
      payload,
      "RepresentativeDob",
      form.representativeDob,
    );

    appendOptionalText(
      payload,
      "RepresentativeAddress",
      form.representativeAddress,
    );

    appendOptionalText(
      payload,
      "BankCode",
      form.bankCode,
    );

    appendOptionalText(
      payload,
      "BankName",
      form.bankName,
    );

    appendOptionalText(
      payload,
      "AccountNumber",
      form.accountNumber,
    );

    appendOptionalText(
      payload,
      "AccountName",
      form.accountName,
    );

    if (form.avatarFile) {
      payload.append(
        "AvatarUrl",
        form.avatarFile,
      );
    }

    if (form.frontIdCardFile) {
      payload.append(
        "FrontIDCardImage",
        form.frontIdCardFile,
      );
    }

    if (form.backIdCardFile) {
      payload.append(
        "BackIDCardImage",
        form.backIdCardFile,
      );
    }

    return payload;
  };

  const validateOptionalFiles = () => {
    const files = [
      [
        form.avatarFile,
        "Ảnh đại diện",
      ],
      [
        form.frontIdCardFile,
        "Ảnh CCCD mặt trước",
      ],
      [
        form.backIdCardFile,
        "Ảnh CCCD mặt sau",
      ],
    ];

    for (const [file, label] of files) {
      const validationError =
        validateImage(file, label);

      if (validationError) {
        return validationError;
      }
    }

    return "";
  };

  const registerAccount = async (
    includeOptionalInformation,
  ) => {
    clearMessages();

    const basicValidationError =
      validateBasicInformation();

    if (basicValidationError) {
      setError(basicValidationError);
      setStep(STEPS.BASIC);
      return;
    }

    if (includeOptionalInformation) {
      const fileValidationError =
        validateOptionalFiles();

      if (fileValidationError) {
        setError(fileValidationError);
        return;
      }
    }

    setLoadingAction("REGISTER");

    try {
      const payload =
        createRegistrationPayload(
          includeOptionalInformation,
        );

      const response =
        await authApi.registerPersonal(
          payload,
          registrationToken,
        );

      if (response?.success === false) {
        throw new Error(
          response?.message ||
            "Đăng ký tài khoản thất bại.",
        );
      }

      setRegisteredUser(
        response?.data?.user || null,
      );
      setSuccessMessage(
        response?.message ||
          "Đăng ký tài khoản cá nhân thành công.",
      );
      setStep(STEPS.SUCCESS);
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

  const handleSubmitOptional = (event) => {
    event.preventDefault();
    registerAccount(true);
  };

  const handleSkipOptional = () => {
    registerAccount(false);
  };

  const handleChangeEmail = () => {
    clearMessages();
    setOtp("");
    setRegistrationToken("");
    setResendCooldown(0);
    setStep(STEPS.EMAIL);
  };

  const handleBackToBasic = () => {
    clearMessages();
    setStep(STEPS.BASIC);
  };

  const getCurrentStepNumber = () => {
    switch (step) {
      case STEPS.EMAIL:
        return 1;
      case STEPS.OTP:
        return 2;
      case STEPS.BASIC:
        return 3;
      case STEPS.OPTIONAL:
        return 4;
      default:
        return 4;
    }
  };

  const renderStepIndicator = () => {
    const currentStepNumber =
      getCurrentStepNumber();

    const stepLabels = [
      "Email",
      "OTP",
      "Tài khoản",
      "Bổ sung",
    ];

    return (
      <div className="mb-6">
        <div className="flex items-center justify-center">
          {[1, 2, 3, 4].map(
            (stepNumber) => (
              <div
                key={stepNumber}
                className="flex items-center"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    stepNumber <=
                    currentStepNumber
                      ? "bg-[#244f4d] text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {stepNumber}
                </div>

                {stepNumber < 4 && (
                  <div
                    className={`mx-1 h-0.5 w-6 sm:mx-2 sm:w-10 ${
                      stepNumber <
                      currentStepNumber
                        ? "bg-[#244f4d]"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ),
          )}
        </div>

        <div className="mt-2 grid grid-cols-4 text-center text-[10px] text-slate-500 sm:text-xs">
          {stepLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    );
  };

  if (step === STEPS.SUCCESS) {
    return (
      <div className="mx-auto w-full max-w-xl animate-fade-in">
        <div className="rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <span className="material-symbols-outlined text-4xl">
              check_circle
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            Đăng ký thành công
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {successMessage}
          </p>

          <div className="mt-5 rounded-md bg-slate-50 p-4 text-left text-sm">
            <p>
              <span className="font-semibold">
                Email:
              </span>{" "}
              {registeredUser?.email || email}
            </p>

            {registeredUser?.username && (
              <p className="mt-1">
                <span className="font-semibold">
                  Tên đăng nhập:
                </span>{" "}
                {registeredUser.username}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/auth/login", {
                replace: true,
                state: {
                  registeredEmail:
                    registeredUser?.email ||
                    email,
                },
              })
            }
            className="mt-6 w-full rounded-md bg-[#244f4d] py-3 font-medium text-white transition hover:bg-[#1a3a38]"
          >
            ĐI ĐẾN ĐĂNG NHẬP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl animate-fade-in">
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-[#244f4d] text-white">
          <span className="material-symbols-outlined">
            autorenew
          </span>
        </div>

        <h1 className="text-center text-2xl font-bold text-slate-800">
          Đăng ký tài khoản cá nhân
        </h1>

        <p className="mt-2 text-center text-sm text-slate-500">
          Xác thực email và hoàn thiện tài khoản.
        </p>
      </div>

      {renderStepIndicator()}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {successMessage &&
        step === STEPS.OTP && (
          <div
            aria-live="polite"
            className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {successMessage}
          </div>
        )}

      {step === STEPS.EMAIL && (
        <form
          onSubmit={handleSendOtp}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="registration-email"
              className="mb-1 block text-xs font-bold text-slate-800"
            >
              Email
              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              id="registration-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              placeholder="Nhập địa chỉ email"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-[#244f4d] focus:outline-none focus:ring-1 focus:ring-[#244f4d]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-[#244f4d] py-3 font-medium text-white transition hover:bg-[#1a3a38] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "SEND_OTP"
              ? "ĐANG GỬI OTP..."
              : "GỬI MÃ OTP"}
          </button>

          <p className="text-center text-sm text-slate-600">
            Bạn đã có tài khoản?{" "}
            <Link
              to="/auth/login"
              className="font-bold text-[#244f4d] hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </form>
      )}

      {step === STEPS.OTP && (
        <form
          onSubmit={handleVerifyOtp}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-800">
              Xác thực email
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Mã OTP gồm 6 chữ số đã được gửi đến:
            </p>

            <p className="mt-1 break-all text-sm font-bold text-[#244f4d]">
              {email}
            </p>
          </div>

          <div>
            <label
              htmlFor="registration-otp"
              className="mb-1 block text-xs font-bold text-slate-800"
            >
              Mã OTP
              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              id="registration-otp"
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
              className="w-full rounded-md border border-slate-300 px-3 py-3 text-center text-xl font-bold tracking-[0.5em] focus:border-[#244f4d] focus:outline-none focus:ring-1 focus:ring-[#244f4d]"
            />
          </div>

          <button
            type="submit"
            disabled={
              isLoading || otp.length !== 6
            }
            className="w-full rounded-md bg-[#244f4d] py-3 font-medium text-white transition hover:bg-[#1a3a38] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "VERIFY_OTP"
              ? "ĐANG XÁC THỰC..."
              : "XÁC THỰC OTP"}
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={
              isLoading ||
              resendCooldown > 0
            }
            className="w-full text-sm font-semibold text-[#244f4d] hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            {loadingAction === "RESEND_OTP"
              ? "ĐANG GỬI LẠI..."
              : resendCooldown > 0
                ? `Gửi lại OTP sau ${resendCooldown}s`
                : "Gửi lại mã OTP"}
          </button>

          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={isLoading}
            className="w-full text-sm text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Thay đổi địa chỉ email
          </button>
        </form>
      )}

      {step === STEPS.BASIC && (
        <form
          onSubmit={handleContinueToOptional}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Email <strong>{email}</strong> đã được
            xác thực.
          </div>

          <div>
            <h2 className="font-bold text-slate-800">
              Thông tin tài khoản
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Các trường có dấu * là bắt buộc.
            </p>
          </div>

          <TextInput
            id="registration-username"
            label="Tên đăng nhập"
            name="username"
            value={form.username}
            onChange={handleFormChange}
            required
            placeholder="Nhập tên đăng nhập"
            autoComplete="username"
          />

          <TextInput
            id="registration-full-name"
            label="Họ và tên"
            name="fullName"
            value={form.fullName}
            onChange={handleFormChange}
            required
            placeholder="Nhập họ và tên"
            autoComplete="name"
          />

          <TextInput
            id="registration-phone-number"
            label="Số điện thoại"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleFormChange}
            required
            type="tel"
            placeholder="Nhập số điện thoại"
            autoComplete="tel"
          />

          <TextInput
            id="registration-password"
            label="Mật khẩu"
            name="password"
            value={form.password}
            onChange={handleFormChange}
            required
            type="password"
            minLength={6}
            placeholder="Tạo mật khẩu"
            autoComplete="new-password"
          />

          <TextInput
            id="registration-confirm-password"
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleFormChange}
            required
            type="password"
            minLength={6}
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-[#244f4d] py-3 font-medium text-white transition hover:bg-[#1a3a38] disabled:cursor-not-allowed disabled:opacity-60"
          >
            TIẾP TỤC
          </button>

          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={isLoading}
            className="w-full text-sm text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Xác thực lại bằng email khác
          </button>
        </form>
      )}

      {step === STEPS.OPTIONAL && (
        <form
          onSubmit={handleSubmitOptional}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Bổ sung hồ sơ
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Các thông tin dưới đây không bắt buộc.
              Bạn có thể cập nhật sau trong trang hồ
              sơ cá nhân.
            </p>
          </div>

          <FileInput
            id="registration-avatar"
            label="Ảnh đại diện"
            name="avatarFile"
            onChange={handleFileChange}
            description="Hỗ trợ JPG, PNG hoặc WEBP; tối đa 5MB."
          />

          <hr className="border-slate-200" />

          <h3 className="font-bold text-slate-800">
            Thông tin định danh
          </h3>

          <TextInput
            id="registration-representative-code"
            label="Số CCCD"
            name="representativeCode"
            value={form.representativeCode}
            onChange={handleFormChange}
            placeholder="Nhập số CCCD"
          />

          <TextInput
            id="registration-representative-name"
            label="Họ tên trên CCCD"
            name="representativeName"
            value={form.representativeName}
            onChange={handleFormChange}
            placeholder="Nhập họ tên trên CCCD"
          />

          <TextInput
            id="registration-representative-dob"
            label="Ngày sinh"
            name="representativeDob"
            value={form.representativeDob}
            onChange={handleFormChange}
            type="date"
          />

          <TextInput
            id="registration-representative-address"
            label="Địa chỉ trên CCCD"
            name="representativeAddress"
            value={form.representativeAddress}
            onChange={handleFormChange}
            placeholder="Nhập địa chỉ trên CCCD"
          />

          <FileInput
            id="registration-front-id-card"
            label="Ảnh CCCD mặt trước"
            name="frontIdCardFile"
            onChange={handleFileChange}
            description="Hỗ trợ JPG, PNG hoặc WEBP; tối đa 5MB."
          />

          <FileInput
            id="registration-back-id-card"
            label="Ảnh CCCD mặt sau"
            name="backIdCardFile"
            onChange={handleFileChange}
            description="Hỗ trợ JPG, PNG hoặc WEBP; tối đa 5MB."
          />

          <hr className="border-slate-200" />

          <h3 className="font-bold text-slate-800">
            Thông tin ngân hàng
          </h3>

          <TextInput
            id="registration-bank-name"
            label="Tên ngân hàng"
            name="bankName"
            value={form.bankName}
            onChange={handleFormChange}
            placeholder="Ví dụ: MB Bank"
          />

          <TextInput
            id="registration-bank-code"
            label="Mã ngân hàng"
            name="bankCode"
            value={form.bankCode}
            onChange={handleFormChange}
            placeholder="Nhập mã ngân hàng"
          />

          <TextInput
            id="registration-account-number"
            label="Số tài khoản"
            name="accountNumber"
            value={form.accountNumber}
            onChange={handleFormChange}
            placeholder="Nhập số tài khoản"
          />

          <TextInput
            id="registration-account-name"
            label="Tên chủ tài khoản"
            name="accountName"
            value={form.accountName}
            onChange={handleFormChange}
            placeholder="Nhập tên chủ tài khoản"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-[#244f4d] py-3 font-medium text-white transition hover:bg-[#1a3a38] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "REGISTER"
              ? "ĐANG ĐĂNG KÝ..."
              : "HOÀN TẤT ĐĂNG KÝ"}
          </button>

          <button
            type="button"
            onClick={handleSkipOptional}
            disabled={isLoading}
            className="w-full rounded-md border border-slate-300 bg-white py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            BỎ QUA, CẬP NHẬT SAU
          </button>

          <button
            type="button"
            onClick={handleBackToBasic}
            disabled={isLoading}
            className="w-full text-sm text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Quay lại thông tin tài khoản
          </button>
        </form>
      )}
    </div>
  );
};

export default RegisterPersonalPage;
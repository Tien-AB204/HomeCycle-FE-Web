import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import moderatorActivationApi from "../../services/apis/moderatorActivationApi";

const SESSION_KEY =
  "homecycle:moderator-activation-session";

const verificationRequests =
  new Map();

const getApiCode = (error) =>
  String(
    error?.response?.data?.code ||
      error?.response?.data?.error?.code ||
      error?.code ||
      "",
  ).trim();

const getActivationErrorMessage = (
  error,
) => {
  const code =
    getApiCode(error);

  if (
    code ===
    "AUTH_MODERATOR_TOKEN_INVALID"
  ) {
    return "Liên kết hoặc phiên kích hoạt không hợp lệ, đã hết hạn hoặc đã được sử dụng.";
  }

  if (
    code ===
    "AUTH_MODERATOR_ACTIVATION_UNAVAILABLE"
  ) {
    return "Tài khoản kiểm duyệt viên hiện không thể được kích hoạt.";
  }

  if (
    code ===
    "AUTH_MODERATOR_CONFIGURATION_INVALID"
  ) {
    return "Hệ thống kích hoạt tài khoản kiểm duyệt viên hiện chưa được cấu hình hợp lệ.";
  }

  return "Không thể hoàn tất kích hoạt tài khoản. Vui lòng thử lại hoặc liên hệ quản trị viên.";
};

const readEmailToken = () => {
  const hash =
    window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

  return (
    new URLSearchParams(hash)
      .get("token")
      ?.trim() || ""
  );
};

const clearEmailTokenFromAddressBar =
  () => {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  };

const clearStoredSession = () => {
  try {
    sessionStorage.removeItem(
      SESSION_KEY,
    );
  } catch {
    // Không chặn flow nếu storage của trình duyệt không khả dụng.
  }
};

const saveStoredSession = (
  session,
) => {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(session),
    );
  } catch {
    // Flow vẫn tiếp tục trong memory của trang hiện tại.
  }
};

const getStoredSession = () => {
  try {
    const raw =
      sessionStorage.getItem(
        SESSION_KEY,
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    const token =
      String(
        parsed?.passwordSetupToken ||
          "",
      ).trim();

    const expiresAt =
      String(
        parsed?.expiresAt || "",
      ).trim();

    const expiresTime =
      Date.parse(expiresAt);

    if (
      !token ||
      !expiresAt ||
      Number.isNaN(expiresTime) ||
      expiresTime <= Date.now()
    ) {
      clearStoredSession();
      return null;
    }

    return {
      passwordSetupToken: token,
      expiresAt,
    };
  } catch {
    clearStoredSession();
    return null;
  }
};

const createInitialState = () => {
  /*
   * Nếu URL có token email mới thì token mới phải thắng
   * một passwordSetupToken cũ còn trong sessionStorage.
   */
  if (readEmailToken()) {
    return {
      phase: "verifying",
      session: null,
      error: "",
    };
  }

  const storedSession =
    getStoredSession();

  if (storedSession) {
    return {
      phase: "password",
      session: storedSession,
      error: "",
    };
  }

  return {
    phase: "invalid",
    session: null,
    error:
      "Liên kết xác nhận không hợp lệ.",
  };
};

const verifyEmailOnce = (
  token,
) => {
  if (
    !verificationRequests.has(token)
  ) {
    const request =
      moderatorActivationApi
        .verifyEmail(token)
        .catch((error) => {
          verificationRequests.delete(
            token,
          );

          throw error;
        });

    verificationRequests.set(
      token,
      request,
    );
  }

  return verificationRequests.get(
    token,
  );
};

const formatExpiry = (value) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
};

const ModeratorActivatePage = () => {
  const [state, setState] =
    useState(createInitialState);

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
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [formError, setFormError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const emailToken =
    readEmailToken();

  useEffect(() => {
    if (
      state.phase !==
        "verifying" ||
      !emailToken
    ) {
      return undefined;
    }

    let active = true;

    /*
     * Không để phiên tạo mật khẩu của link cũ
     * lẫn với link kích hoạt mới.
     */
    clearStoredSession();

    void verifyEmailOnce(
      emailToken,
    )
      .then((result) => {
        if (!active) {
          return;
        }

        const passwordSetupToken =
          String(
            result?.passwordSetupToken ||
              "",
          ).trim();

        const expiresAt =
          String(
            result?.expiresAt || "",
          ).trim();

        const expiresTime =
          Date.parse(expiresAt);

        if (
          !passwordSetupToken ||
          !expiresAt ||
          Number.isNaN(
            expiresTime,
          ) ||
          expiresTime <= Date.now()
        ) {
          throw new Error(
            "Phiên tạo mật khẩu do máy chủ trả về không hợp lệ.",
          );
        }

        const nextSession = {
          passwordSetupToken,
          expiresAt,
        };

        saveStoredSession(
          nextSession,
        );

        clearEmailTokenFromAddressBar();

        setState({
          phase: "password",
          session: nextSession,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        clearStoredSession();
        clearEmailTokenFromAddressBar();

        setState({
          phase: "invalid",
          session: null,
          error:
            getActivationErrorMessage(
              error,
            ),
        });
      });

    return () => {
      active = false;
    };
  }, [
    emailToken,
    state.phase,
  ]);

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    if (
      !state.session ||
      submitting
    ) {
      return;
    }

    setFormError("");

    if (
      password.length < 12 ||
      password.length > 50
    ) {
      setFormError(
        "Mật khẩu phải từ 12 đến 50 ký tự.",
      );
      return;
    }

    if (
      confirmPassword.length === 0
    ) {
      setFormError(
        "Vui lòng nhập lại mật khẩu.",
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setFormError(
        "Mật khẩu xác nhận không khớp.",
      );
      return;
    }

    const expiresTime =
      Date.parse(
        state.session.expiresAt,
      );

    if (
      Number.isNaN(expiresTime) ||
      expiresTime <= Date.now()
    ) {
      clearStoredSession();

      setState({
        phase: "invalid",
        session: null,
        error:
          "Phiên tạo mật khẩu đã hết hạn. Vui lòng liên hệ Admin để được hỗ trợ.",
      });

      return;
    }

    setSubmitting(true);

    try {
      await moderatorActivationApi
        .setPassword({
          token:
            state.session
              .passwordSetupToken,
          password,
          confirmPassword,
        });

      clearStoredSession();

      setPassword("");
      setConfirmPassword("");

      setState({
        phase: "success",
        session: null,
        error: "",
      });
    } catch (error) {
      const code =
        getApiCode(error);

      if (
        code ===
          "AUTH_MODERATOR_TOKEN_INVALID" ||
        code ===
          "AUTH_MODERATOR_ACTIVATION_UNAVAILABLE"
      ) {
        clearStoredSession();

        setState({
          phase: "invalid",
          session: null,
          error:
            getActivationErrorMessage(
              error,
            ),
        });
      } else {
        setFormError(
          getActivationErrorMessage(
            error,
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (
    state.phase ===
    "verifying"
  ) {
    return (
      <div className="py-16 text-center">
        <span
          className="material-symbols-outlined animate-spin text-5xl text-primary"
          aria-hidden="true"
        >
          progress_activity
        </span>

        <h1 className="mt-5 text-2xl font-black text-text">
          Đang xác nhận email
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-textLight">
          HomeCycle đang kiểm tra liên kết kích hoạt tài khoản kiểm duyệt viên.
        </p>
      </div>
    );
  }

  if (
    state.phase === "success"
  ) {
    return (
      <div className="py-10 text-center">
        <span
          className="material-symbols-outlined text-6xl text-success"
          aria-hidden="true"
        >
          check_circle
        </span>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-success">
          Kích hoạt hoàn tất
        </p>

        <h1 className="mt-2 text-2xl font-black text-text">
          Kích hoạt tài khoản thành công
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-textLight">
          Bạn có thể đăng nhập để bắt đầu công việc kiểm duyệt trên HomeCycle.
        </p>

        <Link
          to="/auth/login"
          className="mt-7 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-black text-white transition hover:bg-primary/90"
        >
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  if (
    state.phase === "invalid"
  ) {
    return (
      <div className="py-10 text-center">
        <span
          className="material-symbols-outlined text-6xl text-error"
          aria-hidden="true"
        >
          link_off
        </span>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-error">
          Không thể kích hoạt
        </p>

        <h1 className="mt-2 text-2xl font-black text-text">
          Liên kết hoặc phiên không hợp lệ
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-textLight">
          {state.error}
        </p>

        <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-textLight">
          Phiên bản hiện tại không có chức năng gửi lại email kích hoạt.
          Vui lòng liên hệ Admin nếu cần hỗ trợ.
        </p>

        <Link
          to="/auth/login"
          className="mt-7 inline-flex rounded-xl border border-primary px-6 py-3 text-sm font-black text-primary transition hover:bg-primary/10"
        >
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  const expiryLabel =
    formatExpiry(
      state.session?.expiresAt,
    );

  return (
    <div className="py-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-success">
        Email đã được xác nhận
      </p>

      <h1 className="mt-2 text-2xl font-black text-text sm:text-3xl">
        Tạo mật khẩu tài khoản kiểm duyệt viên
      </h1>

      <p className="mt-3 text-sm leading-6 text-textLight">
        Hãy tạo mật khẩu để hoàn tất kích hoạt tài khoản.
      </p>

      {expiryLabel && (
        <div className="mt-5 rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs font-semibold leading-5 text-warning">
          Phiên tạo mật khẩu hết hạn lúc {expiryLabel}.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
      >
        <label className="block">
          <span className="text-sm font-bold text-text">
            Mật khẩu
          </span>

          <div className="relative mt-2">
            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) => {
                setPassword(
                  event.target.value,
                );
                setFormError("");
              }}
              minLength={12}
              maxLength={50}
              autoComplete="new-password"
              className="w-full rounded-xl border border-border px-4 py-3 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) =>
                    !current,
                )
              }
              aria-label={
                showPassword
                  ? "Ẩn mật khẩu"
                  : "Hiện mật khẩu"
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textLight"
            >
              <span className="material-symbols-outlined text-[21px]">
                {showPassword
                  ? "visibility_off"
                  : "visibility"}
              </span>
            </button>
          </div>

          <span className="mt-1.5 block text-xs text-textLight">
            Từ 12 đến 50 ký tự.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-text">
            Xác nhận mật khẩu
          </span>

          <div className="relative mt-2">
            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={
                confirmPassword
              }
              onChange={(event) => {
                setConfirmPassword(
                  event.target.value,
                );
                setFormError("");
              }}
              minLength={12}
              maxLength={50}
              autoComplete="new-password"
              className="w-full rounded-xl border border-border px-4 py-3 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (current) =>
                    !current,
                )
              }
              aria-label={
                showConfirmPassword
                  ? "Ẩn mật khẩu xác nhận"
                  : "Hiện mật khẩu xác nhận"
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textLight"
            >
              <span className="material-symbols-outlined text-[21px]">
                {showConfirmPassword
                  ? "visibility_off"
                  : "visibility"}
              </span>
            </button>
          </div>
        </label>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-error/20 bg-error/10 p-3 text-sm font-semibold leading-6 text-error"
          >
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && (
            <span className="material-symbols-outlined animate-spin text-[19px]">
              progress_activity
            </span>
          )}

          {submitting
            ? "Đang kích hoạt..."
            : "Hoàn tất kích hoạt"}
        </button>
      </form>
    </div>
  );
};

export default ModeratorActivatePage;

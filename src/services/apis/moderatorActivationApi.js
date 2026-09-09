import axiosClient from "./axiosClient";

const ensureToken = (
  value,
  message,
) => {
  const token =
    String(value || "").trim();

  if (!token) {
    throw new Error(message);
  }

  return token;
};

const unwrapResult = (
  result,
  fallbackMessage,
) => {
  if (
    result?.success === false ||
    result?.isSuccess === false
  ) {
    const error =
      new Error(
        result?.message ||
          result?.error?.message ||
          fallbackMessage,
      );

    error.code =
      result?.code ||
      result?.error?.code ||
      "";

    throw error;
  }

  return result?.data ?? result ?? {};
};

const moderatorActivationApi = {
  verifyEmail: async (emailToken) => {
    const token =
      ensureToken(
        emailToken,
        "Liên kết xác nhận không hợp lệ.",
      );

    const result =
      await axiosClient.post(
        "/auth/moderators/verify-email",
        { token },
        {
          skipGlobalErrorPage: true,
        },
      );

    return unwrapResult(
      result,
      "Không thể xác nhận email Moderator.",
    );
  },

  setPassword: async ({
    token,
    password,
    confirmPassword,
  }) => {
    const passwordSetupToken =
      ensureToken(
        token,
        "Phiên tạo mật khẩu không hợp lệ.",
      );

    const result =
      await axiosClient.post(
        "/auth/moderators/set-password",
        {
          token: passwordSetupToken,
          password,
          confirmPassword,
        },
        {
          skipGlobalErrorPage: true,
        },
      );

    return unwrapResult(
      result,
      "Không thể kích hoạt tài khoản Moderator.",
    );
  },
};

export default moderatorActivationApi;

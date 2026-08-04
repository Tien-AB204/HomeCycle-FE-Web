import axiosClient from "./axiosClient";

const authApi = {
  /**
   * Đăng nhập bằng email và mật khẩu.
   */
  login: ({ email, password }) => {
    return axiosClient.post("/auth/login", {
      email,
      password,
    });
  },

  /**
   * Gửi OTP xác thực email đăng ký.
   */
  sendOtp: (email) => {
    if (!email) {
      throw new Error(
        "Vui lòng nhập địa chỉ email.",
      );
    }

    return axiosClient.post("/auth/send-otp", {
      email,
    });
  },

  /**
   * Xác thực OTP và nhận registrationToken.
   */
  verifyOtp: ({ email, otp }) => {
    if (!email || !otp) {
      throw new Error(
        "Email và mã OTP là bắt buộc.",
      );
    }

    return axiosClient.post(
      "/auth/verify-otp",
      {
        email,
        otp,
      },
    );
  },

  /**
   * Đăng ký tài khoản cá nhân.
   */
  registerPersonal: (
    formData,
    registrationToken,
  ) => {
    if (!(formData instanceof FormData)) {
      throw new TypeError(
        "Dữ liệu đăng ký phải là FormData.",
      );
    }

    if (!registrationToken) {
      throw new Error(
        "Thiếu registration token.",
      );
    }

    return axiosClient.post(
      "/auth/Personal/Register",
      formData,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
          "X-Registration-Token":
            registrationToken,
        },
      },
    );
  },

  /**
   * Đăng ký tài khoản doanh nghiệp.
   *
   * registrationToken được nhận từ verify-otp.
   * API tự động trả accessToken và refreshToken
   * sau khi đăng ký thành công.
   */
  registerBusiness: ({
    password,
    registrationToken,
  }) => {
    if (!registrationToken) {
      throw new Error(
        "Phiên xác thực email không hợp lệ.",
      );
    }

    if (!password) {
      throw new Error(
        "Vui lòng nhập mật khẩu.",
      );
    }

    return axiosClient.post(
      "/auth/business/register",
      {
        password,
      },
      {
        headers: {
          "Content-Type":
            "application/json",
          "X-Registration-Token":
            registrationToken,
        },
      },
    );
  },

  /**
   * Đăng nhập bằng Google.
   */
  googleLogin: (idToken) => {
    if (!idToken) {
      throw new Error(
        "Thiếu Google ID token.",
      );
    }

    return axiosClient.post(
      "/auth/google-login",
      {
        idToken,
      },
    );
  },

  /**
   * Làm mới access token.
   */
  refreshToken: (refreshToken) => {
    if (!refreshToken) {
      throw new Error(
        "Thiếu refresh token.",
      );
    }

    return axiosClient.post(
      "/auth/refresh-token",
      {
        refreshToken,
      },
    );
  },
};

export default authApi;
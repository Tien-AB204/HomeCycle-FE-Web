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
    return axiosClient.post("/auth/send-otp", {
      email,
    });
  },

  /**
   * Xác thực OTP.
   *
   * Response thành công:
   * {
   *   success: true,
   *   message: string,
   *   registrationToken: string
   * }
   */
  verifyOtp: ({ email, otp }) => {
    return axiosClient.post("/auth/verify-otp", {
      email,
      otp,
    });
  },

  /**
   * Đăng ký tài khoản cá nhân.
   *
   * registrationToken được nhận từ API verify-otp.
   * formData phải là instance của FormData.
   */
  registerPersonal: (formData, registrationToken) => {
    if (!(formData instanceof FormData)) {
      throw new TypeError("Dữ liệu đăng ký phải là FormData.");
    }

    if (!registrationToken) {
      throw new Error("Thiếu registration token.");
    }

    return axiosClient.post(
      "/auth/Personal/Register", formData, 
      {
        headers: {
        "Content-Type": "multipart/form-data",
        "X-Registration-Token": registrationToken,
        },
      }
    );
  },

  /**
   * Đăng nhập bằng Google.
   */
  googleLogin: (idToken) => {
    return axiosClient.post("/auth/google-login", {
      idToken,
    });
  },

  /**
   * Làm mới access token.
   *
   * Backend sử dụng refresh-token rotation nên response sẽ trả về
   * cả accessToken mới và refreshToken mới.
   */
  refreshToken: (refreshToken) => {
    if (!refreshToken) {
      throw new Error("Thiếu refresh token.");
    }

    return axiosClient.post("/auth/refresh-token", {
      refreshToken,
    });
  },
};

export default authApi;

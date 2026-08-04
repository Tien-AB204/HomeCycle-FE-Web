import axiosClient from "./apis/axiosClient";

export const userService = {
  /**
   * Lấy hồ sơ người dùng đang đăng nhập.
   */
  getProfile: () => {
    return axiosClient.get(
      "/personal-profiles/me",
    );
  },

  /**
   * Cập nhật thông tin cá nhân cơ bản.
   */
  updateProfile: ({
    username,
    fullName,
    phoneNumber,
    address,
  }) => {
    return axiosClient.put(
      "/personal-profiles/me/profile",
      {
        username,
        fullName,
        phoneNumber,
        address,
      },
    );
  },

  /**
   * Cập nhật thông tin giấy tờ tùy thân.
   */
  updateIdentity: ({
    representativeCode,
    representativeName,
    representativeDob,
    representativeAddress,
    frontIdCardFile,
    backIdCardFile,
  }) => {
    const payload = new FormData();

    payload.append(
      "RepresentativeCode",
      representativeCode,
    );

    payload.append(
      "RepresentativeName",
      representativeName,
    );

    payload.append(
      "RepresentativeDob",
      representativeDob,
    );

    payload.append(
      "RepresentativeAddress",
      representativeAddress,
    );

    if (frontIdCardFile) {
      payload.append(
        "FrontIDCardImage",
        frontIdCardFile,
      );
    }

    if (backIdCardFile) {
      payload.append(
        "BackIDCardImage",
        backIdCardFile,
      );
    }

    return axiosClient.put(
      "/personal-profiles/me/identity",
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },

  /**
   * Cập nhật thông tin tài khoản ngân hàng.
   */
  updateBank: ({
    bankCode,
    bankName,
    accountNumber,
    accountName,
  }) => {
    return axiosClient.put(
      "/personal-profiles/me/bank",
      {
        bankCode,
        bankName,
        accountNumber,
        accountName,
      },
    );
  },
};
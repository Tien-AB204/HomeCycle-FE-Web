import axiosClient from "./apis/axiosClient";

export const userService = {
  /**
   * Lấy hồ sơ cá nhân đang đăng nhập.
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
  }) => {
    return axiosClient.patch(
      "/personal-profiles/me/profile",
      {
        username,
        fullName,
        phoneNumber,
      },
    );
  },

  /**
   * Cập nhật ảnh đại diện.
   */
  updateAvatar: (avatarFile) => {
    if (!avatarFile) {
      throw new Error(
        "Vui lòng chọn ảnh đại diện.",
      );
    }

    const payload = new FormData();

    payload.append(
      "AvatarUrl",
      avatarFile,
    );

    return axiosClient.patch(
      "/personal-profiles/me/avatar",
      payload,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      },
    );
  },

  /**
   * Cập nhật giấy tờ tùy thân.
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

    return axiosClient.patch(
      "/personal-profiles/me/identity",
      payload,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
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
    return axiosClient.patch(
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
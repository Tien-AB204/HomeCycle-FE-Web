import axiosClient from "./axiosClient";

const ensureSuccessfulResponse = (
  response,
  fallbackMessage,
) => {
  if (response?.isSuccess === false) {
    throw new Error(
      response?.error?.message ||
        response?.message ||
        fallbackMessage,
    );
  }

  return response?.data ?? response;
};

const appendText = (
  formData,
  key,
  value,
) => {
  const normalizedValue = String(
    value ?? "",
  ).trim();

  if (normalizedValue) {
    formData.append(key, normalizedValue);
  }
};

const multipartConfig = {
  headers: {
    "Content-Type":
      "multipart/form-data",
  },
};

const buildIdentityPayload = ({
  fullName,
  identityNumber,
  identityName,
  identityDob,
  identityAddress,
  cccdFront,
  cccdBack,
}) => {
  const payload = new FormData();

  appendText(payload, "FullName", fullName);
  appendText(
    payload,
    "IdentityNumber",
    identityNumber,
  );
  appendText(
    payload,
    "IdentityName",
    identityName,
  );
  appendText(
    payload,
    "IdentityDob",
    identityDob,
  );
  appendText(
    payload,
    "IdentityAddress",
    identityAddress,
  );

  if (cccdFront) {
    payload.append(
      "CccdFront",
      cccdFront,
    );
  }

  if (cccdBack) {
    payload.append(
      "CccdBack",
      cccdBack,
    );
  }

  return payload;
};

const buildRegistrationPayload = ({
  businessName,
  businessDescription,
  taxCode,
  businessAddress,
  ward,
  city,
  operatingScope,
  businessRegistrationCertificate,
}) => {
  const payload = new FormData();

  appendText(
    payload,
    "BusinessName",
    businessName,
  );
  appendText(
    payload,
    "BusinessDescription",
    businessDescription,
  );
  appendText(payload, "TaxCode", taxCode);
  appendText(
    payload,
    "BusinessAddress",
    businessAddress,
  );
  appendText(payload, "Ward", ward);
  appendText(payload, "City", city);
  appendText(
    payload,
    "OperatingScope",
    operatingScope,
  );

  if (businessRegistrationCertificate) {
    payload.append(
      "BusinessRegistrationCertificate",
      businessRegistrationCertificate,
    );
  }

  return payload;
};

const buildSubmitPayload = (data) => {
  const payload = new FormData();

  [
    ["FullName", data.fullName],
    ["BusinessName", data.businessName],
    [
      "BusinessDescription",
      data.businessDescription,
    ],
    ["TaxCode", data.taxCode],
    [
      "IdentityNumber",
      data.identityNumber,
    ],
    ["IdentityName", data.identityName],
    ["IdentityDob", data.identityDob],
    [
      "IdentityAddress",
      data.identityAddress,
    ],
    [
      "BusinessAddress",
      data.businessAddress,
    ],
    ["Ward", data.ward],
    ["City", data.city],
    ["OperatingScope", data.operatingScope],
    ["BusinessModel", data.businessModel],
    ["BankCode", data.bankCode],
    ["BankName", data.bankName],
    ["AccountNumber", data.accountNumber],
    ["AccountName", data.accountName],
    ["ServiceArea.City", data.serviceAreaCity],
    [
      "ServiceArea.Street",
      data.serviceAreaStreet,
    ],
    ["ServiceArea.Ward", data.serviceAreaWard],
  ].forEach(([key, value]) => {
    appendText(payload, key, value);
  });

  (data.documents || []).forEach(
    (document, index) => {
      if (!document?.file) return;

      payload.append(
        `Documents[${index}].DocumentType`,
        String(document.documentType),
      );
      payload.append(
        `Documents[${index}].DocumentUrl`,
        document.file,
      );
    },
  );

  return payload;
};

export const businessProfileApi = {
  getRegistrationDetail: async ({
    signal,
  } = {}) => {
    const response = await axiosClient.get(
      "/business-profiles/registration-detail",
      { signal },
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể tải hồ sơ đăng ký doanh nghiệp.",
    );
  },

  submit: async (data) => {
    const response = await axiosClient.post(
      "/business-profiles/submit",
      buildSubmitPayload(data),
      multipartConfig,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể gửi hồ sơ doanh nghiệp.",
    );
  },

  getOnboardingStatus: async ({
    signal,
  } = {}) => {
    const response = await axiosClient.get(
      "/business-profiles/onboarding-status",
      { signal },
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể tải tiến độ hồ sơ doanh nghiệp.",
    );
  },

  submitSurvey: async (survey) => {
    const response = await axiosClient.post(
      "/business-profiles/survey",
      survey,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể lưu khảo sát thu mua.",
    );
  },

  getSurveyDetail: async ({
    signal,
  } = {}) => {
    const response = await axiosClient.get(
      "/business-profiles/survey-detail",
      { signal },
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể tải khảo sát thu mua.",
    );
  },

  getProfile: async ({ signal } = {}) => {
    const response = await axiosClient.get(
      "/business-profiles",
      { signal },
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể tải hồ sơ doanh nghiệp.",
    );
  },

  updateUsername: async (username) => {
    const response = await axiosClient.put(
      "/business-profiles/username",
      { username: String(username || "").trim() },
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể cập nhật tên đăng nhập.",
    );
  },

  updatePhoneNumber: async (phoneNumber) => {
    const response = await axiosClient.put(
      "/business-profiles/phone-number",
      {
        phoneNumber: String(
          phoneNumber || "",
        ).trim(),
      },
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể cập nhật số điện thoại.",
    );
  },

  updateAvatar: async (avatarFile) => {
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

    const response = await axiosClient.put(
      "/business-profiles/avatar",
      payload,
      multipartConfig,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể cập nhật ảnh đại diện.",
    );
  },

  updateBankAccount: async (bankAccount) => {
    const response = await axiosClient.put(
      "/business-profiles/bank-account",
      bankAccount,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể cập nhật tài khoản ngân hàng.",
    );
  },

  updateIdentity: async (identity) => {
    const response = await axiosClient.put(
      "/business-profiles/identity",
      buildIdentityPayload(identity),
      multipartConfig,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể cập nhật thông tin người đại diện.",
    );
  },

  updateBusinessRegistration: async (
    registration,
  ) => {
    const response = await axiosClient.put(
      "/business-profiles/business-registration",
      buildRegistrationPayload(registration),
      multipartConfig,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể cập nhật đăng ký kinh doanh.",
    );
  },

  addServiceArea: async (serviceArea) => {
    const response = await axiosClient.post(
      "/business-profiles/service-areas",
      serviceArea,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể thêm khu vực hoạt động.",
    );
  },

  updateServiceArea: async (
    businessServiceAreaId,
    serviceArea,
  ) => {
    const response = await axiosClient.put(
      `/business-profiles/service-areas/${encodeURIComponent(
        businessServiceAreaId,
      )}`,
      serviceArea,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể cập nhật khu vực hoạt động.",
    );
  },

  deleteServiceArea: async (
    businessServiceAreaId,
  ) => {
    const response = await axiosClient.delete(
      `/business-profiles/service-areas/${encodeURIComponent(
        businessServiceAreaId,
      )}`,
    );

    return ensureSuccessfulResponse(
      response,
      "Không thể xóa khu vực hoạt động.",
    );
  },
};

export default businessProfileApi;

export const MAX_BUSINESS_FILE_SIZE =
  5 * 1024 * 1024;

export const ACCEPTED_BUSINESS_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const getBusinessApiErrorMessage = (
  error,
  fallbackMessage,
) => {
  const responseData =
    error?.response?.data;

  const validationMessage =
    responseData?.errors
      ? Object.values(
          responseData.errors,
        )
          .flat()
          .find(Boolean)
      : "";

  return (
    validationMessage ||
    responseData?.message ||
    responseData?.error?.message ||
    error?.message ||
    fallbackMessage
  );
};

export const validateBusinessFile = (
  file,
  label,
  { required = false } = {},
) => {
  if (!file) {
    return required
      ? `Vui lòng chọn ${label.toLowerCase()}.`
      : "";
  }

  if (
    !ACCEPTED_BUSINESS_FILE_TYPES.includes(
      file.type,
    )
  ) {
    return `${label} chỉ hỗ trợ JPG, PNG, WEBP hoặc PDF.`;
  }

  if (
    file.size > MAX_BUSINESS_FILE_SIZE
  ) {
    return `${label} không được vượt quá 5MB.`;
  }

  return "";
};

export const pickValue = (
  source,
  keys,
  fallback = "",
) => {
  for (const key of keys) {
    const value = source?.[key];

    if (
      value !== undefined &&
      value !== null
    ) {
      return value;
    }
  }

  return fallback;
};

export const normalizeBusinessProfile = (
  rawProfile,
) => {
  const profile =
    rawProfile?.profile ||
    rawProfile?.businessProfile ||
    rawProfile ||
    {};

  const bankAccount =
    profile.bankAccount ||
    profile.businessBankAccount ||
    null;

  const serviceAreas = pickValue(
    profile,
    [
      "serviceAreas",
      "businessServiceAreas",
      "ServiceAreas",
    ],
    [],
  );

  return {
    ...profile,
    id: pickValue(profile, [
      "businessProfileId",
      "profileId",
      "id",
    ]),
    username: pickValue(profile, [
      "username",
      "userName",
    ]),
    email: pickValue(profile, [
      "email",
      "businessEmail",
    ]),
    phoneNumber: pickValue(profile, [
      "phoneNumber",
      "phone",
    ]),
    avatarUrl: pickValue(profile, [
      "avatarUrl",
      "avatarURL",
    ]),
    fullName: pickValue(profile, [
      "fullName",
      "representativeFullName",
    ]),
    identityNumber: pickValue(profile, [
      "identityNumber",
      "representativeCode",
      "cccdNumber",
    ]),
    identityName: pickValue(profile, [
      "identityName",
      "representativeName",
    ]),
    identityDob: String(
      pickValue(profile, [
        "identityDob",
        "representativeDob",
      ]),
    ).slice(0, 10),
    identityAddress: pickValue(profile, [
      "identityAddress",
      "representativeAddress",
    ]),
    cccdFrontUrl: pickValue(profile, [
      "cccdFrontUrl",
      "cccdFront",
      "frontIDCardImage",
    ]),
    cccdBackUrl: pickValue(profile, [
      "cccdBackUrl",
      "cccdBack",
      "backIDCardImage",
    ]),
    businessName: pickValue(profile, [
      "businessName",
      "companyName",
    ]),
    businessDescription: pickValue(
      profile,
      ["businessDescription", "description"],
    ),
    taxCode: pickValue(profile, [
      "taxCode",
      "businessTaxCode",
    ]),
    businessAddress: pickValue(profile, [
      "businessAddress",
      "address",
    ]),
    ward: pickValue(profile, ["ward"]),
    city: pickValue(profile, [
      "city",
      "province",
    ]),
    operatingScope: pickValue(profile, [
      "operatingScope",
      "scope",
    ]),
    businessRegistrationCertificateUrl:
      pickValue(profile, [
        "businessRegistrationCertificateUrl",
        "businessRegistrationCertificate",
        "registrationCertificateUrl",
      ]),
    bankAccount,
    serviceAreas: Array.isArray(
      serviceAreas,
    )
      ? serviceAreas
      : [],
    status: pickValue(profile, [
      "verificationStatus",
      "businessProfileStatus",
      "status",
    ]),
    rejectReason: pickValue(profile, [
      "rejectReason",
      "rejectionReason",
    ]),
  };
};

export const getServiceAreaId = (
  serviceArea,
) => {
  return String(
    pickValue(serviceArea, [
      "businessServiceAreaId",
      "serviceAreaId",
      "id",
    ]),
  ).trim();
};

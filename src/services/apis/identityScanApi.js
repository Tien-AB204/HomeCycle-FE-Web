import axiosClient from "./axiosClient";
import { getSafeProblemDetail } from "../../utils/safeErrorMessage";

/*
 * Quét CCCD bằng AI (Backend gọi Gemini). Ba luồng:
 *   - Đăng ký cá nhân: POST /auth/personal/scan-identity + X-Registration-Token.
 *   - Cá nhân đã đăng nhập: POST /personal-profiles/me/identity/scan.
 *   - Doanh nghiệp đã đăng nhập: POST /business-profiles/me/identity/scan.
 * Kết quả chỉ là gợi ý để người dùng đối chiếu, không dùng để xác minh.
 */
export const IDENTITY_SCAN_TARGETS = Object.freeze({
  REGISTER: "register",
  PERSONAL: "personal",
  BUSINESS: "business",
});

const SCAN_URLS = {
  [IDENTITY_SCAN_TARGETS.REGISTER]: "/auth/personal/scan-identity",
  [IDENTITY_SCAN_TARGETS.PERSONAL]: "/personal-profiles/me/identity/scan",
  [IDENTITY_SCAN_TARGETS.BUSINESS]: "/business-profiles/me/identity/scan",
};

export const IDENTITY_SCAN_FIELD_LABELS = {
  identityNumber: "Số CCCD",
  fullName: "Họ và tên",
  dateOfBirth: "Ngày sinh",
  address: "Địa chỉ",
};

const asText = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

const asTextList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

export const identityScanApi = {
  scan: async ({ target, registrationToken, frontFile, backFile }) => {
    const url = SCAN_URLS[target];

    if (!url) {
      throw new Error("Luồng quét CCCD không hợp lệ.");
    }

    const formData = new FormData();
    formData.append("FrontImage", frontFile);
    formData.append("BackImage", backFile);
    formData.append("ConsentConfirmed", "true");

    const response = await axiosClient.post(url, formData, {
      timeout: 90000,
      skipGlobalErrorPage: true,
      headers:
        target === IDENTITY_SCAN_TARGETS.REGISTER
          ? { "X-Registration-Token": registrationToken }
          : undefined,
    });
    const data = response?.data ?? response ?? {};

    return {
      identityNumber: asText(data.identityNumber),
      fullName: asText(data.fullName),
      // yyyy-MM-dd
      dateOfBirth: asText(data.dateOfBirth),
      address: asText(data.address),
      unreadableFields: asTextList(data.unreadableFields),
      warnings: asTextList(data.warnings),
    };
  },
};

const FALLBACK_MESSAGES = {
  REGISTRATION_TOKEN_REQUIRED:
    "Phiên đăng ký không hợp lệ. Vui lòng xác thực lại email.",
  REGISTRATION_TOKEN_INVALID_OR_EXPIRED:
    "Phiên đăng ký không hợp lệ. Vui lòng xác thực lại email.",
  IDENTITY_SCAN_ROLE_FORBIDDEN:
    "Tài khoản không có quyền quét CCCD theo luồng này.",
  IDENTITY_SCAN_RATE_LIMITED:
    "Dịch vụ quét đang quá tải hoặc hết hạn mức. Vui lòng thử lại sau.",
  IDENTITY_SCAN_TEMPORARILY_UNAVAILABLE:
    "Dịch vụ quét tạm thời không khả dụng. Vui lòng thử lại sau.",
  IDENTITY_SCAN_TIMEOUT:
    "Dịch vụ quét phản hồi quá lâu. Vui lòng thử lại sau.",
  IDENTITY_SCAN_PROVIDER_CONFIGURATION_ERROR:
    "Chưa thể quét CCCD lúc này. Vui lòng tự nhập thông tin hoặc liên hệ hỗ trợ.",
  IDENTITY_SCAN_PROVIDER_INVALID_RESPONSE:
    "Chưa thể quét CCCD lúc này. Vui lòng tự nhập thông tin hoặc liên hệ hỗ trợ.",
};

const STATUS_FALLBACKS = {
  429: FALLBACK_MESSAGES.IDENTITY_SCAN_RATE_LIMITED,
  502: FALLBACK_MESSAGES.IDENTITY_SCAN_PROVIDER_CONFIGURATION_ERROR,
  503: FALLBACK_MESSAGES.IDENTITY_SCAN_TEMPORARILY_UNAVAILABLE,
  504: FALLBACK_MESSAGES.IDENTITY_SCAN_TIMEOUT,
};

export const getIdentityScanErrorMessage = (error) => {
  const data = error?.response?.data;
  const code = String(data?.code ?? data?.error?.code ?? "").trim();

  return (
    getSafeProblemDetail(data?.error?.message) ||
    getSafeProblemDetail(data?.message) ||
    FALLBACK_MESSAGES[code] ||
    STATUS_FALLBACKS[Number(error?.response?.status)] ||
    "Không thể quét CCCD. Vui lòng kiểm tra ảnh và thử lại, hoặc tự nhập thông tin."
  );
};

export default identityScanApi;

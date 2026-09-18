export const EMAIL_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 50;
export const FULL_NAME_MAX_LENGTH = 100;
export const USERNAME_MAX_LENGTH = 100;

export const validateEmail = (value) => {
  const email = String(value || "").trim();

  if (!email) {
    return "Vui lòng nhập địa chỉ email.";
  }

  if (
    email.length >
    EMAIL_MAX_LENGTH
  ) {
    return `Email không được vượt quá ${EMAIL_MAX_LENGTH} ký tự.`;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    return "Địa chỉ email không đúng định dạng.";
  }

  return "";
};

export const validatePassword = (value) => {
  const password =
    String(value ?? "");

  if (
    !password ||
    !password.trim()
  ) {
    return "Vui lòng nhập mật khẩu.";
  }

  if (
    password.length <
    PASSWORD_MIN_LENGTH
  ) {
    return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  }

  if (
    password.length >
    PASSWORD_MAX_LENGTH
  ) {
    return `Mật khẩu không được vượt quá ${PASSWORD_MAX_LENGTH} ký tự.`;
  }

  return "";
};

export const validateFullName = (value) => {
  const fullName =
    String(value || "").trim();

  if (!fullName) {
    return "Vui lòng nhập họ và tên.";
  }

  if (
    fullName.length >
    FULL_NAME_MAX_LENGTH
  ) {
    return `Họ và tên không được vượt quá ${FULL_NAME_MAX_LENGTH} ký tự.`;
  }

  if (/ {2,}/u.test(fullName)) {
    return "Họ và tên chỉ được có một khoảng trắng giữa các từ.";
  }

  if (
    !/^[\p{L}]+(?: [\p{L}]+)*$/u.test(
      fullName,
    )
  ) {
    return "Họ và tên chỉ được chứa chữ cái và khoảng trắng.";
  }

  return "";
};

export const validateUsername = (value) => {
  const username =
    String(value || "").trim();

  if (!username) {
    return "Vui lòng nhập username.";
  }

  if (
    username.length >
    USERNAME_MAX_LENGTH
  ) {
    return `Username không được vượt quá ${USERNAME_MAX_LENGTH} ký tự.`;
  }

  if (
    !/^[A-Za-z0-9_]+$/.test(
      username,
    )
  ) {
    return "Username chỉ được chứa chữ cái, chữ số và dấu gạch dưới _.";
  }

  return "";
};

export const normalizeVietnamPhone = (value) =>
  String(value || "").replace(
    /[\s.-]/gu,
    "",
  );

export const validateVietnamPhone = (value) => {
  const raw =
    String(value || "").trim();

  if (!raw) {
    return "Vui lòng nhập số điện thoại.";
  }

  const normalized =
    normalizeVietnamPhone(raw);

  if (!/^\d+$/.test(normalized)) {
    return "Số điện thoại chỉ được chứa chữ số, khoảng trắng, dấu chấm hoặc dấu gạch ngang.";
  }

  if (
    !/^0(?:[35789]\d{8}|2\d{9})$/.test(
      normalized,
    )
  ) {
    return "Số điện thoại phải bắt đầu bằng 02, 03, 05, 07, 08 hoặc 09.";
  }

  return "";
};

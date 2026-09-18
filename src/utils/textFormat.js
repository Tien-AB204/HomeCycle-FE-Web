const VIETNAMESE_LOCALE = "vi-VN";

export const toUppercaseText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .toLocaleUpperCase(
      VIETNAMESE_LOCALE,
    );

export const capitalizeWordInitials = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(
      /(^|[\s/.,-])([\p{L}])/gu,
      (_match, prefix, letter) =>
        `${prefix}${letter.toLocaleUpperCase(
          VIETNAMESE_LOCALE,
        )}`,
    );

export const toTitleCaseText = (value) =>
  capitalizeWordInitials(
    String(value ?? "")
      .normalize("NFC")
      .toLocaleLowerCase(
        VIETNAMESE_LOCALE,
      ),
  );

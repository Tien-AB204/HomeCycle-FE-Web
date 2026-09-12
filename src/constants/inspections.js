/*
 * Nhãn hiển thị cho các enum của Inspection Form (biên bản kiểm định).
 * Backend serialize các enum này dưới dạng tên chuỗi (JsonStringEnumConverter).
 * Giữ đồng bộ nội dung với bảng nhãn read-only phía Moderator
 * (AppointmentMonitoringPage.jsx) dù không dùng chung module, để tránh
 * bất kỳ rủi ro thay đổi hành vi màn hình Moderator.
 */

export const INSPECTION_STATUS = Object.freeze({
  DRAFT: "Draft",
  PENDING_SELLER_CONFIRMATION: "PendingSellerConfirmation",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
});

const INSPECTION_STATUS_LABELS = Object.freeze({
  Draft: "Bản nháp",
  PendingSellerConfirmation: "Chờ người bán xác nhận",
  Accepted: "Người bán đã đồng ý",
  Rejected: "Người bán từ chối",
});

export const INSPECTION_CONCLUSION = Object.freeze({
  PASSED: "Passed",
  PRICE_ADJUSTMENT: "PriceAdjustment",
  FAILED: "Failed",
});

const INSPECTION_CONCLUSION_LABELS = Object.freeze({
  Passed: "Đạt yêu cầu",
  PriceAdjustment: "Cần điều chỉnh giá",
  Failed: "Không đạt yêu cầu",
});

const INSPECTION_OPERATING_STATUS_LABELS = Object.freeze({
  WorkingWell: "Hoạt động tốt",
  WorkingWithMinorIssue: "Hoạt động, có lỗi nhỏ",
  Unstable: "Hoạt động không ổn định",
  NotWorking: "Không hoạt động",
  UnableToTest: "Không thể kiểm tra",
});

const INSPECTION_APPEARANCE_STATUS_LABELS = Object.freeze({
  Intact: "Nguyên vẹn",
  MinorScratches: "Trầy xước nhẹ",
  HeavyScratches: "Trầy xước nặng",
  DeformedOrCracked: "Biến dạng/nứt vỡ",
  PreviouslyRepaired: "Đã từng sửa chữa",
});

const INSPECTION_PARTS_STATUS_LABELS = Object.freeze({
  Complete: "Đầy đủ",
  MissingParts: "Thiếu phụ kiện",
});

const INSPECTION_MATCH_STATUS_LABELS = Object.freeze({
  MatchesDescription: "Đúng như mô tả",
  MinorDifference: "Khác biệt nhỏ",
  SignificantDifference: "Khác biệt đáng kể",
  DoesNotMatch: "Không đúng như mô tả",
});

const INSPECTION_COLLECT_ACTION_LABELS = Object.freeze({
  CollectNow: "Thu gom ngay",
  ScheduleCollection: "Đặt lịch thu gom",
});

const normalizeKey = (value) => String(value ?? "").trim();

const getLabelFromMap = (map, value, fallback = "Chưa xác định") => {
  const key = normalizeKey(value);
  return key ? map[key] || fallback : fallback;
};

export const getInspectionStatusLabel = (value) =>
  getLabelFromMap(INSPECTION_STATUS_LABELS, value);

export const getInspectionConclusionLabel = (value) =>
  getLabelFromMap(INSPECTION_CONCLUSION_LABELS, value, "");

export const getOperatingStatusLabel = (value) =>
  getLabelFromMap(INSPECTION_OPERATING_STATUS_LABELS, value);

export const getAppearanceStatusLabel = (value) =>
  getLabelFromMap(INSPECTION_APPEARANCE_STATUS_LABELS, value);

export const getPartsStatusLabel = (value) =>
  getLabelFromMap(INSPECTION_PARTS_STATUS_LABELS, value);

export const getMatchStatusLabel = (value) =>
  getLabelFromMap(INSPECTION_MATCH_STATUS_LABELS, value);

export const getCollectActionLabel = (value) =>
  getLabelFromMap(INSPECTION_COLLECT_ACTION_LABELS, value);

export const OPERATING_STATUS_OPTIONS = Object.keys(
  INSPECTION_OPERATING_STATUS_LABELS,
).map((value) => ({ value, label: INSPECTION_OPERATING_STATUS_LABELS[value] }));

export const APPEARANCE_STATUS_OPTIONS = Object.keys(
  INSPECTION_APPEARANCE_STATUS_LABELS,
).map((value) => ({ value, label: INSPECTION_APPEARANCE_STATUS_LABELS[value] }));

export const PARTS_STATUS_OPTIONS = Object.keys(
  INSPECTION_PARTS_STATUS_LABELS,
).map((value) => ({ value, label: INSPECTION_PARTS_STATUS_LABELS[value] }));

export const MATCH_STATUS_OPTIONS = Object.keys(
  INSPECTION_MATCH_STATUS_LABELS,
).map((value) => ({ value, label: INSPECTION_MATCH_STATUS_LABELS[value] }));

export const CONCLUSION_OPTIONS = Object.keys(
  INSPECTION_CONCLUSION_LABELS,
).map((value) => ({ value, label: INSPECTION_CONCLUSION_LABELS[value] }));

/*
 * Mã lỗi Inspection do Backend trả (Errors.cs -> InspectionErrors).
 * Backend đã tự cung cấp message tiếng Việt an toàn cho từng mã;
 * bảng này chỉ dùng để phủ các trường hợp Backend trả message kỹ thuật
 * (ví dụ Validation.InvalidRequest) bằng một câu an toàn, chưa xác định.
 */
export const INSPECTION_FALLBACK_ERROR_MESSAGE =
  "Không thể xử lý biên bản kiểm định. Vui lòng thử lại.";

export const getSafeInspectionErrorMessage = (error, fallback) => {
  const code = String(
    error?.response?.data?.error?.code ??
      error?.response?.data?.code ??
      "",
  ).trim();

  const backendMessage = String(
    error?.response?.data?.error?.message ??
      error?.response?.data?.message ??
      "",
  ).trim();

  if (code === "Inspection.RevisionMismatch") {
    return "Biên bản đã được cập nhật ở phiên khác. Dữ liệu mới nhất đã được tải lại.";
  }

  if (code.startsWith("Inspection.") && backendMessage) {
    return backendMessage;
  }

  return fallback || INSPECTION_FALLBACK_ERROR_MESSAGE;
};

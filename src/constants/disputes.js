export const DISPUTE_TARGET_TYPE = Object.freeze({
  APPOINTMENT: 1,
  ORDER: 2,
  REVIEW: 3,
});

export const DISPUTE_CATEGORY = Object.freeze({
  NO_SHOW: 1,
  ITEM_MISMATCH: 2,
  SELLER_NOT_SHIPPED: 3,
  DAMAGED_OR_LOST: 4,
  ITEM_NOT_RECEIVED: 5,
  FRAUD_OR_SCAM: 6,
  ABUSIVE_REVIEW: 7,
  PAYMENT_NOT_COMPLETED: 8,
  COMMITMENT_VIOLATION: 9,
  OTHER: 99,
});

export const DISPUTE_STATUS = Object.freeze({
  PENDING: 0,
  RESOLVED: 1,
  REJECTED: 2,
  CLOSED: 3,
  UNDER_REVIEW: 4,
  AWAITING_RETURN: 5,
});

/*
 * Backend DisputeStatus/DisputeCategory enum names, dùng làm canonical key.
 * Detail DTO trả enum-name string (JsonStringEnumConverter), form/list có thể
 * dùng số - helper hiển thị phải tra được cả hai dạng cho cùng 1 giá trị.
 */
const DISPUTE_STATUS_NAMES = Object.freeze({
  [DISPUTE_STATUS.PENDING]: "Pending",
  [DISPUTE_STATUS.RESOLVED]: "Resolved",
  [DISPUTE_STATUS.REJECTED]: "Rejected",
  [DISPUTE_STATUS.CLOSED]: "Closed",
  [DISPUTE_STATUS.UNDER_REVIEW]: "UnderReview",
  [DISPUTE_STATUS.AWAITING_RETURN]: "AwaitingReturn",
});

const DISPUTE_CATEGORY_NAMES = Object.freeze({
  [DISPUTE_CATEGORY.NO_SHOW]: "NoShow",
  [DISPUTE_CATEGORY.ITEM_MISMATCH]: "ItemMismatch",
  [DISPUTE_CATEGORY.SELLER_NOT_SHIPPED]: "SellerNotShipped",
  [DISPUTE_CATEGORY.DAMAGED_OR_LOST]: "DamagedOrLost",
  [DISPUTE_CATEGORY.ITEM_NOT_RECEIVED]: "ItemNotReceived",
  [DISPUTE_CATEGORY.FRAUD_OR_SCAM]: "FraudOrScam",
  [DISPUTE_CATEGORY.ABUSIVE_REVIEW]: "AbusiveReview",
  [DISPUTE_CATEGORY.PAYMENT_NOT_COMPLETED]: "PaymentNotCompleted",
  [DISPUTE_CATEGORY.COMMITMENT_VIOLATION]: "CommitmentViolation",
  [DISPUTE_CATEGORY.OTHER]: "Other",
});

/*
 * Chuẩn hoá 1 giá trị (number | numeric string | enum-name string) về
 * số enum Backend, hoặc null nếu không nhận diện được.
 */
const normalizeEnumNumber = (value, namesByNumber) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    const byName = Object.keys(namesByNumber).find(
      (key) => namesByNumber[key] === trimmed,
    );

    if (byName !== undefined) {
      return Number(byName);
    }
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) && namesByNumber[numeric] !== undefined
    ? numeric
    : null;
};

export const normalizeDisputeStatus = (value) =>
  normalizeEnumNumber(value, DISPUTE_STATUS_NAMES);

export const normalizeDisputeCategory = (value) =>
  normalizeEnumNumber(value, DISPUTE_CATEGORY_NAMES);

export const ORDER_DISPUTE_CATEGORY_OPTIONS = Object.freeze([
  {
    value: DISPUTE_CATEGORY.NO_SHOW,
    label: "Đối tác không xuất hiện",
  },
  {
    value: DISPUTE_CATEGORY.ITEM_MISMATCH,
    label: "Sản phẩm không đúng thỏa thuận",
  },
  {
    value: DISPUTE_CATEGORY.SELLER_NOT_SHIPPED,
    label: "Người bán chưa gửi hoặc bàn giao hàng",
  },
  {
    value: DISPUTE_CATEGORY.DAMAGED_OR_LOST,
    label: "Sản phẩm bị hư hỏng hoặc thất lạc",
  },
  {
    value: DISPUTE_CATEGORY.ITEM_NOT_RECEIVED,
    label: "Chưa nhận được sản phẩm",
  },
  {
    value: DISPUTE_CATEGORY.FRAUD_OR_SCAM,
    label: "Nghi ngờ gian lận hoặc lừa đảo",
  },
  {
    value: DISPUTE_CATEGORY.PAYMENT_NOT_COMPLETED,
    label: "Thanh toán chưa hoàn tất",
  },
  {
    value: DISPUTE_CATEGORY.COMMITMENT_VIOLATION,
    label: "Vi phạm cam kết giao dịch",
  },
  {
    value: DISPUTE_CATEGORY.OTHER,
    label: "Lý do khác",
  },
]);

const DISPUTE_STATUS_META = Object.freeze({
  [DISPUTE_STATUS.PENDING]: {
    label: "Đang chờ xử lý",
    className:
      "border-warning/30 bg-warning/10 text-warning",
  },
  [DISPUTE_STATUS.RESOLVED]: {
    label: "Đã giải quyết",
    className:
      "border-success/30 bg-success/10 text-success",
  },
  [DISPUTE_STATUS.REJECTED]: {
    label: "Đã từ chối",
    className:
      "border-error/30 bg-error/10 text-error",
  },
  [DISPUTE_STATUS.CLOSED]: {
    label: "Đã đóng",
    className:
      "border-border bg-textLight/10 text-textLight",
  },
  [DISPUTE_STATUS.UNDER_REVIEW]: {
    label: "Đang xử lý",
    className:
      "border-primary/30 bg-primary/10 text-primary",
  },
  [DISPUTE_STATUS.AWAITING_RETURN]: {
    label: "Chờ hoàn trả",
    className:
      "border-warning/30 bg-warning/10 text-warning",
  },
});

const UNKNOWN_DISPUTE_STATUS_META = Object.freeze({
  label: "Chưa xác định",
  className:
    "border-border bg-textLight/10 text-textLight",
});

export const getDisputeCategoryLabel = (category) => {
  const normalizedCategory = normalizeDisputeCategory(category);

  if (normalizedCategory === null) {
    return "Chưa xác định";
  }

  return (
    ORDER_DISPUTE_CATEGORY_OPTIONS.find(
      (option) => option.value === normalizedCategory,
    )?.label ||
    (normalizedCategory === DISPUTE_CATEGORY.ABUSIVE_REVIEW
      ? "Đánh giá có nội dung không phù hợp"
      : "Chưa xác định")
  );
};

export const getDisputeStatusMeta = (status) => {
  const normalizedStatus = normalizeDisputeStatus(status);

  return (
    (normalizedStatus !== null && DISPUTE_STATUS_META[normalizedStatus]) ||
    UNKNOWN_DISPUTE_STATUS_META
  );
};
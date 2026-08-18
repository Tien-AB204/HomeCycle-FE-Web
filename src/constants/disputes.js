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
});

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
      "border-amber-200 bg-amber-50 text-amber-700",
  },
  [DISPUTE_STATUS.RESOLVED]: {
    label: "Đã giải quyết",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  [DISPUTE_STATUS.REJECTED]: {
    label: "Đã từ chối",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
  [DISPUTE_STATUS.CLOSED]: {
    label: "Đã đóng",
    className:
      "border-slate-200 bg-slate-100 text-slate-700",
  },
});

export const getDisputeCategoryLabel = (category) => {
  const normalizedCategory = Number(category);

  return (
    ORDER_DISPUTE_CATEGORY_OPTIONS.find(
      (option) => option.value === normalizedCategory,
    )?.label ||
    (normalizedCategory === DISPUTE_CATEGORY.ABUSIVE_REVIEW
      ? "Đánh giá có nội dung không phù hợp"
      : "Chưa xác định")
  );
};

export const getDisputeStatusMeta = (status) =>
  DISPUTE_STATUS_META[Number(status)] || {
    label: "Chưa xác định",
    className:
      "border-gray-200 bg-gray-50 text-gray-600",
  };
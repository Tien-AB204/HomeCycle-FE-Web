export const OFFER_STATUS = Object.freeze({
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  EXPIRED: "Expired",
});

const OFFER_STATUS_BY_NUMBER = Object.freeze({
  0: OFFER_STATUS.PENDING,
  1: OFFER_STATUS.ACCEPTED,
  2: OFFER_STATUS.REJECTED,
  3: OFFER_STATUS.CANCELLED,
  4: OFFER_STATUS.COMPLETED,
  5: OFFER_STATUS.CLOSED,
  6: OFFER_STATUS.EXPIRED,
});

export const OFFER_STATUS_META = Object.freeze({
  pending: {
    label: "Đang chờ",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  accepted: {
    label: "Đã chấp nhận",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  rejected: {
    label: "Đã từ chối",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  completed: {
    label: "Đã hoàn tất",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  closed: {
    label: "Đã đóng",
    className: "border-gray-200 bg-gray-100 text-gray-600",
  },
  expired: {
    label: "Đã hết hạn",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
});

export const normalizeOfferStatus = (status) => {
  if (typeof status === "number") {
    return OFFER_STATUS_BY_NUMBER[status] || String(status);
  }

  return String(status || "").trim();
};

export const getOfferStatusMeta = (status) => {
  const normalizedStatus = normalizeOfferStatus(status).toLowerCase();

  return (
    OFFER_STATUS_META[normalizedStatus] || {
      label: normalizeOfferStatus(status) || "Chưa xác định",
      className: "border-gray-200 bg-gray-50 text-gray-600",
    }
  );
};

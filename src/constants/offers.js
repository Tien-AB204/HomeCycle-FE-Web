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
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  accepted: {
    label: "Đã chấp nhận",
    className: "border-success/30 bg-success/10 text-success",
  },
  rejected: {
    label: "Đã từ chối",
    className: "border-error/30 bg-error/10 text-error",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-border bg-textLight/10 text-textLight",
  },
  completed: {
    label: "Đã hoàn tất",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  closed: {
    label: "Đã đóng",
    className: "border-border bg-textLight/10 text-textLight",
  },
  expired: {
    label: "Đã hết hạn",
    className: "border-warning/30 bg-warning/10 text-warning",
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
      className: "border-border bg-textLight/10 text-textLight",
    }
  );
};

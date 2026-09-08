import { normalizeOfferStatus } from "./offers";

export const NEGOTIATION_STATUS = Object.freeze({
  OPEN: "Open",
  AGREED: "Agreed",
  AGREEMENT_PENDING: "AgreementPending",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
});

const NEGOTIATION_STATUS_BY_NUMBER = Object.freeze({
  1: NEGOTIATION_STATUS.OPEN,
  2: NEGOTIATION_STATUS.AGREED,
  3: NEGOTIATION_STATUS.AGREEMENT_PENDING,
  4: NEGOTIATION_STATUS.COMPLETED,
  5: NEGOTIATION_STATUS.CLOSED,
  6: NEGOTIATION_STATUS.EXPIRED,
  7: NEGOTIATION_STATUS.CANCELLED,
});

const NEGOTIATION_STATUS_META = Object.freeze({
  open: {
    label: "Đang thương lượng",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  agreed: {
    label: "Đã thống nhất",
    className: "border-success/30 bg-success/10 text-success",
  },
  agreementpending: {
    label: "Chờ xác nhận thỏa thuận",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  completed: {
    label: "Đã hoàn tất",
    className: "border-success/30 bg-success/10 text-success",
  },
  closed: {
    label: "Đã đóng",
    className: "border-border bg-textLight/10 text-textLight",
  },
  expired: {
    label: "Đã hết hạn",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-error/30 bg-error/10 text-error",
  },
});

export const MESSAGE_TYPE = Object.freeze({
  TEXT: "Text",
  OFFER: "Offer",
  COUNTER_OFFER: "CounterOffer",
  AGREEMENT: "Agreement",
});

const OFFER_STATUS_META = Object.freeze({
  pending: {
    label: "Đang chờ phản hồi",
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
  superseded: {
    label: "Đã có đề xuất mới",
    className: "border-border bg-textLight/10 text-textLight",
  },
});

export const normalizeNegotiationStatus = (status) => {
  if (typeof status === "number") {
    return NEGOTIATION_STATUS_BY_NUMBER[status] || String(status);
  }

  return String(status || "").trim();
};

export const getNegotiationStatusMeta = (status) => {
  const normalizedStatus = normalizeNegotiationStatus(status);
  const key = normalizedStatus.replace(/[\s_-]+/g, "").toLowerCase();

  return (
    NEGOTIATION_STATUS_META[key] || {
      label: normalizedStatus || "Chưa xác định",
      className: "border-border bg-textLight/10 text-textLight",
    }
  );
};

export const getProposalStatusMeta = (status) => {
  const normalizedStatus = normalizeOfferStatus(status);

  return (
    OFFER_STATUS_META[normalizedStatus.toLowerCase()] || {
      label: normalizedStatus || "Chưa xác định",
      className: "border-border bg-textLight/10 text-textLight",
    }
  );
};

export const isProposalMessage = (messageType) => {
  return [MESSAGE_TYPE.OFFER, MESSAGE_TYPE.COUNTER_OFFER].includes(
    String(messageType || "").trim(),
  );
};

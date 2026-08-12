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
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  agreed: {
    label: "Đã thống nhất",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  agreementpending: {
    label: "Chờ xác nhận thỏa thuận",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  completed: {
    label: "Đã hoàn tất",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  closed: {
    label: "Đã đóng",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  expired: {
    label: "Đã hết hạn",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-red-200 bg-red-50 text-red-700",
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
  superseded: {
    label: "Đã có đề xuất mới",
    className: "border-slate-200 bg-slate-100 text-slate-500",
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
      className: "border-gray-200 bg-gray-50 text-gray-600",
    }
  );
};

export const getProposalStatusMeta = (status) => {
  const normalizedStatus = normalizeOfferStatus(status);

  return (
    OFFER_STATUS_META[normalizedStatus.toLowerCase()] || {
      label: normalizedStatus || "Chưa xác định",
      className: "border-gray-200 bg-gray-50 text-gray-600",
    }
  );
};

export const isProposalMessage = (messageType) => {
  return [MESSAGE_TYPE.OFFER, MESSAGE_TYPE.COUNTER_OFFER].includes(
    String(messageType || "").trim(),
  );
};

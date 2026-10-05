/*
 * Trạng thái phòng thương lượng suy ra từ phiên + hợp đồng: hạn nào đang
 * chạy, ô nhập có bị khóa không, phiên đã kết thúc chưa và vì sao.
 * Không import module khác để chạy được bằng node --test.
 */

const toKey = (value) =>
  String(value ?? "").replace(/[\s_-]/g, "").trim().toLowerCase();

const NEGOTIATION_KEYS = Object.freeze({
  open: ["open", "1"],
  agreed: ["agreed", "accepted", "2"],
  agreementPending: ["agreementpending", "3"],
  finished: ["completed", "4", "closed", "5"],
  expired: ["expired", "6"],
  cancelled: ["cancelled", "canceled", "7"],
});

const AGREEMENT_KEYS = Object.freeze({
  awaitingCompletion: ["pending", "0", "awaitingpayment", "1"],
  paid: ["confirmed", "2"],
  cancelled: ["cancelled", "canceled", "3"],
  expired: ["expired", "4"],
});

export const ENDED_TEXT = Object.freeze({
  agreementCancelled:
    "Hợp đồng đã bị hủy nên phiên thương lượng này đã kết thúc. Để tiếp tục giao dịch, hãy gửi đề nghị mới để bắt đầu phiên thương lượng mới.",
  cancelled: "Phiên thương lượng đã bị hủy.",
  agreementExpired:
    "Thỏa thuận đã hết hạn. Bạn có thể gửi yêu cầu mới nếu tin đăng còn khả dụng.",
  expired:
    "Phiên thương lượng đã kết thúc do hết thời gian. Bạn có thể gửi yêu cầu mới nếu tin đăng còn khả dụng.",
  finished:
    "Hợp đồng đã được thanh toán nên phiên thương lượng đã kết thúc. Bạn có thể theo dõi tiếp trong đơn hàng.",
});

/*
 * - Open, hoặc Agreed mà chưa có hợp đồng: hạn 5 phút không hoạt động
 *   (responseDeadlineAt).
 * - Đã có hợp đồng chờ xác nhận/thanh toán: hạn 15 phút (paymentDeadlineAt).
 * - Backend chỉ cho nhắn khi Open/Agreed; khi chờ xác nhận hợp đồng thì khóa
 *   ô nhập nhưng vẫn giữ lối vào hợp đồng.
 * - Backend không chuyển phiên sang Completed sau khi thanh toán nên "đã
 *   thanh toán" lấy theo trạng thái hợp đồng.
 */
export const getNegotiationSessionState = ({
  negotiation,
  agreementPreview,
  agreement,
}) => {
  const statusKey = toKey(negotiation?.negotiationStatus);
  const agreementKey = toKey(agreement?.agreementStatus);
  const hasAgreement = Boolean(agreementPreview?.hasAgreement);
  const is = (keys) => keys.includes(statusKey);
  const agreementIs = (keys) => Boolean(agreement) && keys.includes(agreementKey);

  const isOpen = is(NEGOTIATION_KEYS.open);
  const isAgreedWithoutAgreement = is(NEGOTIATION_KEYS.agreed) && !hasAgreement;
  const isPaidAgreement = agreementIs(AGREEMENT_KEYS.paid);
  const isAgreementCancelled = agreementIs(AGREEMENT_KEYS.cancelled);
  const isAgreementExpired = agreementIs(AGREEMENT_KEYS.expired);
  const isAgreementAwaitingCompletion =
    hasAgreement && agreementIs(AGREEMENT_KEYS.awaitingCompletion);
  const isExpired = is(NEGOTIATION_KEYS.expired);
  const isCancelled = is(NEGOTIATION_KEYS.cancelled);
  const isFinished =
    isPaidAgreement || is(NEGOTIATION_KEYS.finished) || isAgreementCancelled;
  const isEnded = isExpired || isCancelled || isFinished;

  const endedText = !isEnded
    ? ""
    : isAgreementCancelled
      ? ENDED_TEXT.agreementCancelled
      : isCancelled
        ? ENDED_TEXT.cancelled
        : isAgreementExpired
          ? ENDED_TEXT.agreementExpired
          : isExpired
            ? ENDED_TEXT.expired
            : ENDED_TEXT.finished;

  return {
    isOpen,
    isAgreedWithoutAgreement,
    isAgreementAwaitingCompletion,
    isPaidAgreement,
    isAgreementCancelled,
    isAgreementExpired,
    isExpired,
    isEnded,
    endedText,
    canSendText: !isEnded && (isOpen || is(NEGOTIATION_KEYS.agreed)),
    isMessagingLocked: !isEnded && is(NEGOTIATION_KEYS.agreementPending),
    negotiationDeadline:
      !isEnded && (isOpen || isAgreedWithoutAgreement)
        ? negotiation?.responseDeadlineAt ?? null
        : null,
    paymentDeadline:
      !isEnded && isAgreementAwaitingCompletion
        ? agreement?.paymentDeadlineAt ?? negotiation?.paymentDeadlineAt ?? null
        : null,
  };
};

/*
 * Đối phương là bên còn lại trong cặp người mua/người bán của phiên.
 */
export const getPartnerUserId = (negotiation, currentUserId) => {
  const me = String(currentUserId ?? "").trim().toLowerCase();
  const sellerId = String(negotiation?.sellerId ?? "").trim();
  const buyerId = String(negotiation?.buyerId ?? "").trim();

  if (!me) return "";
  if (sellerId.toLowerCase() === me) return buyerId;
  if (buyerId.toLowerCase() === me) return sellerId;
  return "";
};

export const isSystemMessage = (message) =>
  ["system", "4"].includes(toKey(message?.messageType));

export const isAgreementMessage = (message) =>
  ["agreement", "5"].includes(toKey(message?.messageType));

const lower = (text) => String(text ?? "").trim().toLocaleLowerCase("vi-VN");

export const isPaymentCompletedText = (text) => {
  const normalized = lower(text);

  return (
    normalized.includes("đơn hàng") &&
    (normalized.includes("thanh toán thành công") ||
      normalized.includes("hợp đồng đã được thanh toán"))
  );
};

export const getAgreementCardTitle = (text, { isPaid = false } = {}) => {
  if (isPaid) return "Hợp đồng đã thanh toán";

  const normalized = lower(text);

  if (normalized.includes("cả hai bên") && normalized.includes("xác nhận")) {
    return "Hợp đồng đã xác nhận";
  }

  if (normalized.includes("đã tạo") || normalized.includes("tạo thỏa thuận")) {
    return "Hợp đồng đã tạo";
  }

  return "Hợp đồng đã cập nhật";
};

/*
 * Tổng tiền như lúc thanh toán: đơn giá × số lượng + phí giao hàng (nếu có).
 */
export const getAgreementAmounts = (agreement) => {
  const unitPrice = Number(agreement?.finalPrice) || 0;
  const quantity = Number(agreement?.quantity) || 1;
  const shippingFee = Number(
    agreement?.estimatedShippingFee ??
      agreement?.agreementDetails?.estimatedShippingFee ??
      0,
  );
  const hasShippingFee = Number.isFinite(shippingFee) && shippingFee > 0;

  return {
    unitPrice,
    quantity,
    shippingFee: hasShippingFee ? shippingFee : 0,
    total: unitPrice * quantity + (hasShippingFee ? shippingFee : 0),
  };
};

/*
 * Lịch hẹn đang có hiệu lực của đơn: ưu tiên lịch đã chốt, rồi tới lịch chưa
 * hủy, cuối cùng là lịch mới nhất.
 */
export const pickCurrentAppointment = (appointments) => {
  const list = Array.isArray(appointments) ? appointments : [];
  const time = (item) =>
    new Date(item?.createdAt || item?.scheduledAt || 0).getTime() || 0;
  const sorted = [...list].sort((first, second) => time(second) - time(first));
  const statusOf = (item) => toKey(item?.appointmentStatus);
  const cancelled = ["3", "cancelled", "canceled"];
  const proposed = ["0", "proposed"];

  return (
    sorted.find(
      (item) => ![...proposed, ...cancelled].includes(statusOf(item)),
    ) ||
    sorted.find((item) => !cancelled.includes(statusOf(item))) ||
    sorted[0] ||
    null
  );
};

import assert from "node:assert/strict";
import test from "node:test";
import {
  ENDED_TEXT,
  getAgreementAmounts,
  getAgreementCardTitle,
  getNegotiationSessionState,
  getPartnerUserId,
  isPaymentCompletedText,
  pickCurrentAppointment,
} from "./negotiationSession.js";

const RESPONSE_DEADLINE = "2026-10-05T10:05:00Z";
const PAYMENT_DEADLINE = "2026-10-05T10:15:00Z";

const state = (negotiationStatus, { preview, agreement } = {}) =>
  getNegotiationSessionState({
    negotiation: {
      negotiationStatus,
      responseDeadlineAt: RESPONSE_DEADLINE,
      paymentDeadlineAt: PAYMENT_DEADLINE,
    },
    agreementPreview: preview,
    agreement,
  });

test("open and agreed-without-agreement sessions run the 5 minute deadline", () => {
  const open = state("Open");
  assert.equal(open.canSendText, true);
  assert.equal(open.negotiationDeadline, RESPONSE_DEADLINE);
  assert.equal(open.paymentDeadline, null);

  const agreed = state("Agreed", { preview: { hasAgreement: false } });
  assert.equal(agreed.isAgreedWithoutAgreement, true);
  assert.equal(agreed.negotiationDeadline, RESPONSE_DEADLINE);
});

test("agreement awaiting confirmation runs the payment deadline and locks input", () => {
  const pending = state("AgreementPending", {
    preview: { hasAgreement: true },
    agreement: { agreementStatus: "Awaiting_Payment" },
  });

  assert.equal(pending.isMessagingLocked, true);
  assert.equal(pending.canSendText, false);
  assert.equal(pending.negotiationDeadline, null);
  assert.equal(pending.paymentDeadline, PAYMENT_DEADLINE);
});

test("ended sessions explain why and hide every deadline", () => {
  assert.equal(state("Expired").endedText, ENDED_TEXT.expired);
  assert.equal(state("Cancelled").endedText, ENDED_TEXT.cancelled);
  assert.equal(
    state("AgreementPending", {
      preview: { hasAgreement: true },
      agreement: { agreementStatus: "Confirmed" },
    }).endedText,
    ENDED_TEXT.finished,
  );
  assert.equal(
    state("Closed", {
      preview: { hasAgreement: true },
      agreement: { agreementStatus: "Cancelled" },
    }).endedText,
    ENDED_TEXT.agreementCancelled,
  );

  const expired = state(6);
  assert.equal(expired.isEnded, true);
  assert.equal(expired.canSendText, false);
  assert.equal(expired.isMessagingLocked, false);
  assert.equal(expired.negotiationDeadline, null);
});

test("partner is the other side of the buyer/seller pair", () => {
  const negotiation = { sellerId: "AAA", buyerId: "bbb" };
  assert.equal(getPartnerUserId(negotiation, "aaa"), "bbb");
  assert.equal(getPartnerUserId(negotiation, "BBB"), "AAA");
  assert.equal(getPartnerUserId(negotiation, "ccc"), "");
});

test("agreement card helpers", () => {
  assert.equal(
    isPaymentCompletedText("Thanh toán thành công. Đơn hàng đã được tạo."),
    true,
  );
  assert.equal(isPaymentCompletedText("Đã tạo hợp đồng"), false);
  assert.equal(getAgreementCardTitle("Người bán đã tạo hợp đồng"), "Hợp đồng đã tạo");
  assert.equal(
    getAgreementCardTitle("Cả hai bên đã xác nhận hợp đồng"),
    "Hợp đồng đã xác nhận",
  );
  assert.equal(getAgreementCardTitle("x", { isPaid: true }), "Hợp đồng đã thanh toán");
  assert.deepEqual(
    getAgreementAmounts({ finalPrice: 100000, quantity: 2, estimatedShippingFee: 30000 }),
    { unitPrice: 100000, quantity: 2, shippingFee: 30000, total: 230000 },
  );
});

test("current appointment skips proposed and cancelled ones", () => {
  const appointments = [
    { appointmentId: "old", appointmentStatus: "Scheduled", createdAt: "2026-10-01" },
    { appointmentId: "cancel", appointmentStatus: "Cancelled", createdAt: "2026-10-03" },
    { appointmentId: "proposed", appointmentStatus: "Proposed", createdAt: "2026-10-04" },
  ];

  assert.equal(pickCurrentAppointment(appointments).appointmentId, "old");
  assert.equal(
    pickCurrentAppointment(appointments.slice(1)).appointmentId,
    "proposed",
  );
  assert.equal(pickCurrentAppointment([]), null);
});

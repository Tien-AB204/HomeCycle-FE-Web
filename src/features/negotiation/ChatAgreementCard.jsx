import { Link } from "react-router-dom";
import DeadlineBanner from "../../components/shared/DeadlineBanner";
import { formatCurrency } from "../../utils/formatter";
import { getAgreementAmounts } from "./negotiationSession";

const EXPIRED_COUNTDOWN = Object.freeze({
  hasDeadline: true,
  remainingMs: 0,
  isExpired: true,
});

const ShortcutLink = ({ to, state, icon, children }) => (
  <Link
    to={to}
    state={state}
    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10"
  >
    <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">
      {icon}
    </span>
    {children}
  </Link>
);

/*
 * Thẻ hợp đồng ngay trong dòng chat. Mọi thẻ hiện số liệu hợp đồng hiện tại;
 * chỉ thẻ mới nhất có hạn thanh toán và các lối tắt tới hợp đồng, đơn hàng,
 * lịch hẹn để không lặp nút ở các mốc cũ.
 */
export default function ChatAgreementCard({
  title,
  agreement,
  negotiationId,
  isLatest,
  isPaid,
  orderId,
  appointmentId,
  session,
  paymentCountdown,
}) {
  const { unitPrice, quantity, shippingFee, total } = getAgreementAmounts(agreement);
  const showEndedBanner = isLatest && !isPaid;

  return (
    <article className="mx-auto w-full max-w-md rounded-xl border border-primary/25 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }} aria-hidden="true">
          description
        </span>
        <p className="text-sm font-black text-text">{title}</p>
      </div>

      <div className="mt-2.5 rounded-lg bg-background px-3 py-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-lg font-black text-error">{formatCurrency(unitPrice)}</p>
          <p className="text-xs font-bold text-textLight">Số lượng: {quantity}</p>
        </div>
        {shippingFee > 0 && (
          <dl className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-textLight">Phí vận chuyển</dt>
              <dd className="font-bold text-text">{formatCurrency(shippingFee)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-bold text-text">Tổng cộng</dt>
              <dd className="font-black text-error">{formatCurrency(total)}</dd>
            </div>
          </dl>
        )}
      </div>

      {showEndedBanner && session.isAgreementAwaitingCompletion && (
        <DeadlineBanner
          className="mt-2.5"
          countdown={paymentCountdown}
          label="Thời gian xác nhận và thanh toán còn lại"
          expiredText="Thỏa thuận đã hết hạn."
          note="Chỉnh sửa hợp đồng không gia hạn thời gian."
        />
      )}
      {showEndedBanner && (session.isAgreementExpired || session.isExpired) && (
        <DeadlineBanner className="mt-2.5" countdown={EXPIRED_COUNTDOWN} expiredText="Thỏa thuận đã hết hạn." />
      )}
      {showEndedBanner && session.isAgreementCancelled && (
        <DeadlineBanner className="mt-2.5" countdown={EXPIRED_COUNTDOWN} expiredText="Hợp đồng đã bị hủy." />
      )}

      {isLatest && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={`/thuong-luong/${encodeURIComponent(negotiationId)}/thoa-thuan`}
            className="inline-flex rounded-lg bg-primary px-3.5 py-2 text-xs font-black text-white transition hover:bg-primary/90"
          >
            Xem chi tiết hợp đồng
          </Link>
          {isPaid && orderId && (
            <ShortcutLink to={`/don-hang/${encodeURIComponent(orderId)}`} icon="receipt_long">
              Xem đơn hàng
            </ShortcutLink>
          )}
          {isPaid && appointmentId && (
            <ShortcutLink
              to="/lich-hen"
              state={{ notificationAppointmentId: appointmentId }}
              icon="calendar_month"
            >
              Xem lịch hẹn
            </ShortcutLink>
          )}
        </div>
      )}
    </article>
  );
}

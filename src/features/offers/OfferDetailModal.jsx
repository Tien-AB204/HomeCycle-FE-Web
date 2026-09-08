import { Link } from "react-router-dom";
import { getOfferStatusMeta } from "../../constants/offers";

const formatCurrency = (value) => {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "—";
};

const formatDate = (value) => {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const Participant = ({ label, participant }) => {
  const name = participant?.displayName || "Người dùng HomeCycle";

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-textLight">
        {label}
      </p>
      <div className="mt-3 flex items-center gap-3">
        {participant?.avatarUrl ? (
          <img
            src={participant.avatarUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-black text-white">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="min-w-0 truncate text-sm font-bold text-text">
          {name}
        </p>
      </div>
    </div>
  );
};

const OfferDetailModal = ({
  offer,
  loading = false,
  error = "",
  actionBusy = false,
  onClose,
  onRetry,
  onEdit,
  onCancelOffer,
  onCounter,
  onReject,
  onAccept,
}) => {
  const statusMeta = getOfferStatusMeta(offer?.offerStatus);

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !actionBusy
        ) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/70 p-4 backdrop-blur-sm"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-detail-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-white shadow-[0_28px_80px_rgba(23,40,48,0.28)]"
      >
        <div className="relative flex items-start justify-between gap-4 overflow-hidden bg-primary px-6 py-5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full border-[22px] border-white/5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Chi tiết thương lượng
            </p>
            <h2 id="offer-detail-title" className="mt-1 text-xl font-bold">
              Đề nghị giá và số lượng
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={actionBusy}
            aria-label="Đóng cửa sổ"
            className="rounded-lg px-2 py-1 text-2xl leading-none text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div role="status" className="py-16 text-center text-textLight">
              <span className="material-symbols-outlined animate-spin text-3xl">
                refresh
              </span>
              <p className="mt-2 text-sm font-semibold">
                Đang tải chi tiết đề nghị...
              </p>
            </div>
          )}

          {error && !loading && (
            <div role="alert" className="rounded-xl border border-error/20 bg-error/10 p-6 text-center">
              <p className="text-sm font-semibold text-error">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-bold text-white"
              >
                Thử lại
              </button>
            </div>
          )}

          {offer && !loading && !error && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
                <span className="text-xs font-medium text-textLight">
                  Tạo lúc {formatDate(offer.createdAt)}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Participant label="Người gửi" participant={offer.sender} />
                <Participant label="Người nhận" participant={offer.receiver} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-error/20 bg-error/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-error">
                    Giá đề nghị
                  </p>
                  <p className="mt-1 text-2xl font-black text-error">
                    {formatCurrency(offer.offerPrice)}
                  </p>
                </div>
                <div className="rounded-xl bg-primary/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Số lượng
                  </p>
                  <p className="mt-1 text-2xl font-black text-text">
                    {offer.offerQuantity}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to={`/posts/${encodeURIComponent(offer.postId)}`}
                  onClick={onClose}
                  className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10"
                >
                  Xem bài đăng
                </Link>

                {offer.canUpdate && (
                  <button
                    type="button"
                    onClick={onEdit}
                    disabled={actionBusy}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    Chỉnh sửa
                  </button>
                )}

                {offer.canCancel && (
                  <button
                    type="button"
                    onClick={onCancelOffer}
                    disabled={actionBusy}
                    className="rounded-lg border border-border bg-textLight/10 px-4 py-2.5 text-sm font-bold text-textLight transition hover:bg-textLight/20 disabled:opacity-50"
                  >
                    Hủy đề nghị
                  </button>
                )}

                {offer.canReject && (
                  <button
                    type="button"
                    onClick={onReject}
                    disabled={actionBusy}
                    className="rounded-lg border border-error/20 bg-error/10 px-4 py-2.5 text-sm font-bold text-error transition hover:bg-error/10 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                )}

                {(offer.canCounter ?? offer.canAccept) && (
                  <button
                    type="button"
                    onClick={onCounter}
                    disabled={actionBusy}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    Phản đề và mở phòng
                  </button>
                )}

                {offer.canAccept && (
                  <button
                    type="button"
                    onClick={onAccept}
                    disabled={actionBusy}
                    className="rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white transition hover:bg-success disabled:opacity-50"
                  >
                    {actionBusy ? "Đang xử lý..." : "Đồng ý mức giá"}
                  </button>
                )}
              </div>

              {offer.negotiationId && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                  <div>
                    <p className="text-sm font-black text-text">Phòng thương lượng đã sẵn sàng</p>
                    <p className="mt-1 text-xs text-textLight">Tiếp tục trao đổi giá, số lượng và điều kiện giao nhận.</p>
                  </div>
                  <Link
                    to={`/thuong-luong/${encodeURIComponent(offer.negotiationId)}`}
                    onClick={onClose}
                    className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
                  >
                    Mở phòng thương lượng
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default OfferDetailModal;
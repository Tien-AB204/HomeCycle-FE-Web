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
    <div className="rounded-xl border border-[#BAC2C1]/35 bg-[#f8fafa] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
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
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2B5659] font-black text-white">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="min-w-0 truncate text-sm font-bold text-[#172830]">
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#172830]/65 p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-detail-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#BAC2C1]/40 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 bg-[#172830] px-6 py-5 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C1EAEC]">
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
            className="rounded-lg px-2 py-1 text-2xl leading-none text-[#C1EAEC] transition hover:bg-white/10 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div role="status" className="py-16 text-center text-[#547B7D]">
              <span className="material-symbols-outlined animate-spin text-3xl">
                refresh
              </span>
              <p className="mt-2 text-sm font-semibold">
                Đang tải chi tiết đề nghị...
              </p>
            </div>
          )}

          {error && !loading && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-lg bg-[#7A1012] px-4 py-2 text-sm font-bold text-white"
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
                <span className="text-xs font-medium text-[#547B7D]">
                  Tạo lúc {formatDate(offer.createdAt)}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Participant label="Người gửi" participant={offer.sender} />
                <Participant label="Người nhận" participant={offer.receiver} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#7A1012]/8 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7A1012]">
                    Giá đề nghị
                  </p>
                  <p className="mt-1 text-2xl font-black text-[#7A1012]">
                    {formatCurrency(offer.offerPrice)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#2B5659]/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2B5659]">
                    Số lượng
                  </p>
                  <p className="mt-1 text-2xl font-black text-[#172830]">
                    {offer.offerQuantity}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to={`/posts/${encodeURIComponent(offer.postId)}`}
                  onClick={onClose}
                  className="rounded-lg border border-[#BAC2C1] bg-white px-4 py-2.5 text-sm font-bold text-[#172830] transition hover:bg-[#BAC2C1]/15"
                >
                  Xem bài đăng
                </Link>

                {offer.canUpdate && (
                  <button
                    type="button"
                    onClick={onEdit}
                    disabled={actionBusy}
                    className="rounded-lg bg-[#2B5659] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#172830] disabled:opacity-50"
                  >
                    Chỉnh sửa
                  </button>
                )}

                {offer.canCancel && (
                  <button
                    type="button"
                    onClick={onCancelOffer}
                    disabled={actionBusy}
                    className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    Hủy đề nghị
                  </button>
                )}

                {offer.canReject && (
                  <button
                    type="button"
                    onClick={onReject}
                    disabled={actionBusy}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                )}

                {(offer.canCounter ?? offer.canAccept) && (
                  <button
                    type="button"
                    onClick={onCounter}
                    disabled={actionBusy}
                    className="rounded-lg bg-[#2B5659] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#172830] disabled:opacity-50"
                  >
                    Phản đề và mở phòng
                  </button>
                )}

                {offer.canAccept && (
                  <button
                    type="button"
                    onClick={onAccept}
                    disabled={actionBusy}
                    className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-50"
                  >
                    {actionBusy ? "Đang xử lý..." : "Đồng ý mức giá"}
                  </button>
                )}
              </div>

              {offer.negotiationId && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="break-all text-xs font-medium text-green-700">
                    Phiên thương lượng: {offer.negotiationId}
                  </p>
                  <Link
                    to={`/thuong-luong/${encodeURIComponent(offer.negotiationId)}`}
                    onClick={onClose}
                    className="mt-3 inline-flex rounded-lg bg-green-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-800"
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
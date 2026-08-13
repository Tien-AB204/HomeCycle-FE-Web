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
    <div className="rounded-xl border border-[#DCE8E5] bg-[#F7FAF9] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#68807F]">
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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F8588] font-black text-white">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="min-w-0 truncate text-sm font-bold text-[#183F41]">
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#183F41]/70 p-4 backdrop-blur-sm"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-detail-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#D7E7E3] bg-white shadow-[0_28px_80px_rgba(15,45,47,0.28)]"
      >
        <div className="relative flex items-start justify-between gap-4 overflow-hidden bg-gradient-to-r from-[#183F41] via-[#244F51] to-[#2F6F9F] px-6 py-5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full border-[22px] border-white/5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C8ECE7]">
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
            className="rounded-lg px-2 py-1 text-2xl leading-none text-[#C8ECE7] transition hover:bg-white/10 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div role="status" className="py-16 text-center text-[#68807F]">
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
                className="mt-4 rounded-lg bg-[#B33A32] px-4 py-2 text-sm font-bold text-white"
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
                <span className="text-xs font-medium text-[#68807F]">
                  Tạo lúc {formatDate(offer.createdAt)}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Participant label="Người gửi" participant={offer.sender} />
                <Participant label="Người nhận" participant={offer.receiver} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#F1D2CE] bg-[#FFF6F4] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#B33A32]">
                    Giá đề nghị
                  </p>
                  <p className="mt-1 text-2xl font-black text-[#B33A32]">
                    {formatCurrency(offer.offerPrice)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#EDF4F8] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#4F8588]">
                    Số lượng
                  </p>
                  <p className="mt-1 text-2xl font-black text-[#183F41]">
                    {offer.offerQuantity}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to={`/posts/${encodeURIComponent(offer.postId)}`}
                  onClick={onClose}
                  className="rounded-xl border border-[#9FBFBA] bg-white px-4 py-2.5 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5]"
                >
                  Xem bài đăng
                </Link>

                {offer.canUpdate && (
                  <button
                    type="button"
                    onClick={onEdit}
                    disabled={actionBusy}
                    className="rounded-xl bg-[#4F8588] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#356A70] disabled:opacity-50"
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
                    className="rounded-xl bg-[#4F8588] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#356A70] disabled:opacity-50"
                  >
                    Phản đề và mở phòng
                  </button>
                )}

                {offer.canAccept && (
                  <button
                    type="button"
                    onClick={onAccept}
                    disabled={actionBusy}
                    className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-50"
                  >
                    {actionBusy ? "Đang xử lý..." : "Đồng ý mức giá"}
                  </button>
                )}
              </div>

              {offer.negotiationId && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE8E5] bg-[#F7FAF9] p-4">
                  <div>
                    <p className="text-sm font-black text-[#183F41]">Phòng thương lượng đã sẵn sàng</p>
                    <p className="mt-1 text-xs text-[#68807F]">Tiếp tục trao đổi giá, số lượng và điều kiện giao nhận.</p>
                  </div>
                  <Link
                    to={`/thuong-luong/${encodeURIComponent(offer.negotiationId)}`}
                    onClick={onClose}
                    className="inline-flex rounded-lg bg-[#4F8588] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#356A70]"
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
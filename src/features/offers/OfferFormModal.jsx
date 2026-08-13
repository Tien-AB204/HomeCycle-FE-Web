import { useState } from "react";

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Thương lượng";
  }

  return `${amount.toLocaleString("vi-VN")} đ`;
};

const OfferFormModal = ({
  mode = "create",
  post = null,
  offer = null,
  submitting = false,
  serverError = "",
  onClose,
  onSubmit,
}) => {
  const isEditing = mode === "edit";
  const isCountering = mode === "counter";
  const usesExistingOffer = isEditing || isCountering;
  const [offerPrice, setOfferPrice] = useState(() =>
    String(
      usesExistingOffer
        ? offer?.offerPrice ?? ""
        : post?.basePrice ?? "",
    ),
  );
  const [offerQuantity, setOfferQuantity] = useState(() =>
    String(
      usesExistingOffer
        ? offer?.offerQuantity ?? 1
        : 1,
    ),
  );
  const [clientError, setClientError] = useState("");

  const maxQuantity = Number(post?.remainingQuantity);
  const hasMaxQuantity =
    Number.isInteger(maxQuantity) && maxQuantity > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const normalizedPrice = Number(offerPrice);
    const normalizedQuantity = Number(offerQuantity);

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      setClientError("Vui lòng nhập giá đề nghị lớn hơn 0.");
      return;
    }

    if (
      !Number.isInteger(normalizedQuantity) ||
      normalizedQuantity <= 0
    ) {
      setClientError("Số lượng phải là số nguyên lớn hơn 0.");
      return;
    }

    if (hasMaxQuantity && normalizedQuantity > maxQuantity) {
      setClientError(
        `Bài đăng chỉ còn ${maxQuantity} sản phẩm.`,
      );
      return;
    }

    setClientError("");
    await onSubmit({
      offerPrice: normalizedPrice,
      offerQuantity: normalizedQuantity,
    });
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#183F41]/70 p-4 backdrop-blur-sm"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-form-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#D7E7E3] bg-white shadow-[0_28px_80px_rgba(15,45,47,0.28)]"
      >
        <div className="relative flex items-start justify-between gap-4 overflow-hidden bg-gradient-to-r from-[#183F41] via-[#244F51] to-[#2F6F9F] px-6 py-5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full border-[22px] border-white/5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C8ECE7]">
              Yêu cầu thương lượng
            </p>
            <h2
              id="offer-form-title"
              className="mt-1 text-xl font-bold"
            >
              {isEditing
                ? "Cập nhật đề nghị"
                : isCountering
                  ? "Phản đề và mở phòng"
                : "Gửi đề nghị mua"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng cửa sổ"
            className="rounded-lg px-2 py-1 text-2xl leading-none text-[#C8ECE7] transition hover:bg-white/10 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            {!usesExistingOffer && post && (
              <div className="rounded-xl border border-[#DCE8E5] bg-[#EDF4F8] p-4">
                <p className="line-clamp-2 font-bold text-[#183F41]">
                  {post.productName || "Tin đăng bán"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#68807F]">
                  <span>
                    Giá đăng: {formatCurrency(post.basePrice)}
                  </span>
                  <span>
                    Còn lại: {post.remainingQuantity ?? "—"}
                  </span>
                </div>
              </div>
            )}

            {isCountering && offer && (
              <div className="rounded-xl border border-[#DCE8E5] bg-[#EDF4F8] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#68807F]">
                  Đề nghị hiện tại
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-[#183F41]">
                  <span>{formatCurrency(offer.offerPrice)}</span>
                  <span>Số lượng: {offer.offerQuantity}</span>
                </div>
              </div>
            )}

            {(clientError || serverError) && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
              >
                {clientError || serverError}
              </div>
            )}

            <div>
              <label
                htmlFor="offer-price"
                className="mb-1.5 block text-sm font-bold text-[#183F41]"
              >
                Giá đề nghị <span className="text-[#B33A32]">*</span>
              </label>
              <div className="relative">
                <input
                  id="offer-price"
                  type="number"
                  min="1"
                  step="1"
                  value={offerPrice}
                  onChange={(event) => {
                    setOfferPrice(event.target.value);
                    setClientError("");
                  }}
                  disabled={submitting}
                  className="w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-4 py-3 pr-12 text-base font-bold text-[#183F41] outline-none transition focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10 disabled:bg-[#EEF3F1]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#68807F]">
                  đ
                </span>
              </div>
              {Number(offerPrice) > 0 && (
                <p className="mt-1.5 text-xs font-semibold text-[#68807F]">
                  {formatCurrency(offerPrice)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="offer-quantity"
                className="mb-1.5 block text-sm font-bold text-[#183F41]"
              >
                Số lượng <span className="text-[#B33A32]">*</span>
              </label>
              <input
                id="offer-quantity"
                type="number"
                min="1"
                max={hasMaxQuantity ? maxQuantity : undefined}
                step="1"
                value={offerQuantity}
                onChange={(event) => {
                  setOfferQuantity(event.target.value);
                  setClientError("");
                }}
                disabled={submitting}
                className="w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-4 py-3 text-base font-bold text-[#183F41] outline-none transition focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10 disabled:bg-[#EEF3F1]"
              />
            </div>

            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              {isCountering
                ? "Phản đề sẽ mở một phiên thương lượng ở trạng thái đang thương lượng. Hai bên có thể tiếp tục gửi đề xuất cho đến khi một mức giá được chốt."
                : "Đề nghị sẽ được gửi đến chủ bài đăng. Bạn chỉ có thể chỉnh sửa hoặc hủy khi đề nghị còn ở trạng thái đang chờ."}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#DCE8E5] bg-[#F7FAF9] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-[#9FBFBA] bg-white px-4 py-2.5 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5] disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#4F8588] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Đang xử lý..."
                : isEditing
                  ? "Lưu thay đổi"
                  : isCountering
                    ? "Gửi phản đề và mở phòng"
                  : "Gửi đề nghị"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default OfferFormModal;
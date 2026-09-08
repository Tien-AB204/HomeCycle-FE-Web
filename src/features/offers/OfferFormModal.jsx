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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/70 p-4 backdrop-blur-sm"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-form-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-white shadow-[0_28px_80px_rgba(23,40,48,0.28)]"
      >
        <div className="relative flex items-start justify-between gap-4 overflow-hidden bg-primary px-6 py-5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full border-[22px] border-white/5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
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
            className="rounded-lg px-2 py-1 text-2xl leading-none text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            {!usesExistingOffer && post && (
              <div className="rounded-xl border border-border bg-primary/5 p-4">
                <p className="line-clamp-2 font-bold text-text">
                  {post.productName || "Tin đăng bán"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-textLight">
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
              <div className="rounded-xl border border-border bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-textLight">
                  Đề nghị hiện tại
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-text">
                  <span>{formatCurrency(offer.offerPrice)}</span>
                  <span>Số lượng: {offer.offerQuantity}</span>
                </div>
              </div>
            )}

            {(clientError || serverError) && (
              <div
                role="alert"
                className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm font-medium text-error"
              >
                {clientError || serverError}
              </div>
            )}

            <div>
              <label
                htmlFor="offer-price"
                className="mb-1.5 block text-sm font-bold text-text"
              >
                Giá đề nghị <span className="text-error">*</span>
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
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-base font-bold text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:bg-background"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-textLight">
                  đ
                </span>
              </div>
              {Number(offerPrice) > 0 && (
                <p className="mt-1.5 text-xs font-semibold text-textLight">
                  {formatCurrency(offerPrice)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="offer-quantity"
                className="mb-1.5 block text-sm font-bold text-text"
              >
                Số lượng <span className="text-error">*</span>
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
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:bg-background"
              />
            </div>

            <p className="rounded-lg bg-warning/10 p-3 text-xs leading-5 text-warning">
              {isCountering
                ? "Phản đề sẽ mở một phiên thương lượng ở trạng thái đang thương lượng. Hai bên có thể tiếp tục gửi đề xuất cho đến khi một mức giá được chốt."
                : "Đề nghị sẽ được gửi đến chủ bài đăng. Bạn chỉ có thể chỉnh sửa hoặc hủy khi đề nghị còn ở trạng thái đang chờ."}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-border bg-background px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
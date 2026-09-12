import {
  useEffect,
  useMemo,
  useState,
} from "react";
import postApi from "../../services/apis/postApi";

const formatCurrency = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Thương lượng";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Thương lượng";
  }

  return (
    amount.toLocaleString("vi-VN") +
    " đ"
  );
};

const isActiveSellPost = (post) => {
  return (
    String(post?.postType || "")
      .trim()
      .toLowerCase() === "sell" &&
    String(post?.status || "")
      .trim()
      .toLowerCase() === "active" &&
    Number(post?.remainingQuantity) > 0
  );
};

export default function SellerRequestModal({
  buyPost,
  userId,
  initialSellPostId = "",
  submitting = false,
  serverError = "",
  onClose,
  onCreateNew,
  onSubmit,
}) {
  const [sellPosts, setSellPosts] =
    useState([]);

  const [
    selectedSellPostId,
    setSelectedSellPostId,
  ] = useState("");

  const [offerPrice, setOfferPrice] =
    useState("");

  const [
    offerQuantity,
    setOfferQuantity,
  ] = useState("1");

  const [clientError, setClientError] =
    useState("");

  const [loadError, setLoadError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const controller =
      new AbortController();

    let active = true;

    postApi
      .getSellerCandidatesByUser(
        userId,
        {
          pageNumber: 1,
          pageSize: 100,
          signal: controller.signal,
        },
      )
      .then((result) => {
        if (!active) {
          return;
        }

        const candidates =
          (result.items || []).filter(
            isActiveSellPost,
          );

        setSellPosts(candidates);

        const firstPost =
          candidates.find(
            (item) =>
              item.postId ===
              initialSellPostId,
          ) ||
          candidates[0] ||
          null;

        setSelectedSellPostId(
          firstPost?.postId || "",
        );

        const listingPrice =
          Number(firstPost?.basePrice);

        if (
          Number.isFinite(listingPrice) &&
          listingPrice > 0
        ) {
          setOfferPrice(
            String(listingPrice),
          );
        }

        setLoadError("");
      })
      .catch((error) => {
        if (
          error?.name === "CanceledError" ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }

        if (active) {
          setLoadError(
            error?.message ||
              "Không thể tải các tin đăng bán của bạn.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    initialSellPostId,
    userId,
  ]);

  const hasUserId =
    Boolean(userId);

  const visibleLoadError =
    hasUserId
      ? loadError
      : "Phiên đăng nhập không có mã người dùng.";

  const isLoadingSellPosts =
    hasUserId && loading;

  const selectedSellPost =
    useMemo(
      () =>
        sellPosts.find(
          (item) =>
            item.postId ===
            selectedSellPostId,
        ) || null,
      [sellPosts, selectedSellPostId],
    );

  const maxQuantity =
    useMemo(() => {
      const sellRemaining =
        Number(
          selectedSellPost
            ?.remainingQuantity,
        );

      const buyRemaining =
        Number(
          buyPost?.remainingQuantity,
        );

      const validValues = [
        sellRemaining,
        buyRemaining,
      ].filter(
        (value) =>
          Number.isInteger(value) &&
          value > 0,
      );

      return validValues.length > 0
        ? Math.min(...validValues)
        : null;
    }, [
      buyPost?.remainingQuantity,
      selectedSellPost,
    ]);

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!selectedSellPostId) {
      setClientError(
        "Vui lòng chọn một tin đăng bán.",
      );
      return;
    }

    const normalizedPrice =
      Number(offerPrice);

    const normalizedQuantity =
      Number(offerQuantity);

    if (
      !Number.isFinite(
        normalizedPrice,
      ) ||
      normalizedPrice <= 0
    ) {
      setClientError(
        "Giá chào bán phải lớn hơn 0.",
      );
      return;
    }

    if (
      !Number.isInteger(
        normalizedQuantity,
      ) ||
      normalizedQuantity <= 0
    ) {
      setClientError(
        "Số lượng phải là số nguyên lớn hơn 0.",
      );
      return;
    }

    if (
      maxQuantity &&
      normalizedQuantity > maxQuantity
    ) {
      setClientError(
        "Số lượng tối đa có thể chào bán là " +
          maxQuantity +
          ".",
      );
      return;
    }

    setClientError("");

    await onSubmit({
      sellPostId:
        selectedSellPostId,
      offerPrice:
        normalizedPrice,
      offerQuantity:
        normalizedQuantity,
    });
  };

  const targetPriceText =
    buyPost?.priceFrom != null &&
    buyPost?.priceTo != null
      ? formatCurrency(
          buyPost.priceFrom,
        ) +
        " – " +
        formatCurrency(
          buyPost.priceTo,
        )
      : buyPost?.priceTo != null
        ? "Tối đa " +
          formatCurrency(
            buyPost.priceTo,
          )
        : "Thương lượng";

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
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
        aria-labelledby="seller-request-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-white shadow-[0_28px_80px_rgba(23,40,48,0.28)]"
      >
        <header className="relative overflow-hidden bg-primary px-6 py-5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full border-[22px] border-white/5" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Tin thu mua
              </p>

              <h2
                id="seller-request-title"
                className="mt-1 text-xl font-black"
              >
                Chào bán sản phẩm
              </h2>

              <p className="mt-2 text-sm text-white/75">
                Chọn một tin đăng bán đang hoạt động của bạn.
              </p>
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
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div className="rounded-2xl border border-border bg-primary/5 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Nhu cầu của doanh nghiệp
              </p>

              <p className="mt-1 font-black text-text">
                {buyPost?.productName ||
                  "Tin thu mua"}
              </p>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-textLight">
                <span>
                  Khoảng giá:{" "}
                  <strong className="text-text">
                    {targetPriceText}
                  </strong>
                </span>

                <span>
                  Còn cần:{" "}
                  <strong className="text-text">
                    {buyPost?.remainingQuantity ??
                      "—"}
                  </strong>
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-text">
                    Chưa có sản phẩm phù hợp để chào bán?
                  </p>
                  <p className="mt-1 text-sm leading-6 text-textLight">
                    Tạo một tin đăng bán mới, sau đó HomeCycle sẽ đưa bạn quay lại đây để gửi chào bán cho doanh nghiệp.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onCreateNew}
                  disabled={
                    submitting ||
                    typeof onCreateNew !== "function"
                  }
                  className="shrink-0 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tạo tin đăng bán mới
                </button>
              </div>
            </div>

            {isLoadingSellPosts && (
              <div
                role="status"
                className="rounded-xl border border-border bg-background p-5 text-center text-sm font-semibold text-textLight"
              >
                Đang tải sản phẩm của bạn...
              </div>
            )}

            {!isLoadingSellPosts &&
              visibleLoadError && (
                <div
                  role="alert"
                  className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error"
                >
                  {visibleLoadError}
                </div>
              )}

            {!isLoadingSellPosts &&
              !visibleLoadError &&
              sellPosts.length === 0 && (
                <div className="rounded-xl border border-warning/20 bg-warning/10 p-4">
                  <p className="font-bold text-text">
                    Bạn chưa có tin đăng bán đang hoạt động.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-textLight">
                    Hãy tạo hoặc kích hoạt một tin đăng bán trước khi chào bán cho doanh nghiệp.
                  </p>
                </div>
              )}

            {!isLoadingSellPosts &&
              !visibleLoadError &&
              sellPosts.length > 0 && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold text-text">
                      Sản phẩm muốn chào bán{" "}
                      <span className="text-error">
                        *
                      </span>
                    </span>

                    <select
                      value={
                        selectedSellPostId
                      }
                      onChange={(event) => {
                        const nextId =
                          event.target.value;

                        setSelectedSellPostId(
                          nextId,
                        );

                        const nextPost =
                          sellPosts.find(
                            (item) =>
                              item.postId ===
                              nextId,
                          );

                        const nextListingPrice =
                          Number(
                            nextPost?.basePrice,
                          );

                        setOfferPrice(
                          Number.isFinite(
                            nextListingPrice,
                          ) &&
                            nextListingPrice > 0
                            ? String(
                                nextListingPrice,
                              )
                            : "",
                        );

                        setOfferQuantity(
                          "1",
                        );

                        setClientError(
                          "",
                        );
                      }}
                      disabled={submitting}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                    >
                      {sellPosts.map(
                        (sellPost) => (
                          <option
                            key={
                              sellPost.postId
                            }
                            value={
                              sellPost.postId
                            }
                          >
                            {sellPost.productName ||
                              "Sản phẩm"}{" "}
                            — còn{" "}
                            {sellPost.remainingQuantity}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  {selectedSellPost && (
                    <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-textLight">
                          Giá đang đăng
                        </p>

                        <p className="mt-1 font-black text-text">
                          {formatCurrency(
                            selectedSellPost.basePrice,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-textLight">
                          Số lượng còn lại
                        </p>

                        <p className="mt-1 font-black text-text">
                          {selectedSellPost.remainingQuantity ??
                            "—"}
                        </p>
                      </div>
                    </div>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold text-text">
                      Giá chào bán{" "}
                      <span className="text-error">
                        *
                      </span>
                    </span>

                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={offerPrice}
                        onChange={(event) => {
                          setOfferPrice(
                            event.target.value,
                          );

                          setClientError(
                            "",
                          );
                        }}
                        disabled={submitting}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-base font-bold text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-textLight">
                        đ
                      </span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold text-text">
                      Số lượng chào bán{" "}
                      <span className="text-error">
                        *
                      </span>
                    </span>

                    <input
                      type="number"
                      min="1"
                      max={
                        maxQuantity ||
                        undefined
                      }
                      step="1"
                      value={offerQuantity}
                      onChange={(event) => {
                        setOfferQuantity(
                          event.target.value,
                        );

                        setClientError(
                          "",
                        );
                      }}
                      disabled={submitting}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-text outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                    />

                    {maxQuantity && (
                      <p className="mt-1.5 text-xs text-textLight">
                        Có thể chào bán tối đa{" "}
                        <strong>
                          {maxQuantity}
                        </strong>{" "}
                        sản phẩm.
                      </p>
                    )}
                  </label>
                </>
              )}

            {(clientError ||
              serverError) && (
              <div
                role="alert"
                className="rounded-xl border border-error/20 bg-error/10 p-3 text-sm font-semibold text-error"
              >
                {clientError ||
                  serverError}
              </div>
            )}

            <p className="rounded-xl bg-warning/10 p-3 text-xs leading-5 text-warning">
              Chào hàng sẽ ở trạng thái chờ doanh nghiệp xử lý. Thương lượng chỉ xuất hiện khi hệ thống đã tạo phiên phù hợp.
            </p>
          </div>

          <footer className="flex justify-end gap-3 border-t border-border bg-background px-6 py-4">
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
              disabled={
                submitting ||
                isLoadingSellPosts ||
                Boolean(visibleLoadError) ||
                sellPosts.length === 0
              }
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Đang gửi..."
                : "Gửi chào bán"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
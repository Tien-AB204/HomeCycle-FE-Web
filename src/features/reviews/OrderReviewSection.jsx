import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ORDER_STATUS } from "../../constants/orders";
import reviewApi from "../../services/apis/reviewApi";
import ReviewCard from "./ReviewCard";
import ReviewFormModal from "./ReviewFormModal";
import ReviewStars from "./ReviewStars";

const PAGE_SIZE = 10;

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải dữ liệu đánh giá.";

const OrderReviewSection = ({
  orderId,
  orderStatus,
  eligibility,
  counterpartyUserId,
}) => {
  const [pageNumber, setPageNumber] = useState(1);
  const [state, setState] = useState({
    loading: true,
    page: null,
    mine: null,
    error: "",
  });
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);
  const [openingEdit, setOpeningEdit] = useState(false);

  const loadReviews = useCallback(
    async ({ signal, successMessage = "" } = {}) => {
      try {
        const [page, mine] = await Promise.all([
          reviewApi.getByOrder(orderId, {
            pageNumber,
            pageSize: PAGE_SIZE,
            signal,
          }),
          reviewApi.getMineByOrder(orderId, { signal }),
        ]);

        setState({ loading: false, page, mine, error: "" });
        if (successMessage) setNotice(successMessage);
      } catch (error) {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: getErrorMessage(error),
        }));
      }
    },
    [orderId, pageNumber],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadReviews({ signal: controller.signal });
    return () => controller.abort();
  }, [loadReviews]);

  const items = useMemo(() => state.page?.items || [], [state.page]);
  const averageRating =
    Number(state.page?.averageRating) > 0
      ? Number(state.page.averageRating)
      : items.length
        ? items.reduce((total, review) => total + review.rating, 0) /
          items.length
        : 0;
  const isOrderCompleted = Number(orderStatus) === ORDER_STATUS.COMPLETED;
  const serverCanReview = eligibility?.canReview;
  const isEligible =
    typeof serverCanReview === "boolean" ? serverCanReview : isOrderCompleted;
  const blockedReason = eligibility?.blockedReason || "";
  const canCreate = !state.loading && !state.error && isEligible && !state.mine;

  const changePage = (nextPage) => {
    setNotice("");
    setState((current) => ({ ...current, loading: true, error: "" }));
    setPageNumber(nextPage);
  };

  const openEditModal = async (review) => {
    if (!review.reviewId) {
      setNotice("");
      setState((current) => ({
        ...current,
        error:
          "Backend chưa trả mã đánh giá nên chưa thể mở chức năng chỉnh sửa.",
      }));
      return;
    }

    setOpeningEdit(true);
    setNotice("");

    try {
      const detail = await reviewApi.getById(review.reviewId);
      setModal({ mode: "edit", review: detail || review });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getErrorMessage(error),
      }));
    } finally {
      setOpeningEdit(false);
    }
  };

  const submitReview = async (payload) => {
    if (modal?.mode === "edit") {
      await reviewApi.update(modal.review.reviewId, payload);
      setModal(null);
      await loadReviews({ successMessage: "Đã cập nhật đánh giá thành công." });
      return;
    }

    await reviewApi.createForOrder(orderId, payload);
    setModal(null);
    await loadReviews({
      successMessage: "Đã gửi đánh giá đơn hàng thành công.",
    });
  };

  return (
    <section className="mt-5 rounded-xl border border-[#DCE8E5] bg-[#F8FBFA] p-5 shadow-[0_8px_24px_rgba(24,63,65,0.04)] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[#DCE8E5] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6F9F]">
            Sau giao dịch
          </p>
          <h2 className="mt-1 text-xl font-black text-[#183F41]">
            Đánh giá đơn hàng
          </h2>

          <p className="mt-1 text-sm text-[#68807F]">
            Mỗi đơn hàng chỉ được đánh giá một lần sau khi đơn hàng hoàn tất.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
              <ReviewStars value={Math.round(averageRating)} size="text-lg" />
              <span className="text-sm font-black text-[#183F41]">
                {averageRating.toFixed(1)} ·{" "}
                {state.page?.totalCount || items.length} đánh giá
              </span>
            </div>
          )}
          {counterpartyUserId && (
            <Link
              to={`/danh-gia/nguoi-dung/${counterpartyUserId}`}
              className="rounded-lg border border-[#4F8588] bg-white px-4 py-2 text-sm font-black text-[#285E62] transition hover:bg-[#F1F7F5]"
            >
              Uy tín đối tác
            </Link>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setNotice("");
                setModal({ mode: "create", review: null });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F8588] px-4 py-2 text-sm font-black text-white transition hover:bg-[#356A70]"
            >
              <span
                className="material-symbols-outlined text-lg"
                aria-hidden="true"
              >
                rate_review
              </span>
              Viết đánh giá
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          {notice}
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{state.error}</span>
          <button
            type="button"
            onClick={() => {
              setState((current) => ({ ...current, loading: true, error: "" }));
              void loadReviews();
            }}
            className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-black"
          >
            Thử lại
          </button>
        </div>
      )}

      {state.loading && (
        <div className="py-10 text-center text-sm font-semibold text-[#68807F]">
          <span
            className="material-symbols-outlined animate-spin text-2xl"
            aria-hidden="true"
          >
            progress_activity
          </span>
          <p className="mt-1">Đang tải đánh giá...</p>
        </div>
      )}

      {!state.loading && !state.error && items.length === 0 && (
        <div className="py-10 text-center">
          <span
            className="material-symbols-outlined text-4xl text-[#9FBFBA]"
            aria-hidden="true"
          >
            reviews
          </span>
          <h3 className="mt-2 font-black text-[#183F41]">Chưa có đánh giá</h3>
          <p className="mt-1 text-sm text-[#68807F]">
            {canCreate
              ? "Hãy chia sẻ trải nghiệm của bạn về đơn hàng này."
              : blockedReason ||
                "Đánh giá sẽ mở khi đơn hàng hoàn tất và đủ điều kiện."}
          </p>
        </div>
      )}

      {!state.loading && items.length > 0 && (
        <div className="mt-4 space-y-3">
          {items.map((review, index) => {
            const isMine = Boolean(
              state.mine?.reviewId && state.mine.reviewId === review.reviewId,
            );

            return (
              <ReviewCard
                key={review.reviewId || `${review.createdAt}-${index}`}
                review={review}
                ownReview={isMine}
                onEdit={isMine ? openEditModal : undefined}
                editing={isMine && openingEdit}
              />
            );
          })}

          {state.mine &&
            !items.some(
              (review) => review.reviewId === state.mine.reviewId,
            ) && (
              <ReviewCard
                review={state.mine}
                ownReview
                onEdit={openEditModal}
                editing={openingEdit}
              />
            )}
        </div>
      )}

      {!state.loading && state.page?.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={!state.page.hasPreviousPage}
            onClick={() => changePage(pageNumber - 1)}
            className="rounded-lg border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-black text-[#285E62] disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm font-bold text-[#68807F]">
            Trang {state.page.pageNumber}/{state.page.totalPages}
          </span>
          <button
            type="button"
            disabled={!state.page.hasNextPage}
            onClick={() => changePage(pageNumber + 1)}
            className="rounded-lg border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-black text-[#285E62] disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}

      {state.mine && !canCreate && state.mine.canEdit !== false && (
        <p className="mt-4 rounded-lg bg-[#EAF3F8] px-4 py-3 text-xs font-semibold leading-5 text-[#2F6F9F]">
          Bạn chỉ được chỉnh sửa đánh giá trong vòng 3 ngày kể từ khi gửi.
        </p>
      )}

      {modal && (
        <ReviewFormModal
          key={`${modal.mode}-${modal.review?.reviewId || "new"}`}
          mode={modal.mode}
          review={modal.review}
          onClose={() => setModal(null)}
          onSubmit={submitReview}
        />
      )}
    </section>
  );
};

export default OrderReviewSection;

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReviewCard from "../../features/reviews/ReviewCard";
import ReviewStars from "../../features/reviews/ReviewStars";
import reviewApi from "../../services/apis/reviewApi";

const PAGE_SIZE = 10;

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải đánh giá của người dùng.";

const ReceivedReviewsPage = () => {
  const { userId } = useParams();
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ loading: true, page: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();

    reviewApi
      .getByUser(userId, {
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((page) => setState({ loading: false, page, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setState({ loading: false, page: null, error: getErrorMessage(error) });
      });

    return () => controller.abort();
  }, [pageNumber, userId, version]);

  const items = useMemo(() => state.page?.items || [], [state.page]);
  const averageRating = Number(state.page?.averageRating) > 0
    ? Number(state.page.averageRating)
    : items.length
      ? items.reduce((total, review) => total + review.rating, 0) / items.length
      : 0;

  const changePage = (nextPage) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setPageNumber(nextPage);
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 pb-14 pt-7 sm:px-6">
      <Link
        to="/don-hang"
        className="inline-flex items-center gap-1 text-sm font-bold text-[#2F6F9F] transition hover:text-[#183F41]"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
        Quay lại
      </Link>

      <header className="mt-4 flex flex-col gap-4 border-b border-[#DCE8E5] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6F9F]">Uy tín giao dịch</p>
          <h1 className="mt-1 text-2xl font-black text-[#183F41] sm:text-3xl">Đánh giá người dùng nhận được</h1>
          <p className="mt-1.5 text-sm text-[#68807F]">Tham khảo trải nghiệm từ các giao dịch đã hoàn tất trên HomeCycle.</p>
        </div>
        {items.length > 0 && (
          <div className="rounded-xl border border-[#DCE8E5] bg-white px-4 py-3 shadow-sm">
            <ReviewStars value={Math.round(averageRating)} size="text-xl" />
            <p className="mt-1 text-sm font-black text-[#183F41]">
              {averageRating.toFixed(1)}/5 · {state.page?.totalCount || items.length} đánh giá
            </p>
          </div>
        )}
      </header>

      {state.loading && (
        <div className="mt-5 rounded-xl border border-[#DCE8E5] bg-white p-12 text-center text-sm font-semibold text-[#68807F]">
          <span className="material-symbols-outlined animate-spin text-3xl" aria-hidden="true">progress_activity</span>
          <p className="mt-2">Đang tải đánh giá...</p>
        </div>
      )}

      {state.error && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          <p>{state.error}</p>
          <button
            type="button"
            onClick={() => {
              setState({ loading: true, page: null, error: "" });
              setVersion((current) => current + 1);
            }}
            className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-black"
          >
            Thử lại
          </button>
        </div>
      )}

      {!state.loading && !state.error && items.length === 0 && (
        <div className="mt-5 rounded-xl border border-[#DCE8E5] bg-white p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-[#9FBFBA]" aria-hidden="true">reviews</span>
          <h2 className="mt-3 font-black text-[#183F41]">Chưa có đánh giá</h2>
          <p className="mt-1 text-sm text-[#68807F]">Người dùng này chưa nhận được đánh giá từ giao dịch đã hoàn tất.</p>
        </div>
      )}

      {!state.loading && items.length > 0 && (
        <div className="mt-5 space-y-3">
          {items.map((review, index) => (
            <ReviewCard key={review.reviewId || `${review.createdAt}-${index}`} review={review} />
          ))}
        </div>
      )}

      {!state.loading && state.page?.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={!state.page.hasPreviousPage}
            onClick={() => changePage(pageNumber - 1)}
            className="rounded-lg border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-black text-[#285E62] disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm font-bold text-[#68807F]">Trang {state.page.pageNumber}/{state.page.totalPages}</span>
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
    </section>
  );
};

export default ReceivedReviewsPage;
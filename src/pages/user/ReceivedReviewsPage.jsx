import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReviewCard from "../../features/reviews/ReviewCard";
import ContentReportModal from "../../features/disputes/ContentReportModal";
import { DISPUTE_TARGET_TYPE } from "../../constants/disputes";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import reviewApi from "../../services/apis/reviewApi";
import { getUserId, normalizeRole } from "../../utils/authUtils";

const PAGE_SIZE = 10;

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  "Không thể tải đánh giá của người dùng.";

const isReviewUnavailableForReport = (status) =>
  ["3", "4", "hidden", "removed", "deleted"].includes(
    String(status ?? "").trim().toLowerCase(),
  );

const ReceivedReviewsPage = () => {
  const { userId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = getUserId(user);
  const currentRole = normalizeRole(user?.role);
  const canReportReviews =
    isAuthenticated &&
    (currentRole === ROLES.PERSONAL ||
      currentRole === ROLES.BUSINESS);
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ loading: true, page: null, error: "" });
  const [reportTarget, setReportTarget] = useState(null);
  const [reportSuccess, setReportSuccess] = useState("");

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

  const changePage = (nextPage) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setPageNumber(nextPage);
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 pb-14 pt-7 sm:px-6">
      <Link
        to="/don-hang"
        className="inline-flex items-center gap-1 text-sm font-bold text-primary transition hover:text-text"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
        Quay lại
      </Link>

      <header className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Uy tín giao dịch</p>
          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">Đánh giá người dùng nhận được</h1>
          <p className="mt-1.5 text-sm text-textLight">Tham khảo trải nghiệm từ các giao dịch đã hoàn tất trên HomeCycle.</p>
        </div>
        {items.length > 0 && (
          <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-black text-text">
              {state.page?.totalCount || items.length} đánh giá
            </p>
            <p className="mt-1 text-xs font-semibold text-textLight">
              Điểm uy tín hiển thị được hệ thống quản lý riêng theo chính sách đánh giá.
            </p>
          </div>
        )}
      </header>

      {state.loading && (
        <div className="mt-5 rounded-xl border border-border bg-white p-12 text-center text-sm font-semibold text-textLight">
          <span className="material-symbols-outlined animate-spin text-3xl" aria-hidden="true">progress_activity</span>
          <p className="mt-2">Đang tải đánh giá...</p>
        </div>
      )}

      {state.error && (
        <div role="alert" className="mt-5 rounded-xl border border-error/30 bg-error/10 p-5 text-sm font-semibold text-error">
          <p>{state.error}</p>
          <button
            type="button"
            onClick={() => {
              setState({ loading: true, page: null, error: "" });
              setVersion((current) => current + 1);
            }}
            className="mt-3 rounded-lg border border-error/40 px-3 py-1.5 text-xs font-black"
          >
            Thử lại
          </button>
        </div>
      )}

      {reportSuccess && (
        <div
          role="status"
          className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success"
        >
          <p>{reportSuccess}</p>
          <button
            type="button"
            onClick={() => setReportSuccess("")}
            aria-label="Đóng thông báo"
            className="font-black"
          >
            ×
          </button>
        </div>
      )}

      {!state.loading && !state.error && items.length === 0 && (
        <div className="mt-5 rounded-xl border border-border bg-white p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-border" aria-hidden="true">reviews</span>
          <h2 className="mt-3 font-black text-text">Chưa có đánh giá</h2>
          <p className="mt-1 text-sm text-textLight">Người dùng này chưa nhận được đánh giá từ giao dịch đã hoàn tất.</p>
        </div>
      )}

      {!state.loading && items.length > 0 && (
        <div className="mt-5 space-y-3">
          {items.map((review, index) => (
            <ReviewCard
              key={review.reviewId || `${review.createdAt}-${index}`}
              review={review}
              reporting={
                reportTarget?.reviewId === review.reviewId
              }
              onReport={
                canReportReviews &&
                review.reviewId &&
                !isReviewUnavailableForReport(review.status) &&
                (!review.reviewerId ||
                  String(review.reviewerId).toLowerCase() !==
                    currentUserId.toLowerCase())
                  ? (selectedReview) => {
                      setReportSuccess("");
                      setReportTarget(selectedReview);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {!state.loading && state.page?.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={!state.page.hasPreviousPage}
            onClick={() => changePage(pageNumber - 1)}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-black text-primary disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm font-bold text-textLight">Trang {state.page.pageNumber}/{state.page.totalPages}</span>
          <button
            type="button"
            disabled={!state.page.hasNextPage}
            onClick={() => changePage(pageNumber + 1)}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-black text-primary disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}

      {reportTarget && (
        <ContentReportModal
          open
          targetType={DISPUTE_TARGET_TYPE.REVIEW}
          targetId={reportTarget.reviewId}
          targetLabel={`Đánh giá của ${reportTarget.reviewerName || "người dùng HomeCycle"}`}
          onClose={() => setReportTarget(null)}
          onSuccess={() => {
            setReportTarget(null);
            setReportSuccess(
              "Đã gửi báo cáo đánh giá. Nội dung sẽ được giữ nguyên cho đến khi Kiểm duyệt viên đưa ra quyết định.",
            );
          }}
        />
      )}
    </section>
  );
};

export default ReceivedReviewsPage;

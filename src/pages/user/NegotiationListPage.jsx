import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNegotiationStatusMeta } from "../../constants/negotiations";
import negotiationApi from "../../services/apis/negotiationApi";
import Avatar from "../../components/shared/Avatar";

const PAGE_SIZE = 10;

const isCanceledRequest = (error) => {
  return error?.name === "CanceledError" || error?.code === "ERR_CANCELED";
};

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    fallbackMessage
  );
};

const formatCurrency = (value) => {
  const amount = Number(value);

  return value !== null && value !== undefined && Number.isFinite(amount)
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

const NegotiationListPage = () => {
  const [pageNumber, setPageNumber] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const requestKey = `${pageNumber}:${requestVersion}`;
  const [requestState, setRequestState] = useState({
    requestKey: "",
    result: null,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    negotiationApi
      .getAll({
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        if (isActive) {
          setRequestState({ requestKey, result, error: "" });
        }
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setRequestState({
          requestKey,
          result: null,
          error: getErrorMessage(
            requestError,
            "Không thể tải danh sách phiên thương lượng.",
          ),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [pageNumber, requestKey]);

  const loading = requestState.requestKey !== requestKey;
  const result = loading ? null : requestState.result;
  const error = loading ? "" : requestState.error;
  const negotiations = Array.isArray(result?.items) ? result.items : [];

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl px-4 pb-14 pt-7 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Trung tâm giao dịch
          </p>
          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
            Phòng thương lượng
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-textLight">
            Mở lại các cuộc trò chuyện để trao đổi giá, số lượng, giao nhận và hoàn thiện thỏa thuận với đối tác.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setRequestVersion((currentVersion) => currentVersion + 1)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              refresh
            </span>
            Làm mới
          </button>
        </div>
      </header>

      {loading && (
        <div role="status" className="mt-4 rounded-xl border border-border bg-white p-10 text-center text-textLight shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
          <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
          <p className="mt-2 text-sm font-semibold">Đang tải phiên thương lượng...</p>
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="mt-4 rounded-xl border border-error/30 bg-error/10 p-8 text-center">
          <p className="font-semibold text-error">{error}</p>
          <button
            type="button"
            onClick={() =>
              setRequestVersion((currentVersion) => currentVersion + 1)
            }
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && negotiations.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
          <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">forum</span>
          <h2 className="mt-4 text-lg font-bold text-text">
            Chưa có phòng thương lượng
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-textLight">
            Phòng mới sẽ xuất hiện sau khi một đề nghị được phản hồi và phiên trao đổi được mở.
          </p>
          <Link
            to="/thuong-luong"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
          >
            Xem các đề nghị
          </Link>
        </div>
      )}

      {!loading && !error && negotiations.length > 0 && (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
            <div className="hidden grid-cols-[minmax(190px,1.4fr)_150px_80px_130px_155px_120px] items-center gap-4 bg-background px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-textLight md:grid">
              <span>Đối tác</span>
              <span>Giá hiện tại</span>
              <span>Số lượng</span>
              <span>Trạng thái</span>
              <span>Cập nhật</span>
              <span className="sr-only">Thao tác</span>
            </div>
            <div className="divide-y divide-border">
            {negotiations.map((negotiation) => {
              const statusMeta = getNegotiationStatusMeta(
                negotiation.negotiationStatus,
              );
              const name = negotiation.otherPartyName;

              return (
                <article
                  key={negotiation.negotiationId}
                  className="grid gap-4 px-5 py-4 transition hover:bg-background md:grid-cols-[minmax(190px,1.4fr)_150px_80px_130px_155px_120px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={negotiation.otherPartyAvatarUrl}
                        alt={name}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-textLight">Đang trao đổi với</p>
                        <p className="truncate font-bold text-text">{name}</p>
                      </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-textLight md:hidden">Giá hiện tại</p>
                    <p className="mt-0.5 text-base font-black text-error">{formatCurrency(negotiation.currentOfferPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-textLight md:hidden">Số lượng</p>
                    <p className="mt-0.5 font-black text-text">{negotiation.currentOfferQuantity ?? "—"}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-textLight md:hidden">Cập nhật</p>
                    <p className="mt-0.5 text-xs font-medium text-textLight">{formatDate(negotiation.lastMessageAt)}</p>
                  </div>
                  <div className="flex md:justify-end">
                    <Link
                      to={`/thuong-luong/${encodeURIComponent(negotiation.negotiationId)}`}
                      state={{ negotiationSummary: negotiation }}
                      className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
                    >
                      Mở phòng
                    </Link>
                  </div>
                </article>
              );
            })}
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <p className="text-sm font-medium text-textLight">
              Trang {result?.pageNumber ?? pageNumber} / {Math.max(result?.totalPages ?? 1, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage - 1)}
                disabled={!result?.hasPreviousPage}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage + 1)}
                disabled={!result?.hasNextPage}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default NegotiationListPage;
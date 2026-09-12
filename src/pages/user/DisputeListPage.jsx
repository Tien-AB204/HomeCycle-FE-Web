import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDisputeCategoryLabel,
  getDisputeStatusMeta,
} from "../../constants/disputes";
import disputeApi from "../../services/apis/disputeApi";

const PAGE_SIZE = 10;

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const DisputeListPage = () => {
  const [pageNumber, setPageNumber] = useState(1);
  const [state, setState] = useState({
    items: [],
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
    loading: true,
    error: "",
  });

  const listRequestRef = useRef(0);
  const listControllerRef = useRef(null);

  const loadDisputes = useCallback(async () => {
    listControllerRef.current?.abort();

    const controller = new AbortController();
    listControllerRef.current = controller;

    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;

    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await disputeApi.getMine({
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      });

      if (listRequestRef.current !== requestId) {
        return;
      }

      setState({
        items: result.items,
        totalPages: result.totalPages,
        hasPreviousPage: result.hasPreviousPage,
        hasNextPage: result.hasNextPage,
        loading: false,
        error: "",
      });
    } catch (error) {
      if (listRequestRef.current !== requestId) {
        return;
      }

      if (isCanceledRequest(error)) {
        return;
      }

      setState((current) => ({
        ...current,
        loading: false,
        error: "Không thể tải danh sách tranh chấp. Vui lòng thử lại.",
      }));
    }
  }, [pageNumber]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDisputes();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      listRequestRef.current += 1;
      listControllerRef.current?.abort();
    };
  }, [loadDisputes]);

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 pb-14 pt-7 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-warning">
            Trung tâm giao dịch
          </p>
          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
            Tranh chấp của tôi
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-textLight">
            Các tranh chấp bạn đã gửi hoặc bị khiếu nại trong các đơn hàng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDisputes()}
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
        >
          Làm mới
        </button>
      </header>

      {state.loading && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-border bg-white p-10 text-center text-textLight shadow-[0_8px_24px_rgba(23,40,48,0.05)]"
        >
          <p className="text-sm font-semibold">Đang tải danh sách tranh chấp...</p>
        </div>
      )}

      {state.error && !state.loading && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-error/30 bg-error/10 p-8 text-center"
        >
          <p className="font-semibold text-error">{state.error}</p>
          <button
            type="button"
            onClick={() => void loadDisputes()}
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {!state.loading && !state.error && state.items.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
          <p className="text-sm font-semibold text-textLight">
            Bạn chưa có tranh chấp nào.
          </p>
        </div>
      )}

      {!state.loading && !state.error && state.items.length > 0 && (
        <>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-white shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
            {state.items.map((item) => {
              const statusMeta = getDisputeStatusMeta(item.status);

              return (
                <Link
                  key={item.disputeId}
                  to={`/tranh-chap/${encodeURIComponent(item.disputeId)}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-background"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-text">
                      {item.orderCode
                        ? `Đơn ${item.orderCode}`
                        : `Tranh chấp ${String(item.disputeId).slice(0, 8)}`}
                    </p>
                    <p className="mt-1 truncate text-xs text-textLight">
                      {getDisputeCategoryLabel(item.category)} · {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <p className="text-sm font-medium text-textLight">
              Trang {pageNumber} / {Math.max(state.totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((current) => current - 1)}
                disabled={!state.hasPreviousPage}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((current) => current + 1)}
                disabled={!state.hasNextPage}
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

export default DisputeListPage;

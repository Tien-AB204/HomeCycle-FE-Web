import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import conversationApi from "../../services/apis/conversationApi";
import Avatar from "../../components/shared/Avatar";

const PAGE_SIZE = 20;

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getMessagePreview = (item) => {
  if (item.latestMessagePreview) {
    return item.latestMessagePreview;
  }

  if (item.latestMessageType === "Offer" || item.latestMessageType === "CounterOffer") {
    return "Đã gửi một đề xuất giá.";
  }

  return "Chưa có tin nhắn nào.";
};

const ConversationListPage = () => {
  const [pageNumber, setPageNumber] = useState(1);
  const [state, setState] = useState({
    items: [],
    pageNumber: 1,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
    loading: true,
    error: "",
  });

  const listRequestRef = useRef(0);
  const listControllerRef = useRef(null);

  const loadConversations = useCallback(async () => {
    listControllerRef.current?.abort();

    const controller = new AbortController();
    listControllerRef.current = controller;

    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;

    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await conversationApi.getConversations({
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      });

      if (listRequestRef.current !== requestId) {
        return;
      }

      setState({
        items: result.items,
        pageNumber: result.pageNumber,
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
        error: "Không thể tải hộp thư. Vui lòng thử lại.",
      }));
    }
  }, [pageNumber]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadConversations();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      listRequestRef.current += 1;
      listControllerRef.current?.abort();
    };
  }, [loadConversations]);

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 pb-14 pt-7 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Hộp thư
          </p>
          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
            Hội thoại
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-textLight">
            Tất cả cuộc trò chuyện với từng đối tác, gộp mọi phiên thương lượng đã phát sinh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadConversations()}
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">
            refresh
          </span>
          Làm mới
        </button>
      </header>

      {state.loading && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-border bg-white p-10 text-center text-textLight shadow-[0_8px_24px_rgba(23,40,48,0.05)]"
        >
          <span className="material-symbols-outlined animate-spin text-3xl">
            refresh
          </span>
          <p className="mt-2 text-sm font-semibold">Đang tải hộp thư...</p>
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
            onClick={() => void loadConversations()}
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {!state.loading && !state.error && state.items.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
          <span
            className="material-symbols-outlined text-5xl text-primary"
            aria-hidden="true"
          >
            inbox
          </span>
          <h2 className="mt-4 text-lg font-bold text-text">
            Hộp thư trống
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-textLight">
            Hội thoại sẽ xuất hiện khi bạn bắt đầu trao đổi với một đối tác.
          </p>
        </div>
      )}

      {!state.loading && !state.error && state.items.length > 0 && (
        <>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-white shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
            {state.items.map((item) => {
              const participant = item.otherParticipant;

              return (
                <Link
                  key={item.conversationId}
                  to={`/hop-thu/${encodeURIComponent(item.conversationId)}`}
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-background"
                >
                  <Avatar
                    src={participant.avatarUrl}
                    alt={participant.displayName || ""}
                    className="h-11 w-11"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold text-text">
                        {participant.displayName}
                      </p>
                      <span className="shrink-0 text-xs font-medium text-textLight">
                        {formatDate(item.lastActivityAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-textLight">
                      {getMessagePreview(item)}
                    </p>
                  </div>

                  {item.unreadCount > 0 && (
                    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-black text-white">
                      {item.unreadCount > 99 ? "99+" : item.unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <p className="text-sm font-medium text-textLight">
              Trang {state.pageNumber} / {Math.max(state.totalPages, 1)}
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

export default ConversationListPage;

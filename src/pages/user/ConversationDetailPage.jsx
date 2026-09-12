import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getNegotiationStatusMeta } from "../../constants/negotiations";
import { useAuth } from "../../hooks/useAuth";
import { useChatRealtime } from "../../hooks/useChatRealtime";
import conversationApi from "../../services/apis/conversationApi";
import chatRealtimeService from "../../services/realtime/chatRealtimeService";
import { getUserId } from "../../utils/authUtils";

const PAGE_SIZE = 30;

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const formatDateTime = (value) => {
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

const formatCurrency = (value) => {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const raw = typeof value === "string" ? value.trim() : value;

  if (raw === "") {
    return null;
  }

  const amount = Number(raw);

  return Number.isFinite(amount) ? `${amount.toLocaleString("vi-VN")} đ` : null;
};

const getMessageBodyText = (message) => {
  if (message.messageContent) {
    return message.messageContent;
  }

  if (message.messageType === "Offer" || message.messageType === "CounterOffer") {
    const price = formatCurrency(message.offerPrice);
    const quantity = message.offerQuantity;

    return [
      "Đề xuất giá",
      price ? `${price}` : null,
      Number.isFinite(quantity) ? `x${quantity}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (message.messageType === "Agreement") {
    return "Đã cập nhật thỏa thuận.";
  }

  return "Tin nhắn không có nội dung hiển thị.";
};

const ConversationDetailPage = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const { connection } = useChatRealtime();

  const [conversation, setConversation] = useState(null);
  const [conversationError, setConversationError] = useState("");

  const [timelineState, setTimelineState] = useState({
    messages: [],
    loading: true,
    error: "",
  });

  const [negotiationsState, setNegotiationsState] = useState({
    items: [],
    loading: true,
    error: "",
  });

  const timelineRequestRef = useRef(0);
  const timelineControllerRef = useRef(null);
  const negotiationsRequestRef = useRef(0);
  const negotiationsControllerRef = useRef(null);

  const loadConversation = useCallback(async () => {
    try {
      const data = await conversationApi.getConversationById(conversationId);
      setConversation(data);
      setConversationError("");
    } catch {
      setConversationError("Không thể tải thông tin hội thoại.");
    }
  }, [conversationId]);

  const loadTimeline = useCallback(async () => {
    timelineControllerRef.current?.abort();

    const controller = new AbortController();
    timelineControllerRef.current = controller;

    const requestId = timelineRequestRef.current + 1;
    timelineRequestRef.current = requestId;

    setTimelineState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await conversationApi.getMessages(conversationId, {
        pageNumber: 1,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      });

      if (timelineRequestRef.current !== requestId) {
        return;
      }

      setTimelineState({
        messages: result.items,
        loading: false,
        error: "",
      });
    } catch (error) {
      if (timelineRequestRef.current !== requestId) {
        return;
      }

      if (isCanceledRequest(error)) {
        return;
      }

      setTimelineState({
        messages: [],
        loading: false,
        error: "Không thể tải lịch sử tin nhắn. Vui lòng thử lại.",
      });
    }
  }, [conversationId]);

  const loadNegotiations = useCallback(async () => {
    negotiationsControllerRef.current?.abort();

    const controller = new AbortController();
    negotiationsControllerRef.current = controller;

    const requestId = negotiationsRequestRef.current + 1;
    negotiationsRequestRef.current = requestId;

    setNegotiationsState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await conversationApi.getNegotiations(conversationId, {
        pageNumber: 1,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      });

      if (negotiationsRequestRef.current !== requestId) {
        return;
      }

      setNegotiationsState({
        items: result.items,
        loading: false,
        error: "",
      });
    } catch (error) {
      if (negotiationsRequestRef.current !== requestId) {
        return;
      }

      if (isCanceledRequest(error)) {
        return;
      }

      setNegotiationsState({
        items: [],
        loading: false,
        error: "Không thể tải danh sách phiên thương lượng.",
      });
    }
  }, [conversationId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadConversation();
      void loadTimeline();
      void loadNegotiations();
      conversationApi.markAsRead(conversationId).catch(() => {
        /* Đánh dấu đã đọc là phụ; không chặn hiển thị nội dung. */
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      timelineRequestRef.current += 1;
      timelineControllerRef.current?.abort();
      negotiationsRequestRef.current += 1;
      negotiationsControllerRef.current?.abort();
    };
  }, [conversationId, loadConversation, loadTimeline, loadNegotiations]);

  /*
   * Realtime: tham gia group Conversation qua ChatHub dùng chung với
   * Negotiation/Order (không tạo provider realtime thứ hai). Khi có sự
   * kiện, tải lại timeline/danh sách negotiation thay vì tự ghép mảng -
   * đơn giản và an toàn hơn cho một trang tổng hợp nhiều nguồn dữ liệu.
   */
  useEffect(() => {
    if (!connection || !conversationId) {
      return undefined;
    }

    let isActive = true;

    chatRealtimeService
      .joinConversation(connection, conversationId)
      .catch(() => {
        /* Nếu tham gia group thất bại, trang vẫn dùng dữ liệu REST đã tải. */
      });

    const handleUpdate = () => {
      if (!isActive) {
        return;
      }

      void loadTimeline();
      void loadNegotiations();
      void loadConversation();
    };

    connection.on("ConversationMessageCreated", handleUpdate);
    connection.on("ConversationMessageUpdated", handleUpdate);
    connection.on("ConversationMessagesRead", handleUpdate);
    connection.on("ConversationUpdated", handleUpdate);

    return () => {
      isActive = false;
      connection.off("ConversationMessageCreated", handleUpdate);
      connection.off("ConversationMessageUpdated", handleUpdate);
      connection.off("ConversationMessagesRead", handleUpdate);
      connection.off("ConversationUpdated", handleUpdate);
      chatRealtimeService
        .leaveConversation(connection, conversationId)
        .catch(() => {});
    };
  }, [connection, conversationId, loadTimeline, loadNegotiations, loadConversation]);

  const participant = conversation?.otherParticipant;

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-4xl px-4 pb-14 pt-7 sm:px-6">
      <div className="flex items-center gap-3 border-b border-border pb-5">
        <Link
          to="/hop-thu"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-primary transition hover:bg-background"
          aria-label="Quay lại hộp thư"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </Link>

        {participant?.avatarUrl ? (
          <img
            src={participant.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-black text-white">
            {(participant?.displayName || "?").charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate font-black text-text">
            {participant?.displayName || "Người dùng HomeCycle"}
          </p>
          <p className="text-xs text-textLight">Hội thoại tổng hợp</p>
        </div>
      </div>

      {conversationError && (
        <div className="mt-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm font-semibold text-error">
          {conversationError}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-textLight">
            Lịch sử tin nhắn
          </h2>

          {timelineState.loading && (
            <p className="py-8 text-center text-sm font-semibold text-textLight">
              Đang tải lịch sử tin nhắn...
            </p>
          )}

          {timelineState.error && !timelineState.loading && (
            <p className="py-8 text-center text-sm font-semibold text-error">
              {timelineState.error}
            </p>
          )}

          {!timelineState.loading &&
            !timelineState.error &&
            timelineState.messages.length === 0 && (
              <p className="py-8 text-center text-sm text-textLight">
                Chưa có tin nhắn nào.
              </p>
            )}

          {!timelineState.loading &&
            !timelineState.error &&
            timelineState.messages.length > 0 && (
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {timelineState.messages.map((message) => {
                  const isMine =
                    String(message.senderId || "") === String(currentUserId || "");

                  return (
                    <div
                      key={message.messageId}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMine
                            ? "bg-primary text-white"
                            : "border border-border bg-background text-text"
                        }`}
                      >
                        <p className="leading-6 whitespace-pre-wrap break-words">
                          {getMessageBodyText(message)}
                        </p>
                        <p
                          className={`mt-1 text-[11px] ${
                            isMine ? "text-white/70" : "text-textLight"
                          }`}
                        >
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          <p className="mt-3 text-xs text-textLight">
            Đây là lịch sử tổng hợp, chỉ để xem lại. Để tiếp tục trao đổi hoặc
            phản hồi đề xuất, mở đúng phiên thương lượng bên phải.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-textLight">
            Phiên thương lượng
          </h2>

          {negotiationsState.loading && (
            <p className="py-4 text-center text-sm font-semibold text-textLight">
              Đang tải...
            </p>
          )}

          {negotiationsState.error && !negotiationsState.loading && (
            <p className="py-4 text-center text-sm font-semibold text-error">
              {negotiationsState.error}
            </p>
          )}

          {!negotiationsState.loading &&
            !negotiationsState.error &&
            negotiationsState.items.length === 0 && (
              <p className="py-4 text-center text-sm text-textLight">
                Chưa có phiên thương lượng nào.
              </p>
            )}

          <div className="space-y-2">
            {negotiationsState.items.map((negotiation) => {
              const statusMeta = getNegotiationStatusMeta(
                negotiation.negotiationStatus,
              );

              return (
                <Link
                  key={negotiation.negotiationId}
                  to={`/thuong-luong/${encodeURIComponent(negotiation.negotiationId)}`}
                  className="block rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-background"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>

                    {negotiation.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-black text-white">
                        {negotiation.unreadCount > 99 ? "99+" : negotiation.unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-black text-error">
                    {formatCurrency(negotiation.currentOfferPrice) || "Chưa có giá"}
                  </p>

                  <p className="mt-1 text-xs text-textLight">
                    Cập nhật: {formatDateTime(negotiation.lastMessageAt)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConversationDetailPage;

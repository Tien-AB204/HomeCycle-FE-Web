import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  getNegotiationStatusMeta,
  getProposalStatusMeta,
  isProposalMessage,
  MESSAGE_TYPE,
  NEGOTIATION_STATUS,
} from "../../constants/negotiations";
import { useAuth } from "../../hooks/useAuth";
import messageApi, {
  normalizeMessage,
} from "../../services/apis/messageApi";
import agreementApi from "../../services/apis/agreementApi";
import negotiationApi from "../../services/apis/negotiationApi";
import chatRealtimeService, {
  CHAT_REALTIME_STATUS,
} from "../../services/realtime/chatRealtimeService";
import { getUserId } from "../../utils/authUtils";

const MESSAGE_PAGE_SIZE = 50;
const FALLBACK_POLL_INTERVAL_MS = 10000;

const isCanceledRequest = (error) => {
  return error?.name === "CanceledError" || error?.code === "ERR_CANCELED";
};

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
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

const createClientMessageId = () => {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const sortMessages = (messages) => {
  return [...messages].sort((firstMessage, secondMessage) => {
    const createdAtDifference =
      new Date(firstMessage.createdAt).getTime() -
      new Date(secondMessage.createdAt).getTime();

    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    if (
      firstMessage.messageType === "Offer" &&
      secondMessage.messageType !== "Offer"
    ) {
      return -1;
    }

    if (
      secondMessage.messageType === "Offer" &&
      firstMessage.messageType !== "Offer"
    ) {
      return 1;
    }

    return String(firstMessage.messageId).localeCompare(
      String(secondMessage.messageId),
    );
  });
};

const mergeMessages = (...messageGroups) => {
  const messagesById = new Map();
  const messageIdByClientId = new Map();

  messageGroups.flat().forEach((rawMessage) => {
    const message = normalizeMessage(rawMessage);

    if (!message) {
      return;
    }

    const clientMessageId = message.clientMessageId;
    const existingMessageId = clientMessageId
      ? messageIdByClientId.get(clientMessageId)
      : "";
    const key = existingMessageId || message.messageId;
    const existingMessage = messagesById.get(key);

    if (existingMessageId && existingMessageId !== message.messageId) {
      messagesById.delete(existingMessageId);
    }

    messagesById.set(message.messageId, {
      ...(existingMessage || {}),
      ...message,
    });

    if (clientMessageId) {
      messageIdByClientId.set(clientMessageId, message.messageId);
    }
  });

  return sortMessages(Array.from(messagesById.values()));
};

const REALTIME_STATUS_META = Object.freeze({
  [CHAT_REALTIME_STATUS.CONNECTED]: {

  },
  [CHAT_REALTIME_STATUS.CONNECTING]: {
    label: "Đang kết nối",
    dotClassName: "animate-pulse bg-amber-300",
  },
  [CHAT_REALTIME_STATUS.RECONNECTING]: {
    label: "Đang kết nối lại",
    dotClassName: "animate-pulse bg-amber-300",
  },
  [CHAT_REALTIME_STATUS.DISCONNECTED]: {
    label: "Đồng bộ dự phòng",
    dotClassName: "bg-slate-300",
  },
});

const ProposalMessage = ({
  message,
  isMine,
  canRespond,
  actionBusy,
  onAccept,
  onReject,
}) => {
  const statusMeta = getProposalStatusMeta(message.offerStatus);

  return (
    <article
      className={`w-full max-w-sm rounded-xl border px-4 py-3 shadow-sm ${
        isMine
          ? "ml-auto border-[#4F8588]/30 bg-[#edf5f5]"
          : "mr-auto border-[#BAC2C1]/50 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#68807F]">
            {message.messageType === "Offer"
              ? "Đề nghị ban đầu"
              : "Đề xuất mới"}
          </p>
          <p className="mt-0.5 text-lg font-black text-[#B33A32]">
            {formatCurrency(message.offerPrice)}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-7 gap-y-2 border-t border-[#DCE8E5] pt-2.5 text-sm">
        <div>
          <dt className="text-[11px] font-semibold text-[#68807F]">Số lượng</dt>
          <dd className="font-bold text-[#183F41]">{message.offerQuantity}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold text-[#68807F]">Giá bài đăng</dt>
          <dd className="font-bold text-[#183F41]">
            {formatCurrency(message.basePriceSnapshot)}
          </dd>
        </div>
      </dl>

      {message.messageContent && (
        <p className="mt-3 text-sm leading-6 text-[#334b50]">
          {message.messageContent}
        </p>
      )}

      {canRespond && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#BAC2C1]/30 pt-3">
          <button
            type="button"
            onClick={() => onAccept(message.messageId)}
            disabled={Boolean(actionBusy)}
            className="rounded-lg bg-green-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-800 disabled:opacity-50"
          >
            Chốt mức này
          </button>
          <button
            type="button"
            onClick={() => onReject(message.messageId)}
            disabled={Boolean(actionBusy)}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            Từ chối
          </button>
        </div>
      )}

      <p className="mt-2 text-right text-[10px] text-[#789092]">
        {isMine ? "Bạn gửi" : "Đối tác gửi"} · {formatDate(message.createdAt)}
      </p>
    </article>
  );
};

const TextMessage = ({ message, isMine }) => {
  return (
    <article
      className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-sm leading-5 shadow-sm sm:max-w-[70%] ${
        isMine
          ? "ml-auto bg-[#4F8588] text-white"
          : "mr-auto border border-[#BAC2C1]/40 bg-white text-[#183F41]"
      }`}
    >
      <p>{message.messageContent || "Tin nhắn"}</p>
      {message.mediaUrl && (
        <a
          href={message.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className={`mt-2 block break-all text-xs underline ${
            isMine ? "text-[#C8ECE7]" : "text-[#4F8588]"
          }`}
        >
          Xem tệp đính kèm
        </a>
      )}
      <p className={`mt-1 text-right text-[10px] ${isMine ? "text-white/65" : "text-[#789092]"}`}>
        {formatDate(message.createdAt)}
        {isMine ? ` · ${message.isRead ? "Đã đọc" : "Đã gửi"}` : ""}
      </p>
    </article>
  );
};

const AgreementMessage = ({ message, negotiationId, isMine }) => (
  <article className={`w-full max-w-sm rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm ${isMine ? "ml-auto" : "mr-auto"}`}>
    <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Thỏa thuận giao dịch</p>
    <p className="mt-1.5 text-sm leading-5 text-green-900">{message.messageContent || "Thỏa thuận đã được tạo. Vui lòng kiểm tra và xác nhận."}</p>
    <Link to={`/thuong-luong/${negotiationId}/thoa-thuan`} className="mt-2.5 inline-flex rounded-lg bg-green-700 px-3.5 py-2 text-xs font-black text-white hover:bg-green-800">Mở Agreement Form</Link>
    <p className="mt-2 text-right text-[10px] text-green-700/70">{formatDate(message.createdAt)}</p>
  </article>
);

const NegotiationRoomPage = () => {
  const { negotiationId = "" } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const summary = location.state?.negotiationSummary || null;
  const [requestVersion, setRequestVersion] = useState(0);
  const requestKey = `${negotiationId}:${requestVersion}`;
  const [requestState, setRequestState] = useState({
    requestKey: "",
    negotiation: null,
    error: "",
  });
  const [actionBusy, setActionBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [agreementPreview, setAgreementPreview] = useState(null);
  const [counterForm, setCounterForm] = useState({
    offerPrice: "",
    offerQuantity: "1",
  });
  const [messageText, setMessageText] = useState("");
  const [messageError, setMessageError] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [messagePagination, setMessagePagination] = useState({
    pageNumber: 0,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
  });
  const [realtimeStatus, setRealtimeStatus] = useState(
    CHAT_REALTIME_STATUS.CONNECTING,
  );
  const messagesEndRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);

  const refreshRoom = useCallback(() => {
    shouldScrollToBottomRef.current = true;
    setRequestVersion((currentVersion) => currentVersion + 1);
  }, []);

  const updateMessages = useCallback((incomingMessages) => {
    setRequestState((currentState) => {
      if (!currentState.negotiation) {
        return currentState;
      }

      const currentMessages = currentState.negotiation.messages || [];
      const nextIncomingMessages =
        typeof incomingMessages === "function"
          ? incomingMessages(currentMessages)
          : incomingMessages;

      return {
        ...currentState,
        negotiation: {
          ...currentState.negotiation,
          messages: mergeMessages(
            currentMessages,
            nextIncomingMessages || [],
          ),
        },
      };
    });
  }, []);

  const markRoomAsRead = useCallback(async () => {
    if (
      !negotiationId ||
      !currentUserId ||
      document.visibilityState === "hidden"
    ) {
      return;
    }

    try {
      await messageApi.markAsRead(negotiationId);

      updateMessages((currentMessages) =>
        currentMessages.map((message) =>
          String(message.senderId) !== currentUserId
            ? { ...message, isRead: true }
            : message,
        ),
      );
    } catch {
      // Tin nhắn vẫn hiển thị được nếu thao tác read receipt tạm thời thất bại.
    }
  }, [currentUserId, negotiationId, updateMessages]);

  const syncLatestMessages = useCallback(async () => {
    if (!negotiationId) {
      return;
    }

    try {
      const history = await messageApi.getHistory(negotiationId, {
        pageNumber: 1,
        pageSize: MESSAGE_PAGE_SIZE,
      });

      updateMessages(history.items);
      setMessagePagination((currentPagination) => {
        const loadedPageNumber = Math.max(
          currentPagination.pageNumber,
          history.pageNumber,
        );

        return {
          pageNumber: loadedPageNumber,
          totalPages: history.totalPages,
          totalCount: history.totalCount,
          hasNextPage: loadedPageNumber < history.totalPages,
        };
      });

      await markRoomAsRead();
    } catch {
      // SignalR có polling dự phòng; lỗi đồng bộ nền không che nội dung hiện tại.
    }
  }, [markRoomAsRead, negotiationId, updateMessages]);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    Promise.all([
      negotiationApi.getById(negotiationId, {
        signal: controller.signal,
      }),
      messageApi.getHistory(negotiationId, {
        pageNumber: 1,
        pageSize: MESSAGE_PAGE_SIZE,
        signal: controller.signal,
      }),
    ])
      .then(([negotiation, history]) => {
        if (!isActive) {
          return;
        }

        shouldScrollToBottomRef.current = true;
        setRequestState({
          requestKey,
          negotiation: {
            ...negotiation,
            messages: mergeMessages(
              negotiation.messages || [],
              history.items,
            ),
          },
          error: "",
        });
        setMessagePagination({
          pageNumber: history.pageNumber,
          totalPages: history.totalPages,
          totalCount: history.totalCount,
          hasNextPage: history.hasNextPage,
        });
        setCounterForm({
          offerPrice: String(negotiation.currentOfferPrice ?? ""),
          offerQuantity: String(negotiation.currentOfferQuantity ?? 1),
        });

        void markRoomAsRead();
      })
      .catch((requestError) => {
        if (!isActive || isCanceledRequest(requestError)) {
          return;
        }

        setRequestState({
          requestKey,
          negotiation: null,
          error: getErrorMessage(
            requestError,
            "Không thể tải phòng thương lượng.",
          ),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [markRoomAsRead, negotiationId, requestKey]);

  useEffect(() => {
    if (!negotiationId || !currentUserId) {
      return undefined;
    }

    const connection = chatRealtimeService.createConnection();
    let isActive = true;
    let retryTimer = null;

    const scheduleRetry = () => {
      if (!isActive || retryTimer) {
        return;
      }

      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void startConnection();
      }, 5000);
    };

    const startConnection = async () => {
      if (!isActive || connection.state !== "Disconnected") {
        return;
      }

      setRealtimeStatus(CHAT_REALTIME_STATUS.CONNECTING);

      try {
        await connection.start();

        if (!isActive) {
          await connection.stop();
          return;
        }

        await chatRealtimeService.joinNegotiation(
          connection,
          negotiationId,
        );
        setRealtimeStatus(CHAT_REALTIME_STATUS.CONNECTED);
        await syncLatestMessages();
      } catch {
        if (isActive) {
          setRealtimeStatus(CHAT_REALTIME_STATUS.DISCONNECTED);
          scheduleRetry();
        }
      }
    };

    connection.on("MessageCreated", (rawMessage) => {
      const message = normalizeMessage(rawMessage);

      if (!message || message.negotiationId !== negotiationId) {
        return;
      }

      shouldScrollToBottomRef.current = true;
      updateMessages([message]);

      if (message.senderId !== currentUserId) {
        void markRoomAsRead();
      }
    });

    connection.on("MessageUpdated", (rawMessage) => {
      const message = normalizeMessage(rawMessage);

      if (!message || message.negotiationId !== negotiationId) {
        return;
      }

      updateMessages([message]);

      if (
        ["accepted", "rejected"].includes(
          String(message.offerStatus).toLowerCase(),
        )
      ) {
        refreshRoom();
      }
    });

    connection.on("MessagesRead", (readReceipt) => {
      if (String(readReceipt?.negotiationId || "") !== negotiationId) {
        return;
      }

      const readerId = String(readReceipt?.readerId || "");
      const readAt = new Date(readReceipt?.readAt).getTime();

      updateMessages((currentMessages) =>
        currentMessages.map((message) => {
          const messageTime = new Date(message.createdAt).getTime();
          const wasReadByReader =
            String(message.senderId) !== readerId &&
            Number.isFinite(readAt) &&
            messageTime <= readAt;

          return wasReadByReader
            ? { ...message, isRead: true }
            : message;
        }),
      );
    });

    connection.onreconnecting(() => {
      if (isActive) {
        setRealtimeStatus(CHAT_REALTIME_STATUS.RECONNECTING);
      }
    });

    connection.onreconnected(async () => {
      if (!isActive) {
        return;
      }

      try {
        await chatRealtimeService.joinNegotiation(
          connection,
          negotiationId,
        );
        setRealtimeStatus(CHAT_REALTIME_STATUS.CONNECTED);
        await syncLatestMessages();
      } catch {
        setRealtimeStatus(CHAT_REALTIME_STATUS.DISCONNECTED);
      }
    });

    connection.onclose(() => {
      if (isActive) {
        setRealtimeStatus(CHAT_REALTIME_STATUS.DISCONNECTED);
        scheduleRetry();
      }
    });

    void startConnection();

    return () => {
      isActive = false;

      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }

      connection.off("MessageCreated");
      connection.off("MessageUpdated");
      connection.off("MessagesRead");

      void chatRealtimeService
        .leaveNegotiation(connection, negotiationId)
        .catch(() => undefined)
        .finally(() => connection.stop().catch(() => undefined));
    };
  }, [
    currentUserId,
    markRoomAsRead,
    negotiationId,
    refreshRoom,
    syncLatestMessages,
    updateMessages,
  ]);

  useEffect(() => {
    if (realtimeStatus === CHAT_REALTIME_STATUS.CONNECTED) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncLatestMessages();
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [realtimeStatus, syncLatestMessages]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncLatestMessages();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [syncLatestMessages]);

  const loading = requestState.requestKey !== requestKey;
  const negotiation = loading ? null : requestState.negotiation;
  const loadError = loading ? "" : requestState.error;
  const statusMeta = getNegotiationStatusMeta(
    negotiation?.negotiationStatus,
  );
  const isOpen =
    negotiation?.negotiationStatus === NEGOTIATION_STATUS.OPEN;
  const negotiationStatus = negotiation?.negotiationStatus;
  const canSendText = [
    NEGOTIATION_STATUS.OPEN,
    NEGOTIATION_STATUS.AGREED,
  ].includes(negotiation?.negotiationStatus);
  const isSeller = currentUserId === String(negotiation?.sellerId || "");
  const messages = sortMessages(negotiation?.messages || []);
  const realtimeStatusMeta =
    REALTIME_STATUS_META[realtimeStatus] ||
    REALTIME_STATUS_META[CHAT_REALTIME_STATUS.DISCONNECTED];

  useEffect(() => {
    if (!negotiationId || !negotiationStatus || negotiationStatus === NEGOTIATION_STATUS.OPEN) {
      return undefined;
    }

    const controller = new AbortController();
    agreementApi
      .getPreview(negotiationId, { signal: controller.signal })
      .then(setAgreementPreview)
      .catch((previewError) => {
        if (!isCanceledRequest(previewError)) setAgreementPreview(null);
      });

    return () => controller.abort();
  }, [negotiationId, negotiationStatus, requestVersion]);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
    shouldScrollToBottomRef.current = false;
  }, [messages]);

  const loadOlderMessages = async () => {
    if (
      !negotiationId ||
      isLoadingOlder ||
      !messagePagination.hasNextPage
    ) {
      return;
    }

    setIsLoadingOlder(true);
    setMessageError("");
    shouldScrollToBottomRef.current = false;

    try {
      const nextPageNumber = messagePagination.pageNumber + 1;
      const history = await messageApi.getHistory(negotiationId, {
        pageNumber: nextPageNumber,
        pageSize: MESSAGE_PAGE_SIZE,
      });

      updateMessages(history.items);
      setMessagePagination({
        pageNumber: history.pageNumber,
        totalPages: history.totalPages,
        totalCount: history.totalCount,
        hasNextPage: history.hasNextPage,
      });
    } catch (requestError) {
      setMessageError(
        getErrorMessage(requestError, "Không thể tải tin nhắn cũ hơn."),
      );
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleMessageSubmit = async (event) => {
    event.preventDefault();

    const normalizedContent = messageText.trim();

    if (!normalizedContent || !canSendText || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setMessageError("");

    try {
      const message = await messageApi.sendText(negotiationId, {
        messageContent: normalizedContent,
        clientMessageId: createClientMessageId(),
      });

      shouldScrollToBottomRef.current = true;
      updateMessages([message]);
      setMessageText("");
    } catch (requestError) {
      setMessageError(
        getErrorMessage(requestError, "Không thể gửi tin nhắn."),
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  const runProposalAction = async (action, messageId) => {
    if (!negotiation || actionBusy) {
      return;
    }

    const message =
      action === "accept"
        ? "Chốt mức giá và số lượng này? Sau khi xác nhận, phiên sẽ chuyển sang trạng thái đã thống nhất."
        : "Bạn có chắc muốn từ chối đề xuất này?";

    if (!window.confirm(message)) {
      return;
    }

    setActionBusy(`${action}:${messageId}`);
    setActionError("");
    setSuccessMessage("");

    try {
      if (action === "accept") {
        await negotiationApi.acceptProposal(negotiationId, messageId);
        setSuccessMessage("Hai bên đã thống nhất mức giá và số lượng này.");
      } else {
        await negotiationApi.rejectProposal(negotiationId, messageId);
        setSuccessMessage("Đã từ chối đề xuất.");
      }

      refreshRoom();
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError, "Không thể xử lý đề xuất."),
      );
    } finally {
      setActionBusy("");
    }
  };

  const handleCounterSubmit = async (event) => {
    event.preventDefault();

    if (!negotiation || actionBusy) {
      return;
    }

    setActionBusy("counter");
    setActionError("");
    setSuccessMessage("");

    try {
      await negotiationApi.counter(negotiationId, counterForm);
      setSuccessMessage("Đã gửi đề xuất mới đến đối tác.");
      refreshRoom();
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError, "Không thể gửi đề xuất mới."),
      );
    } finally {
      setActionBusy("");
    }
  };

  const handleCancel = async () => {
    if (!negotiation || actionBusy) {
      return;
    }

    if (!window.confirm("Bạn có chắc muốn hủy phiên thương lượng này?")) {
      return;
    }

    setActionBusy("cancel");
    setActionError("");
    setSuccessMessage("");

    try {
      await negotiationApi.cancel(negotiationId);
      setSuccessMessage("Đã hủy phiên thương lượng.");
      refreshRoom();
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError, "Không thể hủy phiên thương lượng."),
      );
    } finally {
      setActionBusy("");
    }
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 pb-12 pt-5 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE8E5] pb-3">
        <Link
          to="/thuong-luong/phien"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#4F8588] transition hover:text-[#183F41]"
        >
          <span aria-hidden="true">←</span> Danh sách phiên
        </Link>
        <button
          type="button"
          onClick={refreshRoom}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5] disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">
            refresh
          </span>
          Làm mới phòng
        </button>
      </div>

      {loading && (
        <div role="status" className="rounded-xl border border-[#DCE8E5] bg-white p-12 text-center text-[#68807F] shadow-[0_8px_24px_rgba(24,63,65,0.05)]">
          <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
          <p className="mt-2 text-sm font-semibold">Đang tải phòng thương lượng...</p>
        </div>
      )}

      {loadError && !loading && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={refreshRoom}
            className="mt-4 rounded-lg bg-[#B33A32] px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {negotiation && !loading && !loadError && (
        <div className="overflow-hidden rounded-xl border border-[#D7E7E3] bg-white shadow-[0_8px_24px_rgba(24,63,65,0.07)]">
          <header className="border-b border-[#DCE8E5] bg-white px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              {summary?.otherPartyAvatarUrl ? (
                <img
                  src={summary.otherPartyAvatarUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#4F8588] font-black text-white">
                  {(summary?.otherPartyName || "H").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#68807F]">
                  {isSeller ? "người bán" : "người mua"}
                </p>
                <h1 className="mt-0.5 truncate text-base font-black text-[#183F41]">
                  {summary?.otherPartyName || "Phòng thương lượng"}
                </h1>
                {realtimeStatusMeta.label && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#68807F]">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${realtimeStatusMeta.dotClassName}`}
                    />
                    {realtimeStatusMeta.label}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
              <Link
                to={`/posts/${encodeURIComponent(negotiation.postId)}`}
                className="rounded-lg border border-[#9FBFBA] bg-white px-3 py-2 text-xs font-bold text-[#285E62] transition hover:bg-[#F1F7F5]"
              >
                Xem bài đăng
              </Link>
            </div>
          </header>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div className="min-w-0 bg-[#F4F8F7]">
              {(successMessage || actionError) && (
                <div
                  role={actionError ? "alert" : "status"}
                  className={`m-4 rounded-xl border p-3 text-sm font-semibold ${
                    actionError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  {actionError || successMessage}
                </div>
              )}

              <div className="max-h-[420px] min-h-[300px] space-y-3 overflow-y-auto p-4">
                {messagePagination.hasNextPage && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={loadOlderMessages}
                      disabled={isLoadingOlder}
                      className="rounded-full border border-[#9FBFBA] bg-white px-4 py-2 text-xs font-bold text-[#285E62] shadow-sm transition hover:bg-[#F1F7F5] disabled:opacity-50"
                    >
                      {isLoadingOlder
                        ? "Đang tải..."
                        : "Xem tin nhắn cũ hơn"}
                    </button>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="py-14 text-center text-sm font-semibold text-[#68807F]">
                    Chưa có nội dung trao đổi.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = String(message.senderId) === currentUserId;
                    const canRespond = Boolean(
                      isOpen &&
                        !isMine &&
                        String(message.offerStatus).toLowerCase() === "pending",
                    );

                    return message.messageType === MESSAGE_TYPE.AGREEMENT ? (
                      <AgreementMessage
                        key={message.messageId}
                        message={message}
                        negotiationId={negotiationId}
                        isMine={isMine}
                      />
                    ) : isProposalMessage(message.messageType) ? (
                      <ProposalMessage
                        key={message.messageId}
                        message={message}
                        isMine={isMine}
                        canRespond={canRespond}
                        actionBusy={actionBusy}
                        onAccept={(messageId) =>
                          runProposalAction("accept", messageId)
                        }
                        onReject={(messageId) =>
                          runProposalAction("reject", messageId)
                        }
                      />
                    ) : (
                      <TextMessage
                        key={message.messageId}
                        message={message}
                        isMine={isMine}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>

              <div className="border-t border-[#DCE8E5] bg-white p-3.5">
                {messageError && (
                  <p
                    role="alert"
                    className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    {messageError}
                  </p>
                )}

                {canSendText ? (
                  <form onSubmit={handleMessageSubmit}>
                    <label
                      htmlFor="negotiation-message"
                      className="text-sm font-black text-[#183F41]"
                    >
                      Nhắn tin với đối tác
                    </label>
                    <div className="mt-2 flex items-end gap-2">
                      <textarea
                        id="negotiation-message"
                        rows="1"
                        maxLength="2000"
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        placeholder="Nhập nội dung trao đổi..."
                        className="min-h-11 flex-1 resize-y rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-3.5 py-2.5 text-sm text-[#183436] outline-none transition placeholder:text-[#91A4A1] focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10"
                      />
                      <button
                        type="submit"
                        disabled={
                          isSendingMessage || !messageText.trim()
                        }
                        className="h-11 rounded-lg bg-[#4F8588] px-5 text-sm font-bold text-white transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSendingMessage ? "Đang gửi..." : "Gửi"}
                      </button>
                    </div>
                    <p className="mt-1 text-right text-[11px] text-[#789092]">
                      {messageText.length}/2000
                    </p>
                  </form>
                ) : (
                  <p className="rounded-xl bg-[#F3F8F7] p-4 text-center text-sm font-semibold text-[#68807F]">
                    Phiên hiện ở chế độ chỉ đọc.
                  </p>
                )}

                {isOpen && (
                  <details className="mt-3 border-t border-[#DCE8E5] pt-3">
                    <summary className="cursor-pointer text-sm font-black text-[#285E62]">
                      Gửi phản đề về giá và số lượng
                    </summary>
                    <form
                      onSubmit={handleCounterSubmit}
                      className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_auto] sm:items-end"
                    >
                      <label className="text-xs font-bold text-[#334b50]">
                        Mức giá
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={counterForm.offerPrice}
                          onChange={(event) =>
                            setCounterForm((currentForm) => ({
                              ...currentForm,
                              offerPrice: event.target.value,
                            }))
                          }
                          required
                          className="mt-1.5 w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-3 py-2.5 text-sm text-[#183436] outline-none focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10"
                        />
                      </label>
                      <label className="text-xs font-bold text-[#334b50]">
                        Số lượng
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={counterForm.offerQuantity}
                          onChange={(event) =>
                            setCounterForm((currentForm) => ({
                              ...currentForm,
                              offerQuantity: event.target.value,
                            }))
                          }
                          required
                          className="mt-1.5 w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-3 py-2.5 text-sm text-[#183436] outline-none focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={Boolean(actionBusy)}
                        className="rounded-lg bg-[#B33A32] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5f0d0f] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionBusy === "counter"
                          ? "Đang gửi..."
                          : "Gửi phản đề"}
                      </button>
                    </form>
                  </details>
                )}
              </div>
            </div>

            <aside className="border-t border-[#DCE8E5] bg-white p-4 lg:border-l lg:border-t-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6F9F]">Tổng quan</p>
              <h2 className="mt-1 font-black text-[#183F41]">Thông tin phiên</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-[#68807F]">Giá hiện tại</dt>
                  <dd className="mt-1 text-xl font-black text-[#B33A32]">
                    {formatCurrency(negotiation.currentOfferPrice)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#68807F]">Số lượng hiện tại</dt>
                  <dd className="mt-1 font-bold text-[#183F41]">
                    {negotiation.currentOfferQuantity ?? "—"}
                  </dd>
                </div>
                {negotiation.finalPrice !== null && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                    <dt className="text-xs font-semibold text-green-700">Giá đã thống nhất</dt>
                    <dd className="mt-1 text-lg font-black text-green-800">
                      {formatCurrency(negotiation.finalPrice)}
                    </dd>
                    <dd className="mt-1 text-xs font-semibold text-green-700">
                      Số lượng: {negotiation.finalQuantity}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold text-[#68807F]">Bắt đầu lúc</dt>
                  <dd className="mt-1 font-medium text-[#183F41]">
                    {formatDate(negotiation.createdAt)}
                  </dd>
                </div>
              </dl>

              {negotiation.negotiationStatus === NEGOTIATION_STATUS.AGREED && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm leading-5 text-green-800">
                  <p className="font-black">Hai bên đã thống nhất giá và số lượng.</p>
                  {agreementPreview?.hasAgreement ? (
                    <>
                      <p className="mt-1">Thỏa thuận đã được tạo. Hãy kiểm tra lịch hẹn, giao nhận và trạng thái xác nhận.</p>
                      <Link
                        to={`/thuong-luong/${negotiationId}/thoa-thuan`}
                        className="mt-3 inline-flex rounded-lg bg-green-700 px-4 py-2 text-xs font-black text-white hover:bg-green-800"
                      >
                        Xem thỏa thuận
                      </Link>
                    </>
                  ) : agreementPreview?.canCreate ? (
                    <>
                      <p className="mt-1">Bạn là người bán. Hãy tạo Agreement Form theo nội dung hai bên đã trao đổi.</p>
                      <Link
                        to={`/thuong-luong/${negotiationId}/thoa-thuan`}
                        className="mt-3 inline-flex rounded-lg bg-green-700 px-4 py-2 text-xs font-black text-white hover:bg-green-800"
                      >
                        Tạo thỏa thuận
                      </Link>
                    </>
                  ) : (
                    <p className="mt-1">Đang chờ người bán tạo và gửi Agreement Form.</p>
                  )}
                </div>
              )}

              {isOpen && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={Boolean(actionBusy)}
                  className="mt-6 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {actionBusy === "cancel" ? "Đang hủy..." : "Hủy phiên thương lượng"}
                </button>
              )}
            </aside>
          </div>
        </div>
      )}
    </section>
  );
};

export default NegotiationRoomPage;
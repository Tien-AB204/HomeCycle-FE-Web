import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  getNegotiationStatusMeta,
  getProposalStatusMeta,
  isProposalMessage,
  NEGOTIATION_STATUS,
} from "../../constants/negotiations";
import { useAuth } from "../../hooks/useAuth";
import negotiationApi from "../../services/apis/negotiationApi";
import { getUserId } from "../../utils/authUtils";

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
      className={`w-full max-w-md rounded-2xl border p-4 shadow-sm ${
        isMine
          ? "ml-auto border-[#2B5659]/30 bg-[#edf5f5]"
          : "mr-auto border-[#BAC2C1]/50 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
            {message.messageType === "Offer"
              ? "Đề nghị ban đầu"
              : "Đề xuất mới"}
          </p>
          <p className="mt-1 text-xl font-black text-[#7A1012]">
            {formatCurrency(message.offerPrice)}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-white/70 p-2.5">
          <p className="text-xs text-[#547B7D]">Số lượng</p>
          <p className="mt-1 font-bold text-[#172830]">{message.offerQuantity}</p>
        </div>
        <div className="rounded-lg bg-white/70 p-2.5">
          <p className="text-xs text-[#547B7D]">Giá bài đăng</p>
          <p className="mt-1 font-bold text-[#172830]">
            {formatCurrency(message.basePriceSnapshot)}
          </p>
        </div>
      </div>

      {message.messageContent && (
        <p className="mt-3 text-sm leading-6 text-[#334b50]">
          {message.messageContent}
        </p>
      )}

      {canRespond && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#BAC2C1]/30 pt-3">
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

      <p className="mt-3 text-right text-[11px] text-[#789092]">
        {isMine ? "Bạn gửi" : "Đối tác gửi"} · {formatDate(message.createdAt)}
      </p>
    </article>
  );
};

const TextMessage = ({ message, isMine }) => {
  return (
    <article
      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
        isMine
          ? "ml-auto bg-[#2B5659] text-white"
          : "mr-auto border border-[#BAC2C1]/40 bg-white text-[#172830]"
      }`}
    >
      <p>{message.messageContent || "Tin nhắn"}</p>
      {message.mediaUrl && (
        <a
          href={message.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className={`mt-2 block break-all text-xs underline ${
            isMine ? "text-[#C1EAEC]" : "text-[#2B5659]"
          }`}
        >
          Xem tệp đính kèm
        </a>
      )}
      <p className={`mt-1 text-right text-[10px] ${isMine ? "text-white/65" : "text-[#789092]"}`}>
        {formatDate(message.createdAt)}
      </p>
    </article>
  );
};

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
  const [counterForm, setCounterForm] = useState({
    offerPrice: "",
    offerQuantity: "1",
  });

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    negotiationApi
      .getById(negotiationId, { signal: controller.signal })
      .then((negotiation) => {
        if (!isActive) {
          return;
        }

        setRequestState({ requestKey, negotiation, error: "" });
        setCounterForm({
          offerPrice: String(negotiation.currentOfferPrice ?? ""),
          offerQuantity: String(negotiation.currentOfferQuantity ?? 1),
        });
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
  }, [negotiationId, requestKey]);

  const loading = requestState.requestKey !== requestKey;
  const negotiation = loading ? null : requestState.negotiation;
  const loadError = loading ? "" : requestState.error;
  const statusMeta = getNegotiationStatusMeta(
    negotiation?.negotiationStatus,
  );
  const isOpen =
    negotiation?.negotiationStatus === NEGOTIATION_STATUS.OPEN;
  const isSeller = currentUserId === String(negotiation?.sellerId || "");
  const messages = [...(negotiation?.messages || [])].sort(
    (firstMessage, secondMessage) => {
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

      return 0;
    },
  );

  const refreshRoom = () => {
    setRequestVersion((currentVersion) => currentVersion + 1);
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
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/thuong-luong/phien"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#2B5659] hover:text-[#172830]"
        >
          <span aria-hidden="true">←</span> Danh sách phiên
        </Link>
        <button
          type="button"
          onClick={refreshRoom}
          disabled={loading}
          className="rounded-lg border border-[#BAC2C1] bg-white px-4 py-2 text-sm font-bold text-[#172830] disabled:opacity-50"
        >
          Làm mới phòng
        </button>
      </div>

      {loading && (
        <div role="status" className="rounded-2xl border border-[#BAC2C1]/40 bg-white p-16 text-center text-[#547B7D] shadow-sm">
          <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
          <p className="mt-2 text-sm font-semibold">Đang tải phòng thương lượng...</p>
        </div>
      )}

      {loadError && !loading && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <p className="font-semibold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={refreshRoom}
            className="mt-4 rounded-lg bg-[#7A1012] px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {negotiation && !loading && !loadError && (
        <div className="overflow-hidden rounded-2xl border border-[#BAC2C1]/40 bg-white shadow-sm">
          <header className="bg-[#172830] px-5 py-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="flex min-w-0 items-center gap-3">
              {summary?.otherPartyAvatarUrl ? (
                <img
                  src={summary.otherPartyAvatarUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#547B7D] text-lg font-black">
                  {(summary?.otherPartyName || "H").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C1EAEC]">
                  {isSeller ? "Bạn là người bán" : "Bạn là người mua"}
                </p>
                <h1 className="mt-1 truncate text-xl font-black">
                  {summary?.otherPartyName || "Phòng thương lượng"}
                </h1>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
              <Link
                to={`/posts/${encodeURIComponent(negotiation.postId)}`}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                Xem bài đăng
              </Link>
            </div>
          </header>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 bg-[#f4f7f7]">
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

              <div className="max-h-[620px] min-h-[420px] space-y-4 overflow-y-auto p-4 sm:p-6">
                {messages.length === 0 ? (
                  <div className="py-20 text-center text-sm font-semibold text-[#547B7D]">
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

                    return isProposalMessage(message.messageType) ? (
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
              </div>

              <div className="border-t border-[#BAC2C1]/40 bg-white p-4 sm:p-5">
                {isOpen ? (
                  <form onSubmit={handleCounterSubmit}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-[#172830]">Gửi đề xuất mới</h2>
                        <p className="mt-1 text-xs text-[#547B7D]">
                          Tin nhắn văn bản sẽ được bổ sung sau khi xác nhận contract Messages.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_auto] sm:items-end">
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
                          className="mt-1.5 w-full rounded-lg border border-[#BAC2C1] px-3 py-2.5 text-sm text-[#172830] outline-none focus:border-[#2B5659]"
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
                          className="mt-1.5 w-full rounded-lg border border-[#BAC2C1] px-3 py-2.5 text-sm text-[#172830] outline-none focus:border-[#2B5659]"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={Boolean(actionBusy)}
                        className="rounded-lg bg-[#2B5659] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#172830] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionBusy === "counter" ? "Đang gửi..." : "Gửi đề xuất"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="rounded-xl bg-[#f4f7f7] p-4 text-center text-sm font-semibold text-[#547B7D]">
                    Phiên không còn ở trạng thái mở nên không thể gửi đề xuất mới.
                  </p>
                )}
              </div>
            </div>

            <aside className="border-t border-[#BAC2C1]/40 bg-white p-5 lg:border-l lg:border-t-0">
              <h2 className="font-black text-[#172830]">Thông tin phiên</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-[#547B7D]">Giá hiện tại</dt>
                  <dd className="mt-1 text-lg font-black text-[#7A1012]">
                    {formatCurrency(negotiation.currentOfferPrice)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#547B7D]">Số lượng hiện tại</dt>
                  <dd className="mt-1 font-bold text-[#172830]">
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
                  <dt className="text-xs font-semibold text-[#547B7D]">Bắt đầu lúc</dt>
                  <dd className="mt-1 font-medium text-[#172830]">
                    {formatDate(negotiation.createdAt)}
                  </dd>
                </div>
              </dl>

              {negotiation.negotiationStatus === NEGOTIATION_STATUS.AGREED && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
                  Hai bên đã thống nhất đề xuất. Agreement Form sẽ được bổ sung sau khi xác nhận đầy đủ contract.
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

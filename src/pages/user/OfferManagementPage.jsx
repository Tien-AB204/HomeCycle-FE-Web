import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { getOfferStatusMeta } from "../../constants/offers";
import ConfirmActionModal from "../../components/shared/ConfirmActionModal";
import OfferDetailModal from "../../features/offers/OfferDetailModal";
import OfferFormModal from "../../features/offers/OfferFormModal";
import offerApi from "../../services/apis/offerApi";

const PAGE_SIZE = 10;

const isCanceledRequest = (error) => {
  return (
    error?.name === "CanceledError" ||
    error?.code === "ERR_CANCELED"
  );
};

const getErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  return (
    responseData?.error?.message ||
    responseData?.message ||
    error?.message ||
    fallbackMessage
  );
};

const formatCurrency = (value) => {
  const amount = Number(value);

  return Number.isFinite(amount)
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

const OfferManagementPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "received"
      ? "received"
      : "sent";
  const [pageNumber, setPageNumber] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [detailVersion, setDetailVersion] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [editingOffer, setEditingOffer] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [counteringOffer, setCounteringOffer] = useState(null);
  const [counterSubmitting, setCounterSubmitting] = useState(false);
  const [counterError, setCounterError] = useState("");
  const listRequestKey = `${activeTab}:${pageNumber}:${requestVersion}`;
  const detailRequestKey = `${selectedOfferId}:${detailVersion}`;
  const [listState, setListState] = useState({
    requestKey: "",
    result: null,
    error: "",
  });
  const [detailState, setDetailState] = useState({
    requestKey: "",
    offer: null,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const request =
      activeTab === "received"
        ? offerApi.getReceived
        : offerApi.getSent;

    request({
      pageNumber,
      pageSize: PAGE_SIZE,
      signal: controller.signal,
    })
      .then((result) => {
        if (!isActive) {
          return;
        }

        setListState({
          requestKey: listRequestKey,
          result,
          error: "",
        });
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setListState({
          requestKey: listRequestKey,
          result: null,
          error: getErrorMessage(
            requestError,
            "Không thể tải danh sách đề nghị.",
          ),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [activeTab, listRequestKey, pageNumber]);

  useEffect(() => {
    if (!selectedOfferId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    offerApi
      .getById(selectedOfferId, {
        signal: controller.signal,
      })
      .then((offer) => {
        if (!isActive) {
          return;
        }

        setDetailState({
          requestKey: detailRequestKey,
          offer,
          error: "",
        });
      })
      .catch((requestError) => {
        if (
          !isActive ||
          isCanceledRequest(requestError)
        ) {
          return;
        }

        setDetailState({
          requestKey: detailRequestKey,
          offer: null,
          error: getErrorMessage(
            requestError,
            "Không thể tải chi tiết đề nghị.",
          ),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [detailRequestKey, selectedOfferId]);

  const isLoading = listState.requestKey !== listRequestKey;
  const result =
    listState.requestKey === listRequestKey
      ? listState.result
      : null;
  const listError =
    listState.requestKey === listRequestKey
      ? listState.error
      : "";
  const offers = Array.isArray(result?.items)
    ? result.items
    : [];
  const detailLoading = Boolean(
    selectedOfferId &&
      detailState.requestKey !== detailRequestKey,
  );
  const selectedOffer =
    detailState.requestKey === detailRequestKey
      ? detailState.offer
      : null;
  const detailError =
    detailState.requestKey === detailRequestKey
      ? detailState.error
      : "";

  const changeTab = (nextTab) => {
    setSearchParams({ tab: nextTab });
    setPageNumber(1);
    setSelectedOfferId("");
    setSuccessMessage("");
  };

  const refreshList = () => {
    setRequestVersion(
      (currentVersion) => currentVersion + 1,
    );
  };

  const runOfferAction = (action) => {
    if (!selectedOffer || actionBusy) {
      return;
    }

    setPendingAction(action);
  };

  const confirmOfferAction = async () => {
    if (!selectedOffer || !pendingAction || actionBusy) return;

    setActionBusy(true);

    try {
      let message = "";

      if (pendingAction === "cancel") {
        await offerApi.cancel(selectedOffer.offerId);
        message = "Đã hủy đề nghị thành công.";
      } else if (pendingAction === "reject") {
        await offerApi.reject(selectedOffer.offerId);
        message = "Đã từ chối đề nghị thành công.";
      } else {
        await offerApi.accept(selectedOffer.offerId);
        message = "Đã đồng ý mức giá và mở phiên thương lượng.";
      }

      setSuccessMessage(message);
      setPendingAction("");
      setDetailVersion(
        (currentVersion) => currentVersion + 1,
      );
      refreshList();
    } catch (requestError) {
      setDetailState({
        requestKey: detailRequestKey,
        offer: selectedOffer,
        error: getErrorMessage(
          requestError,
          "Không thể xử lý đề nghị.",
        ),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const openEditModal = () => {
    setEditingOffer(selectedOffer);
    setEditError("");
    setSelectedOfferId("");
  };

  const openCounterModal = () => {
    setCounteringOffer(selectedOffer);
    setCounterError("");
    setSelectedOfferId("");
  };

  const handleCounterOffer = async (terms) => {
    if (!counteringOffer || counterSubmitting) {
      return;
    }

    setCounterSubmitting(true);
    setCounterError("");

    try {
      const result = await offerApi.counter(counteringOffer.offerId, terms);
      setCounteringOffer(null);
      refreshList();
      navigate(
        `/thuong-luong/${encodeURIComponent(result.negotiationId)}`,
        {
          state: {
            negotiationSummary: {
              negotiationId: result.negotiationId,
              offerId: counteringOffer.offerId,
              postId: counteringOffer.postId,
              otherPartyId: counteringOffer.sender?.userId,
              otherPartyName: counteringOffer.sender?.displayName,
              otherPartyAvatarUrl: counteringOffer.sender?.avatarUrl,
              currentOfferPrice: result.currentOfferPrice,
              currentOfferQuantity: result.currentOfferQuantity,
              negotiationStatus: "Open",
            },
          },
        },
      );
    } catch (requestError) {
      setCounterError(
        getErrorMessage(requestError, "Không thể gửi phản đề."),
      );
    } finally {
      setCounterSubmitting(false);
    }
  };

  const handleUpdateOffer = async (terms) => {
    if (!editingOffer || editSubmitting) {
      return;
    }

    setEditSubmitting(true);
    setEditError("");

    try {
      await offerApi.update(editingOffer.offerId, terms);
      setEditingOffer(null);
      setSuccessMessage("Đã cập nhật đề nghị thành công.");
      refreshList();
    } catch (requestError) {
      setEditError(
        getErrorMessage(
          requestError,
          "Không thể cập nhật đề nghị.",
        ),
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl px-4 pb-14 pt-7 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-[#DCE8E5] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6F9F]">
            Trung tâm giao dịch
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#183F41] sm:text-3xl">
            Đề nghị giá
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#68807F]">
            Quản lý đề nghị đã gửi và phản hồi đề nghị nhận được. Các cuộc trò chuyện đang diễn ra được đặt riêng tại Phòng thương lượng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#EAF3F8] px-3 py-1.5 text-xs font-black text-[#2F6F9F]">
            {result?.totalCount ?? 0} đề nghị
          </span>
        </div>
      </header>

      <div className="mt-4 rounded-xl border border-[#DCE8E5] bg-white p-1.5 shadow-[0_8px_24px_rgba(24,63,65,0.04)]">
        <div
          role="tablist"
          aria-label="Phân loại đề nghị giá"
          className="grid grid-cols-2 gap-1.5 sm:max-w-lg"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sent"}
            onClick={() => changeTab("sent")}
            className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${
              activeTab === "sent"
                ? "bg-[#EAF3F3] text-[#285E62]"
                : "text-[#68807F] hover:bg-[#F6F9F8] hover:text-[#183F41]"
            }`}
          >
            Đề nghị đã gửi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "received"}
            onClick={() => changeTab("received")}
            className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${
              activeTab === "received"
                ? "bg-[#EAF3F3] text-[#285E62]"
                : "text-[#68807F] hover:bg-[#F6F9F8] hover:text-[#183F41]"
            }`}
          >
            Đề nghị đã nhận
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700"
        >
          <p>{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Đóng thông báo"
            className="text-lg font-black"
          >
            ×
          </button>
        </div>
      )}

      {isLoading && (
        <div role="status" className="mt-5 rounded-2xl border border-[#DCE8E5] bg-white p-12 text-center text-[#68807F] shadow-[0_10px_30px_rgba(24,63,65,0.05)]">
          <span className="material-symbols-outlined animate-spin text-3xl">
            refresh
          </span>
          <p className="mt-2 text-sm font-semibold">
            Đang tải danh sách đề nghị...
          </p>
        </div>
      )}

      {listError && !isLoading && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">{listError}</p>
          <button
            type="button"
            onClick={refreshList}
            className="mt-4 rounded-lg bg-[#B33A32] px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !listError && offers.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-[#9FBFBA] bg-white px-6 py-14 text-center shadow-[0_10px_30px_rgba(24,63,65,0.05)]">
          <span className="material-symbols-outlined text-5xl text-[#4F8588]" aria-hidden="true">handshake</span>
          <h2 className="mt-4 text-lg font-bold text-[#183F41]">
            {activeTab === "sent"
              ? "Bạn chưa gửi đề nghị nào"
              : "Bạn chưa nhận được đề nghị nào"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#68807F]">
            {activeTab === "sent"
              ? "Khám phá các tin đăng bán và gửi mức giá phù hợp cho người bán."
              : "Các đề nghị từ người quan tâm đến bài đăng của bạn sẽ xuất hiện tại đây."}
          </p>
          {activeTab === "sent" && (
            <Link
              to="/tin-dang-ban"
              className="mt-5 inline-flex rounded-xl bg-[#4F8588] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#356A70]"
            >
              Khám phá tin đăng bán
            </Link>
          )}
        </div>
      )}

      {!isLoading && !listError && offers.length > 0 && (
        <>
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#DCE8E5] bg-white shadow-[0_10px_30px_rgba(24,63,65,0.05)]">
            <div className="hidden grid-cols-[minmax(190px,1.4fr)_150px_80px_130px_155px_120px] items-center gap-4 bg-[#F3F7F6] px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#68807F] md:grid">
              <span>Đối tác</span>
              <span>Giá đề nghị</span>
              <span>Số lượng</span>
              <span>Trạng thái</span>
              <span>Thời gian</span>
              <span className="sr-only">Thao tác</span>
            </div>
            <div className="divide-y divide-[#E3ECE9]">
            {offers.map((offer) => {
              const statusMeta = getOfferStatusMeta(offer.offerStatus);
              const otherPartyName =
                activeTab === "sent"
                  ? offer.receiverName
                  : offer.senderName;
              const otherPartyAvatar =
                activeTab === "sent"
                  ? offer.receiverAvatarUrl
                  : offer.senderAvatarUrl;

              return (
                <article
                  key={offer.offerId}
                  className="grid gap-4 px-5 py-4 transition hover:bg-[#F8FBFA] md:grid-cols-[minmax(190px,1.4fr)_150px_80px_130px_155px_120px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                      {otherPartyAvatar ? (
                        <img
                          src={otherPartyAvatar}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F8588] font-black text-white">
                          {otherPartyName?.charAt(0).toUpperCase() || "H"}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#68807F]">
                          {activeTab === "sent" ? "Gửi đến" : "Nhận từ"}
                        </p>
                        <p className="truncate font-bold text-[#183F41]">
                          {otherPartyName}
                        </p>
                      </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#789092] md:hidden">Giá đề nghị</p>
                    <p className="mt-0.5 text-base font-black text-[#B33A32]">{formatCurrency(offer.offerPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#789092] md:hidden">Số lượng</p>
                    <p className="mt-0.5 font-black text-[#183F41]">{offer.offerQuantity}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#789092] md:hidden">Thời gian</p>
                    <p className="mt-0.5 text-xs font-medium text-[#68807F]">{formatDate(offer.createdAt)}</p>
                  </div>
                  <div className="flex md:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOfferId(offer.offerId)}
                      className="rounded-lg border border-[#4F8588] bg-white px-4 py-2 text-sm font-bold text-[#285E62] transition hover:bg-[#4F8588] hover:text-white"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </article>
              );
            })}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#DCE8E5] bg-white p-4 sm:flex-row">
            <p className="text-sm font-medium text-[#68807F]">
              Trang {result?.pageNumber ?? pageNumber} / {Math.max(result?.totalPages ?? 1, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage - 1)}
                disabled={!result?.hasPreviousPage}
                className="rounded-xl border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage + 1)}
                disabled={!result?.hasNextPage}
                className="rounded-xl border border-[#9FBFBA] bg-white px-4 py-2 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </>
      )}

      {selectedOfferId && (
        <OfferDetailModal
          offer={selectedOffer}
          loading={detailLoading}
          error={detailError}
          actionBusy={actionBusy}
          onClose={() => setSelectedOfferId("")}
          onRetry={() =>
            setDetailVersion(
              (currentVersion) => currentVersion + 1,
            )
          }
          onEdit={openEditModal}
          onCancelOffer={() => runOfferAction("cancel")}
          onCounter={openCounterModal}
          onReject={() => runOfferAction("reject")}
          onAccept={() => runOfferAction("accept")}
        />
      )}

      {editingOffer && (
        <OfferFormModal
          mode="edit"
          offer={editingOffer}
          submitting={editSubmitting}
          serverError={editError}
          onClose={() => {
            if (!editSubmitting) {
              setEditingOffer(null);
              setEditError("");
            }
          }}
          onSubmit={handleUpdateOffer}
        />
      )}

      {counteringOffer && (
        <OfferFormModal
          mode="counter"
          offer={counteringOffer}
          submitting={counterSubmitting}
          serverError={counterError}
          onClose={() => {
            if (!counterSubmitting) {
              setCounteringOffer(null);
              setCounterError("");
            }
          }}
          onSubmit={handleCounterOffer}
        />
      )}

      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={
          pendingAction === "cancel"
            ? "Hủy đề nghị?"
            : pendingAction === "reject"
              ? "Từ chối đề nghị?"
              : "Chấp nhận đề nghị?"
        }
        description={
          pendingAction === "cancel"
            ? "Đề nghị bạn đã gửi sẽ được hủy và không thể tiếp tục xử lý."
            : pendingAction === "reject"
              ? "Đề nghị này sẽ bị từ chối. Người gửi sẽ nhìn thấy trạng thái mới."
              : "Mức giá và số lượng này sẽ được chấp nhận, sau đó hai bên có thể tiếp tục trong phòng thương lượng."
        }
        confirmLabel={
          pendingAction === "cancel"
            ? "Hủy đề nghị"
            : pendingAction === "reject"
              ? "Từ chối"
              : "Chấp nhận"
        }
        tone={pendingAction === "accept" ? "success" : "danger"}
        icon={
          pendingAction === "cancel"
            ? "cancel"
            : pendingAction === "reject"
              ? "thumb_down"
              : "handshake"
        }
        busy={actionBusy}
        onCancel={() => {
          if (!actionBusy) setPendingAction("");
        }}
        onConfirm={() => void confirmOfferAction()}
      />
    </section>
  );
};

export default OfferManagementPage;
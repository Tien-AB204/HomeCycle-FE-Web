import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";
import { getOfferStatusMeta } from "../../constants/offers";
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

const getShortId = (value) => {
  const normalizedValue = String(value || "");

  return normalizedValue
    ? `${normalizedValue.slice(0, 8)}…`
    : "—";
};

const OfferManagementPage = () => {
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
  const [editingOffer, setEditingOffer] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
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

  const runOfferAction = async (action) => {
    if (!selectedOffer || actionBusy) {
      return;
    }

    const confirmationMessage = {
      cancel: "Bạn có chắc muốn hủy đề nghị này?",
      reject: "Bạn có chắc muốn từ chối đề nghị này?",
      accept:
        "Chấp nhận đề nghị này và mở phiên thương lượng?",
    }[action];

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setActionBusy(true);

    try {
      let message = "";

      if (action === "cancel") {
        await offerApi.cancel(selectedOffer.offerId);
        message = "Đã hủy đề nghị thành công.";
      } else if (action === "reject") {
        await offerApi.reject(selectedOffer.offerId);
        message = "Đã từ chối đề nghị thành công.";
      } else {
        const acceptedOffer = await offerApi.accept(
          selectedOffer.offerId,
        );
        message = `Đã chấp nhận đề nghị. Mã phiên thương lượng: ${acceptedOffer.negotiationId}`;
      }

      setSuccessMessage(message);
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
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-[#BAC2C1]/40 bg-white shadow-sm">
        <div className="bg-[#172830] px-6 py-6 text-white sm:flex sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C1EAEC]">
              Trung tâm giao dịch
            </p>
            <h1 className="mt-2 text-2xl font-black">
              Yêu cầu thương lượng
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#B7C9D4]">
              Theo dõi các đề nghị giá đã gửi, phản hồi đề nghị nhận được và mở phiên thương lượng khi hai bên thống nhất.
            </p>
          </div>
          <div className="mt-4 rounded-xl bg-white/10 px-5 py-3 sm:mt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C1EAEC]">
              Tổng trong mục
            </p>
            <p className="mt-1 text-2xl font-black">
              {result?.totalCount ?? 0}
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Danh sách đề nghị"
          className="grid grid-cols-2 gap-2 bg-[#f8fafa] p-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sent"}
            onClick={() => changeTab("sent")}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              activeTab === "sent"
                ? "bg-[#2B5659] text-white shadow-sm"
                : "text-[#547B7D] hover:bg-[#BAC2C1]/20"
            }`}
          >
            Đề nghị đã gửi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "received"}
            onClick={() => changeTab("received")}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              activeTab === "received"
                ? "bg-[#2B5659] text-white shadow-sm"
                : "text-[#547B7D] hover:bg-[#BAC2C1]/20"
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
        <div role="status" className="mt-5 rounded-xl border border-[#BAC2C1]/40 bg-white p-12 text-center text-[#547B7D] shadow-sm">
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
            className="mt-4 rounded-lg bg-[#7A1012] px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !listError && offers.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-[#BAC2C1] bg-white px-6 py-14 text-center shadow-sm">
          <span className="text-5xl" aria-hidden="true">🤝</span>
          <h2 className="mt-4 text-lg font-bold text-[#172830]">
            {activeTab === "sent"
              ? "Bạn chưa gửi đề nghị nào"
              : "Bạn chưa nhận được đề nghị nào"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#547B7D]">
            {activeTab === "sent"
              ? "Khám phá các tin đăng bán và gửi mức giá phù hợp cho người bán."
              : "Các đề nghị từ người quan tâm đến bài đăng của bạn sẽ xuất hiện tại đây."}
          </p>
          {activeTab === "sent" && (
            <Link
              to="/tin-dang-ban"
              className="mt-5 inline-flex rounded-lg bg-[#2B5659] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#172830]"
            >
              Khám phá tin đăng bán
            </Link>
          )}
        </div>
      )}

      {!isLoading && !listError && offers.length > 0 && (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
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
                  className="rounded-xl border border-[#BAC2C1]/40 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {otherPartyAvatar ? (
                        <img
                          src={otherPartyAvatar}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2B5659] font-black text-white">
                          {otherPartyName?.charAt(0).toUpperCase() || "H"}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#547B7D]">
                          {activeTab === "sent" ? "Gửi đến" : "Nhận từ"}
                        </p>
                        <p className="truncate font-bold text-[#172830]">
                          {otherPartyName}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#7A1012]/8 p-3">
                      <p className="text-xs font-semibold text-[#7A1012]">Giá đề nghị</p>
                      <p className="mt-1 text-lg font-black text-[#7A1012]">
                        {formatCurrency(offer.offerPrice)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#f5f8f8] p-3">
                      <p className="text-xs font-semibold text-[#547B7D]">Số lượng</p>
                      <p className="mt-1 text-lg font-black text-[#172830]">
                        {offer.offerQuantity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#BAC2C1]/25 pt-4">
                    <div className="text-xs text-[#547B7D]">
                      <p title={offer.postId}>Bài đăng {getShortId(offer.postId)}</p>
                      <p className="mt-1">{formatDate(offer.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOfferId(offer.offerId)}
                      className="rounded-lg bg-[#2B5659] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#172830]"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-[#BAC2C1]/35 bg-white p-4 sm:flex-row">
            <p className="text-sm font-medium text-[#547B7D]">
              Trang {result?.pageNumber ?? pageNumber} / {Math.max(result?.totalPages ?? 1, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage - 1)}
                disabled={!result?.hasPreviousPage}
                className="rounded-lg border border-[#BAC2C1] bg-white px-4 py-2 text-sm font-bold text-[#172830] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage + 1)}
                disabled={!result?.hasNextPage}
                className="rounded-lg border border-[#BAC2C1] bg-white px-4 py-2 text-sm font-bold text-[#172830] disabled:cursor-not-allowed disabled:opacity-40"
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
    </section>
  );
};

export default OfferManagementPage;

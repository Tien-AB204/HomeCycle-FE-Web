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
import { ROLES } from "../../constants/roles";
import Avatar from "../../components/shared/Avatar";
import ConfirmActionModal from "../../components/shared/ConfirmActionModal";
import StaleDataWarningModal from "../../components/shared/StaleDataWarningModal";
import OfferDetailModal from "../../features/offers/OfferDetailModal";
import OfferFormModal from "../../features/offers/OfferFormModal";
import BuyPostOfferMatchPanel from "../../features/offers/BuyPostOfferMatchPanel";
import offerApi from "../../services/apis/offerApi";
import postApi from "../../services/apis/postApi";
import { useAuth } from "../../hooks/useAuth";
import { useChatRealtime } from "../../hooks/useChatRealtime";
import { normalizeRole } from "../../utils/authUtils";
import {
  getOfferChangedFields,
  getPostChangedFields,
  isConcurrencyConflict,
  OFFER_CHANGED_WARNING,
  POST_CHANGED_WARNING,
  VERIFICATION_FAILED_WARNING,
} from "../../utils/transactionFreshnessUtils";

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
  const { user } = useAuth();
  const normalizedRole = normalizeRole(user?.role);
  const isPersonal = normalizedRole === ROLES.PERSONAL;

  const {
    connection,
    reconnectVersion,
  } = useChatRealtime();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "received"
      ? "received"
      : "sent";

  const scopedBuyPostId =
    String(
      searchParams.get("buyPostId") || "",
    ).trim();
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
  const [staleWarning, setStaleWarning] = useState(null);
  const listRequestKey =
    `${activeTab}:${scopedBuyPostId}:${pageNumber}:${requestVersion}:${reconnectVersion}`;

  const detailRequestKey =
    `${selectedOfferId}:${detailVersion}:${reconnectVersion}`;
  const [listState, setListState] = useState({
    requestKey: "",
    result: null,
    error: "",
  });
  const [detailState, setDetailState] = useState({
    requestKey: "",
    offer: null,
    post: null,
    error: "",
  });

  const [
    cardMatchState,
    setCardMatchState,
  ] = useState({
    requestKey: "",
    items: {},
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
      buyPostId:
        scopedBuyPostId || undefined,
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
  }, [
    activeTab,
    listRequestKey,
    pageNumber,
    scopedBuyPostId,
  ]);

  useEffect(() => {
    if (!selectedOfferId) {
      return undefined;
    }

    const controller = new AbortController();
    let isActive = true;

    offerApi
      .getById(selectedOfferId, { signal: controller.signal })
      .then(async (offer) => ({
        offer,
        post: offer.postId
          ? await postApi.getById(offer.postId, { signal: controller.signal })
          : null,
      }))
      .then(({ offer, post }) => {
        if (!isActive) {
          return;
        }

        setDetailState({
          requestKey: detailRequestKey,
          offer,
          post,
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
          post: null,
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
  const selectedPost =
    detailState.requestKey === detailRequestKey
      ? detailState.post
      : null;
  const detailError =
    detailState.requestKey === detailRequestKey
      ? detailState.error
      : "";

  const cardMatchOfferKey = offers
    .filter((offer) => Boolean(offer.buyPostId))
    .map(
      (offer) =>
        `${offer.offerId}:${offer.version ?? "na"}:${offer.buyPostId}`,
    )
    .join("|");

  const cardMatchRequestKey =
    `${listRequestKey}:${cardMatchOfferKey}`;

  useEffect(() => {
    const visibleBuyPostOffers =
      Array.isArray(result?.items)
        ? result.items.filter(
            (offer) =>
              Boolean(offer.buyPostId),
          )
        : [];

    if (
      visibleBuyPostOffers.length === 0
    ) {
      return undefined;
    }

    const controller =
      new AbortController();

    let isActive = true;

    Promise.all(
      visibleBuyPostOffers.map(
        async (offer) => {
          try {
            const detail =
              await offerApi.getById(
                offer.offerId,
                {
                  signal:
                    controller.signal,
                },
              );

            return [
              offer.offerId,
              {
                detail,
                error: false,
                offerVersion:
                  detail.version ??
                  offer.version ??
                  null,
                buyPostUpdatedAt:
                  detail.buyPost
                    ?.updatedAt || "",
                sellPostUpdatedAt:
                  detail.sellPost
                    ?.updatedAt || "",
              },
            ];
          } catch (requestError) {
            if (
              isCanceledRequest(
                requestError,
              )
            ) {
              return null;
            }

            return [
              offer.offerId,
              {
                detail: null,
                error: true,
                offerVersion:
                  offer.version ??
                  null,
                buyPostUpdatedAt: "",
                sellPostUpdatedAt: "",
              },
            ];
          }
        },
      ),
    ).then((entries) => {
      if (!isActive) {
        return;
      }

      setCardMatchState({
        requestKey:
          cardMatchRequestKey,
        items: Object.fromEntries(
          entries.filter(Boolean),
        ),
      });
    });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    cardMatchRequestKey,
    result,
  ]);

  useEffect(() => {
    if (!connection) {
      return undefined;
    }

    const normalizeRealtimeId = (
      value,
    ) =>
      String(value ?? "").trim();

    const isRelevantToScope = (
      payload,
    ) => {
      if (!scopedBuyPostId) {
        return true;
      }

      const eventBuyPostId =
        normalizeRealtimeId(
          payload?.buyPostId ??
            payload?.BuyPostId,
        );

      return (
        eventBuyPostId ===
        scopedBuyPostId
      );
    };

    const handleOfferChanged = (
      payload,
    ) => {
      if (
        !isRelevantToScope(payload)
      ) {
        return;
      }

      setRequestVersion(
        (currentVersion) =>
          currentVersion + 1,
      );

      const eventOfferId =
        normalizeRealtimeId(
          payload?.offerId ??
            payload?.OfferId,
        );

      if (
        selectedOfferId &&
        eventOfferId ===
          selectedOfferId
      ) {
        setDetailVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      }
    };

    connection.on(
      "OfferCreated",
      handleOfferChanged,
    );

    connection.on(
      "OfferUpdated",
      handleOfferChanged,
    );

    return () => {
      connection.off(
        "OfferCreated",
        handleOfferChanged,
      );

      connection.off(
        "OfferUpdated",
        handleOfferChanged,
      );
    };
  }, [
    connection,
    scopedBuyPostId,
    selectedOfferId,
  ]);

  const changeTab = (nextTab) => {
    const nextParams = {
      tab: nextTab,
    };

    if (scopedBuyPostId) {
      nextParams.buyPostId =
        scopedBuyPostId;
    }

    setSearchParams(nextParams);
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

  const verifyOfferContext = async (offerSnapshot, postSnapshot) => {
    const latestOffer = await offerApi.getById(offerSnapshot.offerId);
    const postId = latestOffer.postId || offerSnapshot.postId;
    const latestPost = postId ? await postApi.getById(postId) : null;
    const offerChanges = getOfferChangedFields(offerSnapshot, latestOffer);
    const postChanges = postSnapshot && latestPost
      ? getPostChangedFields(postSnapshot, latestPost)
      : [];

    return { latestOffer, latestPost, offerChanges, postChanges };
  };

  const stopForFreshnessChange = ({
    latestOffer,
    latestPost,
    offerChanges,
    postChanges,
  }) => {
    if (selectedOfferId) {
      setDetailState({
        requestKey: detailRequestKey,
        offer: latestOffer,
        post: latestPost,
        error: "",
      });
    }
    setPendingAction("");
    setEditingOffer(null);
    setCounteringOffer(null);
    setStaleWarning({
      message:
        offerChanges.length > 0
          ? OFFER_CHANGED_WARNING
          : POST_CHANGED_WARNING,
      changedFields: [...offerChanges, ...postChanges],
    });
    refreshList();
  };

  const confirmOfferAction = async () => {
    if (!selectedOffer || !pendingAction || actionBusy) return;

    setActionBusy(true);

    try {
      const verification = await verifyOfferContext(selectedOffer, selectedPost);
      if (
        verification.offerChanges.length > 0 ||
        verification.postChanges.length > 0
      ) {
        stopForFreshnessChange(verification);
        return;
      }

      let message = "";

      if (pendingAction === "cancel") {
        await offerApi.cancel(selectedOffer.offerId);
        message = "Đã hủy đề nghị thành công.";
      } else if (pendingAction === "reject") {
        await offerApi.reject(selectedOffer.offerId);
        message = "Đã từ chối đề nghị thành công.";
      } else {
        await offerApi.accept(
          selectedOffer.offerId,
          verification.latestOffer.version,
        );
        message = "Đã đồng ý mức giá và mở phiên thương lượng.";
      }

      setSuccessMessage(message);
      setPendingAction("");
      setDetailVersion(
        (currentVersion) => currentVersion + 1,
      );
      refreshList();
    } catch (requestError) {
      if (isConcurrencyConflict(requestError)) {
        setPendingAction("");
        setStaleWarning({ message: OFFER_CHANGED_WARNING });
        setDetailVersion((currentVersion) => currentVersion + 1);
        return;
      }
      setDetailState({
        requestKey: detailRequestKey,
        offer: selectedOffer,
        post: selectedPost,
        error: getErrorMessage(
          requestError,
          "Không thể xử lý đề nghị.",
        ),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const openEditModal = async () => {
    if (!selectedOffer || actionBusy) return;
    setActionBusy(true);
    try {
      const verification = await verifyOfferContext(selectedOffer, selectedPost);
      if (verification.offerChanges.length || verification.postChanges.length) {
        stopForFreshnessChange(verification);
        return;
      }
      setEditingOffer({
        ...verification.latestOffer,
        __postSnapshot: verification.latestPost,
      });
      setEditError("");
      setSelectedOfferId("");
    } catch {
      setStaleWarning({ message: VERIFICATION_FAILED_WARNING });
    } finally {
      setActionBusy(false);
    }
  };

  const openCounterModal = async () => {
    if (!selectedOffer || actionBusy) return;
    setActionBusy(true);
    try {
      const verification = await verifyOfferContext(selectedOffer, selectedPost);
      if (verification.offerChanges.length || verification.postChanges.length) {
        stopForFreshnessChange(verification);
        return;
      }
      setCounteringOffer({
        ...verification.latestOffer,
        __postSnapshot: verification.latestPost,
      });
      setCounterError("");
      setSelectedOfferId("");
    } catch {
      setStaleWarning({ message: VERIFICATION_FAILED_WARNING });
    } finally {
      setActionBusy(false);
    }
  };

  const handleCounterOffer = async (terms) => {
    if (!counteringOffer || counterSubmitting) {
      return;
    }

    setCounterSubmitting(true);
    setCounterError("");

    try {
      const verification = await verifyOfferContext(
        counteringOffer,
        counteringOffer.__postSnapshot,
      );
      if (verification.offerChanges.length || verification.postChanges.length) {
        stopForFreshnessChange(verification);
        return;
      }

      const result = await offerApi.counter(
        counteringOffer.offerId,
        {
          ...terms,
          version:
            verification.latestOffer.version,
        },
      );
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
      if (isConcurrencyConflict(requestError)) {
        setCounteringOffer(null);
        setStaleWarning({ message: OFFER_CHANGED_WARNING });
        refreshList();
        return;
      }
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
      const verification = await verifyOfferContext(
        editingOffer,
        editingOffer.__postSnapshot,
      );
      if (verification.offerChanges.length || verification.postChanges.length) {
        stopForFreshnessChange(verification);
        return;
      }

      await offerApi.update(
        editingOffer.offerId,
        {
          ...terms,
          version:
            verification.latestOffer.version,
        },
      );
      setEditingOffer(null);
      setSuccessMessage("Đã cập nhật đề nghị thành công.");
      refreshList();
    } catch (requestError) {
      if (isConcurrencyConflict(requestError)) {
        setEditingOffer(null);
        setStaleWarning({ message: OFFER_CHANGED_WARNING });
        refreshList();
        return;
      }
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
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Trung tâm giao dịch
          </p>
          <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
            Đề nghị giá
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-textLight">
            Quản lý đề nghị đã gửi và phản hồi đề nghị nhận được. Các cuộc trò chuyện đang diễn ra được đặt riêng tại Phòng thương lượng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
            {result?.totalCount ?? 0} đề nghị
          </span>
        </div>
      </header>

      {scopedBuyPostId && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              Đang lọc theo tin thu mua
            </p>
            <p className="mt-1 text-sm leading-6 text-textLight">
              Danh sách này chỉ hiển thị các đề nghị gắn với tin thu mua bạn vừa mở.
            </p>
          </div>

          <Link
            to={`/bai-dang-cua-toi/${encodeURIComponent(
              scopedBuyPostId,
            )}`}
            className="shrink-0 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10"
          >
            Quay lại tin thu mua
          </Link>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-white p-1.5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
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
                ? "bg-primary/10 text-primary"
                : "text-textLight hover:bg-background hover:text-text"
            }`}
          >
            {isPersonal
              ? "Chào hàng đã gửi"
              : "Đề nghị đã gửi"}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "received"}
            onClick={() => changeTab("received")}
            className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${
              activeTab === "received"
                ? "bg-primary/10 text-primary"
                : "text-textLight hover:bg-background hover:text-text"
            }`}
          >
            {scopedBuyPostId
              ? "Chào hàng nhận được"
              : "Đề nghị đã nhận"}
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success"
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
        <div role="status" className="mt-5 rounded-2xl border border-border bg-white p-12 text-center text-textLight shadow-[0_10px_30px_rgba(23,40,48,0.05)]">
          <span className="material-symbols-outlined animate-spin text-3xl">
            refresh
          </span>
          <p className="mt-2 text-sm font-semibold">
            Đang tải danh sách đề nghị...
          </p>
        </div>
      )}

      {listError && !isLoading && (
        <div role="alert" className="mt-5 rounded-xl border border-error/30 bg-error/10 p-8 text-center">
          <p className="font-semibold text-error">{listError}</p>
          <button
            type="button"
            onClick={refreshList}
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !listError && offers.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center shadow-[0_10px_30px_rgba(23,40,48,0.05)]">
          <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">handshake</span>
          <h2 className="mt-4 text-lg font-bold text-text">
            {activeTab === "sent"
              ? "Bạn chưa gửi đề nghị nào"
              : "Bạn chưa nhận được đề nghị nào"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-textLight">
            {activeTab === "sent"
              ? "Khám phá các tin đăng bán và gửi mức giá phù hợp cho người bán."
              : "Các đề nghị từ người quan tâm đến bài đăng của bạn sẽ xuất hiện tại đây."}
          </p>
          {activeTab === "sent" && (
            <Link
              to="/tin-dang-ban"
              className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
            >
              Khám phá tin đăng bán
            </Link>
          )}
        </div>
      )}

      {!isLoading && !listError && offers.length > 0 && (
        <>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_30px_rgba(23,40,48,0.05)]">
            <div className="hidden grid-cols-[minmax(190px,1.4fr)_150px_80px_130px_155px_120px] items-center gap-4 bg-background px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-textLight md:grid">
              <span>Đối tác</span>
              <span>Giá đề nghị</span>
              <span>Số lượng</span>
              <span>Trạng thái</span>
              <span>Thời gian</span>
              <span className="sr-only">Thao tác</span>
            </div>
            <div className="divide-y divide-border">
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

              const cardMatchItem =
                cardMatchState.requestKey ===
                cardMatchRequestKey
                  ? cardMatchState.items[
                      offer.offerId
                    ] || null
                  : null;

              return (
                <article
                  key={offer.offerId}
                  className="grid gap-4 px-5 py-4 transition hover:bg-background md:grid-cols-[minmax(190px,1.4fr)_150px_80px_130px_155px_120px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={otherPartyAvatar}
                        alt={otherPartyName || ""}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-textLight">
                          {activeTab === "sent" ? "Gửi đến" : "Nhận từ"}
                        </p>
                        <p className="truncate font-bold text-text">
                          {otherPartyName}
                        </p>
                      </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-textLight md:hidden">Giá đề nghị</p>
                    <p className="mt-0.5 text-base font-black text-error">{formatCurrency(offer.offerPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-textLight md:hidden">Số lượng</p>
                    <p className="mt-0.5 font-black text-text">{offer.offerQuantity}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-textLight md:hidden">Thời gian</p>
                    <p className="mt-0.5 text-xs font-medium text-textLight">{formatDate(offer.createdAt)}</p>
                  </div>
                  <div className="flex md:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOfferId(offer.offerId)}
                      className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
                    >
                      Xem chi tiết
                    </button>
                  </div>

                  {offer.buyPostId && (
                    <div className="md:col-span-6">
                      {!cardMatchItem ? (
                        <div
                          role="status"
                          className="animate-pulse rounded-xl border border-border bg-background/60 p-3"
                        >
                          <div className="h-3 w-44 rounded bg-border/60" />
                          <div className="mt-2 h-4 w-72 max-w-full rounded bg-border/40" />
                        </div>
                      ) : cardMatchItem.error ? (
                        <div
                          role="status"
                          className="rounded-xl border border-border bg-background/60 p-3 text-xs leading-5 text-textLight"
                        >
                          Chưa thể đối chiếu tiêu chí cho đề nghị này. Mở chi tiết hoặc làm mới danh sách để thử lại.
                        </div>
                      ) : (
                        <BuyPostOfferMatchPanel
                          offer={
                            cardMatchItem.detail
                          }
                          compact
                        />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row">
            <p className="text-sm font-medium text-textLight">
              Trang {result?.pageNumber ?? pageNumber} / {Math.max(result?.totalPages ?? 1, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage - 1)}
                disabled={!result?.hasPreviousPage}
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((currentPage) => currentPage + 1)}
                disabled={!result?.hasNextPage}
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
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
      <StaleDataWarningModal
        open={Boolean(staleWarning)}
        message={staleWarning?.message}
        changedFields={staleWarning?.changedFields}
        onAcknowledge={() => setStaleWarning(null)}
      />
    </section>
  );
};

export default OfferManagementPage;

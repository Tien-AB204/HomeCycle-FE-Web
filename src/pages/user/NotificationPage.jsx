import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import { useChatRealtime } from "../../hooks/useChatRealtime";
import { useNotifications } from "../../hooks/useNotifications";
import notificationApi, {
  normalizeNotification,
  normalizeNotificationTargetType,
} from "../../services/apis/notificationApi";
import offerApi from "../../services/apis/offerApi";

const PAGE_SIZE = 20;

const TARGET_META = {
  offer: {
    icon: "sell",
    label: "Đề nghị",
  },

  negotiation: {
    icon: "forum",
    label: "Thương lượng",
  },

  agreement: {
    icon: "description",
    label: "Thỏa thuận",
  },

  order: {
    icon: "receipt_long",
    label: "Đơn hàng",
  },

  dispute: {
    icon: "gavel",
    label: "Tranh chấp",
  },

  post: {
    icon: "article",
    label: "Bài đăng",
  },

  appointment: {
    icon: "calendar_month",
    label: "Lịch hẹn",
  },

  withdrawal: {
    icon: "account_balance_wallet",
    label: "Rút tiền",
  },
};

const getErrorMessage = (
  error,
  fallback,
) => {
  return (
    error?.response?.data
      ?.error?.message ||
    error?.response?.data
      ?.message ||
    fallback
  );
};

const formatTimeAgo = (
  value,
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          date.getTime()
        ) / 1000,
      ),
    );

  if (seconds < 60) {
    return "Vừa xong";
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  if (minutes < 60) {
    return (
      minutes +
      " phút trước"
    );
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return (
      hours +
      " giờ trước"
    );
  }

  const days =
    Math.floor(
      hours / 24,
    );

  if (days < 30) {
    return (
      days +
      " ngày trước"
    );
  }

  return date
    .toLocaleDateString(
      "vi-VN",
    );
};

const NotificationPage = () => {
  const navigate =
    useNavigate();

  const {
    connection,
    reconnectVersion,
  } = useChatRealtime();

  const {
    unreadCount,
    refreshUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useNotifications();

  const [
    items,
    setItems,
  ] = useState([]);

  const [
    pagination,
    setPagination,
  ] = useState({
    pageNumber: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [
    openingId,
    setOpeningId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    notice,
    setNotice,
  ] = useState("");

  const loadFirstPage =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!silent) {
          setLoading(true);
        }

        setError("");

        try {
          const result =
            await notificationApi
              .getMine({
                pageNumber: 1,
                pageSize: PAGE_SIZE,
              });

          setItems(
            result.items,
          );

          setPagination(
            result,
          );
        } catch (loadError) {
          setError(
            getErrorMessage(
              loadError,
              "Không thể tải thông báo lúc này.",
            ),
          );
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      [],
    );

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          void loadFirstPage();

          void refreshUnreadCount()
            .catch(() => {});
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    loadFirstPage,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    if (
      reconnectVersion <= 0
    ) {
      return undefined;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          void loadFirstPage({
            silent: true,
          });
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    reconnectVersion,
    loadFirstPage,
  ]);

  useEffect(() => {
    if (!connection) {
      return undefined;
    }

    const handleCreated = (
      payload,
    ) => {
      const item =
        normalizeNotification(
          payload,
        );

      if (!item) {
        return;
      }

      setItems(
        (current) => {
          if (
            current.some(
              (existing) =>
                existing.notificationId ===
                item.notificationId,
            )
          ) {
            return current;
          }

          return [
            item,
            ...current,
          ];
        },
      );

      setPagination(
        (current) => ({
          ...current,
          totalCount:
            current.totalCount + 1,
        }),
      );
    };

    const handleRead = (
      payload,
    ) => {
      const source =
        payload?.data ??
        payload ??
        {};

      const id =
        String(
          source.notificationId ??
            source.NotificationId ??
            "",
        ).trim();

      if (!id) {
        return;
      }

      setItems(
        (current) =>
          current.map(
            (item) =>
              item.notificationId ===
              id
                ? {
                    ...item,
                    isRead: true,
                  }
                : item,
          ),
      );
    };

    const handleAllRead =
      () => {
        setItems(
          (current) =>
            current.map(
              (item) => ({
                ...item,
                isRead: true,
              }),
            ),
        );
      };

    connection.on(
      "NotificationCreated",
      handleCreated,
    );

    connection.on(
      "NotificationRead",
      handleRead,
    );

    connection.on(
      "NotificationsReadAll",
      handleAllRead,
    );

    return () => {
      connection.off(
        "NotificationCreated",
        handleCreated,
      );

      connection.off(
        "NotificationRead",
        handleRead,
      );

      connection.off(
        "NotificationsReadAll",
        handleAllRead,
      );
    };
  }, [connection]);

  const loadMore =
    async () => {
      if (
        loadingMore ||
        !pagination.hasNextPage
      ) {
        return;
      }

      setLoadingMore(true);
      setError("");

      try {
        const result =
          await notificationApi
            .getMine({
              pageNumber:
                pagination
                  .pageNumber + 1,

              pageSize:
                PAGE_SIZE,
            });

        setItems(
          (current) => {
            const existingIds =
              new Set(
                current.map(
                  (item) =>
                    item.notificationId,
                ),
              );

            return [
              ...current,
              ...result.items.filter(
                (item) =>
                  !existingIds.has(
                    item.notificationId,
                  ),
              ),
            ];
          },
        );

        setPagination(
          result,
        );
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Không thể tải thêm thông báo.",
          ),
        );
      } finally {
        setLoadingMore(false);
      }
    };

  const markAllAsRead =
    async () => {
      if (
        markingAll ||
        unreadCount <= 0
      ) {
        return;
      }

      setMarkingAll(true);
      setError("");
      setNotice("");

      try {
        await markAllNotificationsAsRead();

        setItems(
          (current) =>
            current.map(
              (item) => ({
                ...item,
                isRead: true,
              }),
            ),
        );

        setNotice(
          "Đã đánh dấu tất cả thông báo là đã đọc.",
        );
      } catch (markError) {
        setError(
          getErrorMessage(
            markError,
            "Không thể đánh dấu tất cả thông báo đã đọc.",
          ),
        );
      } finally {
        setMarkingAll(false);
      }
    };

  const navigateToTarget =
    async (item) => {
      const targetType =
        normalizeNotificationTargetType(
          item.targetType,
        );

      const targetId =
        String(
          item.targetId || "",
        ).trim();

      if (
        !targetType ||
        !targetId
      ) {
        setNotice(
          "Thông báo này chưa có nội dung chi tiết để mở.",
        );

        return;
      }

      switch (targetType) {
        case "offer": {
          const offer =
            await offerApi
              .getById(
                targetId,
              );

          const negotiationId =
            String(
              offer
                ?.negotiationId ||
                "",
            ).trim();

          if (negotiationId) {
            navigate(
              "/thuong-luong/" +
                encodeURIComponent(
                  negotiationId,
                ),
            );

            return;
          }

          navigate(
            "/thuong-luong",
          );

          return;
        }

        case "negotiation":
          navigate(
            "/thuong-luong/" +
              encodeURIComponent(
                targetId,
              ),
          );
          return;

        case "agreement":
          navigate(
            "/thoa-thuan/" +
              encodeURIComponent(
                targetId,
              ),
          );
          return;

        case "order":
          navigate(
            "/don-hang/" +
              encodeURIComponent(
                targetId,
              ),
          );
          return;

        case "dispute":
          navigate(
            "/tranh-chap/" +
              encodeURIComponent(
                targetId,
              ),
          );
          return;

        case "post":
          navigate(
            "/posts/" +
              encodeURIComponent(
                targetId,
              ),
          );
          return;

        case "appointment":
          /*
           * Web hiện chỉ có trang danh sách lịch hẹn.
           * Không bịa route detail chưa tồn tại.
           */
          navigate(
            "/lich-hen",
          );
          return;

        case "withdrawal":
          navigate(
            "/vi",
          );
          return;

        default:
          return;
      }
    };

  const openNotification =
    async (item) => {
      if (openingId) {
        return;
      }

      setOpeningId(
        item.notificationId,
      );

      setError("");
      setNotice("");

      if (!item.isRead) {
        try {
          await markNotificationAsRead(
            item.notificationId,
          );

          setItems(
            (current) =>
              current.map(
                (currentItem) =>
                  currentItem
                    .notificationId ===
                  item.notificationId
                    ? {
                        ...currentItem,
                        isRead: true,
                      }
                    : currentItem,
              ),
          );
        } catch (markError) {
          setError(
            getErrorMessage(
              markError,
              "Không thể cập nhật trạng thái đã đọc.",
            ),
          );
        }
      }

      try {
        await navigateToTarget(
          item,
        );
      } catch (navigationError) {
        setError(
          getErrorMessage(
            navigationError,
            "Không thể mở nội dung liên quan của thông báo.",
          ),
        );
      } finally {
        setOpeningId("");
      }
    };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-7 sm:px-6">
      <section className="overflow-hidden rounded-3xl bg-primary px-5 py-6 text-white shadow-[0_18px_50px_rgba(23,40,48,0.14)] sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/65">
              HomeCycle
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Thông báo
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Theo dõi thay đổi của đề nghị, thương lượng, thỏa thuận và giao dịch của bạn.
            </p>
          </div>

          <button
            type="button"
            onClick={
              markAllAsRead
            }
            disabled={
              markingAll ||
              unreadCount <= 0
            }
            className="rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAll
              ? "Đang cập nhật..."
              : "Đánh dấu tất cả đã đọc"}
          </button>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-text">
            Tất cả thông báo
          </p>

          <p className="mt-1 text-xs font-semibold text-textLight">
            {unreadCount > 0
              ? unreadCount + " thông báo chưa đọc"
              : "Bạn đã đọc hết thông báo"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadFirstPage();
            void refreshUnreadCount()
              .catch(() => {});
          }}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 text-xs font-black text-primary transition hover:bg-background disabled:opacity-50"
        >
          <span
            className={
              "material-symbols-outlined text-[18px] " +
              (
                loading
                  ? "animate-spin"
                  : ""
              )
            }
            aria-hidden="true"
          >
            refresh
          </span>

          Làm mới
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          aria-live="polite"
          className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success"
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-border bg-white text-primary">
          <span className="material-symbols-outlined animate-spin text-4xl">
            progress_activity
          </span>

          <p className="mt-3 text-sm font-bold">
            Đang tải thông báo...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-border bg-white p-10 text-center">
          <span className="material-symbols-outlined text-5xl text-textLight">
            notifications_off
          </span>

          <h2 className="mt-3 text-lg font-black text-text">
            Chưa có thông báo
          </h2>

          <p className="mt-2 text-sm text-textLight">
            Các cập nhật mới trong quá trình giao dịch sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_24px_rgba(23,40,48,0.04)]">
          {items.map(
            (item) => {
              const targetType =
                normalizeNotificationTargetType(
                  item.targetType,
                );

              const meta =
                TARGET_META[
                  targetType
                ] || {
                  icon:
                    "notifications",
                  label:
                    "Thông báo",
                };

              const isOpening =
                openingId ===
                item.notificationId;

              return (
                <button
                  key={
                    item.notificationId
                  }
                  type="button"
                  onClick={() => {
                    void openNotification(
                      item,
                    );
                  }}
                  disabled={
                    Boolean(openingId)
                  }
                  className={
                    "flex w-full items-start gap-4 border-b border-border px-4 py-4 text-left transition last:border-b-0 sm:px-5 " +
                    (
                      item.isRead
                        ? "bg-white hover:bg-background"
                        : "bg-primary/[0.045] hover:bg-primary/[0.075]"
                    )
                  }
                >
                  <span
                    className={
                      "material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-full " +
                      (
                        item.isRead
                          ? "bg-background text-textLight"
                          : "bg-primary/10 text-primary"
                      )
                    }
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-text">
                        {item.title}
                      </span>

                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </span>

                    {item.message && (
                      <span className="mt-1.5 block text-sm leading-6 text-textLight">
                        {item.message}
                      </span>
                    )}

                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-textLight">
                      <span>
                        {meta.label}
                      </span>

                      {item.createdAt && (
                        <span>
                          {formatTimeAgo(
                            item.createdAt,
                          )}
                        </span>
                      )}
                    </span>
                  </span>

                  <span
                    className="material-symbols-outlined mt-2 shrink-0 text-[20px] text-textLight"
                    aria-hidden="true"
                  >
                    {isOpening
                      ? "progress_activity"
                      : "chevron_right"}
                  </span>
                </button>
              );
            },
          )}
        </div>
      )}

      {!loading &&
        pagination.hasNextPage && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                void loadMore();
              }}
              disabled={loadingMore}
              className="rounded-full border border-primary bg-white px-5 py-2.5 text-sm font-black text-primary transition hover:bg-background disabled:opacity-50"
            >
              {loadingMore
                ? "Đang tải..."
                : "Tải thêm thông báo"}
            </button>
          </div>
        )}
    </div>
  );
};

export default NotificationPage;

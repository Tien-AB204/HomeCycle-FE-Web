import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import notificationApi from "../../services/apis/notificationApi";
import { getUserId } from "../../utils/authUtils";
import { getSafeProblemDetail } from "../../utils/safeErrorMessage";

/*
 * Thông báo Backend gửi khi giá/số lượng của đề nghị bị đổi (OfferService).
 * Toast chỉ hiện vài giây nên các thông báo này còn hiện thêm modal tới khi
 * người dùng bấm "Đã hiểu".
 */
const PRICE_CHANGE_TITLES = new Set([
  "đề nghị đã được cập nhật",
  "bạn nhận được đề nghị đối ứng",
]);

const isOfferPriceChange = (notification) =>
  notification?.targetType === "offer" &&
  PRICE_CHANGE_TITLES.has(
    String(notification?.title ?? "").trim().toLowerCase(),
  );

const RECENT_NOTIFICATION_PAGE_SIZE = 30;
const OFFER_PAGE_PATH = "/thuong-luong";

const toAlert = (notification) => ({
  notificationId: notification.notificationId,
  title: notification.title,
  message: notification.message,
});

export default function OfferUpdateAlertHost() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { toastNotification, markNotificationAsRead } = useNotifications();
  const userId = getUserId(user);
  const [queueState, setQueueState] = useState({ userId: "", items: [] });
  // Đã xác nhận trong phiên: không hiện lại dù danh sách thông báo chưa kịp cập nhật.
  const acknowledgedIdsRef = useRef(new Set());
  const queue = queueState.userId === userId ? queueState.items : [];

  const enqueue = useCallback(
    (alerts) => {
      setQueueState((current) => {
        const items = current.userId === userId ? current.items : [];
        const known = new Set(items.map((alert) => alert.notificationId));
        const next = alerts.filter(
          (alert) =>
            !known.has(alert.notificationId) &&
            !acknowledgedIdsRef.current.has(alert.notificationId),
        );

        return next.length || current.userId !== userId
          ? { userId, items: [...items, ...next] }
          : current;
      });
    },
    [userId],
  );

  // Thông báo realtime vừa tới (cùng lúc với toast).
  useEffect(() => {
    if (userId && isOfferPriceChange(toastNotification)) {
      enqueue([toAlert(toastNotification)]);
    }
  }, [enqueue, toastNotification, userId]);

  // Vào lại trang đề nghị: thông báo đổi giá chưa xem thì hiện lại.
  const isOfferPage = pathname === OFFER_PAGE_PATH;

  useEffect(() => {
    if (!userId || !isOfferPage) {
      return undefined;
    }

    const controller = new AbortController();

    notificationApi
      .getMine({
        pageNumber: 1,
        pageSize: RECENT_NOTIFICATION_PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) =>
        enqueue(
          result.items
            .filter((item) => !item.isRead && isOfferPriceChange(item))
            // Cũ nhất trước để đọc đúng thứ tự thay đổi.
            .reverse()
            .map(toAlert),
        ),
      )
      .catch(() => {
        // Không tải được thì vẫn còn toast và trang Thông báo.
      });

    return () => controller.abort();
  }, [enqueue, isOfferPage, userId]);

  const current = queue[0] ?? null;

  const acknowledge = () => {
    if (!current) {
      return;
    }

    const { notificationId } = current;
    acknowledgedIdsRef.current.add(notificationId);
    setQueueState((state) => ({
      ...state,
      items: state.items.filter((item) => item.notificationId !== notificationId),
    }));
    // Bấm "Đã hiểu" nghĩa là đã xem thông báo này.
    markNotificationAsRead(notificationId).catch(() => {});
  };

  if (!current) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="offer-update-alert-title"
        className="w-full max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-[0_26px_80px_rgba(24,63,65,0.28)]"
      >
        <span
          className="material-symbols-outlined mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white"
          style={{ fontSize: 28 }}
          aria-hidden="true"
        >
          sell
        </span>
        <h2
          id="offer-update-alert-title"
          className="mt-4 text-lg font-black text-text"
        >
          {getSafeProblemDetail(current.title) || "Đề nghị đã thay đổi"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-textLight">
          {getSafeProblemDetail(current.message) ||
            "Giá hoặc số lượng của đề nghị đã được cập nhật."}
        </p>
        <p className="mt-4 rounded-xl bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
          Kiểm tra lại giá và số lượng mới trước khi phản hồi đề nghị.
        </p>
        {queue.length > 1 && (
          <p className="mt-3 text-xs font-bold text-textLight">
            Còn {queue.length - 1} cập nhật khác
          </p>
        )}
        <button
          type="button"
          autoFocus
          onClick={acknowledge}
          className="mt-5 w-full rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90"
        >
          Đã hiểu
        </button>
      </section>
    </div>
  );
}

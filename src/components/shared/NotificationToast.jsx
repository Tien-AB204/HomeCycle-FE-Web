import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import {
  NOTIFICATION_TARGET_META,
  openNotificationTarget,
} from "../../utils/notificationNavigation";

const NotificationToast = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    toastNotification,
    dismissNotificationToast,
    markNotificationAsRead,
  } = useNotifications();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState({ notificationId: "", message: "" });

  useEffect(() => {
    if (!toastNotification) return undefined;

    const notificationId = toastNotification.notificationId;
    const timeoutId = window.setTimeout(
      () => dismissNotificationToast(notificationId),
      7000,
    );
    return () => window.clearTimeout(timeoutId);
  }, [toastNotification, dismissNotificationToast]);

  if (!toastNotification) return null;

  const meta = NOTIFICATION_TARGET_META[toastNotification.targetType] || {
    icon: "notifications",
    label: "Thông báo",
  };
  const currentError =
    error.notificationId === toastNotification.notificationId
      ? error.message
      : "";

  const openToast = async () => {
    if (opening) return;

    setOpening(true);
    setError({
      notificationId: toastNotification.notificationId,
      message: "",
    });

    if (!toastNotification.isRead) {
      try {
        await markNotificationAsRead(toastNotification.notificationId);
      } catch {
        setError({
          notificationId: toastNotification.notificationId,
          message: "Không thể cập nhật trạng thái đã đọc.",
        });
      }
    }

    try {
      await openNotificationTarget({
        item: toastNotification,
        userRole: user?.role,
        navigate,
      });
      dismissNotificationToast(toastNotification.notificationId);
    } catch (navigationError) {
      setError({
        notificationId: toastNotification.notificationId,
        message:
          navigationError?.message ||
          "Không thể mở nội dung của thông báo.",
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <aside
      aria-live="polite"
      className="fixed right-4 top-4 z-[100] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-primary/20 bg-white p-4 shadow-[0_24px_64px_rgba(23,40,48,0.24)]"
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {meta.icon}
        </span>
        <button
          type="button"
          onClick={() => void openToast()}
          disabled={opening}
          className="min-w-0 flex-1 text-left disabled:opacity-70"
        >
          <span className="block text-xs font-black uppercase tracking-wide text-primary">
            {meta.label}
          </span>
          <span className="mt-0.5 block font-black text-text">
            {toastNotification.title}
          </span>
          {toastNotification.message && (
            <span className="mt-1 line-clamp-2 block text-sm leading-5 text-textLight">
              {toastNotification.message}
            </span>
          )}
          <span className="mt-2 block text-xs font-bold text-primary">
            {opening ? "Đang mở..." : "Mở nội dung"}
          </span>
        </button>
        <button
          type="button"
          onClick={() =>
            dismissNotificationToast(toastNotification.notificationId)
          }
          aria-label="Đóng thông báo"
          className="rounded-lg px-2 py-1 text-xl leading-none text-textLight hover:bg-background"
        >
          ×
        </button>
      </div>
      {currentError && (
        <p role="alert" className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-xs font-semibold text-error">
          {currentError}
        </p>
      )}
    </aside>
  );
};

export default NotificationToast;

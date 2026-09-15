import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import {
  formatNotificationTime,
  NOTIFICATION_TARGET_META,
  openNotificationTarget,
} from "../../utils/notificationNavigation";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const NotificationBell = ({ allNotificationsPath, onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    unreadCount,
    recentNotifications,
    notificationsLoading,
    notificationsError,
    refreshNotifications,
    markNotificationAsRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [localError, setLocalError] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const openItem = async (item) => {
    if (openingId) return;

    setOpeningId(item.notificationId);
    setLocalError("");

    if (!item.isRead) {
      try {
        await markNotificationAsRead(item.notificationId);
      } catch (error) {
        setLocalError(
          getErrorMessage(error, "Không thể cập nhật trạng thái đã đọc."),
        );
      }
    }

    try {
      await openNotificationTarget({
        item,
        userRole: user?.role,
        navigate,
      });
      setOpen(false);
      onNavigate?.();
    } catch (error) {
      setLocalError(
        getErrorMessage(error, "Không thể mở nội dung của thông báo."),
      );
    } finally {
      setOpeningId("");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Thông báo, ${unreadCount} chưa đọc`
            : "Thông báo"
        }
        aria-expanded={open}
        onClick={() => {
          setLocalError("");
          setOpen((current) => !current);
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary shadow-sm transition hover:bg-background"
      >
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
          notifications
        </span>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-error px-1 text-[10px] font-black leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-[70] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white text-left shadow-[0_24px_64px_rgba(23,40,48,0.2)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-black text-text">Thông báo</p>
              <p className="text-xs font-semibold text-textLight">
                {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Đã đọc hết"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshNotifications()}
              disabled={notificationsLoading}
              className="rounded-lg p-2 text-primary transition hover:bg-background disabled:opacity-50"
              aria-label="Làm mới thông báo"
            >
              <span
                className={`material-symbols-outlined text-[19px] ${
                  notificationsLoading ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
            </button>
          </div>

          {(localError || notificationsError) && (
            <div role="alert" className="m-3 rounded-lg bg-error/10 px-3 py-2 text-xs font-semibold text-error">
              {localError || notificationsError}
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {notificationsLoading && recentNotifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-textLight">
                Đang tải thông báo...
              </p>
            ) : recentNotifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-textLight">
                Chưa có thông báo.
              </p>
            ) : (
              recentNotifications.map((item) => {
                const meta = NOTIFICATION_TARGET_META[item.targetType] || {
                  icon: "notifications",
                  label: "Thông báo",
                };

                return (
                  <button
                    key={item.notificationId}
                    type="button"
                    disabled={Boolean(openingId)}
                    onClick={() => void openItem(item)}
                    className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition last:border-0 ${
                      item.isRead
                        ? "bg-white hover:bg-background"
                        : "bg-primary/[0.05] hover:bg-primary/[0.09]"
                    }`}
                  >
                    <span className="material-symbols-outlined mt-0.5 text-[20px] text-primary" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-text">
                        {item.title}
                      </span>
                      {item.message && (
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-textLight">
                          {item.message}
                        </span>
                      )}
                      <span className="mt-1 block text-[10px] font-bold text-textLight">
                        {meta.label} · {formatNotificationTime(item.createdAt)}
                      </span>
                    </span>
                    {openingId === item.notificationId && (
                      <span className="material-symbols-outlined animate-spin text-[18px] text-primary">
                        progress_activity
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <Link
            to={allNotificationsPath}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="block border-t border-border px-4 py-3 text-center text-sm font-black text-primary transition hover:bg-background"
          >
            Xem tất cả thông báo
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

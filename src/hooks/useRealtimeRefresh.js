import { useEffect, useRef } from "react";
import { normalizeNotification } from "../services/apis/notificationApi";
import useChatRealtime from "./useChatRealtime";

/*
 * Làm mới màn hình quản trị theo SignalR (dùng chung kết nối của
 * ChatRealtimeProvider, không tạo kết nối riêng).
 *
 * - notificationTargets: loại đối tượng của NotificationCreated cần nghe,
 *   ví dụ ["dispute"], ["personalProfile", "businessProfile"], ["withdrawal"].
 *   Backend chỉ gửi các thông báo này cho Kiểm duyệt viên.
 * - finance: nghe FinanceUpdated (Backend gửi cho nhóm Kiểm duyệt viên/Quản trị viên);
 *   true = mọi sự kiện, hoặc hàm (payload) => boolean để chỉ nhận sự kiện liên quan.
 * - Sau khi kết nối lại cũng gọi onRefresh để tải lại dữ liệu đang hiển thị.
 * Nhiều sự kiện liên tiếp được gộp thành một lần làm mới.
 */
export default function useRealtimeRefresh(onRefresh, { notificationTargets = [], finance = false, delay = 800 } = {}) {
  const { subscribe, reconnectVersion } = useChatRealtime();
  const handlerRef = useRef(onRefresh);
  const financeRef = useRef(finance);
  const timerRef = useRef(0);
  const targetsKey = notificationTargets.join("|");

  useEffect(() => {
    handlerRef.current = onRefresh;
    financeRef.current = finance;
  });
  const listensFinance = Boolean(finance);

  useEffect(() => {
    const targets = new Set(targetsKey ? targetsKey.split("|") : []);
    const schedule = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => handlerRef.current?.(), delay);
    };
    const unsubscribers = [];

    if (targets.size) {
      unsubscribers.push(
        subscribe("NotificationCreated", (payload) => {
          const item = normalizeNotification(payload);
          if (item && targets.has(item.targetType)) schedule();
        }),
      );
    }
    if (listensFinance) {
      unsubscribers.push(
        subscribe("FinanceUpdated", (payload) => {
          const accept = financeRef.current;
          if (typeof accept !== "function" || accept(payload || {})) schedule();
        }),
      );
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.clearTimeout(timerRef.current);
    };
  }, [subscribe, targetsKey, listensFinance, delay]);

  useEffect(() => {
    if (reconnectVersion > 0) handlerRef.current?.();
  }, [reconnectVersion]);
}

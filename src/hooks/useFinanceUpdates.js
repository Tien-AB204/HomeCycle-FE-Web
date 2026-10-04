import { useEffect, useRef } from "react";
import useChatRealtime from "./useChatRealtime";

/*
 * FinanceUpdated là tín hiệu làm mới: payload có thể rỗng nhưng vẫn có ý nghĩa
 * (ví dụ người bán được báo khi tiền đơn hàng vào Order_Escrow), nên luôn gọi
 * callback và để từng màn hình tự quyết định có tải lại hay không. Sau khi kết
 * nối lại cũng gọi callback để tải lại dữ liệu REST đang hiển thị.
 */
export default function useFinanceUpdates(onUpdate) {
  const { subscribe, reconnectVersion } = useChatRealtime();
  const handlerRef = useRef(onUpdate);

  useEffect(() => {
    handlerRef.current = onUpdate;
  });

  useEffect(
    () =>
      subscribe("FinanceUpdated", (payload) => {
        handlerRef.current?.(payload || {});
      }),
    [subscribe],
  );

  useEffect(() => {
    if (reconnectVersion > 0) {
      handlerRef.current?.({ reconnected: true });
    }
  }, [reconnectVersion]);
}

const ORDER_ESCROW_EVENTS = new Set([
  "1",
  "5",
  "6",
  "orderpaymentcompleted",
  "orderrefunded",
  "orderpayoutreleased",
]);

export const isOrderEscrowEvent = (payload) =>
  ORDER_ESCROW_EVENTS.has(String(payload?.eventType ?? "").toLowerCase());

export const hasItems = (value) => Array.isArray(value) && value.length > 0;

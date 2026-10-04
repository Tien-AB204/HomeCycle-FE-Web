import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import walletApi from "../../services/apis/walletApi";
import { formatCurrency } from "../../utils/formatter";
import {
  getFinanceLabel,
  ORDER_STATUS_LABELS,
} from "../finance/financePresentation";

/*
 * Tiền đơn hàng HomeCycle đang giữ cho người bán. Ẩn khi không có khoản nào.
 * refreshKey đổi thì tải lại (ví dụ khi ví có biến động realtime).
 */
export default function PendingSettlementsCard({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    walletApi
      .getPendingSettlements({ signal: controller.signal })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) {
          setData(null);
        }
      });

    return () => controller.abort();
  }, [refreshKey]);

  if (!data || (data.totalPendingAmount <= 0 && data.items.length === 0)) {
    return null;
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-white shadow-[0_10px_30px_rgba(23,40,48,0.05)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
      >
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-success">
            Tiền chờ nhận từ đơn hàng
          </p>
          <p className="mt-2 text-2xl font-black text-text">
            {formatCurrency(data.totalPendingAmount)}
          </p>
          <p className="mt-1 text-xs font-semibold text-textLight">
            {data.items.length} đơn · {expanded ? "Thu gọn" : "Xem chi tiết"}
          </p>
        </div>
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 24 }}
          aria-hidden="true"
        >
          {expanded ? "expand_less" : "expand_more"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 pb-5 sm:px-6">
          <p className="py-3 text-sm leading-6 text-textLight">
            HomeCycle đang giữ khoản tiền này cho các đơn bạn bán. Tiền được
            chuyển vào số dư khả dụng sau khi đơn hoàn tất và hết thời hạn
            khiếu nại.
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {data.items.map((item, index) => {
              const content = (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-text">
                      {item.productName || "Đơn hàng"}
                    </p>
                    <p className="mt-0.5 text-xs text-textLight">
                      {[
                        item.orderCode,
                        item.orderStatus != null
                          ? getFinanceLabel(ORDER_STATUS_LABELS, item.orderStatus)
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-success">
                    {formatCurrency(item.amount)}
                  </p>
                </>
              );

              return (
                <li key={item.orderId || `${item.orderCode}-${index}`}>
                  {item.orderId ? (
                    <Link
                      to={`/don-hang/${encodeURIComponent(item.orderId)}`}
                      className="flex items-center gap-3 bg-white px-4 py-3 transition hover:bg-background"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 bg-white px-4 py-3">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

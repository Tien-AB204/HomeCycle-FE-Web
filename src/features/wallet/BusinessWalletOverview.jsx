import { useEffect, useMemo, useState } from "react";
import walletApi from "../../services/apis/walletApi";
import {
  formatDayKey,
  getRecentVietnamDayKeys,
  getVietnamDayStartIso,
} from "../../utils/vietnamDate";
import {
  MetricTile,
  WorkspacePanel,
} from "../business-workspace/WorkspaceWidgets";
import {
  buildDailyFlow,
  getBalanceShares,
  getQuotaUsage,
} from "./walletOverview";

const LEDGER_PAGE_SIZE = 100;
const MAX_LEDGER_PAGES = 5;
const PERIOD_OPTIONS = [
  { value: 7, label: "7 ngày gần nhất" },
  { value: 30, label: "30 ngày gần nhất" },
];

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatPercent = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

const formatResetAt = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        timeStyle: "short",
        dateStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date)
    : "";
};

// Tải các dòng sao kê khả dụng trong kỳ; dừng ở MAX_LEDGER_PAGES trang để không gọi quá nhiều.
const loadAvailableLedger = async ({ fromDate, signal }) => {
  const requestPage = (pageNumber) =>
    walletApi.getLedger({
      pageNumber,
      pageSize: LEDGER_PAGE_SIZE,
      balanceType: "Available",
      fromDate,
      signal,
    });

  const firstPage = await requestPage(1);
  const totalPages = firstPage.totalPages || 1;
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.min(totalPages, MAX_LEDGER_PAGES) - 1 },
      (_, index) => requestPage(index + 2),
    ),
  );

  return {
    items: [firstPage, ...remainingPages].flatMap((page) => page.items),
    truncated: totalPages > MAX_LEDGER_PAGES,
  };
};

function DailyFlowChart({ rows }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.in, row.out]));
  const labelEvery = rows.length > 10 ? 5 : 1;

  return (
    <div>
      <div className="flex h-48 items-end gap-1 border-b border-border px-1 sm:gap-2">
        {rows.map((row) => (
          <div
            key={row.dayKey}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
          >
            {[
              ["in", "bg-success", "tăng"],
              ["out", "bg-[#537DA9]", "giảm"],
            ].map(([key, color, label]) => (
              <span
                key={key}
                title={`${formatDayKey(row.dayKey)}: ${label} ${formatCurrency(row[key])}`}
                className={`w-full max-w-[18px] rounded-t-[3px] ${color}`}
                style={{
                  height: `${(row[key] / max) * 100}%`,
                  minHeight: row[key] ? "3px" : 0,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 px-1 sm:gap-2">
        {rows.map((row, index) => (
          <span
            key={row.dayKey}
            className="min-w-0 flex-1 text-center text-[10px] font-semibold text-textLight"
          >
            {index % labelEvery === 0 || index === rows.length - 1
              ? formatDayKey(row.dayKey, { withYear: false })
              : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BusinessWalletOverview({
  availableBalance,
  holdBalance,
  quota,
  refreshKey,
}) {
  const [period, setPeriod] = useState(7);
  // Mốc hôm nay lấy một lần khi mở trang; đổi kỳ hoặc số dư thay đổi thì tải lại sao kê.
  const [nowMs] = useState(() => Date.now());
  const dayKeys = useMemo(
    () => getRecentVietnamDayKeys(nowMs, period),
    [nowMs, period],
  );
  const requestKey = `${period}|${refreshKey}`;
  const [ledgerState, setLedgerState] = useState({
    key: "",
    items: [],
    truncated: false,
    error: "",
  });
  const loading = ledgerState.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    loadAvailableLedger({
      fromDate: getVietnamDayStartIso(dayKeys[0]),
      signal: controller.signal,
    })
      .then(({ items, truncated }) =>
        setLedgerState({ key: requestKey, items, truncated, error: "" }),
      )
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setLedgerState({
          key: requestKey,
          items: [],
          truncated: false,
          error: "Không thể tải biến động số dư khả dụng.",
        });
      });

    return () => controller.abort();
  }, [dayKeys, requestKey]);

  const shares = getBalanceShares(availableBalance, holdBalance);
  const usage = getQuotaUsage(quota);
  const flowRows = useMemo(
    () => buildDailyFlow(ledgerState.items, dayKeys),
    [dayKeys, ledgerState.items],
  );
  const hasFlow = flowRows.some((row) => row.in || row.out);

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Tiền có thể sử dụng"
          value={formatCurrency(availableBalance)}
          caption="Có thể thanh toán hoặc yêu cầu rút"
          tone="text-success"
          highlighted
        />
        <MetricTile
          label="Tiền đang tạm giữ"
          value={formatCurrency(holdBalance)}
          caption="Chưa thể sử dụng hoặc rút"
          tone="text-warning"
        />
        <MetricTile
          label="Tổng tiền trong ví"
          value={formatCurrency(shares.total)}
          caption="Khả dụng + tạm giữ"
        />
        <MetricTile
          label="Đang chờ rút"
          value={usage ? formatCurrency(usage.reserved) : "—"}
          caption="Tiền đã gửi yêu cầu rút, chờ xử lý"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WorkspacePanel
          title="Tiền của bạn đang ở đâu?"
          description="Số dư hiện tại trong ví doanh nghiệp"
        >
          <p className="text-3xl font-black tabular-nums text-text">
            {formatCurrency(shares.total)}
          </p>
          <div
            className="mt-4 flex h-3 overflow-hidden rounded-full bg-background"
            role="img"
            aria-label={`Khả dụng ${formatPercent(shares.availablePercent)}, tạm giữ ${formatPercent(shares.holdPercent)}`}
          >
            <i className="bg-success" style={{ width: `${shares.availablePercent}%` }} />
            <i className="bg-warning" style={{ width: `${shares.holdPercent}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs font-semibold text-textLight">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-[3px] bg-success" aria-hidden="true" />
              Khả dụng · {formatPercent(shares.availablePercent)}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-[3px] bg-warning" aria-hidden="true" />
              Tạm giữ · {formatPercent(shares.holdPercent)}
            </span>
          </div>
          <p className="mt-4 rounded-xl bg-background p-3 text-xs leading-5 text-textLight">
            Tiền tạm giữ chưa thể rút. Khoản này đang được giữ cho giao dịch
            hoặc yêu cầu rút tiền đang xử lý.
          </p>
        </WorkspacePanel>

        <WorkspacePanel
          title="Hạn mức rút hôm nay"
          description={
            usage?.resetAt
              ? `Đặt lại lúc ${formatResetAt(usage.resetAt)}`
              : "Theo gói dịch vụ hiện tại"
          }
        >
          {!usage ? (
            <p className="py-6 text-center text-sm text-textLight">
              Chưa tải được hạn mức rút tiền.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-textLight">Đã dùng / hạn mức ngày</span>
                <strong className="tabular-nums text-text">
                  {formatCurrency(usage.used)} /{" "}
                  {usage.limit === null ? "Không giới hạn" : formatCurrency(usage.limit)}
                </strong>
              </div>
              {usage.percent !== null && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                  <i
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${usage.percent}%` }}
                  />
                </div>
              )}
              <dl className="mt-3 divide-y divide-border text-sm">
                <div className="flex justify-between gap-3 py-2.5">
                  <dt className="text-textLight">Còn có thể yêu cầu trong ngày</dt>
                  <dd className="font-black tabular-nums text-text">
                    {usage.remaining === null ? "Không giới hạn" : formatCurrency(usage.remaining)}
                  </dd>
                </div>
                {usage.countLimit !== null && (
                  <div className="flex justify-between gap-3 py-2.5">
                    <dt className="text-textLight">Số lượt còn lại</dt>
                    <dd className="font-black tabular-nums text-text">
                      {usage.countRemaining ?? "—"} / {usage.countLimit} lượt
                    </dd>
                  </div>
                )}
              </dl>
              <p className="mt-2 text-xs text-textLight">
                Mỗi lần: {formatCurrency(usage.minimum)}–{formatCurrency(usage.maximum)}.
                Số tiền rút còn phụ thuộc số dư khả dụng.
              </p>
            </>
          )}
        </WorkspacePanel>
      </div>

      <WorkspacePanel
        title="Biến động tiền khả dụng"
        description="Từ sao kê ví · không phải doanh thu hay lợi nhuận"
        aside={
          <select
            aria-label="Khoảng thời gian"
            value={period}
            onChange={(event) => setPeriod(Number(event.target.value))}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-textLight outline-none focus:border-primary"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
      >
        <div className="mb-3 flex flex-wrap gap-4 text-[11px] font-bold text-textLight">
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-success" aria-hidden="true" />
            Tăng khả dụng
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-[#537DA9]" aria-hidden="true" />
            Giảm khả dụng
          </span>
        </div>

        {loading ? (
          <p role="status" className="py-14 text-center text-sm text-textLight">
            Đang tải biến động...
          </p>
        ) : ledgerState.error ? (
          <p role="alert" className="py-14 text-center text-sm font-semibold text-error">
            {ledgerState.error}
          </p>
        ) : (
          <>
            {hasFlow ? (
              <DailyFlowChart rows={flowRows} />
            ) : (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-textLight">
                Không có biến động số dư khả dụng trong{" "}
                {formatDayKey(dayKeys[0], { withYear: false })}–
                {formatDayKey(dayKeys[dayKeys.length - 1], { withYear: false })}.
              </p>
            )}
            {ledgerState.truncated && (
              <p className="mt-3 text-xs text-warning">
                Kỳ này có nhiều giao dịch; biểu đồ chỉ tính {MAX_LEDGER_PAGES * LEDGER_PAGE_SIZE} dòng sao kê mới nhất.
              </p>
            )}
          </>
        )}

        <p className="mt-4 rounded-xl bg-background p-3 text-xs leading-5 text-textLight">
          Nhận tiền đơn bán, hoàn tiền và chuyển sang tạm giữ đều làm số dư
          khả dụng thay đổi. Không cộng các khoản này thành thu nhập.
        </p>
      </WorkspacePanel>
    </div>
  );
}

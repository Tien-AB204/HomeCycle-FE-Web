import { useCallback, useEffect, useState } from "react";
import walletApi from "../../services/apis/walletApi";
import { getApiErrorMessage, isCanceledRequest } from "../../utils/apiError";
import { formatCurrency, formatDateTime } from "../../utils/formatter";
import {
  getAmountSign,
  getBalanceTypeLabel,
  getTransactionStatusLabel,
  getTransactionTitle,
  getTransactionTypeInfo,
  isDirectionIn,
} from "./walletTransactions";

const PAGE_SIZE = 10;

const FLOW_CLASS = {
  in: "text-success",
  out: "text-error",
  lock: "text-warning",
  none: "text-textLight",
};

const TransactionDetail = ({ item, detailState }) => {
  const title = getTransactionTitle(item);
  const impacts = detailState?.data?.balanceImpacts || [];

  return (
    <div className="mt-3 space-y-2 rounded-xl bg-background px-4 py-3 text-sm">
      {item.description && item.description !== title && (
        <p className="text-text">{item.description}</p>
      )}

      {detailState?.loading ? (
        <p className="text-textLight">Đang tải chi tiết...</p>
      ) : detailState?.error ? (
        <p className="font-semibold text-error">{detailState.error}</p>
      ) : impacts.length > 0 ? (
        impacts.map((impact, index) => {
          const incoming = isDirectionIn(impact.direction);

          return (
            <div
              key={impact.ledgerId || index}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="font-semibold text-textLight">
                {getBalanceTypeLabel(impact.balanceType)}
              </span>
              <span className="text-right">
                <span
                  className={`font-black ${incoming ? "text-success" : "text-error"}`}
                >
                  {incoming ? "+" : "-"}
                  {formatCurrency(impact.amount)}
                </span>
                <span className="ml-2 text-xs text-textLight">
                  {formatCurrency(impact.balanceBefore)} →{" "}
                  {formatCurrency(impact.balanceAfter)}
                </span>
              </span>
            </div>
          );
        })
      ) : (
        <p className="text-textLight">
          Giao dịch này không làm thay đổi số dư ví của bạn.
        </p>
      )}
    </div>
  );
};

/*
 * Lịch sử giao dịch ví, mỗi giao dịch một dòng; bấm để xem số dư trước/sau.
 * refreshKey đổi thì tải lại trang hiện tại.
 */
export default function WalletTransactionsPanel({ refreshKey = 0 }) {
  const [pageNumber, setPageNumber] = useState(1);
  const [state, setState] = useState({
    key: "",
    result: null,
    error: "",
  });
  const [expandedId, setExpandedId] = useState("");
  const [details, setDetails] = useState({});
  const requestKey = `${pageNumber}-${refreshKey}`;

  useEffect(() => {
    const controller = new AbortController();

    walletApi
      .getTransactions({
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => setState({ key: requestKey, result, error: "" }))
      .catch((error) => {
        if (isCanceledRequest(error) || controller.signal.aborted) {
          return;
        }

        setState({
          key: requestKey,
          result: null,
          error: getApiErrorMessage(
            error,
            "Không thể tải lịch sử giao dịch ví.",
          ),
        });
      });

    return () => controller.abort();
  }, [pageNumber, requestKey]);

  const loadDetail = useCallback(async (id) => {
    setDetails((current) => ({ ...current, [id]: { loading: true } }));

    try {
      const data = await walletApi.getTransactionById(id);
      setDetails((current) => ({ ...current, [id]: { data } }));
    } catch (error) {
      setDetails((current) => ({
        ...current,
        [id]: {
          error: getApiErrorMessage(error, "Không thể tải chi tiết giao dịch."),
        },
      }));
    }
  }, []);

  const toggle = (id) => {
    if (!id) {
      return;
    }

    if (expandedId === id) {
      setExpandedId("");
      return;
    }

    setExpandedId(id);

    if (!details[id]?.data) {
      void loadDetail(id);
    }
  };

  const isLoading = state.key !== requestKey;
  const result = state.result;
  const items = result?.items || [];

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
        Lịch sử ví
      </p>
      <h2 className="mt-1 text-xl font-black text-text">Giao dịch</h2>
      <p className="mt-1 text-sm text-textLight">
        {result
          ? `${result.totalCount} giao dịch. Bấm vào một giao dịch để xem số dư trước và sau.`
          : "Các khoản cộng, trừ hoặc khóa chờ rút của ví."}
      </p>

      {state.error && !isLoading && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error"
        >
          {state.error}
        </p>
      )}

      {isLoading && !result ? (
        <p className="mt-5 rounded-xl border border-border bg-background px-4 py-8 text-center text-sm font-semibold text-textLight">
          Đang tải giao dịch...
        </p>
      ) : !state.error && items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-border bg-background px-4 py-10 text-center">
          <p className="text-sm font-black text-text">Chưa có giao dịch</p>
          <p className="mt-1 text-xs text-textLight">
            Các khoản cộng, trừ hoặc khóa chờ rút sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <ul
          className={`mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border ${
            isLoading ? "opacity-60" : ""
          }`}
        >
          {items.map((item, index) => {
            const id = String(item.walletTransactionId || "");
            const typeInfo = getTransactionTypeInfo(item.transactionType);
            const amount = Math.abs(Number(item.amount || 0));
            const isExpanded = Boolean(id) && expandedId === id;

            return (
              <li key={id || `${item.createdAt}-${index}`} className="bg-white p-4">
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  disabled={!id}
                  aria-expanded={isExpanded}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-text">
                      {getTransactionTitle(item)}
                    </p>
                    <p className="mt-1 text-xs text-textLight">
                      {[
                        item.referenceCode,
                        getTransactionStatusLabel(item.status),
                        formatDateTime(item.createdAt),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-base font-black ${FLOW_CLASS[typeInfo.flow]}`}
                  >
                    {getAmountSign(typeInfo.flow)}
                    {formatCurrency(amount)}
                  </p>
                  <span
                    className="material-symbols-outlined text-textLight"
                    style={{ fontSize: 20 }}
                    aria-hidden="true"
                  >
                    {isExpanded ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {isExpanded && (
                  <TransactionDetail item={item} detailState={details[id]} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {result?.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
            disabled={isLoading || !result.hasPreviousPage}
            className="rounded-lg border border-primary bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-primary/10 disabled:opacity-40"
          >
            Trang trước
          </button>
          <span className="text-xs font-bold text-textLight">
            Trang {result.pageNumber}/{result.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((page) => page + 1)}
            disabled={isLoading || !result.hasNextPage}
            className="rounded-lg border border-primary bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-primary/10 disabled:opacity-40"
          >
            Trang sau
          </button>
        </div>
      )}
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import useFinanceUpdates, { hasItems } from "../../../hooks/useFinanceUpdates";
import financeOperationsApi from "../../../services/apis/financeOperationsApi";
import FinancialTransactionDrawer from "../../finance/FinancialTransactionDrawer";
import {
  PAYMENT_METHOD_LABELS,
  SYSTEM_PURPOSE_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_OPTIONS,
  WALLET_TYPE_LABELS,
  excludeCommissionFeeTransactions,
  formatFinanceDateTime,
  getFinanceLabel,
  getFinanceReferenceLabel,
  shortenFinanceId,
} from "../../finance/financePresentation";
import { money } from "./financeFormat";
import { matchesKeyword } from "./financeLookup";
import { Pager, StatusTag } from "./FinanceLookupParts";

const PAGE_SIZE = 20;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const hasValue = (value) => value !== null && value !== undefined && value !== "";

// Tên ngắn của một bên trong giao dịch; tiền từ PayOS không đi ra từ ví nào.
const partyName = (party, externalSource) => {
  if (party?.username) return party.username;
  if (hasValue(party?.systemPurpose)) return getFinanceLabel(SYSTEM_PURPOSE_LABELS, party.systemPurpose);
  if (hasValue(party?.walletType)) return `Ví ${getFinanceLabel(WALLET_TYPE_LABELS, party.walletType).toLocaleLowerCase("vi-VN")}`;
  if (hasValue(externalSource)) return getFinanceLabel(PAYMENT_METHOD_LABELS, externalSource);
  return "—";
};

const getFromName = (item) => partyName(item.from, item.fromWalletId ? undefined : item.paymentMethod);

export default function FinanceLedgerTab() {
  const [transactionType, setTransactionType] = useState("");
  const [keyword, setKeyword] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const requestKey = `${transactionType}|${pageNumber}|${version}`;
  const [list, setList] = useState({ key: "", items: [], totalCount: 0, totalPages: 0, error: "" });
  const loading = list.key !== requestKey;

  useFinanceUpdates((payload) => {
    if (payload.reconnected || hasItems(payload.financeTransactions)) setVersion((current) => current + 1);
  });

  useEffect(() => {
    const controller = new AbortController();
    financeOperationsApi
      .getTransactions({ transactionType, pageNumber, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((page) =>
        setList({
          key: requestKey,
          items: excludeCommissionFeeTransactions(page.items),
          totalCount: page.totalCount,
          totalPages: page.totalPages,
          error: "",
        }),
      )
      .catch((error) => {
        if (isCanceled(error)) return;
        setList({ key: requestKey, items: [], totalCount: 0, totalPages: 0, error: "Không thể tải lịch sử giao dịch." });
      });
    return () => controller.abort();
  }, [pageNumber, requestKey, transactionType]);

  const rows = useMemo(
    () =>
      list.items.filter((item) =>
        matchesKeyword(
          [
            item.walletTransactionId,
            item.referenceCode,
            getFinanceLabel(TRANSACTION_TYPE_LABELS, item.transactionType),
            getFromName(item),
            partyName(item.to),
          ],
          keyword,
        ),
      ),
    [keyword, list.items],
  );

  return (
    <section>
      <div className="section-title">
        <div>
          <h2>Lịch sử giao dịch</h2>
          <p className="muted">Các lần tăng, giảm hoặc chuyển tiền được ghi nhận trong ví.</p>
        </div>
      </div>
      <section className="panel">
        <div className="filters">
          <label className="search">
            Tìm trong trang này
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Mã giao dịch, tham chiếu, tài khoản" />
          </label>
          <label>
            Loại giao dịch
            <select
              value={transactionType}
              onChange={(event) => {
                setPageNumber(1);
                setTransactionType(event.target.value);
              }}
            >
              <option value="">Tất cả loại</option>
              {TRANSACTION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        {list.error && <div className="notice error">{list.error}</div>}
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Giao dịch / Tham chiếu</th><th>Thời gian</th><th>Loại giao dịch</th><th className="num">Số tiền giao dịch</th><th>Từ / Đến</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="empty">{loading ? "Đang tải..." : "Không có giao dịch phù hợp với bộ lọc."}</td></tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.walletTransactionId}>
                    <td>
                      <strong>{getFinanceReferenceLabel(item.referenceType, item.referenceCode, item.referenceId)}</strong>
                      <small title={item.walletTransactionId}>Mã giao dịch {shortenFinanceId(item.walletTransactionId)}</small>
                    </td>
                    <td>{formatFinanceDateTime(item.createdAt)}</td>
                    <td>{getFinanceLabel(TRANSACTION_TYPE_LABELS, item.transactionType)}</td>
                    <td className="num">{money(item.amount)}</td>
                    <td>
                      {getFromName(item)}
                      <small>→ {partyName(item.to)}</small>
                    </td>
                    <td><StatusTag>{getFinanceLabel(TRANSACTION_STATUS_LABELS, item.status)}</StatusTag></td>
                    <td><button type="button" onClick={() => setSelectedId(item.walletTransactionId)}>Chi tiết</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager
          summary={`${list.totalCount.toLocaleString("vi-VN")} giao dịch${keyword.trim() ? ` · ${rows.length} khớp trong trang này` : ""}`}
          pageNumber={pageNumber}
          totalPages={list.totalPages}
          loading={loading}
          onChange={setPageNumber}
        />
        <p className="footnote">
          Một giao dịch có thể làm thay đổi nhiều ví nên số tiền không kèm dấu +/−. Bấm “Chi tiết” để xem từng ví tăng hay giảm.
          Không cộng toàn bộ giao dịch thành doanh thu hoặc tiền vào bên ngoài.
        </p>
      </section>

      <FinancialTransactionDrawer transactionId={selectedId} onClose={() => setSelectedId("")} />
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import useFinanceUpdates, { hasItems } from "../../../hooks/useFinanceUpdates";
import financeOperationsApi from "../../../services/apis/financeOperationsApi";
import {
  USER_ROLE_LABELS,
  WALLET_TYPE_LABELS,
  getFinanceLabel,
  getFinanceReferenceLabel,
} from "../../finance/financePresentation";
import { money } from "./financeFormat";
import {
  getHoldRelation,
  getHoldRelationKey,
  matchesKeyword,
  paginate,
} from "./financeLookup";
import { Pager, RecordDialog, StatusTag } from "./FinanceLookupParts";

const PAGE_SIZE = 20;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const getAccountType = (owner) =>
  owner?.role
    ? getFinanceLabel(USER_ROLE_LABELS, owner.role)
    : getFinanceLabel(WALLET_TYPE_LABELS, owner?.walletType);

const toRecord = (item) => ({
  title: "Khoản tạm giữ",
  rows: [
    ["Tài khoản", item.owner?.username || "—"],
    ["Mã tài khoản", item.owner?.userId || "—"],
    ["Loại tài khoản", getAccountType(item.owner)],
    ["Tiền tạm giữ", money(item.holdAmount)],
    ["Khoản liên quan", getHoldRelation(item)],
    ["Tham chiếu", getFinanceReferenceLabel(item.referenceType, item.referenceCode, item.referenceId)],
    ["Mã tham chiếu", item.referenceId || "—"],
  ],
});

export default function FinanceHoldsTab() {
  const [keyword, setKeyword] = useState("");
  const [relation, setRelation] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [record, setRecord] = useState(null);
  const [state, setState] = useState({ key: -1, items: [], error: "" });
  const loading = state.key !== version;

  useFinanceUpdates((payload) => {
    if (payload.reconnected || hasItems(payload.wallets)) setVersion((current) => current + 1);
  });

  useEffect(() => {
    const controller = new AbortController();
    financeOperationsApi
      .getHolds({ signal: controller.signal })
      .then((data) => setState({ key: version, items: Array.isArray(data) ? data : [], error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ key: version, items: [], error: "Không thể tải các khoản tạm giữ." });
      });
    return () => controller.abort();
  }, [version]);

  // API trả toàn bộ khoản tạm giữ (không phân trang) nên lọc ngay trên danh sách đã tải.
  const relationOptions = useMemo(() => {
    const options = new Map();
    state.items.forEach((item) => options.set(getHoldRelationKey(item), getHoldRelation(item)));
    return [...options.entries()];
  }, [state.items]);

  const filtered = useMemo(
    () =>
      state.items.filter(
        (item) =>
          (!relation || getHoldRelationKey(item) === relation) &&
          matchesKeyword([item.owner?.username, item.owner?.userId, item.referenceCode, item.referenceId], keyword),
      ),
    [keyword, relation, state.items],
  );
  const total = filtered.reduce((sum, item) => sum + (Number(item.holdAmount) || 0), 0);
  const page = paginate(filtered, pageNumber, PAGE_SIZE);

  return (
    <section>
      <div className="section-title">
        <div>
          <h2>Tạm giữ trong ví người dùng</h2>
          <p className="muted">Phần tiền trong ví người dùng đang bị khóa và chưa thể sử dụng.</p>
        </div>
        <span className="pill">Số dư hiện tại</span>
      </div>
      <section className="panel">
        <div className="filters">
          <label className="search">
            Tìm tài khoản
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPageNumber(1);
              }}
              placeholder="Tên, mã tài khoản hoặc mã tham chiếu"
            />
          </label>
          <label>
            Khoản liên quan
            <select
              value={relation}
              onChange={(event) => {
                setRelation(event.target.value);
                setPageNumber(1);
              }}
            >
              <option value="">Tất cả khoản</option>
              {relationOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
        {state.error && <div className="notice error">{state.error}</div>}
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Tài khoản</th><th>Tham chiếu</th><th>Loại tài khoản</th><th className="num">Tiền tạm giữ</th><th>Khoản liên quan</th><th /></tr>
            </thead>
            <tbody>
              {page.items.length === 0 ? (
                <tr><td colSpan={6} className="empty">{loading ? "Đang tải..." : "Không có khoản tạm giữ phù hợp."}</td></tr>
              ) : (
                page.items.map((item) => (
                  <tr key={`${item.walletId}-${item.referenceId || "hold"}`}>
                    <td>
                      <strong>{item.owner?.username || "—"}</strong>
                      {item.owner?.userId && <small title={item.owner.userId}>{item.owner.userId}</small>}
                    </td>
                    <td>{getFinanceReferenceLabel(item.referenceType, item.referenceCode, item.referenceId)}</td>
                    <td>{getAccountType(item.owner)}</td>
                    <td className="num"><strong>{money(item.holdAmount)}</strong></td>
                    <td><StatusTag warning={getHoldRelationKey(item) === "Withdrawal"}>{getHoldRelation(item)}</StatusTag></td>
                    <td><button type="button" onClick={() => setRecord(toRecord(item))}>Chi tiết</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager
          summary={`${filtered.length.toLocaleString("vi-VN")} khoản · tổng ${money(total)}`}
          pageNumber={page.page}
          totalPages={page.totalPages}
          onChange={setPageNumber}
        />
        <p className="footnote">Tạm giữ trong ví người dùng và tiền hệ thống giữ cho đơn hàng là hai khoản riêng biệt.</p>
      </section>

      <RecordDialog record={record} onClose={() => setRecord(null)} />
    </section>
  );
}

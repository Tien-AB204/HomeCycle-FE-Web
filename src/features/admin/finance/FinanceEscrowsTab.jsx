import { useEffect, useState } from "react";
import useFinanceUpdates, { isOrderEscrowEvent } from "../../../hooks/useFinanceUpdates";
import financeOperationsApi from "../../../services/apis/financeOperationsApi";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_LABELS,
  formatFinanceDateTime,
  getFinanceLabel,
} from "../../finance/financePresentation";
import { money } from "./financeFormat";
import { Pager, RecordDialog, StatusTag } from "./FinanceLookupParts";

const PAGE_SIZE = 20;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const toRecord = (item) => ({
  title: `Đơn ${item.orderCode || "—"}`,
  rows: [
    ["Sản phẩm", item.productName || "—"],
    ["Người mua", item.buyerUsername || "—"],
    ["Người bán", item.sellerUsername || "—"],
    ["Tiền đang giữ", money(item.escrowAmount)],
    ["Trạng thái đơn", getFinanceLabel(ORDER_STATUS_LABELS, item.orderStatus)],
    ["Thanh toán", getFinanceLabel(PAYMENT_STATUS_LABELS, item.paymentStatus)],
    ["Tranh chấp", item.hasActiveDispute ? "Đang có tranh chấp" : "Không"],
    ["Hết hạn khiếu nại", item.disputeWindowEndsAt ? formatFinanceDateTime(item.disputeWindowEndsAt) : "Chưa xác định"],
    ["Cập nhật đơn", formatFinanceDateTime(item.updatedAt)],
  ],
});

export default function FinanceEscrowsTab() {
  const [keywordInput, setKeywordInput] = useState("");
  const [filters, setFilters] = useState({ keyword: "", orderStatus: "", hasActiveDispute: "" });
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [record, setRecord] = useState(null);
  const requestKey = `${JSON.stringify(filters)}|${pageNumber}|${version}`;
  const [list, setList] = useState({ key: "", items: [], totalCount: 0, totalPages: 0, error: "" });
  const loading = list.key !== requestKey;

  useFinanceUpdates((payload) => {
    if (payload.reconnected || isOrderEscrowEvent(payload)) setVersion((current) => current + 1);
  });

  // API có tìm theo từ khóa; chờ người dùng gõ xong mới gọi.
  useEffect(() => {
    const timer = setTimeout(() => {
      const keyword = keywordInput.trim();
      setFilters((current) => (current.keyword === keyword ? current : { ...current, keyword }));
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    const controller = new AbortController();
    financeOperationsApi
      .getOrderEscrows({ ...filters, pageNumber, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((page) => setList({ key: requestKey, items: page.items, totalCount: page.totalCount, totalPages: page.totalPages, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setList({ key: requestKey, items: [], totalCount: 0, totalPages: 0, error: "Không thể tải danh sách tiền đơn hàng đang giữ." });
      });
    return () => controller.abort();
  }, [filters, pageNumber, requestKey]);

  const updateFilter = (key, value) => {
    setPageNumber(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <section>
      <div className="section-title">
        <div>
          <h2>Tiền đơn hàng đang giữ</h2>
          <p className="muted">Tiền hệ thống giữ cho từng đơn, chờ giải ngân hoặc hoàn cho người mua.</p>
        </div>
        <span className="pill">Số dư hiện tại</span>
      </div>
      <section className="panel">
        <div className="filters">
          <label className="search">
            Tìm đơn hàng
            <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="Mã đơn, người mua hoặc người bán" />
          </label>
          <label>
            Trạng thái đơn
            <select value={filters.orderStatus} onChange={(event) => updateFilter("orderStatus", event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {ORDER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            Tranh chấp
            <select value={filters.hasActiveDispute} onChange={(event) => updateFilter("hasActiveDispute", event.target.value)}>
              <option value="">Tất cả</option>
              <option value="true">Đang có tranh chấp</option>
              <option value="false">Không có tranh chấp</option>
            </select>
          </label>
        </div>
        {list.error && <div className="notice error">{list.error}</div>}
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Đơn hàng / Sản phẩm</th><th>Cập nhật đơn</th><th>Người mua</th><th className="num">Tiền đang giữ</th><th>Trạng thái đơn</th><th /></tr>
            </thead>
            <tbody>
              {list.items.length === 0 ? (
                <tr><td colSpan={6} className="empty">{loading ? "Đang tải..." : "Không có đơn hàng nào đang được giữ tiền."}</td></tr>
              ) : (
                list.items.map((item) => (
                  <tr key={item.orderId}>
                    <td>
                      <strong>{item.orderCode || "—"}</strong>
                      <small>{item.productName || "—"}</small>
                    </td>
                    <td>{formatFinanceDateTime(item.updatedAt)}</td>
                    <td>
                      {item.buyerUsername || "—"}
                      <small>Người bán: {item.sellerUsername || "—"}</small>
                    </td>
                    <td className="num"><strong>{money(item.escrowAmount)}</strong></td>
                    <td>
                      <StatusTag warning={item.hasActiveDispute}>
                        {item.hasActiveDispute ? "Có tranh chấp" : getFinanceLabel(ORDER_STATUS_LABELS, item.orderStatus)}
                      </StatusTag>
                    </td>
                    <td><button type="button" onClick={() => setRecord(toRecord(item))}>Chi tiết</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager
          summary={`${list.totalCount.toLocaleString("vi-VN")} đơn còn tiền đang giữ`}
          pageNumber={pageNumber}
          totalPages={list.totalPages}
          loading={loading}
          onChange={setPageNumber}
        />
        <p className="footnote">Chỉ hiển thị đơn còn tiền đang giữ. Tổng số dư ví ký quỹ đơn hàng nằm ở tab Tổng quan.</p>
      </section>

      <RecordDialog record={record} onClose={() => setRecord(null)} />
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import useFinanceUpdates from "../../../hooks/useFinanceUpdates";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import financeOperationsApi from "../../../services/apis/financeOperationsApi";
import { PaymentDetailDrawer } from "../../finance/PaymentManagementPanel";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TYPE_LABELS,
  formatFinanceDateTime,
  getFinanceLabel,
} from "../../finance/financePresentation";
import { countOf } from "../operations/operationsPresentation";
import { formatCompact, money } from "./financeFormat";
import { matchesKeyword } from "./financeLookup";
import { Pager, StatusTag } from "./FinanceLookupParts";

const PAGE_SIZE = 20;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const PAYMENT_METHOD_NAMES = { PayOS: "PayOS", Internal_Wallet: "Ví nội bộ", Unknown: "Chưa xác định", Unspecified: "Chưa xác định" };

const PAYMENT_STATES = [
  ["Pending", "Chờ thanh toán", "var(--amber)"],
  ["Completed", "Đã hoàn tất", "#2f7b64"],
  ["Failed", "Thất bại", "var(--red)"],
  ["Refunded", "Đã hoàn tiền", "var(--blue)"],
  ["PartiallyRefunded", "Hoàn tiền một phần", "var(--teal)"],
  ["Expired", "Đã hết hạn", "#8a969d"],
  ["Cancelled", "Đã hủy", "var(--red)"],
];

const WARNING_STATUSES = new Set(["Pending", "Failed", "Expired", "Cancelled", "0", "2", "5", "6"]);

function PaymentStats({ refreshKey }) {
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    const controller = new AbortController();
    adminDashboardApi
      .getPayments({ signal: controller.signal })
      .then((data) => setState({ loading: false, data }))
      .catch((error) => {
        if (!isCanceled(error)) setState({ loading: false, data: null });
      });
    return () => controller.abort();
  }, [refreshKey]);

  const methods = Array.isArray(state.data?.paymentMethodPerformance) ? state.data.paymentMethodPerformance : [];
  const distribution = state.data?.currentStatusDistribution;
  const total = PAYMENT_STATES.reduce((sum, [key]) => sum + countOf(distribution, key), 0);
  const stops = PAYMENT_STATES.reduce(
    (result, [key, , color]) => {
      const count = countOf(distribution, key);
      if (!count || !total) return result;
      const end = result.angle + (count / total) * 360;
      return { angle: end, stops: [...result.stops, `${color} ${result.angle}deg ${end}deg`] };
    },
    { angle: 0, stops: [] },
  ).stops;

  return (
    <div className="split payment-analysis">
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Thanh toán theo phương thức</h2>
            <p className="muted">Toàn bộ thanh toán hiện có · không phụ thuộc kỳ báo cáo</p>
          </div>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Phương thức</th><th className="num">Tổng</th><th className="num">Đã thanh toán</th><th className="num">Thất bại</th><th className="num">Tỷ lệ</th></tr>
            </thead>
            <tbody>
              {methods.length === 0 ? (
                <tr><td colSpan={5} className="empty">{state.loading ? "Đang tải..." : "Chưa có thanh toán."}</td></tr>
              ) : (
                methods.map((item) => (
                  <tr key={item.method}>
                    <td><strong>{PAYMENT_METHOD_NAMES[item.method] || item.method}</strong></td>
                    <td className="num">{item.totalCount}</td>
                    <td className="num">{item.paidCount}</td>
                    <td className="num">{item.failedCount}</td>
                    <td className="num">{item.successRate === null || item.successRate === undefined ? "—" : `${formatCompact(item.successRate)}%`}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="footnote">Tỷ lệ = đã thanh toán / (đã thanh toán + thất bại). “Đã thanh toán” gồm khoản có thời điểm thanh toán, kể cả sau đó hoàn tiền.</p>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Thanh toán theo trạng thái</h2>
            <p className="muted">Trạng thái hiện tại · không phụ thuộc kỳ báo cáo</p>
          </div>
        </div>
        <div className="payment-donut-layout">
          <div
            className="payment-donut"
            role="img"
            aria-label={`${total} thanh toán: ${PAYMENT_STATES.map(([key, label]) => `${countOf(distribution, key)} ${label.toLocaleLowerCase("vi-VN")}`).join(", ")}`}
            style={{ background: stops.length ? `conic-gradient(${stops.join(",")})` : "#edf1f3" }}
          >
            <div><strong>{total}</strong><span>thanh toán</span></div>
          </div>
          <div className="payment-state-list">
            {PAYMENT_STATES.map(([key, label, color]) => {
              const count = countOf(distribution, key);
              return (
                <div key={key}>
                  <span><i style={{ background: color }} />{label}</span>
                  <strong>{count}</strong>
                  <small>{total ? `${formatCompact((count / total) * 100)}%` : "0%"}</small>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function FinancePaymentsTab() {
  const [filters, setFilters] = useState({ method: "", status: "" });
  const [keyword, setKeyword] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const requestKey = `${filters.method}|${filters.status}|${pageNumber}|${version}`;
  const [list, setList] = useState({ key: "", items: [], totalCount: 0, totalPages: 0, error: "" });
  const loading = list.key !== requestKey;

  useFinanceUpdates((payload) => {
    if (payload.reconnected || payload.managementPayment) setVersion((current) => current + 1);
  });

  useEffect(() => {
    const controller = new AbortController();
    financeOperationsApi
      .getPayments({ ...filters, pageNumber, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((page) => setList({ key: requestKey, items: page.items, totalCount: page.totalCount, totalPages: page.totalPages, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setList({ key: requestKey, items: [], totalCount: 0, totalPages: 0, error: "Không thể tải danh sách thanh toán." });
      });
    return () => controller.abort();
  }, [filters, pageNumber, requestKey]);

  const rows = useMemo(
    () =>
      list.items.filter((item) =>
        matchesKeyword([item.description, item.payerUsername, item.paymentId, item.orderId, item.subscriptionId], keyword),
      ),
    [keyword, list.items],
  );

  const updateFilter = (key, value) => {
    setPageNumber(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <section>
      <div className="section-title">
        <div>
          <h2>Thanh toán</h2>
          <p className="muted">Theo dõi kết quả thanh toán và tra cứu từng yêu cầu.</p>
        </div>
        <span className="pill">Trạng thái hiện tại</span>
      </div>

      <PaymentStats refreshKey={version} />

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Danh sách thanh toán</h2>
            <p className="muted">Lọc theo phương thức, trạng thái; ô tìm kiếm chỉ tìm trong trang đang xem.</p>
          </div>
        </div>
        <div className="filters">
          <label className="search">
            Tìm trong trang này
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Nội dung, người trả, mã đơn" />
          </label>
          <label>
            Phương thức
            <select value={filters.method} onChange={(event) => updateFilter("method", event.target.value)}>
              <option value="">Tất cả phương thức</option>
              {PAYMENT_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            Trạng thái
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        {list.error && <div className="notice error">{list.error}</div>}
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Thanh toán / Nội dung</th><th>Thời gian tạo</th><th>Phương thức</th><th className="num">Số tiền</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="empty">{loading ? "Đang tải..." : "Không có thanh toán phù hợp với bộ lọc."}</td></tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.paymentId}>
                    <td>
                      <strong>{item.description || getFinanceLabel(PAYMENT_TYPE_LABELS, item.paymentType)}</strong>
                      <small>{[item.payerUsername, getFinanceLabel(PAYMENT_TYPE_LABELS, item.paymentType)].filter(Boolean).join(" · ")}</small>
                    </td>
                    <td>{formatFinanceDateTime(item.createdAt)}</td>
                    <td>{getFinanceLabel(PAYMENT_METHOD_LABELS, item.paymentMethod)}</td>
                    <td className="num">{money(item.amount)}</td>
                    <td>
                      <StatusTag warning={WARNING_STATUSES.has(String(item.paymentStatus))}>
                        {getFinanceLabel(PAYMENT_STATUS_LABELS, item.paymentStatus)}
                      </StatusTag>
                    </td>
                    <td><button type="button" onClick={() => setSelectedId(item.paymentId)}>Chi tiết</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager
          summary={`${list.totalCount.toLocaleString("vi-VN")} thanh toán${keyword.trim() ? ` · ${rows.length} khớp trong trang này` : ""}`}
          pageNumber={pageNumber}
          totalPages={list.totalPages}
          loading={loading}
          onChange={setPageNumber}
        />
      </section>

      <PaymentDetailDrawer paymentId={selectedId} onClose={() => setSelectedId("")} />
    </section>
  );
}

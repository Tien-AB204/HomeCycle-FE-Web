import { useEffect, useState } from "react";
import { getDisputeStatusMeta } from "../../../constants/disputes";
import {
  adminAppointmentHistoryApi,
  adminOrderHistoryApi,
} from "../../../services/apis/adminHistoryApi";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  DELIVERY_METHOD_LABELS,
  ORDER_GROUP_OPTIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_ORDER,
  PAYMENT_STATUS_LABELS,
  enumKey,
  formatDateTime,
  formatMoney,
  labelOf,
  pillTone,
  shiftDayKey,
  vnDayStartIso,
} from "./operationsPresentation";

const PAGE_SIZE = 8;

const EMPTY_HISTORY_FILTERS = Object.freeze({
  keyword: "",
  status: "",
  type: "",
  deliveryMethod: "",
  hasActiveDispute: "",
  inspection: "",
  paymentStatus: "",
  group: "",
  isOverdue: "",
  from: "",
  to: "",
});

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const yesNo = (value) => (value === "yes" ? true : value === "no" ? false : undefined);

const dateRange = (filters) => ({
  from: filters.from ? vnDayStartIso(filters.from) : undefined,
  to: filters.to ? vnDayStartIso(shiftDayKey(filters.to, 1)) : undefined,
});

const loadOrders = (filters, pageNumber, signal) => {
  const range = dateRange(filters);
  return adminOrderHistoryApi.getOrders({
    keyword: filters.keyword,
    status: filters.status || undefined,
    deliveryMethod: filters.deliveryMethod || undefined,
    hasActiveDispute: yesNo(filters.hasActiveDispute),
    hasInspection: yesNo(filters.inspection),
    paymentStatus: filters.paymentStatus || undefined,
    group: filters.group || undefined,
    createdFrom: range.from,
    createdTo: range.to,
    pageNumber,
    pageSize: PAGE_SIZE,
    signal,
  });
};

const loadAppointments = (filters, pageNumber, signal) => {
  const range = dateRange(filters);
  return adminAppointmentHistoryApi.getAppointments({
    keyword: filters.keyword,
    status: filters.status || undefined,
    type: filters.type || undefined,
    deliveryMethod: filters.deliveryMethod || undefined,
    hasOpenDispute: yesNo(filters.hasActiveDispute),
    hasInspectionForm: yesNo(filters.inspection),
    isOverdue: yesNo(filters.isOverdue),
    scheduledFrom: range.from,
    scheduledTo: range.to,
    pageNumber,
    pageSize: PAGE_SIZE,
    signal,
  });
};

function StatusPill({ value, kind, labels }) {
  const key = enumKey(value, kind);
  return <span className={`pill ${pillTone(key)}`}>{labelOf(labels, value, kind)}</span>;
}

function OrderRows({ items, onOpenDetail }) {
  return items.map((order) => (
    <tr key={order.orderId}>
      <td>
        <strong>{order.orderCode || "Chưa có mã"}</strong>
        <small>{order.productName || "Sản phẩm HomeCycle"}</small>
        {order.dispute?.latestDisputeId && (
          <small
            className="muted"
            style={order.dispute.hasActiveDispute ? { color: "var(--red)" } : undefined}
          >
            {order.dispute.hasActiveDispute
              ? "Đang tranh chấp"
              : getDisputeStatusMeta(order.dispute.latestDisputeStatus).label}
          </small>
        )}
      </td>
      <td>
        {formatMoney(order.finalTotalAmount)}
        <small>{order.quantity ?? 0} sản phẩm</small>
      </td>
      <td>
        <StatusPill value={order.orderStatus} kind="order" labels={ORDER_STATUS_LABELS} />
        <small>{labelOf(PAYMENT_STATUS_LABELS, order.paymentStatus, "payment")}</small>
      </td>
      <td>
        {order.buyer?.username || "—"}
        <small>{order.seller?.username || "—"}</small>
      </td>
      <td>{formatDateTime(order.createdAt)}</td>
      <td>
        <button type="button" onClick={() => onOpenDetail("order", order)}>Chi tiết</button>
      </td>
    </tr>
  ));
}

function AppointmentRows({ items, onOpenDetail }) {
  return items.map((item) => {
    const status = enumKey(item.appointmentStatus, "appointment");
    const replaced = item.cancellationReason === "Rescheduled";
    return (
      <tr key={item.appointmentId}>
        <td>
          <strong>{item.productName || "Sản phẩm HomeCycle"}</strong>
          <small>{item.orderCode || "Chưa có mã đơn"}</small>
        </td>
        <td>{labelOf(APPOINTMENT_TYPE_LABELS, item.appointmentType, "appointmentType")}</td>
        <td>
          {formatDateTime(item.scheduledAt)}
          <small>{item.location || "Chưa có địa điểm"}</small>
        </td>
        <td>
          <span className={`pill ${pillTone(status)}`}>
            {replaced ? "Đã thay thế" : APPOINTMENT_STATUS_LABELS[status] || "Chưa xác định"}
          </span>
          {item.isOverdue && <small style={{ color: "var(--red)" }}>Quá hạn hẹn</small>}
        </td>
        <td>
          {item.hasInspectionForm || item.inspectionFormId
            ? "Có phiếu kiểm tra"
            : status === "Proposed"
              ? "Chưa chấp nhận"
              : replaced
                ? "Lịch cũ đã thay thế"
                : "—"}
          {item.hasOpenDispute && <small>Tranh chấp mở</small>}
        </td>
        <td>
          <button type="button" onClick={() => onOpenDetail("appointment", item)}>Chi tiết</button>
        </td>
      </tr>
    );
  });
}

export default function OperationsHistory({ preset, onOpenDetail }) {
  const [kind, setKind] = useState(preset?.kind || "orders");
  const [draft, setDraft] = useState({ ...EMPTY_HISTORY_FILTERS, ...preset?.filters });
  const [applied, setApplied] = useState({ ...EMPTY_HISTORY_FILTERS, ...preset?.filters });
  const [pageNumber, setPageNumber] = useState(1);
  const [state, setState] = useState({ loading: true, error: "", result: null });

  // Mở từ Tổng quan với bộ lọc dựng sẵn (vd. "Đơn đang tranh chấp").
  useEffect(() => {
    if (!preset) return;
    const next = { ...EMPTY_HISTORY_FILTERS, ...preset.filters };
    void Promise.resolve().then(() => {
      setKind(preset.kind || "orders");
      setDraft(next);
      setApplied(next);
      setPageNumber(1);
    });
  }, [preset]);

  useEffect(() => {
    const controller = new AbortController();
    const loader = kind === "orders" ? loadOrders : loadAppointments;

    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    loader(applied, pageNumber, controller.signal)
      .then((result) => setState({ loading: false, error: "", result }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, error: "Không thể tải dữ liệu tra cứu.", result: null });
      });

    return () => controller.abort();
  }, [kind, applied, pageNumber]);

  const isOrders = kind === "orders";
  const items = Array.isArray(state.result?.items) ? state.result.items : [];
  const totalCount = Number(state.result?.totalCount) || 0;
  const totalPages = Math.max(1, Number(state.result?.totalPages) || 1);

  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const apply = () => {
    setApplied({ ...draft });
    setPageNumber(1);
  };
  const reset = () => {
    setDraft({ ...EMPTY_HISTORY_FILTERS });
    setApplied({ ...EMPTY_HISTORY_FILTERS });
    setPageNumber(1);
  };
  const switchKind = (nextKind) => {
    if (nextKind === kind) return;
    setKind(nextKind);
    reset();
  };

  const statusOptions = isOrders
    ? ORDER_STATUS_ORDER.map((key) => [key, ORDER_STATUS_LABELS[key]])
    : ["Scheduled", "InProgress", "Completed", "Cancelled", "Expired", "Proposed"].map((key) => [key, APPOINTMENT_STATUS_LABELS[key]]);

  const first = totalCount ? (pageNumber - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(pageNumber * PAGE_SIZE, totalCount);

  return (
    <section>
      <div className="header">
        <div className="eyebrow">TRA CỨU VẬN HÀNH</div>
        <h1>Lịch sử đơn hàng & lịch hẹn</h1>
        <p className="muted">Giữ hai danh sách riêng, kết nối qua mã đơn và trang chi tiết. Quản trị viên chỉ xem.</p>
      </div>

      <div className="histcards">
        <button type="button" aria-selected={isOrders} onClick={() => switchKind("orders")}>
          <strong>Đơn hàng</strong>
          <span className="muted">Thông tin giao dịch, thanh toán và lịch sử liên quan</span>
        </button>
        <button type="button" aria-selected={!isOrders} onClick={() => switchKind("appointments")}>
          <strong>Lịch hẹn</strong>
          <span className="muted">Kiểm định, thu gom, điểm danh và phiếu kiểm tra</span>
        </button>
      </div>

      <section className="panel">
        <div className="filters">
          <label className="search">
            Tìm kiếm
            <input
              value={draft.keyword}
              onChange={update("keyword")}
              onKeyDown={(event) => event.key === "Enter" && apply()}
              placeholder="Mã đơn, sản phẩm, người mua, người bán…"
            />
          </label>
          <label>
            Trạng thái
            <select value={draft.status} onChange={update("status")}>
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {!isOrders && (
            <label>
              Loại lịch
              <select value={draft.type} onChange={update("type")}>
                <option value="">Tất cả loại lịch</option>
                {Object.entries(APPOINTMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="primary" onClick={apply}>Tìm kiếm</button>
          <button type="button" onClick={reset}>Xóa bộ lọc</button>
        </div>

        <details className="advanced">
          <summary>Bộ lọc bổ sung</summary>
          <div className="filters">
            <label>
              Cách giao nhận
              <select value={draft.deliveryMethod} onChange={update("deliveryMethod")}>
                <option value="">Tất cả</option>
                {["GhnDelivery", "SellerDelivers", "BuyerPickUp"].map((key) => (
                  <option key={key} value={key}>{DELIVERY_METHOD_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label>
              Tranh chấp
              <select value={draft.hasActiveDispute} onChange={update("hasActiveDispute")}>
                <option value="">Tất cả</option>
                <option value="yes">Có tranh chấp mở</option>
                <option value="no">Không</option>
              </select>
            </label>
            <label>
              Kiểm định / phiếu kiểm tra
              <select value={draft.inspection} onChange={update("inspection")}>
                <option value="">Tất cả</option>
                <option value="yes">Có</option>
                <option value="no">Không</option>
              </select>
            </label>
            {isOrders ? (
              <>
                <label>
                  Thanh toán
                  <select value={draft.paymentStatus} onChange={update("paymentStatus")}>
                    <option value="">Tất cả</option>
                    {["Pending", "Completed", "Refunded"].map((key) => (
                      <option key={key} value={key}>{PAYMENT_STATUS_LABELS[key]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nhóm đơn
                  <select value={draft.group} onChange={update("group")}>
                    <option value="">Tất cả</option>
                    {ORDER_GROUP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label>
                Quá hạn hẹn
                <select value={draft.isOverdue} onChange={update("isOverdue")}>
                  <option value="">Tất cả</option>
                  <option value="yes">Có</option>
                  <option value="no">Không</option>
                </select>
              </label>
            )}
            <label>
              {isOrders ? "Ngày tạo từ" : "Ngày hẹn từ"}
              <input type="date" value={draft.from} onChange={update("from")} />
            </label>
            <label>
              Đến hết ngày
              <input type="date" value={draft.to} onChange={update("to")} />
            </label>
          </div>
        </details>

        <p className="muted">
          {isOrders
            ? "Lọc ngày theo ngày tạo đơn. Báo cáo hoàn tất theo kỳ dùng ngày hoàn tất nên không đối chiếu trực tiếp bằng bộ lọc ngày tạo."
            : "Lịch sử giữ cả đề xuất đổi lịch và lịch đã thay thế. Ngày lọc là ngày hẹn; lịch tháng chỉ tính lịch hiệu lực."}
        </p>

        {state.error && <div className="notice error" role="alert">{state.error}</div>}

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                {(isOrders
                  ? ["Đơn hàng", "Số lượng / Giá trị", "Trạng thái / Thanh toán", "Người mua / Người bán", "Ngày tạo", ""]
                  : ["Lịch hẹn / Đơn hàng", "Loại lịch", "Ngày hẹn / Địa điểm", "Trạng thái", "Ghi nhận", ""]
                ).map((label, index) => <th key={label || index}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {state.loading && items.length === 0 ? (
                <tr><td colSpan={6} className="empty">Đang tải dữ liệu...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="empty">Không có kết quả phù hợp.</td></tr>
              ) : isOrders ? (
                <OrderRows items={items} onOpenDetail={onOpenDetail} />
              ) : (
                <AppointmentRows items={items} onOpenDetail={onOpenDetail} />
              )}
            </tbody>
          </table>
        </div>

        <div className="row pagination">
          <span aria-live="polite">{totalCount} kết quả · {first}–{last} đang hiển thị</span>
          <div>
            <button type="button" disabled={pageNumber <= 1 || state.loading} onClick={() => setPageNumber((page) => page - 1)}>
              Trước
            </button>{" "}
            <span>{pageNumber} / {totalPages}</span>{" "}
            <button type="button" disabled={pageNumber >= totalPages || state.loading} onClick={() => setPageNumber((page) => page + 1)}>
              Sau
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

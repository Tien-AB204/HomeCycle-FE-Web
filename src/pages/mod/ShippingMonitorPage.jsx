import { useEffect, useState } from "react";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/mod/shipping/shipping-monitor.css";
import {
  DELIVERY_METHODS,
  SHIPMENT_STATUSES,
  getDeliveryMethodLabel,
  getGhnCreationLabel,
  getPageStats,
  getShipmentStatusMeta,
  isGhnDelivery,
} from "../../features/mod/shipping/shippingMonitor";
import moderatorOrderApi from "../../services/apis/moderatorOrderApi";
import { getSafeProblemDetail } from "../../utils/safeErrorMessage";

const PAGE_SIZE = 10;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
};

// Thông báo lỗi theo hướng dẫn BE: 403 không có quyền, còn lại dùng message trả về.
const getErrorMessage = (error, fallback) => {
  const status = error?.response?.status;
  if (status === 403) return "Bạn không có quyền xem thông tin này.";
  const data = error?.response?.data;
  return (
    getSafeProblemDetail(data?.message) ||
    getSafeProblemDetail(data?.error?.message) ||
    getSafeProblemDetail(data?.detail) ||
    (status === 404 ? "Đơn hàng không tồn tại hoặc chưa có vận đơn." : "") ||
    (status === 409 ? "Thiếu thông tin GHN hoặc mã vận đơn." : "") ||
    fallback
  );
};

const StatusPill = ({ status }) => {
  const meta = getShipmentStatusMeta(status);
  return <span className={`pill ${meta.tone}`}>{meta.label}</span>;
};

const Field = ({ label, children }) => (
  <div>
    <span className="field-label">{label}</span>
    {children || "—"}
  </div>
);

function GhnTracking({ orderId, version }) {
  const requestKey = `${orderId}|${version}`;
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const loading = state.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    moderatorOrderApi
      .getShipmentTracking(orderId, { signal: controller.signal })
      .then((data) => setState({ key: requestKey, data, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ key: requestKey, data: null, error: getErrorMessage(error, "Không thể tải tracking GHN.") });
      });
    return () => controller.abort();
  }, [orderId, requestKey]);

  const data = state.data;

  return (
    <div className="tracking-box">
      <h3>Tracking GHN</h3>
      {loading ? (
        <p className="muted">Đang tải tracking GHN...</p>
      ) : state.error ? (
        <div className="notice error">{state.error}</div>
      ) : (
        <>
          {!data?.trackingCode && data?.message && <p className="tracking-message">{data.message}</p>}
          <div className="kv">
            <Field label="Mã vận đơn">{data?.trackingCode}</Field>
            <Field label="Trạng thái GHN">{data?.carrierStatus}</Field>
            <Field label="Dự kiến giao">{formatTime(data?.expectedDeliveryAt)}</Field>
            <Field label="Đồng bộ gần nhất">{formatTime(data?.lastSyncedAt)}</Field>
            <Field label="Tạo vận đơn">{getGhnCreationLabel(data?.creationStatus)}</Field>
            {data?.carrierOperationError && <Field label="Lỗi vận hành">{data.carrierOperationError}</Field>}
          </div>
          {data?.trackingCode && data?.message && <p className="muted">{data.message}</p>}
        </>
      )}
      <p className="muted">Đọc dữ liệu do webhook GHN cập nhật, không đồng bộ trực tiếp khi tải lại.</p>
    </div>
  );
}

function ShipmentDetail({ orderId }) {
  const [version, setVersion] = useState(0);
  const requestKey = `${orderId}|${version}`;
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const loading = state.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    moderatorOrderApi
      .getOrderById(orderId, { signal: controller.signal, skipGlobalErrorPage: true })
      .then((data) => setState({ key: requestKey, data, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ key: requestKey, data: null, error: getErrorMessage(error, "Không thể tải chi tiết đơn hàng.") });
      });
    return () => controller.abort();
  }, [orderId, requestKey]);

  // Giữ dữ liệu cũ của đúng đơn này trong lúc tải lại; đơn khác thì không hiện dữ liệu cũ.
  const order = state.data && String(state.data.orderId) === String(orderId) ? state.data : null;
  const shipment = order?.shipment || null;
  const steps = [
    ["Người bán sẵn sàng giao hàng", shipment?.sellerReadyAt],
    ["Đã lấy hàng", shipment?.pickedUpAt],
    ["Đã giao hàng", shipment?.deliveredAt],
  ];

  return (
    <section className="panel shipping-detail" aria-live="polite">
      <div className="row panel-head">
        <h2>Chi tiết vận chuyển</h2>
        <button type="button" disabled={loading} onClick={() => setVersion((current) => current + 1)}>Tải lại</button>
      </div>

      {state.error && !loading && <div className="notice error">{state.error}</div>}
      {!order && loading && <p className="empty">Đang tải chi tiết đơn hàng...</p>}

      {order && (
        <>
          <div className="row">
            <strong>{order.orderCode || "—"}</strong>
            <StatusPill status={shipment?.shipmentStatus} />
          </div>
          <p className="product">{order.productName || "Sản phẩm trong đơn hàng"}</p>
          <p className="muted">{getDeliveryMethodLabel(order.deliveryMethod)} · Số lượng: {order.quantity ?? "—"}</p>

          <div className="kv detail-kv">
            <Field label="Người mua">{order.buyer?.username}</Field>
            <Field label="Người bán">{order.seller?.username}</Field>
            <Field label="Cập nhật đơn hàng">{formatTime(order.updatedAt)}</Field>
            <Field label="Trạng thái vận chuyển"><StatusPill status={shipment?.shipmentStatus} /></Field>
          </div>

          <div className="detail-section">
            <h3>Các mốc vận chuyển đã ghi nhận</h3>
            <ul className="timeline">
              {steps.map(([title, time]) => (
                <li key={title} className={time ? "" : "pending"}>
                  {title}
                  <small>{formatTime(time) || "Chưa có mốc ghi nhận"}</small>
                </li>
              ))}
            </ul>
          </div>

          {isGhnDelivery(order.deliveryMethod) ? (
            <GhnTracking orderId={orderId} version={version} />
          ) : (
            <div className="tracking-box">Tracking GHN không áp dụng cho phương thức giao hàng này.</div>
          )}
        </>
      )}
    </section>
  );
}

export default function ShippingMonitorPage() {
  const [keywordInput, setKeywordInput] = useState("");
  const [filters, setFilters] = useState({ keyword: "", deliveryMethod: "", shipmentStatus: "" });
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const requestKey = `${JSON.stringify(filters)}|${pageNumber}`;
  const [list, setList] = useState({ key: "", items: [], totalCount: 0, totalPages: 0, error: "" });
  const loading = list.key !== requestKey;

  // Tìm theo từ khóa ở BE; chờ người dùng gõ xong rồi mới gọi và quay về trang 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      const keyword = keywordInput.trim();
      setFilters((current) => (current.keyword === keyword ? current : { ...current, keyword }));
      setPageNumber(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    const controller = new AbortController();
    moderatorOrderApi
      .getOrders({ ...filters, pageNumber, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((page) => setList({ key: requestKey, items: page.items, totalCount: page.totalCount, totalPages: page.totalPages, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setList({ key: requestKey, items: [], totalCount: 0, totalPages: 0, error: getErrorMessage(error, "Không thể tải danh sách đơn hàng.") });
      });
    return () => controller.abort();
  }, [filters, pageNumber, requestKey]);

  const stats = getPageStats(list.items);
  // Đơn đang chọn phải nằm trong trang hiện tại; nếu không thì chọn đơn đầu tiên.
  const activeId = list.items.some((item) => item.orderId === selectedId)
    ? selectedId
    : list.items[0]?.orderId || "";

  const updateFilter = (key, value) => {
    setPageNumber(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="hc-admin hc-shipping">
      <main className="content">
        <div className="header">
          <p className="eyebrow">VẬN HÀNH / ĐƠN HÀNG</p>
          <h1>Theo dõi vận chuyển</h1>
          <p className="muted">Quan sát tiến độ giao hàng và các đơn phát sinh vấn đề. Chỉ theo dõi, không sửa trạng thái đơn.</p>
        </div>

        <div className="stats shipping-stats">
          <article className="metric">
            <p className="label">Đơn trên trang này</p>
            <div className="value">{loading ? "—" : stats.total}</div>
            <p className="caption">Tổng {list.totalCount.toLocaleString("vi-VN")} đơn khớp bộ lọc</p>
          </article>
          <article className="metric">
            <p className="label">Đang giao</p>
            <div className="value">{loading ? "—" : stats.delivering}</div>
            <p className="caption">Thống kê trên trang đang xem</p>
          </article>
          <article className="metric">
            <p className="label">Vận chuyển có vấn đề</p>
            <div className="value">{loading ? "—" : stats.issues}</div>
            <p className="caption">Đã hủy, đang hoàn, đã hoàn, hư hỏng/thất lạc, ngoại lệ</p>
          </article>
        </div>

        <div className="shipping-workspace">
          <section className="panel">
            <div className="row panel-head">
              <h2>Danh sách đơn hàng</h2>
              <span className="pill green">Quyền kiểm duyệt viên</span>
            </div>
            <div className="filters">
              <label className="search">
                Tìm đơn hàng
                <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="Mã đơn, sản phẩm…" />
              </label>
              <label>
                Phương thức giao hàng
                <select value={filters.deliveryMethod} onChange={(event) => updateFilter("deliveryMethod", event.target.value)}>
                  <option value="">Mọi phương thức</option>
                  {DELIVERY_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label>
                Trạng thái vận chuyển
                <select value={filters.shipmentStatus} onChange={(event) => updateFilter("shipmentStatus", event.target.value)}>
                  <option value="">Mọi trạng thái</option>
                  {SHIPMENT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
            {list.error && <div className="notice error">{list.error}</div>}
            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>Đơn / Sản phẩm</th><th>Giao hàng</th><th>Trạng thái</th></tr>
                </thead>
                <tbody>
                  {list.items.length === 0 ? (
                    <tr><td colSpan={3} className="empty">{loading ? "Đang tải..." : "Không tìm thấy đơn phù hợp."}</td></tr>
                  ) : (
                    list.items.map((item) => (
                      <tr key={item.orderId} className={item.orderId === activeId ? "selected" : ""}>
                        <td>
                          <button type="button" className="order-link" onClick={() => setSelectedId(item.orderId)}>
                            {item.orderCode || "—"}
                          </button>
                          <small>{item.productName || "—"}</small>
                        </td>
                        <td>{getDeliveryMethodLabel(item.deliveryMethod)}</td>
                        <td><StatusPill status={item.shipmentStatus} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="row pagination">
              <span>Chọn mã đơn để xem chi tiết · Trang {pageNumber} / {Math.max(1, list.totalPages)}</span>
              {list.totalPages > 1 && (
                <div>
                  <button type="button" disabled={pageNumber <= 1 || loading} onClick={() => setPageNumber((page) => page - 1)}>Trước</button>{" "}
                  <button type="button" disabled={pageNumber >= list.totalPages || loading} onClick={() => setPageNumber((page) => page + 1)}>Sau</button>
                </div>
              )}
            </div>
          </section>

          {activeId ? (
            <ShipmentDetail key={activeId} orderId={activeId} />
          ) : (
            <section className="panel shipping-detail">
              <h2>Chi tiết vận chuyển</h2>
              <p className="empty">{loading ? "Đang tải..." : "Chọn bộ lọc khác để xem đơn hàng."}</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

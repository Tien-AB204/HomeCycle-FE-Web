import { useEffect, useRef, useState } from "react";
import {
  getInspectionConclusionLabel,
  getInspectionStatusLabel,
} from "../../../constants/inspections";
import {
  adminAppointmentHistoryApi,
  adminOrderHistoryApi,
} from "../../../services/apis/adminHistoryApi";
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  getFinanceLabel,
} from "../../finance/financePresentation";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  DELIVERY_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  enumKey,
  formatDateTime,
  formatMoney,
  labelOf,
  pillTone,
} from "./operationsPresentation";

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

function KeyValue({ label, value }) {
  return (
    <div>
      <span className="muted">{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

const statusPill = (value, kind, labels) => (
  <span className={`pill ${pillTone(enumKey(value, kind))}`}>{labelOf(labels, value, kind)}</span>
);

function OrderDetail({ summary, data, onOpen }) {
  const order = data.detail || summary;
  const appointments = Array.isArray(data.detail?.appointments) ? data.detail.appointments : [];
  const finance = Array.isArray(data.finance) ? data.finance : [];

  return (
    <>
      <p className="muted">Chỉ xem, không thực hiện thao tác nghiệp vụ.</p>
      <div className="kv">
        <KeyValue label="Sản phẩm" value={order.productName || "Sản phẩm HomeCycle"} />
        <KeyValue label="Trạng thái" value={statusPill(order.orderStatus, "order", ORDER_STATUS_LABELS)} />
        <KeyValue label="Người mua" value={order.buyer?.username} />
        <KeyValue label="Người bán" value={order.seller?.username} />
        <KeyValue label="Giá trị giao dịch" value={formatMoney(order.finalTotalAmount)} />
        <KeyValue label="Số lượng" value={order.quantity} />
        <KeyValue label="Thanh toán" value={labelOf(PAYMENT_STATUS_LABELS, order.paymentStatus, "payment")} />
        <KeyValue label="Cách giao nhận" value={labelOf(DELIVERY_METHOD_LABELS, order.deliveryMethod, "delivery", "—")} />
        <KeyValue label="Ngày tạo" value={formatDateTime(order.createdAt)} />
        <KeyValue label="Ngày hoàn tất" value={formatDateTime(order.completedAt)} />
      </div>

      <div className="section">
        <h3>Lịch hẹn liên quan</h3>
        {appointments.length === 0 ? (
          <p className="muted">{data.loading ? "Đang tải..." : "Đơn chưa có lịch hẹn."}</p>
        ) : (
          appointments.map((item, index) => (
            <div className="attention" key={item.appointmentId || index}>
              <div>
                {labelOf(APPOINTMENT_TYPE_LABELS, item.appointmentType, "appointmentType", "Lịch hẹn")} ·{" "}
                {formatDateTime(item.scheduledAt)}
                <br />
                {statusPill(item.appointmentStatus, "appointment", APPOINTMENT_STATUS_LABELS)}
              </div>
              {item.appointmentId && (
                <button type="button" onClick={() => onOpen("appointment", { ...item, orderCode: order.orderCode, productName: order.productName })}>
                  Xem lịch →
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="section">
        <h3>Lịch sử tài chính của đơn</h3>
        {finance.length === 0 ? (
          <p className="muted">{data.loading ? "Đang tải..." : "Chưa có diễn biến tài chính."}</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th>Thời gian</th><th>Loại giao dịch</th><th>Số tiền</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {finance.map((event, index) => (
                  <tr key={event.walletTransactionId || index}>
                    <td>{formatDateTime(event.createdAt)}</td>
                    <td>{getFinanceLabel(TRANSACTION_TYPE_LABELS, event.transactionType)}</td>
                    <td>{formatMoney(event.amount)}</td>
                    <td>{getFinanceLabel(TRANSACTION_STATUS_LABELS, event.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Lịch sử liên quan</h3>
        <div className="timeline">
          <div>{formatDateTime(order.createdAt)}<br />Tạo đơn {order.orderCode}</div>
          {order.completedAt && <div>{formatDateTime(order.completedAt)}<br />Đơn hoàn tất</div>}
          {order.cancellation?.cancelledAt && (
            <div>
              {formatDateTime(order.cancellation.cancelledAt)}
              <br />
              Đơn bị hủy{order.cancellation.reason ? ` · ${order.cancellation.reason}` : ""}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AppointmentDetail({ summary, data, onOpen }) {
  const detail = data.detail || {};
  const type = enumKey(detail.appointmentType ?? summary.appointmentType, "appointmentType");
  const status = detail.appointmentStatus ?? summary.appointmentStatus;
  const scheduledAt = summary.scheduledAt || detail.inspection?.inspectionDate || detail.collection?.collectionDate;
  const address =
    summary.location ||
    detail.inspection?.inspectionAddress ||
    detail.collection?.deliveryAddress ||
    detail.collection?.pickupAddress;
  const order = detail.order || { orderId: summary.orderId, orderCode: summary.orderCode, productName: summary.productName };
  const checkIn = detail.inspection?.checkIn || { buyerCheckAt: summary.buyerCheckAt, sellerCheckAt: summary.sellerCheckAt };
  const form = detail.inspection?.inspectionForm;
  const replaced = (detail.cancellation?.reason || summary.cancellationReason) === "Rescheduled";

  return (
    <>
      <p className="muted">Chỉ xem, không thực hiện thao tác nghiệp vụ.</p>
      <div className="kv">
        <KeyValue label="Sản phẩm" value={order.productName || summary.productName || "Sản phẩm HomeCycle"} />
        <KeyValue
          label="Trạng thái"
          value={replaced ? <span className="pill gray">Đã thay thế</span> : statusPill(status, "appointment", APPOINTMENT_STATUS_LABELS)}
        />
        <KeyValue label="Người mua" value={(detail.buyer || summary.buyer)?.username} />
        <KeyValue label="Người bán" value={(detail.seller || summary.seller)?.username} />
        <KeyValue label="Loại lịch" value={APPOINTMENT_TYPE_LABELS[type] || "Lịch hẹn"} />
        <KeyValue label="Ngày hẹn" value={formatDateTime(scheduledAt)} />
        <KeyValue label="Mốc quá hạn" value={formatDateTime(detail.lateThresholdAt ?? summary.lateThresholdAt)} />
        <KeyValue label="Địa điểm" value={address || "—"} />
        <KeyValue label="Đơn hàng liên quan" value={order.orderCode || "—"} />
        <KeyValue label="Quá hạn" value={(detail.isOverdue ?? summary.isOverdue) ? "Có" : "Không"} />
      </div>

      {order.orderId && (
        <div className="section">
          <button type="button" className="text" onClick={() => onOpen("order", { orderId: order.orderId, orderCode: order.orderCode })}>
            Xem đơn hàng {order.orderCode} →
          </button>
        </div>
      )}

      {type === "Inspection" && (
        <div className="section">
          <h3>Điểm danh & phiếu kiểm tra</h3>
          <div className="kv">
            <KeyValue label="Người mua" value={checkIn.buyerCheckAt ? `Đã ghi nhận · ${formatDateTime(checkIn.buyerCheckAt)}` : "Chưa ghi nhận"} />
            <KeyValue label="Người bán" value={checkIn.sellerCheckAt ? `Đã ghi nhận · ${formatDateTime(checkIn.sellerCheckAt)}` : "Chưa ghi nhận"} />
            <KeyValue
              label="Phiếu kiểm tra"
              value={form ? getInspectionStatusLabel(form.inspectionStatus) || "Có phiếu" : summary.hasInspectionForm ? "Có phiếu" : "Chưa có phiếu"}
            />
            {getInspectionConclusionLabel(form?.conclusion) && (
              <KeyValue label="Kết luận" value={getInspectionConclusionLabel(form.conclusion)} />
            )}
          </div>
        </div>
      )}

      {(detail.reschedule || replaced || enumKey(status, "appointment") === "Proposed") && (
        <div className="section">
          <h3>Lịch sử đổi lịch</h3>
          <p className="muted">
            {enumKey(status, "appointment") === "Proposed"
              ? "Đề xuất chưa được chấp nhận; không tính là lịch hiệu lực."
              : replaced
                ? "Lịch này đã được thay thế; giữ để tra cứu, không tính trên lịch tháng."
                : `Có yêu cầu đổi lịch${detail.reschedule?.requestedAt ? ` lúc ${formatDateTime(detail.reschedule.requestedAt)}` : ""}.`}
          </p>
        </div>
      )}

      <div className="section">
        <h3>Lịch sử liên quan</h3>
        <div className="timeline">
          {(detail.createdAt || summary.createdAt) && (
            <div>{formatDateTime(detail.createdAt || summary.createdAt)}<br />Tạo lịch hẹn</div>
          )}
          {scheduledAt && (
            <div>{formatDateTime(scheduledAt)}<br />Thời điểm hẹn {(APPOINTMENT_TYPE_LABELS[type] || "").toLowerCase()} (không phải thời điểm tạo lịch)</div>
          )}
          {(detail.completedAt || summary.completedAt) && (
            <div>{formatDateTime(detail.completedAt || summary.completedAt)}<br />Lịch hoàn tất</div>
          )}
          {detail.cancellation?.cancelledAt && (
            <div>
              {formatDateTime(detail.cancellation.cancelledAt)}
              <br />
              Lịch bị hủy{detail.cancellation.reason && !replaced ? ` · ${detail.cancellation.reason}` : replaced ? " · Đổi sang lịch mới" : ""}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function OperationsDetailDialog({ target, onClose, onOpen }) {
  const dialogRef = useRef(null);
  const [data, setData] = useState({ key: "", loading: false, error: "", detail: null, finance: null });

  const isOrder = target?.type === "order";
  const id = target ? (isOrder ? target.item.orderId : target.item.appointmentId) : "";
  const key = target ? `${target.type}:${id}` : "";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (target && !dialog.open) dialog.showModal();
    if (!target && dialog.open) dialog.close();
  }, [target]);

  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    const signal = controller.signal;

    void Promise.resolve().then(() =>
      setData({ key, loading: true, error: "", detail: null, finance: null }),
    );

    const requests = isOrder
      ? [
          adminOrderHistoryApi.getOrderById(id, { signal }),
          adminOrderHistoryApi.getOrderFinancialHistory(id, { signal }).catch(() => []),
        ]
      : [adminAppointmentHistoryApi.getAppointmentById(id, { signal })];

    Promise.all(requests)
      .then(([detail, finance]) => setData({ key, loading: false, error: "", detail, finance: finance ?? null }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setData({ key, loading: false, error: "Không thể tải chi tiết. Đang hiển thị thông tin từ danh sách.", detail: null, finance: null });
      });

    return () => controller.abort();
  }, [id, isOrder, key]);

  const current = data.key === key ? data : { loading: true, detail: null, finance: null, error: "" };
  const title = isOrder
    ? target?.item.orderCode || current.detail?.orderCode || "Đơn hàng"
    : current.detail?.order?.orderCode
      ? `Lịch hẹn · ${current.detail.order.orderCode}`
      : `Lịch hẹn${target?.item.orderCode ? ` · ${target.item.orderCode}` : ""}`;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {target && (
        <>
          <div className="modalhead row">
            <div>
              <div className="eyebrow">{isOrder ? "CHI TIẾT ĐƠN HÀNG" : "CHI TIẾT LỊCH HẸN"}</div>
              <h2>{title}</h2>
            </div>
            <button type="button" onClick={onClose}>Đóng</button>
          </div>
          <div className="modalbody">
            {current.error && <div className="notice error" role="alert">{current.error}</div>}
            {isOrder ? (
              <OrderDetail summary={target.item} data={current} onOpen={onOpen} />
            ) : (
              <AppointmentDetail summary={target.item} data={current} onOpen={onOpen} />
            )}
          </div>
        </>
      )}
    </dialog>
  );
}

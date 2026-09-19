import { useRef, useState } from "react";
import ConfirmActionModal from "../../components/shared/ConfirmActionModal";
import ghnApi from "../../services/apis/ghnApi";

const isSimulatorEnabled =
  import.meta.env.DEV ||
  String(import.meta.env.VITE_ENABLE_GHN_WEBHOOK_SIMULATOR || "")
    .trim()
    .toLowerCase() === "true";

const STATUS_LABELS = {
  ready_to_pick: "Chờ lấy hàng",
  picking: "Tài xế đang đến lấy hàng",
  money_collect_picking: "Đang thu tiền khi lấy hàng",
  picked: "Đã lấy hàng",
  storing: "Đang ở kho GHN",
  sorting: "Đang phân loại",
  transporting: "Đang vận chuyển giữa các kho",
  delivering: "Đang giao",
  money_collect_delivering: "Đang thu tiền người nhận",
  delivered: "Giao thành công",
  delivery_fail: "Giao thất bại",
  waiting_to_return: "Chờ trả hàng",
  return: "Đã yêu cầu trả hàng",
  return_transporting: "Đang vận chuyển trả",
  return_sorting: "Đang phân loại hàng trả",
  returning: "Đang trả cho người gửi",
  return_fail: "Trả hàng thất bại",
  returned: "Đã trả hàng",
  cancel: "Đã hủy",
  exception: "Sự cố cần xử lý",
  lost: "Thất lạc",
  damage: "Hư hỏng",
  scrap: "Đã tiêu hủy",
};

const REASON_REQUIRED_STATUSES = new Set([
  "ready_to_pick",
  "delivery_fail",
  "return_fail",
  "damage",
  "lost",
  "cancel",
]);

const IDENTIFIER_TYPE_OPTIONS = [
  { value: "orderCode", label: "Mã vận đơn GHN" },
  { value: "clientOrderCode", label: "Mã đơn HomeCycle" },
];

const getStatusDisplay = (code) => {
  const key = String(code || "").trim();

  if (!key) {
    return "—";
  }

  const label = STATUS_LABELS[key];

  return label ? `${label} (${key})` : key;
};

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const mapErrorMessage = (error) => {
  const status = Number(error?.response?.status);

  switch (status) {
    case 400:
      return "Payload hoặc trạng thái không hợp lệ.";
    case 401:
      return "ShopID không khớp.";
    case 403:
      return "Tài khoản không có quyền quản trị.";
    case 404:
      return "Không tìm thấy vận đơn.";
    case 409:
      return "Mã vận đơn đang xung đột. Vui lòng tra cứu lại.";
    case 503:
      return "Hệ thống tạm thời chưa cập nhật được. Vui lòng thử lại.";
    default:
      return "Đã xảy ra lỗi. Vui lòng thử lại.";
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return "Chưa có";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

const SummaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 text-sm last:border-0">
    <span className="font-semibold text-textLight">{label}</span>
    <span className="text-right font-bold text-text">{value}</span>
  </div>
);

export default function GhnWebhookSimulator() {
  const [identifierType, setIdentifierType] = useState("orderCode");
  const [identifierInput, setIdentifierInput] = useState("");
  const [shipment, setShipment] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reason, setReason] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lookupControllerRef = useRef(null);

  if (!isSimulatorEnabled) {
    return null;
  }

  const requiresReason = REASON_REQUIRED_STATUSES.has(selectedStatus);

  const runLookup = async ({ clearSubmitStatus }) => {
    const identifier = identifierInput.trim();

    if (!identifier || lookupLoading) {
      return;
    }

    lookupControllerRef.current?.abort();
    const controller = new AbortController();
    lookupControllerRef.current = controller;

    setLookupLoading(true);
    setLookupError("");

    if (clearSubmitStatus) {
      setSubmitError("");
      setSuccessMessage("");
    }

    try {
      const params =
        identifierType === "orderCode"
          ? { orderCode: identifier }
          : { clientOrderCode: identifier };

      const result = await ghnApi.lookupAdminOrder({
        ...params,
        signal: controller.signal,
      });

      setShipment(result);
      setSelectedStatus("");
      setReason("");

      if (clearSubmitStatus) {
        setSubmitError("");
      }
    } catch (error) {
      if (isCanceled(error)) {
        return;
      }

      setShipment(null);
      setLookupError(mapErrorMessage(error));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookupClick = () => {
    void runLookup({ clearSubmitStatus: true });
  };

  const openConfirm = () => {
    if (!shipment || !selectedStatus || submitLoading || shipment.isTerminal) {
      return;
    }

    if (requiresReason && !reason.trim()) {
      setSubmitError("Vui lòng nhập lý do.");
      return;
    }

    setSubmitError("");
    setConfirmOpen(true);
  };

  const submitWebhook = async () => {
    if (submitLoading || !shipment || !selectedStatus) {
      return;
    }

    setSubmitLoading(true);
    setSubmitError("");

    try {
      const payload = {
        ShopID: shipment.shopId,
        Time: new Date().toISOString(),
        OrderCode: shipment.orderCode,
        ClientOrderCode: shipment.clientOrderCode,
        Type: "switch_status",
        Description: "Cập nhật trạng thái đơn hàng",
        Status: selectedStatus,
        Reason: requiresReason ? reason.trim() : "",
        ReasonCode: "",
        CODAmount: shipment.codAmount ?? 0,
        CODTransferDate: null,
        Weight: shipment.weight ?? 0,
        ConvertedWeight: 0,
        Length: shipment.length ?? 0,
        Width: shipment.width ?? 0,
        Height: shipment.height ?? 0,
        PaymentType: shipment.paymentType ?? 0,
        IsPartialReturn: false,
        PartialReturnCode: "",
        Fee: {},
        TotalFee: 0,
        Warehouse: "",
        ShipperName: "",
        ShipperPhone: "",
        PodURL: "",
      };

      await ghnApi.simulateWebhook(payload);

      setConfirmOpen(false);
      setSuccessMessage("Cập nhật trạng thái thành công");

      await runLookup({ clearSubmitStatus: false });
    } catch (error) {
      setSubmitError(mapErrorMessage(error));
    } finally {
      setSubmitLoading(false);
    }
  };

  const statusOptions = Array.isArray(shipment?.supportedStatuses)
    ? shipment.supportedStatuses
    : [];

  return (
    <section className="rounded-2xl border border-warning/30 bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black uppercase tracking-wide text-text">
            Mô phỏng webhook GHN
          </h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-warning">
            Chỉ sử dụng trong môi trường sandbox
          </p>
        </div>
      </div>

      <div
        role="alert"
        className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-text"
      >
        Đây là công cụ mô phỏng callback GHN. Thao tác chỉ cập nhật trạng thái
        trong HomeCycle, không thay đổi đơn hàng trên hệ thống GHN.
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
        <label>
          <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
            Loại mã
          </span>
          <select
            value={identifierType}
            onChange={(event) => setIdentifierType(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            {IDENTIFIER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
            Mã đơn
          </span>
          <input
            value={identifierInput}
            onChange={(event) => setIdentifierInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleLookupClick();
              }
            }}
            placeholder="Nhập mã đơn cần tra cứu"
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          />
        </label>

        <button
          type="button"
          onClick={handleLookupClick}
          disabled={!identifierInput.trim() || lookupLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {lookupLoading && (
            <span
              className="material-symbols-outlined animate-spin text-[18px]"
              aria-hidden="true"
            >
              progress_activity
            </span>
          )}
          Tra cứu
        </button>
      </div>

      {lookupError && (
        <p className="mt-3 text-sm font-semibold text-error">{lookupError}</p>
      )}

      {successMessage && (
        <p className="mt-3 text-sm font-semibold text-success">
          {successMessage}
        </p>
      )}

      {shipment && (
        <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4">
          <SummaryRow label="Mã vận đơn GHN" value={shipment.orderCode || "—"} />
          <SummaryRow
            label="Mã đơn HomeCycle"
            value={shipment.clientOrderCode || "—"}
          />
          <SummaryRow
            label="Trạng thái GHN"
            value={getStatusDisplay(shipment.carrierStatus)}
          />
          <SummaryRow
            label="Trạng thái HomeCycle"
            value={shipment.shipmentStatus || "—"}
          />
          <SummaryRow
            label="Thời gian lấy hàng"
            value={formatDateTime(shipment.pickedUpAt)}
          />
          <SummaryRow
            label="Thời gian giao hàng"
            value={formatDateTime(shipment.deliveredAt)}
          />
          <SummaryRow
            label="Dự kiến giao"
            value={formatDateTime(shipment.expectedDeliveryAt)}
          />
          <SummaryRow
            label="Đồng bộ gần nhất"
            value={formatDateTime(shipment.lastSyncedAt)}
          />

          {shipment.isTerminal ? (
            <div className="mt-4 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-textLight">
              Vận đơn đã kết thúc và không thể chuyển sang trạng thái khác.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
                  Trạng thái mới
                </span>
                <select
                  value={selectedStatus}
                  onChange={(event) => {
                    setSelectedStatus(event.target.value);
                    setReason("");
                    setSubmitError("");
                  }}
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
                >
                  <option value="">Chọn trạng thái</option>
                  {statusOptions.map((code) => (
                    <option key={code} value={code}>
                      {getStatusDisplay(code)}
                    </option>
                  ))}
                </select>
              </label>

              {requiresReason && (
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
                    Lý do
                  </span>
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Không liên hệ được người nhận"
                    className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
                  />
                </label>
              )}

              {submitError && (
                <p className="text-sm font-semibold text-error">{submitError}</p>
              )}

              <button
                type="button"
                onClick={openConfirm}
                disabled={!selectedStatus || submitLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-warning px-5 py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Gửi webhook mô phỏng
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmActionModal
        open={confirmOpen}
        title="Xác nhận cập nhật trạng thái"
        description={
          <>
            <strong>Mã vận đơn:</strong> {shipment?.orderCode || "—"}
            <br />
            <strong>Trạng thái hiện tại:</strong>{" "}
            {getStatusDisplay(shipment?.carrierStatus)}
            <br />
            <strong>Trạng thái mới:</strong> {getStatusDisplay(selectedStatus)}
            <br />
            <br />
            Thao tác này sẽ mô phỏng callback từ GHN.
          </>
        }
        confirmLabel="Xác nhận"
        cancelLabel="Quay lại"
        tone="danger"
        icon="local_shipping"
        busy={submitLoading}
        onCancel={() => {
          if (!submitLoading) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={() => void submitWebhook()}
      />
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import ConfirmActionModal from "../../components/shared/ConfirmActionModal";
import ghnApi from "../../services/apis/ghnApi";

const MAIN_STATUS_FLOW = [
  "ready_to_pick",
  "picked",
  "delivering",
  "delivered",
];

const STATUS_LABELS = {
  ready_to_pick: "Chờ lấy hàng",
  picked: "Đã lấy hàng",
  delivering: "Đang giao",
  delivered: "Giao thành công",
};

const IDENTIFIER_TYPE_OPTIONS = [
  { value: "orderCode", label: "GHN Order Code" },
  { value: "clientOrderCode", label: "Client Order Code" },
];

const getStatusLabel = (value) => {
  const code = String(value || "").trim();

  if (!code) {
    return "—";
  }

  return STATUS_LABELS[code]
    ? `${STATUS_LABELS[code]} (${code})`
    : code;
};

const getNextStatus = (currentStatus) => {
  const index = MAIN_STATUS_FLOW.indexOf(String(currentStatus || "").trim());

  if (index < 0 || index >= MAIN_STATUS_FLOW.length - 1) {
    return "";
  }

  return MAIN_STATUS_FLOW[index + 1];
};

const getForwardStatuses = (currentStatus) => {
  const index = MAIN_STATUS_FLOW.indexOf(String(currentStatus || "").trim());

  if (index < 0 || index >= MAIN_STATUS_FLOW.length - 1) {
    return [];
  }

  return MAIN_STATUS_FLOW.slice(index + 1);
};

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const mapErrorMessage = (error) => {
  const status = Number(error?.response?.status);

  switch (status) {
    case 400:
      return "Payload hoặc trạng thái callback không hợp lệ.";
    case 401:
      return "Yêu cầu mô phỏng không được chấp nhận. Vui lòng kiểm tra lại phiên đăng nhập hoặc thông tin vận đơn.";
    case 403:
      return "Tài khoản hiện tại không có quyền sử dụng công cụ demo.";
    case 404:
      return "Không tìm thấy vận đơn theo mã đã cung cấp.";
    case 409:
      return "Thông tin vận đơn đang xung đột. Vui lòng tra cứu lại trước khi gửi callback.";
    case 503:
      return "HomeCycle tạm thời chưa xử lý được webhook. Vui lòng thử lại.";
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
  <div className="grid gap-1 border-b border-border/70 py-3 last:border-0 sm:grid-cols-[220px_1fr] sm:items-center">
    <dt className="text-xs font-black uppercase tracking-[0.08em] text-textLight">
      {label}
    </dt>
    <dd className="break-all text-sm font-bold text-text sm:text-right">
      {value || "—"}
    </dd>
  </div>
);

export default function GhnWebhookTestConsolePage() {
  const [identifierType, setIdentifierType] = useState("orderCode");
  const [identifierInput, setIdentifierInput] = useState("");
  const [shipment, setShipment] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lookupControllerRef = useRef(null);
  const submitControllerRef = useRef(null);

  useEffect(
    () => () => {
      lookupControllerRef.current?.abort();
      submitControllerRef.current?.abort();
    },
    [],
  );

  const runLookup = async ({ preserveResult = false } = {}) => {
    const identifier = identifierInput.trim();

    if (!identifier || lookupLoading) {
      return;
    }

    lookupControllerRef.current?.abort();
    const controller = new AbortController();
    lookupControllerRef.current = controller;

    setLookupLoading(true);
    setLookupError("");

    if (!preserveResult) {
      setSubmitError("");
      setResultMessage("");
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

      const suggestedStatus = getNextStatus(result?.carrierStatus);
      setSelectedStatus(suggestedStatus);

      if (!preserveResult) {
        setSubmitError("");
      }
    } catch (error) {
      if (isCanceled(error)) {
        return;
      }

      setShipment(null);
      setSelectedStatus("");
      setLookupError(mapErrorMessage(error));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookupClick = () => {
    void runLookup();
  };

  const forwardStatuses = getForwardStatuses(shipment?.carrierStatus);
  const suggestedStatus = getNextStatus(shipment?.carrierStatus);
  const isMainFlowStatus = MAIN_STATUS_FLOW.includes(
    String(shipment?.carrierStatus || "").trim(),
  );
  const canSubmit =
    Boolean(shipment) &&
    !shipment?.isTerminal &&
    Boolean(selectedStatus) &&
    forwardStatuses.includes(selectedStatus) &&
    !submitLoading;

  const openConfirm = () => {
    if (!canSubmit) {
      return;
    }

    setSubmitError("");
    setConfirmOpen(true);
  };

  const submitWebhook = async () => {
    if (!canSubmit) {
      return;
    }

    const controller = new AbortController();
    submitControllerRef.current = controller;

    setSubmitLoading(true);
    setSubmitError("");
    setResultMessage("");

    try {
      const payload = {
        ShopID: shipment.shopId,
        OrderCode: shipment.orderCode,
        ClientOrderCode: shipment.clientOrderCode,
        Status: selectedStatus,
        Time: new Date().toISOString(),
        Type: "switch_status",
        Description: "GHN webhook callback simulation",
        CODAmount: shipment.codAmount ?? 0,
        Weight: shipment.weight ?? 0,
        Length: shipment.length ?? 0,
        Width: shipment.width ?? 0,
        Height: shipment.height ?? 0,
        PaymentType: shipment.paymentType ?? 0,
      };

      await ghnApi.simulateWebhook(payload, {
        signal: controller.signal,
      });

      setConfirmOpen(false);
      setResultMessage("HTTP 200 – HomeCycle đã tiếp nhận webhook.");
      await runLookup({ preserveResult: true });
    } catch (error) {
      if (isCanceled(error)) {
        return;
      }

      setSubmitError(mapErrorMessage(error));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
            GHN WEBHOOK TEST CONSOLE
          </p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            Mô phỏng callback GHN
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
            Chỉ sử dụng trong môi trường staging/demo. Công cụ này không phải giao diện shipper và không thay đổi trạng thái vận đơn trực tiếp trên hệ thống GHN.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr_auto] sm:items-end">
            <label>
              <span className="text-xs font-black uppercase tracking-[0.1em] text-textLight">
                Loại mã
              </span>
              <select
                value={identifierType}
                onChange={(event) => {
                  setIdentifierType(event.target.value);
                  setShipment(null);
                  setSelectedStatus("");
                  setLookupError("");
                  setSubmitError("");
                  setResultMessage("");
                }}
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
              <span className="text-xs font-black uppercase tracking-[0.1em] text-textLight">
                Mã vận đơn
              </span>
              <input
                value={identifierInput}
                onChange={(event) => {
                  setIdentifierInput(event.target.value);
                  setShipment(null);
                  setSelectedStatus("");
                  setLookupError("");
                  setSubmitError("");
                  setResultMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleLookupClick();
                  }
                }}
                placeholder={
                  identifierType === "orderCode"
                    ? "Nhập GHN Order Code"
                    : "Nhập Client Order Code"
                }
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
            <p className="mt-4 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
              {lookupError}
            </p>
          )}
        </section>

        {shipment && (
          <>
            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-lg font-black text-text">
                  Thông tin vận đơn
                </h2>
              </div>

              <dl className="mt-2">
                <SummaryRow label="GHN Order Code" value={shipment.orderCode} />
                <SummaryRow
                  label="Client Order Code"
                  value={shipment.clientOrderCode}
                />
                <SummaryRow label="Order ID" value={shipment.orderId} />
                <SummaryRow label="Shipment ID" value={shipment.shipmentId} />
                <SummaryRow
                  label="Trạng thái tạo vận đơn"
                  value={shipment.creationStatus}
                />
                <SummaryRow
                  label="Trạng thái GHN hiện tại"
                  value={getStatusLabel(shipment.carrierStatus)}
                />
                <SummaryRow
                  label="Trạng thái HomeCycle hiện tại"
                  value={shipment.shipmentStatus}
                />
                <SummaryRow
                  label="Cập nhật gần nhất"
                  value={formatDateTime(shipment.lastSyncedAt)}
                />
                <SummaryRow
                  label="Trạng thái kết thúc"
                  value={shipment.isTerminal ? "Đã kết thúc" : "Chưa kết thúc"}
                />
              </dl>
            </section>

            <section className="rounded-2xl border border-warning/30 bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-warning">
                  CALLBACK DEMO
                </p>
                <h2 className="mt-1 text-lg font-black text-text">
                  Trạng thái callback
                </h2>
              </div>

              {shipment.isTerminal ? (
                <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-textLight">
                  Vận đơn đã ở trạng thái kết thúc.
                </div>
              ) : !isMainFlowStatus ? (
                <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-text">
                  Trạng thái GHN hiện tại nằm ngoài luồng demo chính. Hãy dùng một vận đơn đang ở ready_to_pick, picked hoặc delivering để trình diễn luồng callback tiêu chuẩn.
                </div>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-background px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-textLight">
                        Hiện tại
                      </p>
                      <p className="mt-1 text-sm font-black text-text">
                        {getStatusLabel(shipment.carrierStatus)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-primary/5 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">
                        Đề xuất tiếp theo
                      </p>
                      <p className="mt-1 text-sm font-black text-text">
                        {getStatusLabel(suggestedStatus)}
                      </p>
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs font-black uppercase tracking-[0.1em] text-textLight">
                      Trạng thái callback
                    </span>
                    <select
                      value={selectedStatus}
                      onChange={(event) => {
                        setSelectedStatus(event.target.value);
                        setSubmitError("");
                        setResultMessage("");
                      }}
                      className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
                    >
                      {forwardStatuses.map((status) => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-textLight">
                      Console chỉ cho phép chọn trạng thái tiến về phía trước trong bốn mốc demo chính.
                    </p>
                  </label>

                  {submitError && (
                    <p className="mt-4 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
                      {submitError}
                    </p>
                  )}

                  {resultMessage && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-success">
                        Kết quả
                      </p>
                      <p className="mt-1 text-sm font-bold text-text">
                        {resultMessage}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={openConfirm}
                    disabled={!canSubmit}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-warning px-5 py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitLoading && (
                      <span
                        className="material-symbols-outlined animate-spin text-[18px]"
                        aria-hidden="true"
                      >
                        progress_activity
                      </span>
                    )}
                    Gửi callback mô phỏng
                  </button>
                </>
              )}
            </section>
          </>
        )}
      </section>

      <ConfirmActionModal
        open={confirmOpen}
        title="Xác nhận gửi callback mô phỏng"
        description={
          <>
            <strong>Mã vận đơn GHN:</strong> {shipment?.orderCode || "—"}
            <br />
            <strong>Trạng thái GHN hiện tại:</strong>{" "}
            {getStatusLabel(shipment?.carrierStatus)}
            <br />
            <strong>Callback mô phỏng:</strong>{" "}
            {getStatusLabel(selectedStatus)}
            <br />
            <br />
            HomeCycle sẽ tiếp nhận request này qua endpoint webhook như một callback GHN trong môi trường demo.
          </>
        }
        confirmLabel="Gửi callback"
        cancelLabel="Quay lại"
        tone="danger"
        icon="webhook"
        busy={submitLoading}
        onCancel={() => {
          if (!submitLoading) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={() => void submitWebhook()}
      />
    </main>
  );
}

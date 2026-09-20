import { Alert, Drawer, Spin } from "antd";
import { useEffect, useState } from "react";
import financeOperationsApi from "../../services/apis/financeOperationsApi";
import FinancialLedgerTable from "./FinancialLedgerTable";
import FinancialPartyDisplay from "./FinancialPartyDisplay";
import {
  formatFinanceCurrency,
  formatFinanceDateTime,
  getFinanceLabel,
  PAYMENT_METHOD_LABELS,
  REFERENCE_TYPE_LABELS,
  shortenFinanceId,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "./financePresentation";

const DetailField = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase text-textLight">{label}</p>
    <p className="mt-1 break-all text-sm font-bold text-text">{value || "—"}</p>
  </div>
);

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

export default function FinancialTransactionDrawer({ transactionId, onClose }) {
  const [state, setState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    if (!transactionId) {
      return undefined;
    }

    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState({ loading: true, data: null, error: "" }),
    );
    financeOperationsApi
      .getTransactionById(transactionId, { signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({
          loading: false,
          data: null,
          error: "Không thể tải chi tiết giao dịch.",
        });
      });

    return () => controller.abort();
  }, [transactionId]);

  const detail = state.data;

  return (
    <Drawer
      title="Chi tiết giao dịch"
      open={Boolean(transactionId)}
      onClose={onClose}
      width={760}
      destroyOnClose
    >
      {state.loading && (
        <div className="flex min-h-40 items-center justify-center"><Spin /></div>
      )}
      {!state.loading && state.error && <Alert type="error" showIcon message={state.error} />}
      {!state.loading && detail && (
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-background/60 p-4">
            <h3 className="text-xs font-black uppercase tracking-wide text-primary">Tổng quan</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailField label="Loại giao dịch" value={getFinanceLabel(TRANSACTION_TYPE_LABELS, detail.transactionType)} />
              <DetailField label="Số tiền" value={formatFinanceCurrency(detail.amount)} />
              <DetailField label="Trạng thái" value={getFinanceLabel(TRANSACTION_STATUS_LABELS, detail.status)} />
              <DetailField label="Thời gian" value={formatFinanceDateTime(detail.createdAt)} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-background/60 p-4">
            <h3 className="text-xs font-black uppercase tracking-wide text-primary">Tham chiếu / Thanh toán</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailField label="Loại tham chiếu" value={getFinanceLabel(REFERENCE_TYPE_LABELS, detail.referenceType)} />
              <DetailField label="Mã tham chiếu" value={detail.referenceCode || shortenFinanceId(detail.referenceId)} />
              {detail.paymentId && <DetailField label="Mã thanh toán" value={detail.paymentId} />}
              {detail.paymentMethod !== null && detail.paymentMethod !== undefined && (
                <DetailField label="Phương thức thanh toán" value={getFinanceLabel(PAYMENT_METHOD_LABELS, detail.paymentMethod)} />
              )}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-primary">Từ</h3>
              <FinancialPartyDisplay party={detail.from} detailed />
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-primary">Đến</h3>
              <FinancialPartyDisplay party={detail.to} detailed />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-background/60 p-4">
            <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-primary">Thay đổi số dư liên quan</h3>
            <FinancialLedgerTable ledgers={detail.ledgers} />
          </section>
        </div>
      )}
    </Drawer>
  );
}

import { Alert, Button, Descriptions, Drawer, Empty, Select, Spin, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import useFinanceUpdates from "../../hooks/useFinanceUpdates";
import financeOperationsApi from "../../services/apis/financeOperationsApi";
import FinancialTransactionsPanel from "./FinancialTransactionsPanel";
import {
  formatFinanceCurrency,
  formatFinanceDateTime,
  getFinanceLabel,
  getPaymentStatusTone,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TRANSACTION_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPE_OPTIONS,
  shortenFinanceId,
} from "./financePresentation";

const DEFAULT_PAGE_SIZE = 10;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const toIsoBoundary = (value, endOfDay = false) => {
  if (!value) return undefined;
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  return new Date(`${value}${suffix}`).toISOString();
};

const getPaymentReference = (payment) => {
  if (payment?.orderId) return { label: "Đơn hàng", id: payment.orderId };
  if (payment?.subscriptionId) return { label: "Gói đăng ký", id: payment.subscriptionId };
  if (payment?.agreementId) return { label: "Thỏa thuận", id: payment.agreementId };
  return null;
};

const StatusTag = ({ status }) => (
  <Tag className={`m-0 ${getPaymentStatusTone(status)}`}>
    {getFinanceLabel(PAYMENT_STATUS_LABELS, status)}
  </Tag>
);

export function PaymentDetailDrawer({ paymentId, onClose }) {
  const [state, setState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    if (!paymentId) return undefined;
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState({ loading: true, data: null, error: "" }),
    );
    financeOperationsApi
      .getPaymentById(paymentId, { signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, data: null, error: "Không thể tải chi tiết thanh toán." });
      });
    return () => controller.abort();
  }, [paymentId]);

  const payment = state.data?.payment;
  const attempts = Array.isArray(state.data?.paymentTransactions)
    ? state.data.paymentTransactions
    : [];
  const reference = getPaymentReference(payment);

  return (
    <Drawer
      open={Boolean(paymentId)}
      onClose={onClose}
      width={980}
      title="Chi tiết thanh toán"
      destroyOnHidden
    >
      {state.loading && (
        <div className="flex min-h-40 items-center justify-center">
          <Spin />
        </div>
      )}
      {state.error && <Alert type="error" showIcon message={state.error} />}
      {payment && (
        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-primary">
              Thông tin thanh toán
            </h3>
            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label="Mã thanh toán">
                <span className="break-all font-mono text-xs">{payment.paymentId}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Người trả">{payment.payerUsername || "—"}</Descriptions.Item>
              <Descriptions.Item label="Loại">{getFinanceLabel(PAYMENT_TYPE_LABELS, payment.paymentType)}</Descriptions.Item>
              <Descriptions.Item label="Phương thức">{getFinanceLabel(PAYMENT_METHOD_LABELS, payment.paymentMethod)}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><StatusTag status={payment.paymentStatus} /></Descriptions.Item>
              <Descriptions.Item label="Số tiền">{formatFinanceCurrency(payment.amount)}</Descriptions.Item>
              <Descriptions.Item label="Tham chiếu">
                {reference ? (
                  <span>
                    {reference.label} ·{" "}
                    <span title={reference.id} className="font-mono text-xs">
                      {shortenFinanceId(reference.id)}
                    </span>
                  </span>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tạo lúc">{formatFinanceDateTime(payment.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Thanh toán lúc">{formatFinanceDateTime(payment.paidAt)}</Descriptions.Item>
              <Descriptions.Item label="Hết hạn lúc">{formatFinanceDateTime(payment.expiredAt)}</Descriptions.Item>
              <Descriptions.Item label="Mô tả" span={2}>{payment.description || "—"}</Descriptions.Item>
            </Descriptions>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-primary">
              Các lần gọi cổng thanh toán
            </h3>
            <Table
              size="small"
              rowKey={(item) => item.paymentTransactionId}
              dataSource={attempts}
              pagination={false}
              locale={{ emptyText: <Empty description="Không có lần gọi cổng thanh toán (ví dụ thanh toán bằng ví)." /> }}
              scroll={{ x: 760 }}
              columns={[
                { title: "Mã lần gọi", dataIndex: "paymentTransactionId", render: (value) => <span title={value} className="font-mono text-xs">{shortenFinanceId(value)}</span> },
                { title: "Mã đơn PayOS", dataIndex: "payOSOrderCode", render: (value) => value || "—" },
                { title: "Mã giao dịch PayOS", dataIndex: "payOSTransactionId", render: (value) => value || "—" },
                { title: "Trạng thái", dataIndex: "paymentTransactionStatus", render: (value) => <Tag>{getFinanceLabel(PAYMENT_TRANSACTION_STATUS_LABELS, value)}</Tag> },
                { title: "Tạo lúc", dataIndex: "createdAt", render: formatFinanceDateTime },
                { title: "Cập nhật", dataIndex: "updatedAt", render: formatFinanceDateTime },
              ]}
            />
          </section>

          <section>
            <h3 className="mb-1 text-xs font-black uppercase tracking-wide text-primary">
              Giao dịch tài chính của thanh toán này
            </h3>
            <p className="mb-3 text-xs text-textLight">
              Dòng tiền thực tế được ghi nhận cho thanh toán; thanh toán thất bại, hết hạn hoặc bị hủy có thể không có giao dịch nào.
            </p>
            <FinancialTransactionsPanel admin compact paymentId={payment.paymentId} />
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default function PaymentManagementPanel() {
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    method: "",
    fromDate: "",
    toDate: "",
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [state, setState] = useState({ loading: true, items: [], totalCount: 0, error: "" });

  useFinanceUpdates((payload) => {
    if (payload.reconnected || payload.managementPayment) {
      setRefreshVersion((current) => current + 1);
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    financeOperationsApi
      .getPayments({
        ...filters,
        fromDate: toIsoBoundary(filters.fromDate),
        toDate: toIsoBoundary(filters.toDate, true),
        pageNumber,
        pageSize,
        signal: controller.signal,
      })
      .then((page) =>
        setState({ loading: false, items: page.items, totalCount: page.totalCount, error: "" }),
      )
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, items: [], totalCount: 0, error: "Không thể tải danh sách thanh toán." });
      });
    return () => controller.abort();
  }, [filters, pageNumber, pageSize, refreshVersion]);

  const columns = useMemo(
    () => [
      { title: "Tạo lúc", dataIndex: "createdAt", render: formatFinanceDateTime },
      { title: "Người trả", dataIndex: "payerUsername", render: (value) => <span className="font-bold text-text">{value || "—"}</span> },
      { title: "Loại", dataIndex: "paymentType", render: (value) => getFinanceLabel(PAYMENT_TYPE_LABELS, value) },
      { title: "Phương thức", dataIndex: "paymentMethod", render: (value) => getFinanceLabel(PAYMENT_METHOD_LABELS, value) },
      {
        title: "Tham chiếu",
        render: (_, item) => {
          const reference = getPaymentReference(item);
          return reference ? (
            <span>
              {reference.label} ·{" "}
              <span title={reference.id} className="font-mono text-xs">{shortenFinanceId(reference.id)}</span>
            </span>
          ) : (
            "—"
          );
        },
      },
      { title: "Số tiền", dataIndex: "amount", align: "right", render: formatFinanceCurrency },
      { title: "Trạng thái", dataIndex: "paymentStatus", render: (value) => <StatusTag status={value} /> },
      {
        title: "",
        render: (_, item) => (
          <Button size="small" onClick={() => setSelectedId(item.paymentId)}>
            Xem chi tiết
          </Button>
        ),
      },
    ],
    [],
  );

  const updateFilter = (key, value) => {
    setPageNumber(1);
    setFilters((current) => ({ ...current, [key]: value || "" }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-text">Thanh toán</h2>
          <p className="mt-1 text-sm text-textLight">
            Vòng đời của mọi khoản thanh toán, kể cả thanh toán thất bại, hết hạn hoặc bị hủy chưa phát sinh tiền.
          </p>
        </div>
        <Button onClick={() => setRefreshVersion((current) => current + 1)}>Làm mới</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Select allowClear placeholder="Trạng thái" value={filters.status || undefined} onChange={(value) => updateFilter("status", value)} options={PAYMENT_STATUS_OPTIONS} />
        <Select allowClear placeholder="Loại thanh toán" value={filters.type || undefined} onChange={(value) => updateFilter("type", value)} options={PAYMENT_TYPE_OPTIONS} />
        <Select allowClear placeholder="Phương thức" value={filters.method || undefined} onChange={(value) => updateFilter("method", value)} options={PAYMENT_METHOD_OPTIONS} />
        <input aria-label="Từ ngày" type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} className="rounded-md border border-border px-3 py-2 text-sm" />
        <input aria-label="Đến ngày" type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} className="rounded-md border border-border px-3 py-2 text-sm" />
      </div>

      {state.error && <Alert type="error" showIcon message={state.error} />}
      <Table
        rowKey={(item) => item.paymentId}
        columns={columns}
        dataSource={state.items}
        loading={state.loading}
        locale={{ emptyText: <Empty description="Chưa có thanh toán phù hợp." /> }}
        pagination={{
          current: pageNumber,
          pageSize,
          total: state.totalCount,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          onChange: (nextPage, nextSize) => {
            setPageNumber(nextSize === pageSize ? nextPage : 1);
            setPageSize(nextSize);
          },
        }}
        scroll={{ x: 1100 }}
      />

      <PaymentDetailDrawer paymentId={selectedId} onClose={() => setSelectedId("")} />
    </div>
  );
}

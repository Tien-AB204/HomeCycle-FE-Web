import { Alert, Button, Empty, Input, Select, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import useFinanceUpdates, { isOrderEscrowEvent } from "../../hooks/useFinanceUpdates";
import financeOperationsApi from "../../services/apis/financeOperationsApi";
import {
  formatFinanceCurrency,
  formatFinanceDateTime,
  getFinanceLabel,
  getPaymentStatusTone,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from "./financePresentation";

const DEFAULT_PAGE_SIZE = 10;

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const DISPUTE_OPTIONS = [
  { value: "true", label: "Đang có tranh chấp" },
  { value: "false", label: "Không có tranh chấp" },
];

export default function OrderEscrowsPanel() {
  const [keywordInput, setKeywordInput] = useState("");
  const [filters, setFilters] = useState({
    keyword: "",
    orderStatus: "",
    paymentStatus: "",
    hasActiveDispute: "",
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], totalCount: 0, error: "" });

  useFinanceUpdates((payload) => {
    if (payload.reconnected || isOrderEscrowEvent(payload)) {
      setRefreshVersion((current) => current + 1);
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.keyword === keywordInput.trim()
          ? current
          : { ...current, keyword: keywordInput.trim() },
      );
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    financeOperationsApi
      .getOrderEscrows({ ...filters, pageNumber, pageSize, signal: controller.signal })
      .then((page) =>
        setState({ loading: false, items: page.items, totalCount: page.totalCount, error: "" }),
      )
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, items: [], totalCount: 0, error: "Không thể tải danh sách tiền đơn hàng đang giữ." });
      });
    return () => controller.abort();
  }, [filters, pageNumber, pageSize, refreshVersion]);

  const columns = useMemo(
    () => [
      {
        title: "Đơn hàng",
        render: (_, item) => (
          <div>
            <p className="font-bold text-text">{item.orderCode || "—"}</p>
            <p className="text-xs text-textLight">{item.productName || "—"}</p>
          </div>
        ),
      },
      { title: "Người mua", dataIndex: "buyerUsername", render: (value) => value || "—" },
      { title: "Người bán", dataIndex: "sellerUsername", render: (value) => value || "—" },
      { title: "Số tiền đang giữ", dataIndex: "escrowAmount", align: "right", render: (value) => <span className="font-black text-text">{formatFinanceCurrency(value)}</span> },
      { title: "Trạng thái đơn", dataIndex: "orderStatus", render: (value) => getFinanceLabel(ORDER_STATUS_LABELS, value) },
      {
        title: "Thanh toán",
        dataIndex: "paymentStatus",
        render: (value) => (
          <Tag className={`m-0 ${getPaymentStatusTone(value)}`}>{getFinanceLabel(PAYMENT_STATUS_LABELS, value)}</Tag>
        ),
      },
      {
        title: "Tranh chấp",
        dataIndex: "hasActiveDispute",
        render: (value) => (value ? <Tag color="error" className="m-0">Đang có</Tag> : <span className="text-textLight">Không</span>),
      },
      { title: "Hết hạn khiếu nại", dataIndex: "disputeWindowEndsAt", render: (value) => (value ? formatFinanceDateTime(value) : "Chưa xác định") },
      { title: "Cập nhật", dataIndex: "updatedAt", render: formatFinanceDateTime },
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
          <h2 className="text-lg font-black text-text">Tiền đơn hàng đang giữ (Order Escrow)</h2>
          <p className="mt-1 text-sm text-textLight">
            Tiền của các đơn hàng mà HomeCycle đang giữ hộ, chưa hoàn cho người mua hoặc chuyển cho người bán. Đơn đã hoàn tất vẫn có thể còn ở đây nếu chưa đủ điều kiện chuyển tiền.
          </p>
        </div>
        <Button onClick={() => setRefreshVersion((current) => current + 1)}>Làm mới</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Input allowClear placeholder="Mã đơn, người mua hoặc người bán" value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} />
        <Select allowClear placeholder="Trạng thái đơn" value={filters.orderStatus || undefined} onChange={(value) => updateFilter("orderStatus", value)} options={ORDER_STATUS_OPTIONS} />
        <Select allowClear placeholder="Trạng thái thanh toán" value={filters.paymentStatus || undefined} onChange={(value) => updateFilter("paymentStatus", value)} options={PAYMENT_STATUS_OPTIONS} />
        <Select allowClear placeholder="Tranh chấp" value={filters.hasActiveDispute || undefined} onChange={(value) => updateFilter("hasActiveDispute", value)} options={DISPUTE_OPTIONS} />
      </div>

      {state.error && <Alert type="error" showIcon message={state.error} />}
      <Table
        rowKey={(item) => item.orderId}
        columns={columns}
        dataSource={state.items}
        loading={state.loading}
        locale={{ emptyText: <Empty description="Không có đơn hàng nào đang được giữ tiền." /> }}
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
        scroll={{ x: 1200 }}
      />
    </div>
  );
}

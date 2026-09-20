import { Alert, Empty, Select, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import financeOperationsApi from "../../services/apis/financeOperationsApi";
import FinancialPartyDisplay from "./FinancialPartyDisplay";
import FinancialTransactionDrawer from "./FinancialTransactionDrawer";
import {
  formatFinanceCurrency,
  formatFinanceDateTime,
  getFinanceLabel,
  getFinanceReferenceLabel,
  PAYMENT_METHOD_LABELS,
  REFERENCE_TYPE_OPTIONS,
  shortenFinanceId,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_OPTIONS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_OPTIONS,
} from "./financePresentation";

const DEFAULT_PAGE_SIZE = 10;

const toIsoBoundary = (value, endOfDay = false) => {
  if (!value) return undefined;
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  return new Date(`${value}${suffix}`).toISOString();
};

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

export default function FinancialTransactionsPanel({ admin = false }) {
  const [filters, setFilters] = useState({
    transactionType: "",
    referenceType: "",
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState("");
  const [state, setState] = useState({
    loading: true,
    items: [],
    totalCount: 0,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    financeOperationsApi
      .getTransactions({
        ...filters,
        fromDate: toIsoBoundary(filters.fromDate),
        toDate: toIsoBoundary(filters.toDate, true),
        pageNumber,
        pageSize,
        signal: controller.signal,
      })
      .then((page) =>
        setState({
          loading: false,
          items: page.items,
          totalCount: page.totalCount,
          error: "",
        }),
      )
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({
          loading: false,
          items: [],
          totalCount: 0,
          error: "Không thể tải lịch sử giao dịch.",
        });
      });
    return () => controller.abort();
  }, [filters, pageNumber, pageSize]);

  const columns = useMemo(() => {
    const result = [
      {
        title: "Thời gian",
        dataIndex: "createdAt",
        render: formatFinanceDateTime,
      },
      {
        title: "Loại giao dịch",
        dataIndex: "transactionType",
        render: (value) => getFinanceLabel(TRANSACTION_TYPE_LABELS, value),
      },
      {
        title: "Từ",
        dataIndex: "from",
        render: (party) => <FinancialPartyDisplay party={party} />,
      },
      {
        title: "Đến",
        dataIndex: "to",
        render: (party) => <FinancialPartyDisplay party={party} />,
      },
      {
        title: "Tham chiếu",
        render: (_, item) => (
          <button
            type="button"
            className="text-left font-bold text-primary hover:underline"
            onClick={() => setSelectedId(item.walletTransactionId)}
          >
            {getFinanceReferenceLabel(
              item.referenceType,
              item.referenceCode,
              item.referenceId,
            ) || shortenFinanceId(item.walletTransactionId)}
          </button>
        ),
      },
    ];

    if (admin) {
      result.push({
        title: "Thanh toán",
        render: (_, item) => (
          <div>
            <p className="font-bold text-text">
              {item.paymentMethod !== null && item.paymentMethod !== undefined
                ? getFinanceLabel(PAYMENT_METHOD_LABELS, item.paymentMethod)
                : "—"}
            </p>
            {item.paymentId && (
              <p title={item.paymentId} className="font-mono text-[11px] text-textLight">
                {shortenFinanceId(item.paymentId)}
              </p>
            )}
          </div>
        ),
      });
    }

    result.push(
      {
        title: "Số tiền",
        dataIndex: "amount",
        align: "right",
        render: formatFinanceCurrency,
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        render: (value) => <Tag>{getFinanceLabel(TRANSACTION_STATUS_LABELS, value)}</Tag>,
      },
    );

    return result;
  }, [admin]);

  const updateFilter = (key, value) => {
    setPageNumber(1);
    setFilters((current) => ({ ...current, [key]: value || "" }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-text">Lịch sử giao dịch</h2>
        <p className="mt-1 text-sm text-textLight">
          Mỗi dòng là một giao dịch ví hoặc thanh toán được HomeCycle ghi nhận. Bấm vào tham chiếu để xem chi tiết và các thay đổi số dư liên quan.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Select allowClear placeholder="Loại giao dịch" value={filters.transactionType || undefined} onChange={(value) => updateFilter("transactionType", value)} options={TRANSACTION_TYPE_OPTIONS} />
        <Select allowClear placeholder="Loại tham chiếu" value={filters.referenceType || undefined} onChange={(value) => updateFilter("referenceType", value)} options={REFERENCE_TYPE_OPTIONS} />
        <Select allowClear placeholder="Trạng thái" value={filters.status || undefined} onChange={(value) => updateFilter("status", value)} options={TRANSACTION_STATUS_OPTIONS} />
        <input aria-label="Từ ngày" type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} className="rounded-md border border-border px-3 py-2 text-sm" />
        <input aria-label="Đến ngày" type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} className="rounded-md border border-border px-3 py-2 text-sm" />
      </div>

      {state.error && <Alert type="error" showIcon message={state.error} />}
      <Table
        rowKey={(item) => item.walletTransactionId}
        columns={columns}
        dataSource={state.items}
        loading={state.loading}
        locale={{ emptyText: <Empty description="Chưa có giao dịch phù hợp." /> }}
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
        onRow={(item) => ({
          onClick: () => setSelectedId(item.walletTransactionId),
          style: { cursor: "pointer" },
        })}
        scroll={{ x: admin ? 1250 : 1100 }}
      />

      <FinancialTransactionDrawer
        transactionId={selectedId}
        onClose={() => setSelectedId("")}
      />
    </div>
  );
}

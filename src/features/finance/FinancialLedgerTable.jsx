import { Empty, Table } from "antd";
import {
  formatFinanceCurrency,
  formatFinanceDateTime,
  getFinanceLabel,
  LEDGER_BALANCE_TYPE_LABELS,
  LEDGER_DIRECTION_LABELS,
} from "./financePresentation";

export default function FinancialLedgerTable({ ledgers = [] }) {
  const columns = [
    {
      title: "Chiều",
      dataIndex: "direction",
      render: (value) => getFinanceLabel(LEDGER_DIRECTION_LABELS, value),
    },
    {
      title: "Loại số dư",
      dataIndex: "balanceType",
      render: (value) => getFinanceLabel(LEDGER_BALANCE_TYPE_LABELS, value),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      align: "right",
      render: formatFinanceCurrency,
    },
    {
      title: "Số dư trước",
      dataIndex: "balanceBefore",
      align: "right",
      render: formatFinanceCurrency,
    },
    {
      title: "Số dư sau",
      dataIndex: "balanceAfter",
      align: "right",
      render: formatFinanceCurrency,
    },
    { title: "Nội dung", dataIndex: "description", render: (value) => value || "—" },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      render: formatFinanceDateTime,
    },
  ];

  return (
    <Table
      rowKey={(item) => item.ledgerId}
      columns={columns}
      dataSource={Array.isArray(ledgers) ? ledgers : []}
      pagination={false}
      locale={{ emptyText: <Empty description="Chưa có thay đổi số dư liên quan." /> }}
      scroll={{ x: 900 }}
      size="small"
    />
  );
}

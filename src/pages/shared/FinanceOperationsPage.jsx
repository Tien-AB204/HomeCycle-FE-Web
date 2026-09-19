import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Drawer, Empty, Input, Select, Spin, Table, Tag } from "antd";
import financeOperationsApi from "../../services/apis/financeOperationsApi";

const PAGE_SIZE = 10;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(date);
};

const findValue = (source, ...keys) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }
  return undefined;
};

const FundsPanel = ({ data, loading, error }) => {
  if (loading) return <Spin />;
  if (error) return <Alert type="error" showIcon message={error} />;
  if (!data) return null;

  const source = data?.data ?? data;
  const rows = [
    ["Tổng Available người dùng", findValue(source, "userAvailableBalance", "totalUserAvailableBalance", "UserAvailableBalance", "TotalUserAvailableBalance")],
    ["Tổng Hold người dùng", findValue(source, "userHoldBalance", "totalUserHoldBalance", "UserHoldBalance", "TotalUserHoldBalance")],
    ["Tổng Available ví hệ thống", findValue(source, "systemAvailableBalance", "totalSystemAvailableBalance", "SystemAvailableBalance", "TotalSystemAvailableBalance")],
    ["Tổng Hold ví hệ thống", findValue(source, "systemHoldBalance", "totalSystemHoldBalance", "SystemHoldBalance", "TotalSystemHoldBalance")],
  ].filter(([, value]) => value !== undefined);

  if (!rows.length) {
    return (
      <pre className="overflow-auto rounded-xl bg-background p-4 text-xs text-text">
        {JSON.stringify(source, null, 2)}
      </pre>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-border bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-textLight">{label}</div>
          <div className="mt-2 text-xl font-black text-text">{formatCurrency(value)}</div>
        </div>
      ))}
    </div>
  );
};

const HoldsPanel = ({ data, loading, error }) => {
  if (loading) return <Spin />;
  if (error) return <Alert type="error" showIcon message={error} />;

  const source = data?.data ?? data;
  const items = Array.isArray(source)
    ? source
    : Array.isArray(source?.items)
      ? source.items
      : [];

  if (!items.length) return <Empty description="Không có khoản tiền đang hold." />;

  const columns = [
    {
      title: "Ví",
      render: (_, item) =>
        findValue(item, "walletName", "walletType", "WalletName", "WalletType") || "—",
    },
    {
      title: "Reference",
      render: (_, item) => {
        const type = findValue(item, "referenceType", "ReferenceType") || "—";
        const id = findValue(item, "referenceId", "ReferenceId") || "";
        return id ? `${type} · ${id}` : type;
      },
    },
    {
      title: "Số tiền hold",
      align: "right",
      render: (_, item) =>
        formatCurrency(findValue(item, "holdAmount", "amount", "HoldAmount", "Amount")),
    },
  ];

  return (
    <Table
      rowKey={(item, index) =>
        String(
          findValue(item, "referenceId", "ReferenceId", "walletId", "WalletId") ??
            index,
        )
      }
      pagination={false}
      columns={columns}
      dataSource={items}
      scroll={{ x: 720 }}
    />
  );
};

export default function FinanceOperationsPage({ admin = false }) {
  const [funds, setFunds] = useState({ loading: admin, data: null, error: "" });
  const [holds, setHolds] = useState({ loading: true, data: null, error: "" });
  const [filters, setFilters] = useState({
    transactionType: "",
    referenceType: "",
    status: "",
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [transactions, setTransactions] = useState({
    loading: true,
    error: "",
    page: {
      items: [],
      pageNumber: 1,
      pageSize: PAGE_SIZE,
      totalCount: 0,
      totalPages: 0,
    },
  });
  const [detailId, setDetailId] = useState("");
  const [detail, setDetail] = useState({ loading: false, data: null, error: "" });

  const loadFunds = useCallback(() => {
    if (!admin) return;
    const controller = new AbortController();
    setFunds((current) => ({ ...current, loading: true, error: "" }));
    financeOperationsApi
      .getFunds({ signal: controller.signal })
      .then((data) => setFunds({ loading: false, data, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setFunds({
          loading: false,
          data: null,
          error: getErrorMessage(error, "Không thể tải tổng quan số dư."),
        });
      });
    return () => controller.abort();
  }, [admin]);

  const loadHolds = useCallback(() => {
    const controller = new AbortController();
    setHolds((current) => ({ ...current, loading: true, error: "" }));
    financeOperationsApi
      .getHolds({ signal: controller.signal })
      .then((data) => setHolds({ loading: false, data, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setHolds({
          loading: false,
          data: null,
          error: getErrorMessage(error, "Không thể tải các khoản tiền đang hold."),
        });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => loadFunds(), [loadFunds]);
  useEffect(() => loadHolds(), [loadHolds]);

  useEffect(() => {
    const controller = new AbortController();
    setTransactions((current) => ({ ...current, loading: true, error: "" }));

    financeOperationsApi
      .getTransactions({
        ...filters,
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((page) =>
        setTransactions({
          loading: false,
          error: "",
          page,
        }),
      )
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setTransactions((current) => ({
          ...current,
          loading: false,
          error: getErrorMessage(error, "Không thể tải giao dịch tài chính."),
        }));
      });

    return () => controller.abort();
  }, [filters, pageNumber]);

  useEffect(() => {
    if (!detailId) {
      setDetail({ loading: false, data: null, error: "" });
      return undefined;
    }

    const controller = new AbortController();
    setDetail({ loading: true, data: null, error: "" });

    financeOperationsApi
      .getTransactionById(detailId, { signal: controller.signal })
      .then((data) => setDetail({ loading: false, data, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setDetail({
          loading: false,
          data: null,
          error: getErrorMessage(error, "Không thể tải chi tiết giao dịch."),
        });
      });

    return () => controller.abort();
  }, [detailId]);

  const transactionColumns = useMemo(
    () => [
      {
        title: "Giao dịch",
        render: (_, item) => (
          <button
            type="button"
            className="text-left font-bold text-primary hover:underline"
            onClick={() =>
              setDetailId(
                String(
                  findValue(
                    item,
                    "walletTransactionId",
                    "transactionId",
                    "WalletTransactionId",
                    "TransactionId",
                  ) || "",
                ),
              )
            }
          >
            {findValue(
              item,
              "transactionCode",
              "walletTransactionId",
              "transactionId",
              "TransactionCode",
              "WalletTransactionId",
              "TransactionId",
            ) || "Xem chi tiết"}
          </button>
        ),
      },
      {
        title: "Loại",
        render: (_, item) =>
          findValue(item, "transactionType", "TransactionType") || "—",
      },
      {
        title: "Reference",
        render: (_, item) =>
          findValue(item, "referenceType", "ReferenceType") || "—",
      },
      {
        title: "Trạng thái",
        render: (_, item) => (
          <Tag>
            {findValue(item, "status", "transactionStatus", "Status", "TransactionStatus") ||
              "—"}
          </Tag>
        ),
      },
      {
        title: "Số tiền",
        align: "right",
        render: (_, item) =>
          formatCurrency(
            findValue(item, "amount", "netAmount", "Amount", "NetAmount"),
          ),
      },
      {
        title: "Thời gian",
        render: (_, item) =>
          formatDateTime(
            findValue(item, "createdAt", "occurredAt", "CreatedAt", "OccurredAt"),
          ),
      },
    ],
    [],
  );

  return (
    <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
          {admin ? "Trung tâm quản trị" : "Trung tâm kiểm duyệt"}
        </p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">
          Vận hành tài chính
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
          Theo dõi số dư, tiền đang hold và toàn bộ financial transaction do Backend cung cấp.
        </p>
      </header>

      {admin && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-text">Tổng quan số dư</h2>
            <Button onClick={loadFunds}>Tải lại</Button>
          </div>
          <FundsPanel {...funds} />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-text">Các khoản tiền đang hold</h2>
          <Button onClick={loadHolds}>Tải lại</Button>
        </div>
        <HoldsPanel {...holds} />
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-black text-text">Financial transactions</h2>
          <p className="mt-1 text-sm text-textLight">
            Lọc theo loại giao dịch, reference và trạng thái. Bấm mã giao dịch để xem ledger chi tiết.
          </p>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Input
            allowClear
            placeholder="Loại giao dịch"
            value={filters.transactionType}
            onChange={(event) => {
              setPageNumber(1);
              setFilters((current) => ({
                ...current,
                transactionType: event.target.value,
              }));
            }}
          />
          <Input
            allowClear
            placeholder="Reference type"
            value={filters.referenceType}
            onChange={(event) => {
              setPageNumber(1);
              setFilters((current) => ({
                ...current,
                referenceType: event.target.value,
              }));
            }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            value={filters.status || undefined}
            onChange={(value) => {
              setPageNumber(1);
              setFilters((current) => ({
                ...current,
                status: value ?? "",
              }));
            }}
            options={[
              { value: "Pending", label: "Pending" },
              { value: "Completed", label: "Completed" },
              { value: "Failed", label: "Failed" },
              { value: "Cancelled", label: "Cancelled" },
            ]}
          />
        </div>

        {transactions.error && (
          <Alert className="mb-4" type="error" showIcon message={transactions.error} />
        )}

        <Table
          rowKey={(item, index) =>
            String(
              findValue(
                item,
                "walletTransactionId",
                "transactionId",
                "WalletTransactionId",
                "TransactionId",
              ) ?? index,
            )
          }
          loading={transactions.loading}
          columns={transactionColumns}
          dataSource={transactions.page.items}
          scroll={{ x: 1000 }}
          pagination={{
            current: transactions.page.pageNumber,
            pageSize: transactions.page.pageSize,
            total: transactions.page.totalCount,
            showSizeChanger: false,
            onChange: setPageNumber,
          }}
        />
      </div>

      <Drawer
        title="Chi tiết financial transaction"
        width={720}
        open={Boolean(detailId)}
        onClose={() => setDetailId("")}
      >
        {detail.loading ? (
          <div className="flex justify-center py-14"><Spin /></div>
        ) : detail.error ? (
          <Alert type="error" showIcon message={detail.error} />
        ) : detail.data ? (
          <pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-background p-4 text-xs text-text">
            {JSON.stringify(detail.data, null, 2)}
          </pre>
        ) : null}
      </Drawer>
    </section>
  );
}

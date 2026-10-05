import { Alert, Button, Empty, Spin, Table, Tabs } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FinancialPartyDisplay from "../../features/finance/FinancialPartyDisplay";
import FinancialTransactionsPanel from "../../features/finance/FinancialTransactionsPanel";
import OrderEscrowsPanel from "../../features/finance/OrderEscrowsPanel";
import PaymentManagementPanel from "../../features/finance/PaymentManagementPanel";
import useFinanceUpdates, { hasItems } from "../../hooks/useFinanceUpdates";
import {
  formatFinanceCurrency,
  getFinanceLabel,
  REFERENCE_TYPE_LABELS,
  SYSTEM_PURPOSE_LABELS,
  USER_ROLE_LABELS,
  WALLET_TYPE_LABELS,
} from "../../features/finance/financePresentation";
import financeOperationsApi from "../../services/apis/financeOperationsApi";
import PortalPageHeader from "../../components/admin/PortalPageHeader";

const VALID_TABS = new Set(["funds", "payments", "transactions", "escrows", "holds"]);
const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const SummaryCard = ({ label, value, description }) => (
  <article className="rounded-2xl border border-border bg-white p-4">
    <p className="text-xs font-black uppercase tracking-wide text-textLight">{label}</p>
    <p className="mt-2 text-xl font-black text-text">{formatFinanceCurrency(value)}</p>
    {description && <p className="mt-2 text-xs leading-5 text-textLight">{description}</p>}
  </article>
);

function FundsPanel() {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useFinanceUpdates((payload) => {
    if (payload.reconnected || hasItems(payload.wallets)) {
      setVersion((current) => current + 1);
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    financeOperationsApi
      .getFunds({ signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, data: null, error: "Không thể tải số dư ví." });
      });
    return () => controller.abort();
  }, [version]);

  if (state.loading) return <div className="flex min-h-40 items-center justify-center"><Spin /></div>;
  if (state.error) return <Alert type="error" showIcon message={state.error} action={<Button onClick={() => setVersion((current) => current + 1)}>Thử lại</Button>} />;

  const data = state.data || {};
  const personalTotal = Number(data.totalPersonalAvailable || 0) + Number(data.totalPersonalHold || 0);
  const businessTotal = Number(data.totalBusinessAvailable || 0) + Number(data.totalBusinessHold || 0);
  const userTotal = Number(data.totalUserAvailable || 0) + Number(data.totalUserHold || 0);
  const systemWallets = Array.isArray(data.systemWallets) ? data.systemWallets : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-text">Số dư người dùng</h2>
          <Button onClick={() => setVersion((current) => current + 1)}>Làm mới</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Tổng số dư người dùng" value={userTotal} description="Số dư hiện tại trong ví Cá nhân và Doanh nghiệp (khả dụng cộng tạm giữ). Đây là tiền của người dùng, không phải doanh thu HomeCycle." />
          <SummaryCard label="Khả dụng" value={data.totalUserAvailable} />
          <SummaryCard label="Tạm giữ" value={data.totalUserHold} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background/50 p-4">
          <h3 className="font-black text-text">Cá nhân</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Khả dụng" value={data.totalPersonalAvailable} />
            <SummaryCard label="Tạm giữ" value={data.totalPersonalHold} />
            <SummaryCard label="Tổng" value={personalTotal} />
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-background/50 p-4">
          <h3 className="font-black text-text">Doanh nghiệp</h3>
          {/* Doanh nghiệp chỉ mua nên ví không có tiền tạm giữ; chỉ hiện khi dữ liệu bất thường. */}
          {Number(data.totalBusinessHold || 0) > 0 ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <SummaryCard label="Khả dụng" value={data.totalBusinessAvailable} />
              <SummaryCard label="Tạm giữ" value={data.totalBusinessHold} />
              <SummaryCard label="Tổng" value={businessTotal} />
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              <SummaryCard label="Số dư khả dụng" value={data.totalBusinessAvailable} />
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Tổng số dư ví hệ thống" value={data.totalSystemBalance} description="Tổng số dư các ví do HomeCycle quản lý: quỹ phí vận chuyển, doanh thu nền tảng và ví tạm giữ tiền đơn hàng." />
          <SummaryCard label="Tổng số dư trong các ví HomeCycle" value={data.totalRecordedBalance} description="Tổng khả dụng và tạm giữ của toàn bộ ví người dùng và ví hệ thống; không phải số dư ngân hàng hay doanh thu." />
        </div>
        <h3 className="mb-3 mt-5 font-black text-text">Các ví hệ thống</h3>
        {systemWallets.length === 0 ? (
          <Empty description="Chưa có ví hệ thống." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {systemWallets.map((wallet) => (
              <article key={wallet.walletId} className="rounded-2xl border border-border bg-white p-4">
                <p className="font-black text-text">{getFinanceLabel(SYSTEM_PURPOSE_LABELS, wallet.purpose)}</p>
                <p className="mt-3 text-xs text-textLight">Số dư</p>
                <p className="text-xl font-black text-text">{formatFinanceCurrency(wallet.balance)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HoldsPanel() {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const load = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    financeOperationsApi
      .getHolds({ signal: controller.signal })
      .then((data) => setState({ loading: false, items: Array.isArray(data) ? data : [], error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, items: [], error: "Không thể tải các khoản tiền đang tạm giữ." });
      });
    return () => controller.abort();
  }, [version]);

  const columns = useMemo(() => [
    { title: "Người dùng", render: (_, item) => <FinancialPartyDisplay party={item.owner} /> },
    { title: "Vai trò", render: (_, item) => getFinanceLabel(USER_ROLE_LABELS, item.owner?.role) },
    { title: "Loại ví", render: (_, item) => getFinanceLabel(WALLET_TYPE_LABELS, item.owner?.walletType) },
    { title: "Loại tham chiếu", dataIndex: "referenceType", render: (value) => getFinanceLabel(REFERENCE_TYPE_LABELS, value) },
    {
      title: "Mã tham chiếu",
      render: (_, item) => (
        <div><p className="font-bold text-text">{item.referenceCode || "—"}</p>{item.referenceId && <p title={item.referenceId} className="font-mono text-[11px] text-textLight">{item.referenceId}</p>}</div>
      ),
    },
    { title: "Số tiền tạm giữ", dataIndex: "holdAmount", align: "right", render: formatFinanceCurrency },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-text">Các khoản tiền đang tạm giữ trong ví người dùng</h2><p className="mt-1 text-sm text-textLight">Tiền trong ví người dùng tạm thời chưa dùng được, ví dụ đang chờ rút. Tiền của đơn hàng không nằm ở đây mà ở tab "Tiền đơn hàng đang giữ".</p></div>
        <Button onClick={load}>Làm mới</Button>
      </div>
      {state.error && <Alert type="error" showIcon message={state.error} />}
      <Table rowKey={(item) => `${item.walletId}-${item.referenceId || "hold"}`} columns={columns} dataSource={state.items} loading={state.loading} locale={{ emptyText: <Empty description="Không có khoản tiền đang tạm giữ." /> }} pagination={{ defaultPageSize: 10, pageSizeOptions: [10, 20, 50], showSizeChanger: true }} scroll={{ x: 1050 }} />
    </div>
  );
}

export default function FinanceOperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || "funds";
  const activeTab = VALID_TABS.has(requestedTab) ? requestedTab : "funds";

  const changeTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  };

  return (
    <section className="hc-portal-page flex flex-col gap-6">
      <PortalPageHeader
        className="hc-page-head-flush"
        title="Ví & giao dịch"
        description="Theo dõi số dư ví, thanh toán, giao dịch và tiền đơn hàng HomeCycle đang giữ."
      />

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <Tabs activeKey={activeTab} onChange={changeTab} items={[
          { key: "funds", label: "Số dư & ví hệ thống", children: activeTab === "funds" ? <FundsPanel /> : null },
          { key: "payments", label: "Thanh toán", children: activeTab === "payments" ? <PaymentManagementPanel /> : null },
          { key: "transactions", label: "Lịch sử giao dịch", children: activeTab === "transactions" ? <FinancialTransactionsPanel admin /> : null },
          { key: "escrows", label: "Tiền đơn hàng đang giữ", children: activeTab === "escrows" ? <OrderEscrowsPanel /> : null },
          { key: "holds", label: "Tạm giữ trong ví người dùng", children: activeTab === "holds" ? <HoldsPanel /> : null },
        ]} />
      </div>
    </section>
  );
}

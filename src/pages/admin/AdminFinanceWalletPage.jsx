import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/admin/redesign/hc-finance.css";
import FinanceActivityTab from "../../features/admin/finance/FinanceActivityTab";
import FinanceEscrowsTab from "../../features/admin/finance/FinanceEscrowsTab";
import FinanceHoldsTab from "../../features/admin/finance/FinanceHoldsTab";
import FinanceLedgerTab from "../../features/admin/finance/FinanceLedgerTab";
import FinanceOverviewTab from "../../features/admin/finance/FinanceOverviewTab";
import FinancePaymentsTab from "../../features/admin/finance/FinancePaymentsTab";
import { FINANCE_TABS, resolveFinanceTab } from "../../features/admin/finance/financeLookup";
import useRealtimeRefresh from "../../hooks/useRealtimeRefresh";

export default function AdminFinanceWalletPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveFinanceTab(searchParams.get("tab"));
  const [liveVersion, setLiveVersion] = useState(0);

  // Số dư hiện tại đổi theo FinanceUpdated; số liệu theo kỳ đã hoàn tất không cần tải lại.
  useRealtimeRefresh(() => setLiveVersion((current) => current + 1), { finance: true, delay: 1500 });

  const openTab = (key) => setSearchParams(key === "overview" ? {} : { tab: key });

  return (
    <div className="hc-admin hc-finance">
      <main className="content">
        <div className="heading">
          <div>
            <h1>Tài chính & ví</h1>
            <p className="muted">Theo dõi tiền đang ghi nhận, dòng tiền và các khoản cần kiểm tra.</p>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Tài chính và ví">
          {FINANCE_TABS.map(([key, label]) => (
            <button type="button" role="tab" key={key} aria-selected={tab === key} onClick={() => openTab(key)}>
              {label}
            </button>
          ))}
        </nav>
        {tab === "overview" && <FinanceOverviewTab refreshKey={liveVersion} onNavigate={openTab} />}
        {tab === "finance" && <FinanceActivityTab />}
        {tab === "payments" && <FinancePaymentsTab />}
        {tab === "ledger" && <FinanceLedgerTab />}
        {tab === "escrows" && <FinanceEscrowsTab />}
        {tab === "holds" && <FinanceHoldsTab />}
      </main>
    </div>
  );
}

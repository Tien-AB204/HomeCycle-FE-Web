import { useSearchParams } from "react-router-dom";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/admin/redesign/hc-finance.css";
import FinanceActivityTab from "../../features/admin/finance/FinanceActivityTab";
import FinanceOverviewTab from "../../features/admin/finance/FinanceOverviewTab";
import GhnFundTab from "../../features/admin/finance/GhnFundTab";

const TABS = [
  ["overview", "Tổng quan"],
  ["finance", "Tài chính"],
  ["ghn", "Đối soát GHN"],
];

export default function AdminFinanceWalletPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some(([key]) => key === requested) ? requested : "overview";

  return (
    <div className="hc-admin hc-finance">
      <main className="content">
        <div className="heading">
          <div>
            <h1>Tài chính & ví</h1>
            <p className="muted">Theo dõi tiền đang ghi nhận, dòng tiền và các khoản cần kiểm tra.</p>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Tổng quan tài chính">
          {TABS.map(([key, label]) => (
            <button
              type="button"
              role="tab"
              key={key}
              aria-selected={tab === key}
              onClick={() => setSearchParams(key === "overview" ? {} : { tab: key })}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "overview" && <FinanceOverviewTab />}
        {tab === "finance" && <FinanceActivityTab />}
        {tab === "ghn" && <GhnFundTab />}
      </main>
    </div>
  );
}

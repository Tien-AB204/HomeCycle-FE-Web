import { useSearchParams } from "react-router-dom";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/admin/redesign/hc-subscriptions.css";
import SubscriptionListTab from "../../features/admin/subscriptions/SubscriptionListTab";
import SubscriptionStatsTab from "../../features/admin/subscriptions/SubscriptionStatsTab";

const TABS = [
  ["stats", "Thống kê"],
  ["list", "Danh sách gói"],
];

export default function AdminSubscriptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some(([key]) => key === requested) ? requested : "stats";

  return (
    <div className="hc-admin hc-subs">
      <main className="content">
        <div className="heading">
          <div>
            <h1>Gói đăng ký</h1>
            <p className="muted">Theo dõi doanh thu và quản lý giá, thời hạn, quyền lợi của gói.</p>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Gói đăng ký">
          {TABS.map(([key, label]) => (
            <button
              type="button"
              role="tab"
              key={key}
              aria-selected={tab === key}
              onClick={() => setSearchParams(key === "stats" ? {} : { tab: key })}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "stats" && <SubscriptionStatsTab />}
        {tab === "list" && <SubscriptionListTab />}
      </main>
    </div>
  );
}

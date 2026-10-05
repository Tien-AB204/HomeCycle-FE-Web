import { useSearchParams } from "react-router-dom";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/admin/redesign/hc-users.css";
import UsersListTab from "../../features/admin/users/UsersListTab";
import UsersOverviewTab from "../../features/admin/users/UsersOverviewTab";

const TABS = [
  ["overview", "Tổng quan"],
  ["list", "Danh sách tài khoản"],
];

export default function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedUserId = String(searchParams.get("userId") || "").trim();
  const requested = searchParams.get("tab") || (linkedUserId ? "list" : "");
  const tab = TABS.some(([key]) => key === requested) ? requested : "overview";

  return (
    <div className="hc-admin hc-users">
      <main className="content">
        <nav className="tabs" role="tablist" aria-label="Trang người dùng">
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
        {tab === "overview" && <UsersOverviewTab />}
        {tab === "list" && <UsersListTab linkedUserId={linkedUserId} />}
      </main>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import "../../features/admin/redesign/hc-admin.css";
import "../../features/admin/redesign/hc-disputes.css";
import DisputeCategoriesTab from "../../features/admin/disputes/DisputeCategoriesTab";
import DisputeConfigTab from "../../features/admin/disputes/DisputeConfigTab";
import DisputeOverviewTab from "../../features/admin/disputes/DisputeOverviewTab";
import disputeCategoryApi from "../../services/apis/disputeCategoryApi";

const TABS = [
  ["overview", "Tổng quan"],
  ["categories", "Danh mục"],
  ["config", "Cấu hình giá trị"],
];

export default function AdminDisputesPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some(([key]) => key === requested) ? requested : "overview";
  const openDisputeId = location.state?.notificationDisputeId || "";

  const [categories, setCategories] = useState({ loading: true, items: [], error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => setCategories((current) => ({ ...current, loading: true })));
    disputeCategoryApi
      .getAll({ signal: controller.signal })
      .then((items) => setCategories({ loading: false, items, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setCategories({ loading: false, items: [], error: "Không thể tải danh mục tranh chấp." });
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 5000);
  }, []);

  return (
    <div className="hc-admin hc-disputes">
      <main className="content">
        <nav className="tabs" aria-label="Quản lý tranh chấp">
          {TABS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-selected={tab === key}
              onClick={() => setSearchParams(key === "overview" ? {} : { tab: key })}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "overview" && <DisputeOverviewTab categories={categories.items} openDisputeId={openDisputeId} />}
        {tab === "categories" && (
          <DisputeCategoriesTab
            categories={categories.items}
            loading={categories.loading}
            error={categories.error}
            onReload={() => setReloadKey((key) => key + 1)}
            onToast={notify}
          />
        )}
        {tab === "config" && <DisputeConfigTab onToast={notify} />}

        {toast && <div className="toast" aria-live="polite">{toast}</div>}
      </main>
    </div>
  );
}

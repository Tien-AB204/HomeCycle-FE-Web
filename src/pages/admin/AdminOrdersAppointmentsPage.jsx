import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../features/admin/redesign/hc-admin.css";
import OperationsDetailDialog from "../../features/admin/operations/OperationsDetailDialog";
import OperationsHistory from "../../features/admin/operations/OperationsHistory";
import OperationsOverview from "../../features/admin/operations/OperationsOverview";

export default function AdminOrdersAppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "history" ? "history" : "overview";
  const kind = searchParams.get("kind") === "appointments" ? "appointments" : "orders";

  const [preset, setPreset] = useState(() => ({ kind, filters: {} }));
  const [detailTarget, setDetailTarget] = useState(null);

  const setView = (nextTab, nextKind = kind) => {
    const params = new URLSearchParams();
    if (nextTab === "history") {
      params.set("tab", "history");
      if (nextKind === "appointments") params.set("kind", "appointments");
    }
    setSearchParams(params);
  };

  const openHistory = useCallback(
    (nextKind, filters = {}) => {
      setPreset({ kind: nextKind, filters });
      const params = new URLSearchParams({ tab: "history" });
      if (nextKind === "appointments") params.set("kind", "appointments");
      setSearchParams(params);
      window.scrollTo({ top: 0 });
    },
    [setSearchParams],
  );

  const openDetail = useCallback((type, item) => setDetailTarget({ type, item }), []);

  return (
    <div className="hc-admin">
      <main className="content">
        <nav className="tabs" aria-label="Trang đơn hàng và lịch hẹn">
          <button type="button" aria-selected={tab === "overview"} onClick={() => setView("overview")}>
            Tổng quan
          </button>
          <button type="button" aria-selected={tab === "history"} onClick={() => setView("history")}>
            Lịch sử
          </button>
        </nav>

        {tab === "overview" ? (
          <OperationsOverview onOpenHistory={openHistory} onOpenDetail={openDetail} />
        ) : (
          <OperationsHistory preset={preset} onOpenDetail={openDetail} />
        )}

        <OperationsDetailDialog
          target={detailTarget}
          onClose={() => setDetailTarget(null)}
          onOpen={openDetail}
        />
      </main>
    </div>
  );
}

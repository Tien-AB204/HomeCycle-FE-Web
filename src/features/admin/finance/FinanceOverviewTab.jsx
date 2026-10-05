import { useEffect, useRef, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import financeOperationsApi from "../../../services/apis/financeOperationsApi";
import { SYSTEM_PURPOSE_LABELS } from "../../finance/financePresentation";
import { formatDateTime } from "../operations/operationsPresentation";
import { money } from "./financeFormat";

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

// Quỹ phí GHN: mục đích 1 (enum) hoặc tên enum.
const isGhnFund = (purpose) => String(purpose) === "1" || String(purpose) === "Shipping_Escrow";

const Value = ({ amount }) => (
  <strong className="value">
    {Number(amount || 0).toLocaleString("vi-VN")} <small>₫</small>
  </strong>
);

export default function FinanceOverviewTab({ refreshKey = 0, onNavigate }) {
  const walletDetailsRef = useRef(null);
  const [state, setState] = useState({ loading: true, error: "", funds: null, overview: null, health: null });

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    Promise.all([
      financeOperationsApi.getFunds({ signal }),
      adminDashboardApi.getFinanceOverview({ signal }).catch(() => null),
      adminDashboardApi.getFinanceHealth({ signal }).catch(() => null),
    ])
      .then(([funds, overview, health]) => setState({ loading: false, error: "", funds, overview, health }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState((current) => ({ ...current, loading: false, error: "Không thể tải số dư hiện tại." }));
      });
    return () => controller.abort();
  }, [refreshKey]);

  const { funds, overview, health } = state;
  const position = overview?.position || {};
  const userAvailable = Number(funds?.totalUserAvailable) || 0;
  const userHold = Number(funds?.totalUserHold) || 0;
  const systemWallets = Array.isArray(funds?.systemWallets) ? funds.systemWallets : [];
  const orderEscrow =
    position.orderEscrowHeld ??
    systemWallets.find((wallet) => String(wallet.purpose) === "Order_Escrow" || String(wallet.purpose) === "3")?.balance ??
    0;

  const alerts = [
    ["Rút tiền chờ xử lý", health?.pendingWithdrawals],
    ["Thanh toán chờ quá hạn", health?.stalePendingPayments],
    ["Đơn hoàn tất thiếu hạn chuyển tiền", health?.completedOrdersMissingReleaseDeadline],
  ];

  const openWalletDetails = () => {
    const element = walletDetailsRef.current;
    if (!element) return;
    element.open = true;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section>
      <div className="section-title">
        <h2>Số dư hiện tại</h2>
        <span className="muted">
          {state.loading ? "Đang tải..." : `Cập nhật ${formatDateTime(overview?.generatedAtUtc || new Date().toISOString())}`}
        </span>
      </div>
      {state.error && <div className="notice error">{state.error}</div>}

      <div className="kpis">
        <article className="kpi">
          <p className="muted">Tổng số dư ví nội bộ</p>
          <Value amount={funds?.totalRecordedBalance} />
          <p className="muted">Ví người dùng + ví hệ thống</p>
        </article>
        <article className="kpi">
          <p className="muted">Số dư người dùng</p>
          <Value amount={userAvailable + userHold} />
          <p className="muted">Khả dụng + đang giữ tại ví người dùng</p>
        </article>
        <article className="kpi">
          <p className="muted">Số dư ví hệ thống</p>
          <Value amount={funds?.totalSystemBalance} />
          <p className="muted">Số dư khả dụng của các ví hệ thống</p>
        </article>
      </div>

      <div className="split">
        <section className="panel">
          <div className="panel-title">
            <div><h2>Tiền đang được giữ ở đâu?</h2></div>
            <button type="button" className="text" onClick={openWalletDetails}>Xem phân loại số dư ↓</button>
          </div>
          <div className="summaryrow">
            <div>Tiền người dùng có thể sử dụng<span className="muted">Số dư ví có thể thanh toán hoặc yêu cầu rút</span></div>
            <strong>{money(userAvailable)}</strong>
          </div>
          <div className="summaryrow">
            <div>
              Tiền người dùng đang bị tạm giữ
              <span className="muted">
                Chưa thể sử dụng{position.withdrawalLocked ? `; gồm ${money(position.withdrawalLocked)} đang chờ rút` : ""}
              </span>
            </div>
            <strong>{money(userHold)}</strong>
          </div>
          <div className="summaryrow">
            <div>Ký quỹ đơn hàng<span className="muted">Tiền hệ thống giữ cho đơn hàng, chờ giải ngân hoặc hoàn tiền</span></div>
            <strong>{money(orderEscrow)}</strong>
          </div>
          <p className="footnote">Không phải số dư ngân hàng/PayOS; không cộng ký quỹ đơn vào tiền đang giữ ở ví người dùng.</p>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Cần theo dõi</h2>
              <p className="muted">Trạng thái hiện tại · không phụ thuộc kỳ báo cáo</p>
            </div>
            <span className="pill">Ưu tiên kiểm tra</span>
          </div>
          {alerts.map(([label, metric]) => (
            <div className="alertrow" key={label}>
              <div>{label}</div>
              <span className="count">{health ? Number(metric?.count || 0).toLocaleString("vi-VN") : "—"}</span>
              <span className="amount">{health ? money(metric?.amount) : "—"}</span>
            </div>
          ))}
          <details>
            <summary>Các khoản theo dõi khác</summary>
            <div className="alertrow">
              <div>Tiền giữ ở đơn có tranh chấp</div>
              <span className="count">{health ? Number(health.activeDisputeHeldFunds?.count || 0).toLocaleString("vi-VN") : "—"}</span>
              <span className="amount">{health ? money(health.activeDisputeHeldFunds?.amount) : "—"}</span>
            </div>
            <p className="footnote">Các nhóm có thể giao nhau. Không cộng số lượng hoặc số tiền thành tổng tồn đọng.</p>
          </details>
        </section>
      </div>

      <details className="panel" ref={walletDetailsRef}>
        <summary>Chi tiết số dư người dùng & ví hệ thống</summary>
        <div className="split">
          <section>
            <h3>Số dư người dùng</h3>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>Nhóm tài khoản</th><th className="num">Khả dụng</th><th className="num">Đang giữ</th><th className="num">Tổng</th></tr>
                </thead>
                <tbody>
                  {[
                    ["Cá nhân", funds?.totalPersonalAvailable, funds?.totalPersonalHold],
                    ["Doanh nghiệp", funds?.totalBusinessAvailable, funds?.totalBusinessHold],
                  ].map(([label, available, hold]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td className="num">{money(available)}</td>
                      <td className="num">{money(hold)}</td>
                      <td className="num">{money(Number(available || 0) + Number(hold || 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Tổng</td>
                    <td className="num">{money(userAvailable)}</td>
                    <td className="num">{money(userHold)}</td>
                    <td className="num">{money(userAvailable + userHold)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          <section>
            <h3>Số dư theo mục đích ví hệ thống</h3>
            {systemWallets.map((wallet) => (
              <div className="summaryrow" key={wallet.walletId || wallet.purpose}>
                <span>
                  {SYSTEM_PURPOSE_LABELS[wallet.purpose] || "Ví hệ thống khác"}
                  {isGhnFund(wallet.purpose) && <small>Phí vận chuyển đã thu và đang giữ trong ví hệ thống</small>}
                </span>
                <strong>{money(wallet.balance)}</strong>
              </div>
            ))}
            <div className="summaryrow">
              <span>Tổng ví hệ thống</span>
              <strong>{money(funds?.totalSystemBalance)}</strong>
            </div>
            <p className="footnote">Số dư ví doanh thu khác với doanh thu phát sinh trong kỳ. Số dư quỹ GHN không mặc định là số tiền phải thanh toán ngay.</p>
          </section>
        </div>
      </details>

      <div className="jump-links">
        <button type="button" onClick={() => onNavigate?.("escrows")}>Xem tiền giữ theo đơn →</button>
        <button type="button" onClick={() => onNavigate?.("holds")}>Xem tạm giữ theo tài khoản →</button>
        <button type="button" onClick={() => onNavigate?.("payments")}>Tra cứu thanh toán →</button>
      </div>
      <p className="page-end">Số dư hiện tại không thay đổi theo kỳ báo cáo ở tab Tài chính.</p>
    </section>
  );
}

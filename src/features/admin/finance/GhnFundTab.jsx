import { useEffect, useMemo, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { completedPeriod, formatDayKey } from "../operations/operationsPresentation";
import { money } from "./financeFormat";

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

/*
 * Backend chưa có API đối soát/ghi nhận các đợt trả phí cho GHN, nên tab này
 * chỉ hiển thị phí GHN đã thu trong kỳ và số dư quỹ GHN đang tạm giữ.
 */
export default function GhnFundTab() {
  const [periodDays, setPeriodDays] = useState(30);
  const [state, setState] = useState({ loading: true, error: "", collected: null, held: null });
  const period = useMemo(() => completedPeriod(periodDays), [periodDays]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    void Promise.resolve().then(() => setState((current) => ({ ...current, loading: true, error: "" })));
    Promise.all([
      adminDashboardApi.getFinanceCashFlow({ from: period.from, to: period.to, signal }),
      adminDashboardApi.getFinanceOverview({ signal }),
    ])
      .then(([cashFlow, overview]) => {
        const sources = Array.isArray(cashFlow?.inflowSources) ? cashFlow.inflowSources : [];
        setState({
          loading: false,
          error: "",
          collected: Number(sources.find((item) => item.key === "GhnShippingCollected")?.amount) || 0,
          held: Number(overview?.position?.shippingEscrowBalance) || 0,
        });
      })
      .catch((error) => {
        if (isCanceled(error)) return;
        setState((current) => ({ ...current, loading: false, error: "Không thể tải số liệu quỹ phí GHN." }));
      });
    return () => controller.abort();
  }, [period]);

  return (
    <section>
      <div className="section-title">
        <h2>Đối soát & thanh toán GHN</h2>
        <span className="muted">{formatDayKey(period.from)} → trước {formatDayKey(period.to)}</span>
      </div>
      <div className="period">
        <label>
          Kỳ thống kê
          <select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))}>
            <option value={30}>30 ngày đã hoàn tất</option>
            <option value={7}>7 ngày đã hoàn tất</option>
          </select>
        </label>
        <span className="muted">Phí thu theo kỳ; phần còn giữ là số dư hiện tại.</span>
      </div>
      {state.error && <div className="notice error">{state.error}</div>}

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Quỹ phí GHN</h2>
            <p className="muted">Phí vận chuyển người mua đã trả, đang giữ trong ví hệ thống để thanh toán cho GHN.</p>
          </div>
          <span className="pill">Chỉ xem</span>
        </div>
        <div className="ghn-stats">
          <div>
            <span className="muted">Phí GHN thu trong kỳ</span>
            <strong>{state.loading ? "—" : money(state.collected)}</strong>
          </div>
          <div>
            <span className="muted">Phí GHN hệ thống tạm giữ</span>
            <strong>{state.loading ? "—" : money(state.held)}</strong>
          </div>
          <div>
            <span className="muted">Đã trả GHN trong kỳ</span>
            <strong>Chưa hỗ trợ</strong>
          </div>
        </div>
        <div className="notice-warn">
          Hệ thống chưa có chức năng đối soát theo lô vận đơn và ghi nhận các đợt thanh toán cho GHN. Phần chọn lô, xem trước
          đợt thanh toán và lịch sử các đợt sẽ được bổ sung khi Backend có API tương ứng.
        </div>
      </section>
    </section>
  );
}

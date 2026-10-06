import { useEffect, useRef, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { adminDisputeHistoryApi } from "../../../services/apis/adminHistoryApi";
import {
  countOf,
  formatDateTime,
  formatPercent,
  shiftDayKey,
  vnDayStartIso,
} from "../operations/operationsPresentation";
import {
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_ORDER,
  ORIGIN_LABELS,
  RESPONSE_TYPE_LABELS,
  TARGET_TYPE_LABELS,
  TARGET_TYPE_OPTIONS,
  disputeCode,
  extractPaged,
  outcomeLabel,
  statusBadgeTone,
  statusKey,
  targetKey,
} from "./disputeAdminPresentation";

const PAGE_SIZE = 8;
const EMPTY_FILTERS = Object.freeze({ keyword: "", status: "", targetType: "", categoryId: "", from: "", to: "" });

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const StatusBadge = ({ value }) => {
  const key = statusKey(value);
  return <span className={`badge ${statusBadgeTone(key)}`}>{DISPUTE_STATUS_LABELS[key] || "Chưa xác định"}</span>;
};

const imageUrl = (media) => (typeof media === "string" ? media : media?.url || media?.mediaUrl || "");

function ChartBars({ rows, total, onSelect, colorOf }) {
  if (!rows.length) return <div className="empty">Chưa có dữ liệu.</div>;
  return rows.map((row) => (
    <div className="barrow" key={row.key}>
      <div className="row">
        <button type="button" className="text" onClick={() => onSelect(row.key)}>{row.label}</button>
        <strong>{row.count} hồ sơ</strong>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${total ? (row.count / total) * 100 : 0}%`, background: colorOf?.(row.key) || "var(--teal)" }} />
      </div>
      <div className="barpercent">{formatPercent(row.count, total)}</div>
    </div>
  ));
}

function DisputeDetailDialog({ target, onClose }) {
  const dialogRef = useRef(null);
  const [state, setState] = useState({ id: "", detail: null, error: "" });
  const id = target?.disputeId || "";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (target && !dialog.open) dialog.showModal();
    if (!target && dialog.open) dialog.close();
  }, [target]);

  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    adminDisputeHistoryApi
      .getById(id, { signal: controller.signal })
      .then((response) => setState({ id, detail: response?.data ?? response, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ id, detail: null, error: "Không thể tải chi tiết. Đang hiển thị thông tin từ danh sách." });
      });
    return () => controller.abort();
  }, [id]);

  const detail = state.id === id && state.detail ? state.detail : {};
  const item = { ...target, ...detail };
  const key = statusKey(item.status);
  const targetType = targetKey(item.target?.targetType ?? item.targetType);
  const objectCode =
    item.target?.order?.orderCode ||
    item.orderCode ||
    item.target?.post?.productName ||
    (targetType === "Review" ? "Đánh giá" : String(item.target?.targetId || item.targetId || "").slice(0, 8));
  const evidence = (Array.isArray(item.evidenceImages) ? item.evidenceImages : []).map(imageUrl).filter(Boolean);
  const responses = Array.isArray(item.responses) ? item.responses : [];
  const timeline = Array.isArray(item.timeline) ? item.timeline : [];
  const resolved = key === "Resolved" || Boolean(item.resolvedAt);
  const outcome = outcomeLabel(item.resolutionOutcome);

  return (
    <dialog ref={dialogRef} className="detail" onClose={onClose} onClick={(event) => event.target === dialogRef.current && onClose()}>
      {target && (
        <>
          <div className="modalhead row">
            <div>
              <div className="muted">CHI TIẾT TRANH CHẤP</div>
              <h2>{disputeCode(item)}</h2>
            </div>
            <button type="button" onClick={onClose}>Đóng</button>
          </div>
          <div className="modalbody">
            {state.id === id && state.error && <div className="notice error">{state.error}</div>}
            <section className="detail-object">
              <div className="row">
                <div>
                  <span className="detail-label">ĐỐI TƯỢNG LIÊN QUAN</span>
                  <h3>{objectCode || "—"}</h3>
                  <span className="badge">{TARGET_TYPE_LABELS[targetType] || "Chưa xác định"}</span>
                </div>
                <StatusBadge value={item.status} />
              </div>
            </section>

            <div className="detail-parties">
              <section className="detail-box">
                <span className="detail-label">NGƯỜI GỬI</span>
                <strong className="party-name">{item.sender?.username || item.senderUsername || "Hệ thống"}</strong>
              </section>
              <section className="detail-box">
                <span className="detail-label">NGƯỜI BỊ KHIẾU NẠI</span>
                <strong className="party-name">{item.targetUser?.username || item.targetUsername || "Chưa có"}</strong>
              </section>
            </div>

            <div className="detail-columns">
              <div>
                <section className="detail-box">
                  <h3>Nội dung khiếu nại</h3>
                  <div className="detail-reason">
                    <span className="muted">Nguyên nhân</span>
                    <strong>{item.category?.name || "Chưa xác định"}</strong>
                    {ORIGIN_LABELS[item.origin] && <span className="muted">Nguồn: {ORIGIN_LABELS[item.origin]}</span>}
                  </div>
                  <p className="complaint-text">{item.description || "Không có mô tả."}</p>
                </section>
                <section className="detail-box">
                  <h3>Bằng chứng & phản hồi</h3>
                  {evidence.length === 0 ? (
                    <div className="evidence-empty">Không có tệp bằng chứng.</div>
                  ) : (
                    <div className="evidence-grid">
                      {evidence.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="Bằng chứng" />
                        </a>
                      ))}
                    </div>
                  )}
                  {responses.map((response, index) => (
                    <div className="response-item" key={response.disputeResponseId || index}>
                      <strong>{response.responder?.username || "Người dùng"}</strong>{" "}
                      <span className="badge">{RESPONSE_TYPE_LABELS[response.responseType] || "Phản hồi"}</span>
                      <span className="muted"> · {formatDateTime(response.createdAt)}</span>
                      <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{response.content || "Không có nội dung."}</p>
                    </div>
                  ))}
                  <div className="response-note">
                    <span className="detail-label">GHI NHẬN XỬ LÝ</span>
                    <p>{item.moderatorNote || (resolved ? "Đã có kết luận xử lý." : "Chưa có kết luận xử lý trong hồ sơ này.")}</p>
                  </div>
                </section>
              </div>
              <aside>
                <section className="detail-box">
                  <h3>Thông tin xử lý</h3>
                  <div className="detail-metadata">
                    <div><span>Ngày gửi</span><strong>{formatDateTime(item.createdAt)}</strong></div>
                    <div><span>Cập nhật gần nhất</span><strong>{formatDateTime(item.updatedAt)}</strong></div>
                    <div><span>Kiểm duyệt viên phụ trách</span><strong>{item.moderatorId ? "Đã phân công" : "Chưa phân công"}</strong></div>
                  </div>
                </section>
                <section className={`detail-box detail-result${resolved ? " is-resolved" : ""}`}>
                  <h3>Kết quả giải quyết</h3>
                  <strong>{outcome || "Chưa có kết luận"}</strong>
                  <p className="muted">{item.resolvedAt ? `Giải quyết lúc ${formatDateTime(item.resolvedAt)}` : "Hồ sơ đang chờ hoàn tất xử lý."}</p>
                </section>
              </aside>
            </div>

            <section className="detail-box">
              <h3>Dòng thời gian</h3>
              <div className="timeline">
                {timeline.length > 0 ? (
                  timeline.map((step, index) => (
                    <div key={`${step.code}-${index}`}>
                      <strong>{formatDateTime(step.occurredAt)}</strong>
                      <br />
                      {step.title || step.code}
                    </div>
                  ))
                ) : (
                  <>
                    <div><strong>{formatDateTime(item.createdAt)}</strong><br />Gửi hồ sơ.</div>
                    {item.resolvedAt && <div><strong>{formatDateTime(item.resolvedAt)}</strong><br />Đã giải quyết{outcome ? ` · ${outcome}` : ""}.</div>}
                  </>
                )}
              </div>
            </section>
            <p className="muted">Chỉ xem hồ sơ. Việc xử lý tranh chấp thực hiện tại Trung tâm kiểm duyệt.</p>
          </div>
        </>
      )}
    </dialog>
  );
}

export default function DisputeOverviewTab({ categories, openDisputeId }) {
  const historyRef = useRef(null);
  const [dashboard, setDashboard] = useState({ loading: true, data: null, error: "" });
  const [draft, setDraft] = useState({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState({ ...EMPTY_FILTERS });
  const [pageNumber, setPageNumber] = useState(1);
  const [list, setList] = useState({ loading: true, items: [], totalCount: 0, totalPages: 1, error: "" });
  const [detailTarget, setDetailTarget] = useState(null);

  // Mở thẳng một hồ sơ khi đi từ màn khác (vd. bài đăng bị báo cáo).
  useEffect(() => {
    if (!openDisputeId) return;
    void Promise.resolve().then(() => setDetailTarget({ disputeId: openDisputeId }));
  }, [openDisputeId]);

  useEffect(() => {
    const controller = new AbortController();
    adminDashboardApi
      .getDisputes({ signal: controller.signal })
      .then((data) => setDashboard({ loading: false, data, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setDashboard({ loading: false, data: null, error: "Không thể tải tổng quan tranh chấp." });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => setList((current) => ({ ...current, loading: true, error: "" })));
    adminDisputeHistoryApi
      .getAll(
        {
          pageNumber,
          pageSize: PAGE_SIZE,
          ...(applied.keyword.trim() ? { keyword: applied.keyword.trim() } : {}),
          ...(applied.status ? { status: applied.status } : {}),
          ...(applied.targetType ? { targetType: applied.targetType } : {}),
          ...(applied.categoryId ? { disputeCategoryId: applied.categoryId } : {}),
          ...(applied.from ? { fromDate: vnDayStartIso(applied.from) } : {}),
          ...(applied.to ? { toDate: vnDayStartIso(shiftDayKey(applied.to, 1)) } : {}),
        },
        { signal: controller.signal },
      )
      .then((response) => setList({ loading: false, error: "", ...extractPaged(response) }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setList({ loading: false, items: [], totalCount: 0, totalPages: 1, error: "Không thể tải lịch sử tranh chấp." });
      });
    return () => controller.abort();
  }, [applied, pageNumber]);

  const data = dashboard.data;
  const statusDistribution = data?.currentStatusDistribution;
  const total = Number(data?.totalDisputes) || 0;
  const statusRows = DISPUTE_STATUS_ORDER.map((key) => ({ key, label: DISPUTE_STATUS_LABELS[key], count: countOf(statusDistribution, key) }));
  const reasonRows = (Array.isArray(data?.categoryDistribution) ? data.categoryDistribution : [])
    .map((item) => ({ key: item.key, label: item.label, count: Number(item.count) || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
  const reasonTotal = reasonRows.reduce((sum, row) => sum + row.count, 0);
  const hasDraftFilters = Object.values(draft).some((value) => String(value ?? "").trim());
  const hasAppliedFilters = Object.values(applied).some((value) => String(value ?? "").trim());
  const activeAdvancedFilterCount = [draft.categoryId, draft.from, draft.to].filter(Boolean).length;

  const openHistory = (filters = {}) => {
    const next = { ...EMPTY_FILTERS, ...filters };
    setDraft(next);
    setApplied(next);
    setPageNumber(1);
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const update = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.value }));
  const search = () => {
    setApplied({ ...draft });
    setPageNumber(1);
  };

  const statusColor = (key) =>
    key === "Resolved" ? "var(--green)" : key === "Pending" ? "var(--amber)" : key === "AwaitingResponse" ? "#527eaf" : "var(--teal)";

  return (
    <section>
      <div className="row">
        <div><h1>Tổng quan tranh chấp</h1></div>
        <button type="button" onClick={() => openHistory()}>Tra cứu tất cả →</button>
      </div>
      {dashboard.error && <div className="notice error">{dashboard.error}</div>}

      <div className="stats">
        {[
          { label: "Tổng tranh chấp", value: total, caption: "Tất cả hồ sơ", tone: "", filters: {} },
          { label: "Chưa xử lý xong", value: data?.unresolvedDisputeCount, caption: "Chờ xử lý, chờ phản hồi hoặc đang xem xét", tone: "alert" },
          { label: "Đã giải quyết", value: countOf(statusDistribution, "Resolved"), caption: "Có kết luận xử lý", tone: "success", filters: { status: "Resolved" } },
        ].map((metric) => (
          <div className={`metric ${metric.tone}`} key={metric.label}>
            <div className="label">{metric.label}</div>
            <div className="value">{data ? Number(metric.value || 0).toLocaleString("vi-VN") : "—"}</div>
            <div className="muted">{metric.caption}</div>
            {metric.filters && (
              <button type="button" className="text" onClick={() => openHistory(metric.filters)}>Tra cứu →</button>
            )}
          </div>
        ))}
      </div>

      <div className="overview-grid">
        <section className="panel compact-chart">
          <h2>Trạng thái hiện tại</h2>
          <ChartBars rows={statusRows} total={total} colorOf={statusColor} onSelect={(key) => openHistory({ status: key })} />
        </section>
        <section className="panel compact-chart">
          <h2>Tỷ lệ các loại tranh chấp</h2>
          <ChartBars rows={reasonRows} total={reasonTotal} onSelect={(key) => openHistory({ categoryId: key })} />
        </section>
      </div>

      <section className="integrated-history" ref={historyRef}>
        <h2>Lịch sử tranh chấp</h2>
        <p className="muted">Tra cứu toàn bộ hồ sơ. Chọn một dòng để xem thông tin, phản hồi và lịch sử liên quan.</p>
        <section className="panel">
          <div className="filters history-filters">
            <label className="search">
              Tìm kiếm
              <input
                value={draft.keyword}
                onChange={update("keyword")}
                onKeyDown={(event) => event.key === "Enter" && search()}
                placeholder="Mã đơn, người dùng, nội dung…"
              />
            </label>
            <label>
              Trạng thái
              <select value={draft.status} onChange={update("status")}>
                <option value="">Tất cả trạng thái</option>
                {DISPUTE_STATUS_ORDER.map((key) => <option key={key} value={key}>{DISPUTE_STATUS_LABELS[key]}</option>)}
              </select>
            </label>
            <label>
              Đối tượng
              <select value={draft.targetType} onChange={update("targetType")}>
                <option value="">Tất cả đối tượng</option>
                {TARGET_TYPE_OPTIONS.map((key) => <option key={key} value={key}>{TARGET_TYPE_LABELS[key]}</option>)}
              </select>
            </label>
            <div className="history-filter-actions">
              <button type="button" className="primary" onClick={search} disabled={list.loading}>
                {list.loading ? "Đang tìm…" : "Tìm kiếm"}
              </button>
              <button type="button" onClick={() => openHistory()} disabled={!hasDraftFilters && !hasAppliedFilters}>
                Xóa bộ lọc
              </button>
            </div>
          </div>
          <details className="fold history-advanced-filters" open={Boolean(draft.categoryId || draft.from || draft.to) || undefined}>
            <summary>
              <span>Lọc theo nguyên nhân và ngày gửi</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="filter-count">{activeAdvancedFilterCount} đang chọn</span>
              )}
            </summary>
            <div className="filters">
              <label>
                Nguyên nhân
                <select value={draft.categoryId} onChange={update("categoryId")}>
                  <option value="">Tất cả nguyên nhân</option>
                  {categories.map((category) => (
                    <option key={category.disputeCategoryId} value={category.disputeCategoryId}>
                      {category.name}{category.isActive === false ? " (ngừng sử dụng)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>Từ ngày<input type="date" value={draft.from} onChange={update("from")} /></label>
              <label>Đến ngày<input type="date" value={draft.to} onChange={update("to")} /></label>
            </div>
          </details>

          {list.error && <div className="notice error">{list.error}</div>}
          <div className="tablewrap history-table">
            <table>
              <thead>
                <tr><th>Hồ sơ / Đối tượng</th><th>Nguyên nhân</th><th>Người gửi / Bị khiếu nại</th><th>Trạng thái</th><th>Ngày gửi</th><th /></tr>
              </thead>
              <tbody>
                {list.loading && list.items.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Đang tải hồ sơ...</td></tr>
                ) : list.items.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Không có hồ sơ phù hợp.</td></tr>
                ) : (
                  list.items.map((item) => (
                    <tr key={item.disputeId} data-row onClick={() => setDetailTarget(item)}>
                      <td>
                        <strong>{disputeCode(item)}</strong>
                        <small>{TARGET_TYPE_LABELS[targetKey(item.targetType)] || "Chưa xác định"}{item.orderCode ? ` · ${item.orderCode}` : ""}</small>
                      </td>
                      <td>{item.category?.name || "Chưa xác định"}</td>
                      <td>
                        {item.senderUsername || (item.senderId ? "Chưa có" : "Hệ thống")}
                        <small>{item.targetUsername || "Chưa có"}</small>
                      </td>
                      <td><StatusBadge value={item.status} /></td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        <button type="button" onClick={(event) => { event.stopPropagation(); setDetailTarget(item); }}>Chi tiết</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="row pagination">
            <span aria-live="polite">{list.totalCount} kết quả</span>
            <div>
              <button type="button" disabled={pageNumber <= 1 || list.loading} onClick={() => setPageNumber((page) => page - 1)}>Trước</button>{" "}
              <span>{pageNumber} / {list.totalPages}</span>{" "}
              <button type="button" disabled={pageNumber >= list.totalPages || list.loading} onClick={() => setPageNumber((page) => page + 1)}>Sau</button>
            </div>
          </div>
        </section>
      </section>

      <DisputeDetailDialog target={detailTarget} onClose={() => setDetailTarget(null)} />
    </section>
  );
}

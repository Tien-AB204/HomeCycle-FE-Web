import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import platformPolicyApi, {
  PLATFORM_POLICY_TYPES,
} from "../../../services/apis/platformPolicyApi";
import { formatDateTime } from "../operations/operationsPresentation";

// Thời hạn hoàn trả không còn dùng (Backend đã bỏ luồng hoàn trả) nên không hiển thị.
const FIELDS = [
  { key: "normalDisputeWindowDays", label: "Thời hạn mở tranh chấp thông thường", unit: "ngày", min: 1, max: 365, group: "window" },
  { key: "lowReputationDisputeWindowDays", label: "Thời hạn khi uy tín thấp", unit: "ngày", min: 1, max: 365, group: "window" },
  { key: "lowReputationThreshold", label: "Ngưỡng uy tín thấp", unit: "điểm", min: 0, max: 100, group: "window" },
  { key: "postViolationPenaltyPoints", label: "Phạt bài đăng vi phạm", unit: "điểm", min: 1, max: 100, group: "penalty" },
  { key: "reviewViolationPenaltyPoints", label: "Phạt đánh giá vi phạm", unit: "điểm", min: 1, max: 100, group: "penalty" },
  { key: "responseWindowHours", label: "Thời hạn phản hồi", unit: "giờ", min: 1, max: 168, group: "extra" },
];

const errorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || fallback;

// Phiên bản hiện hành, lấy trường config dạng camelCase.
const readConfig = (policy) => policy?.config || {};

export default function DisputeConfigTab({ onToast }) {
  const versionDialogRef = useRef(null);
  const [policy, setPolicy] = useState(null);
  const [versions, setVersions] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [versionDetail, setVersionDetail] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    void Promise.resolve().then(() => setLoading(true));
    Promise.all([
      platformPolicyApi.getCurrent(PLATFORM_POLICY_TYPES.DISPUTE, { signal }),
      platformPolicyApi.getVersions(PLATFORM_POLICY_TYPES.DISPUTE, { signal }).catch(() => []),
    ])
      .then(([current, versionList]) => {
        setPolicy(current);
        setVersions([...versionList].sort((a, b) => Number(b.version) - Number(a.version)));
        const config = readConfig(current);
        setDraft(Object.fromEntries(FIELDS.map((field) => [field.key, String(config[field.key] ?? "")])));
        setError("");
        setLoading(false);
      })
      .catch((requestError) => {
        if (requestError?.name === "CanceledError" || requestError?.code === "ERR_CANCELED") return;
        setError(errorMessage(requestError, "Không thể tải cấu hình tranh chấp."));
        setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const dialog = versionDialogRef.current;
    if (!dialog) return;
    if (versionDetail && !dialog.open) dialog.showModal();
    if (!versionDetail && dialog.open) dialog.close();
  }, [versionDetail]);

  const config = readConfig(policy);
  const changed = FIELDS.filter((field) => draft[field.key] !== String(config[field.key] ?? ""));

  const save = async () => {
    const payload = {};
    for (const field of changed) {
      const value = Number(draft[field.key]);
      if (draft[field.key] === "" || !Number.isInteger(value) || value < field.min || value > field.max) {
        setError(`${field.label} phải là số nguyên từ ${field.min} đến ${field.max}.`);
        return;
      }
      payload[field.key] = value;
    }
    const normal = Number(draft.normalDisputeWindowDays);
    const low = Number(draft.lowReputationDisputeWindowDays);
    if (low < normal) {
      setError("Thời hạn khi uy tín thấp không được nhỏ hơn thời hạn thông thường.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await platformPolicyApi.updateCurrent(PLATFORM_POLICY_TYPES.DISPUTE, payload);
      onToast("Đã lưu phiên bản cấu hình mới.");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(errorMessage(requestError, "Không thể lưu cấu hình."));
    } finally {
      setSaving(false);
    }
  };

  const openVersion = async (version) => {
    try {
      const detail = await platformPolicyApi.getVersion(PLATFORM_POLICY_TYPES.DISPUTE, version.version);
      setVersionDetail(detail);
    } catch (requestError) {
      setError(errorMessage(requestError, "Không thể tải phiên bản."));
    }
  };

  const restore = async () => {
    if (!versionDetail) return;
    try {
      await platformPolicyApi.restoreVersion(PLATFORM_POLICY_TYPES.DISPUTE, versionDetail.version);
      onToast(`Đã khôi phục nội dung từ phiên bản v${versionDetail.version}.`);
      setVersionDetail(null);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(errorMessage(requestError, "Không thể khôi phục phiên bản."));
    }
  };

  const fieldRows = (group) =>
    FIELDS.filter((field) => field.group === group).map((field) => (
      <div className="configfield" key={field.key}>
        <label htmlFor={`cfg-${field.key}`}>
          {field.label}
          <small>{field.min}–{field.max} {field.unit}</small>
        </label>
        <div className="number">
          <input
            id={`cfg-${field.key}`}
            type="number"
            step="1"
            min={field.min}
            max={field.max}
            value={draft[field.key] ?? ""}
            disabled={loading}
            onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
          />
          {field.unit}
        </div>
      </div>
    ));

  return (
    <section>
      <div className="row">
        <div>
          <h1>Cấu hình tranh chấp</h1>
          <p className="muted">Thời hạn gửi khiếu nại và điểm phạt vi phạm, tập trung tại một nơi.</p>
        </div>
        {policy?.version && <span className="badge green">v{policy.version} · Đang áp dụng</span>}
      </div>
      <div className="configintro">
        <strong>Chính sách đang áp dụng</strong>
        <div className="muted">
          {policy?.updatedAt ? `Cập nhật lúc ${formatDateTime(policy.updatedAt)}.` : loading ? "Đang tải..." : "Chưa có thông tin cập nhật."}
        </div>
        <div className="muted">
          Cũng chỉnh được tại <Link to="/admin/policies">Chính sách hệ thống → Tranh chấp</Link>; hai nơi dùng chung một cấu hình.
        </div>
      </div>

      <section className="panel">
        <h2>Thời hạn & điều kiện</h2>
        <div className="configgrid">{fieldRows("window")}</div>
        <div className="subsection">
          <h2>Điểm phạt nội dung</h2>
          <p className="muted">Áp dụng khi kiểm duyệt viên xác nhận vi phạm; tách biệt với điểm đánh giá sao.</p>
          <div className="configgrid">{fieldRows("penalty")}</div>
        </div>
        <details className="fold subsection">
          <summary>Giá trị bổ sung và thông tin chỉ đọc</summary>
          <div className="configgrid" style={{ marginTop: 12 }}>{fieldRows("extra")}</div>
          <div className="readonly">
            <span>Phạt thua tranh chấp: <strong>{config.disputeLossPenaltyPoints ?? "—"} điểm</strong></span>
            <span className="badge gray">Chỉ đọc</span>
          </div>
        </details>
        <div className="savebar">
          <div>
            <span className="statusmessage" aria-live="polite">
              {changed.length ? `${changed.length} giá trị đang thay đổi.` : "Chưa có thay đổi."}
            </span>
            <div className="muted">Mỗi lần lưu tạo một phiên bản cấu hình mới.</div>
          </div>
          <div className="actions">
            <button type="button" disabled={!changed.length || saving} onClick={() => setReloadKey((key) => key + 1)}>Hủy thay đổi</button>
            <button type="button" className="primary" disabled={!changed.length || saving} onClick={save}>
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </div>
        </div>
        <p className="field-error" role="alert">{error}</p>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Lịch sử phiên bản cấu hình</h2>
        <p className="muted">Lịch sử cấu hình tách khỏi lịch sử hồ sơ tranh chấp.</p>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Phiên bản</th><th>Thời điểm</th><th /></tr></thead>
            <tbody>
              {versions.length === 0 ? (
                <tr><td colSpan={3} className="empty">{loading ? "Đang tải..." : "Chưa có lịch sử phiên bản."}</td></tr>
              ) : (
                versions.map((version) => (
                  <tr key={version.policyId || version.version}>
                    <td>
                      <strong>v{version.version}</strong>{" "}
                      {version.isActive && <span className="badge green">Đang áp dụng</span>}
                    </td>
                    <td>{formatDateTime(version.createdAt)}</td>
                    <td><button type="button" onClick={() => openVersion(version)}>Xem giá trị</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <dialog ref={versionDialogRef} style={{ maxWidth: 620 }} onClose={() => setVersionDetail(null)}>
        {versionDetail && (
          <>
            <div className="modalhead row">
              <h2>Cấu hình v{versionDetail.version}</h2>
              <button type="button" onClick={() => setVersionDetail(null)}>Đóng</button>
            </div>
            <div className="modalbody">
              <div className="kv">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <span className="muted">{field.label}</span>
                    <strong>{readConfig(versionDetail)[field.key] ?? "—"} {field.unit}</strong>
                  </div>
                ))}
              </div>
              {!versionDetail.isActive && versionDetail.canRestore !== false && (
                <div className="modalfoot">
                  <button type="button" className="primary" onClick={restore}>Khôi phục phiên bản này</button>
                </div>
              )}
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}

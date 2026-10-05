import { useEffect, useMemo, useRef, useState } from "react";
import adminSubscriptionPackageApi from "../../../services/apis/adminSubscriptionPackageApi";
import {
  DELETE_REJECTED_MESSAGE,
  PERSONAL_AI_PRICE_DAILY_COUNT,
  PERSONAL_AI_PRICE_KEY,
  PERSONAL_DURATION_DAYS,
  buildDefinitionLookup,
  definitionSupportsRole,
  entitlementValueText,
  getErrorCode,
  getPackageErrorMessage,
  money,
  normalizeTargetRole,
  normalizeValueType,
  roleLabel,
  sameEntitlementSets,
  validateEntitlementRows,
  validatePackageFields,
} from "./subscriptionPackageModel";

const isCanceled = (error) => error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

function useDialog(open) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}

const keyOf = (value) => String(value || "").trim().toLowerCase();

const emptyForm = () => ({
  targetRole: "Business",
  code: "",
  name: "",
  description: "",
  price: "",
  duration: "30",
  ents: {},
});

const formFromPackage = (pkg) => ({
  targetRole: normalizeTargetRole(pkg.targetRole) || "Business",
  code: pkg.code || "",
  name: pkg.name || "",
  description: pkg.description || "",
  price: String(pkg.price ?? ""),
  duration: String(pkg.duration ?? ""),
  ents: Object.fromEntries(
    (pkg.entitlements || []).map((item) => [
      keyOf(item.key),
      {
        included: true,
        numericValue: item.numericValue === null || item.numericValue === undefined ? "" : String(item.numericValue),
        booleanValue: Boolean(item.booleanValue),
        isUnlimited: Boolean(item.isUnlimited),
      },
    ]),
  ),
});

function PackageEditor({ open, editing, definitions, onClose, onSaved }) {
  const ref = useDialog(open);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [trackedOpen, setTrackedOpen] = useState(false);
  const lookup = useMemo(() => buildDefinitionLookup(definitions), [definitions]);

  // Mở hộp thoại: nạp lại form theo gói đang sửa (điều chỉnh trong render, không dùng effect).
  if (open !== trackedOpen) {
    setTrackedOpen(open);
    if (open) {
      setForm(editing ? formFromPackage(editing) : emptyForm());
      setError("");
    }
  }

  const personal = form.targetRole === "Personal";
  const roleDefinitions = definitions.filter((definition) => definitionSupportsRole(definition, form.targetRole));
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setEnt = (key, patch) =>
    setForm((current) => ({
      ...current,
      ents: { ...current.ents, [key]: { included: false, numericValue: "", booleanValue: false, isUnlimited: false, ...current.ents[key], ...patch } },
    }));

  const close = () => {
    if (!busy) onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const fields = validatePackageFields(personal ? { ...form, duration: String(PERSONAL_DURATION_DAYS) } : form, {
      requireCode: !editing,
      role: form.targetRole,
    });
    if (fields.error) {
      setError(fields.error);
      return;
    }
    const rows = personal
      ? [{ key: PERSONAL_AI_PRICE_KEY, numericValue: String(PERSONAL_AI_PRICE_DAILY_COUNT), booleanValue: false, isUnlimited: false }]
      : roleDefinitions
          .filter((definition) => form.ents[keyOf(definition.key)]?.included)
          .map((definition) => ({ key: definition.key, ...form.ents[keyOf(definition.key)] }));
    const ents = validateEntitlementRows(rows, lookup);
    if (ents.error) {
      setError(ents.error);
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (editing) {
        const patch = {};
        if (fields.name !== String(editing.name || "").trim()) patch.name = fields.name;
        if (fields.description !== String(editing.description || "").trim()) patch.description = fields.description;
        if (fields.price !== Number(editing.price)) patch.price = fields.price;
        if (fields.duration !== Number(editing.duration)) patch.duration = fields.duration;
        if (!sameEntitlementSets(editing.entitlements, ents.entitlements)) patch.entitlements = ents.entitlements;
        if (!Object.keys(patch).length) {
          setError("Không có thay đổi nào cần lưu.");
          setBusy(false);
          return;
        }
        await adminSubscriptionPackageApi.updatePackage(editing.packageId, patch);
        onSaved(`Đã sửa gói "${fields.name}".`);
      } else {
        await adminSubscriptionPackageApi.createPackage({
          code: fields.code,
          name: fields.name,
          description: fields.description || null,
          price: fields.price,
          duration: fields.duration,
          targetRole: personal ? 1 : 2,
          entitlements: ents.entitlements,
        });
        onSaved(`Đã tạo gói "${fields.name}".`);
      }
    } catch (requestError) {
      setError(getPackageErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="editor" onCancel={(event) => { event.preventDefault(); close(); }} aria-labelledby="hcs-editor-title">
      <div className="modalhead">
        <h2 id="hcs-editor-title">{editing ? "Sửa gói đăng ký" : "Tạo gói đăng ký"}</h2>
        <button type="button" onClick={close} disabled={busy}>Đóng</button>
      </div>
      <form onSubmit={submit}>
        <div className="modalbody">
          <div className="fields">
            <label>
              Mã gói
              <input value={form.code} onChange={(event) => set("code", event.target.value)} maxLength={100} disabled={Boolean(editing) || busy} placeholder="BUSINESS_VIP_30D" />
            </label>
            <label>
              Loại tài khoản
              <select
                value={form.targetRole}
                disabled={Boolean(editing) || busy}
                onChange={(event) => setForm((current) => ({ ...current, targetRole: event.target.value, duration: event.target.value === "Personal" ? String(PERSONAL_DURATION_DAYS) : current.duration, ents: {} }))}
              >
                <option value="Business">Doanh nghiệp</option>
                <option value="Personal">Cá nhân</option>
              </select>
            </label>
            <label className="wide">
              Tên gói
              <input value={form.name} onChange={(event) => set("name", event.target.value)} maxLength={255} disabled={busy} placeholder="VIP Doanh nghiệp 30 ngày" />
            </label>
            <label>
              Giá (đồng)
              <input type="number" min="1" max="2147483647" step="1" value={form.price} onChange={(event) => set("price", event.target.value)} disabled={busy} />
            </label>
            <label>
              Thời hạn (ngày)
              <input
                type="number"
                min="1"
                max="3650"
                step="1"
                value={personal ? String(PERSONAL_DURATION_DAYS) : form.duration}
                onChange={(event) => set("duration", event.target.value)}
                disabled={personal || busy}
              />
            </label>
            <label className="wide">
              Mô tả
              <textarea rows="2" maxLength={2000} value={form.description} onChange={(event) => set("description", event.target.value)} disabled={busy} placeholder="Lợi ích chính của gói" />
            </label>
            <h3>Quyền lợi</h3>
          </div>
          {roleDefinitions.length === 0 && <p className="note">Chưa tải được danh sách quyền lợi.</p>}
          {roleDefinitions.map((definition) => {
            const key = keyOf(definition.key);
            const isPersonalAi = personal && key === keyOf(PERSONAL_AI_PRICE_KEY);
            const row = isPersonalAi
              ? { included: true, numericValue: String(PERSONAL_AI_PRICE_DAILY_COUNT), isUnlimited: false }
              : form.ents[key] || { included: false, numericValue: "", booleanValue: false, isUnlimited: false };
            const valueType = normalizeValueType(definition.valueType);
            const locked = personal || busy;
            return (
              <div className="ent-row" key={key}>
                <label>
                  <input type="checkbox" checked={row.included} disabled={locked} onChange={(event) => setEnt(key, { included: event.target.checked })} />
                  {definition.displayName || definition.key}
                </label>
                {valueType === "Boolean" ? (
                  <label>
                    <input type="checkbox" checked={Boolean(row.booleanValue)} disabled={locked || !row.included} onChange={(event) => setEnt(key, { booleanValue: event.target.checked })} />
                    Bật
                  </label>
                ) : (
                  <input
                    type="number"
                    aria-label={definition.displayName || definition.key}
                    min={valueType === "Integer" ? 1 : 0.01}
                    step={valueType === "Integer" ? 1 : "any"}
                    value={row.isUnlimited ? "" : row.numericValue}
                    disabled={locked || !row.included || row.isUnlimited}
                    onChange={(event) => setEnt(key, { numericValue: event.target.value })}
                  />
                )}
                {definition.supportsUnlimited && valueType !== "Boolean" ? (
                  <label className="unlimited">
                    <input type="checkbox" checked={Boolean(row.isUnlimited)} disabled={locked || !row.included} onChange={(event) => setEnt(key, { isUnlimited: event.target.checked })} />
                    Không giới hạn
                  </label>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
          <p className="note">
            {personal
              ? `Gói Cá nhân: ${PERSONAL_DURATION_DAYS} ngày, ${PERSONAL_AI_PRICE_DAILY_COUNT} lượt AI gợi ý giá mỗi ngày.`
              : "Chọn ít nhất một quyền lợi. AI cần hạn mức cụ thể; rút tiền có thể không giới hạn."}
          </p>
          <p className="note">Bài đủ điều kiện được ưu tiên hiển thị trong thời gian gói còn hiệu lực.</p>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <div className="modalfoot">
          <button type="button" onClick={close} disabled={busy}>Hủy</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? "Đang lưu..." : "Lưu gói"}</button>
        </div>
      </form>
    </dialog>
  );
}

function PackageDetail({ pkg, definitions, onClose }) {
  const ref = useDialog(Boolean(pkg));
  const lookup = useMemo(() => buildDefinitionLookup(definitions), [definitions]);
  return (
    <dialog ref={ref} className="editor" onClose={onClose} aria-labelledby="hcs-detail-title">
      <div className="modalhead">
        <h2 id="hcs-detail-title">{pkg?.name || "Chi tiết gói"}</h2>
        <button type="button" onClick={onClose}>Đóng</button>
      </div>
      {pkg && (
        <div className="modalbody">
          <dl className="detail-list">
            <div><dt>Mã gói</dt><dd>{pkg.code}</dd></div>
            <div><dt>Loại tài khoản</dt><dd>{roleLabel(pkg.targetRole)}</dd></div>
            <div><dt>Giá</dt><dd>{money(pkg.price)}</dd></div>
            <div><dt>Thời hạn</dt><dd>{pkg.duration} ngày</dd></div>
          </dl>
          <p>{pkg.description || "Chưa có mô tả."}</p>
          <h3 style={{ marginTop: 20, fontSize: 14 }}>Quyền lợi</h3>
          {(pkg.entitlements || []).length === 0 && <p className="note">Gói chưa có quyền lợi.</p>}
          {(pkg.entitlements || []).map((item) => {
            const definition = lookup.get(keyOf(item.key));
            return (
              <div className="bar-title" key={item.packageEntitlementId || item.key}>
                <span>{definition?.displayName || item.key}</span>
                <strong>{entitlementValueText(item, definition)}</strong>
              </div>
            );
          })}
          <p className="note">{pkg.postingPriorityDescription || "Bài đủ điều kiện được ưu tiên hiển thị trong thời gian gói còn hiệu lực."}</p>
        </div>
      )}
    </dialog>
  );
}

function ConfirmDialog({ pending, onClose, onDone }) {
  const ref = useDialog(Boolean(pending));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pkg = pending?.pkg;
  const deleting = pending?.type === "delete";
  const title = deleting ? "Xóa gói đăng ký" : pkg?.isActive ? "Đóng gói đăng ký" : "Mở bán gói đăng ký";
  const body = deleting
    ? `Xóa vĩnh viễn ${pkg?.name}? Chỉ xóa được khi gói chưa từng có đăng ký.`
    : pkg?.isActive
      ? `Ngừng bán ${pkg?.name}. Lịch sử và gói còn hiệu lực được giữ lại.`
      : `Cho phép mua ${pkg?.name} trở lại.`;

  const close = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  const confirm = async () => {
    if (!pkg || busy) return;
    setBusy(true);
    setError("");
    try {
      if (deleting) {
        await adminSubscriptionPackageApi.deletePackage(pkg.packageId);
        onDone(`Đã xóa gói "${pkg.name}".`);
      } else {
        await adminSubscriptionPackageApi.updatePackageStatus(pkg.packageId, !pkg.isActive);
        onDone(pkg.isActive ? `Đã đóng gói "${pkg.name}".` : `Đã mở bán gói "${pkg.name}".`);
      }
    } catch (requestError) {
      setError(deleting && getErrorCode(requestError) === "VALIDATION_ERROR" ? DELETE_REJECTED_MESSAGE : getPackageErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} onCancel={(event) => { event.preventDefault(); close(); }} aria-labelledby="hcs-confirm-title">
      <div className="modalhead">
        <h2 id="hcs-confirm-title">{title}</h2>
        <button type="button" onClick={close} disabled={busy}>Đóng</button>
      </div>
      <div className="modalbody">
        {body}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="modalfoot">
        <button type="button" onClick={close} disabled={busy}>Hủy</button>
        <button type="button" className="primary" onClick={confirm} disabled={busy}>{busy ? "Đang xử lý..." : "Xác nhận"}</button>
      </div>
    </dialog>
  );
}

export default function SubscriptionListTab() {
  const [definitions, setDefinitions] = useState([]);
  const [state, setState] = useState({ loading: true, packages: [], error: "" });
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [editor, setEditor] = useState({ open: false, pkg: null });
  const [detail, setDetail] = useState(null);
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    adminSubscriptionPackageApi
      .getEntitlementDefinitions({ signal: controller.signal })
      .then(setDefinitions)
      .catch(() => setDefinitions([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminSubscriptionPackageApi
      .getPackages({ signal: controller.signal })
      .then((packages) => setState({ loading: false, packages, error: "" }))
      .catch((error) => {
        if (!isCanceled(error)) setState({ loading: false, packages: [], error: getPackageErrorMessage(error, "Không thể tải danh sách gói đăng ký.") });
      });
    return () => controller.abort();
  }, [version]);

  const query = search.trim().toLowerCase();
  const rows = state.packages.filter(
    (pkg) =>
      `${pkg.name} ${pkg.code}`.toLowerCase().includes(query) &&
      (!role || normalizeTargetRole(pkg.targetRole) === role) &&
      (!status || Boolean(pkg.isActive) === (status === "on")),
  );

  const done = (message) => {
    setNotice(message);
    setVersion((current) => current + 1);
  };

  return (
    <section>
      {notice && <div className="notice" role="status">{notice}</div>}
      <div className="panel toolbar">
        <label>
          Tìm gói
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc mã gói" />
        </label>
        <label>
          Loại tài khoản
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="Personal">Cá nhân</option>
            <option value="Business">Doanh nghiệp</option>
          </select>
        </label>
        <label>
          Trạng thái
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="on">Đang mở bán</option>
            <option value="off">Đã đóng</option>
          </select>
        </label>
        <button type="button" className="primary push" onClick={() => setEditor({ open: true, pkg: null })}>+ Tạo gói</button>
      </div>

      <section className="panel">
        <div className="tablewrap">
          <table className="package-table">
            <thead>
              <tr>
                <th>Gói đăng ký</th>
                <th>Loại tài khoản</th>
                <th className="right">Giá</th>
                <th>Thời hạn</th>
                <th>Quyền lợi</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {state.loading && <tr><td colSpan="7" className="no-data">Đang tải danh sách gói...</td></tr>}
              {!state.loading && state.error && <tr><td colSpan="7" className="no-data">{state.error}</td></tr>}
              {!state.loading && !state.error && rows.length === 0 && <tr><td colSpan="7" className="no-data">Không có gói phù hợp.</td></tr>}
              {!state.loading &&
                rows.map((pkg) => (
                  <tr key={pkg.packageId}>
                    <td>
                      <div className="name">{pkg.name}</div>
                      <div className="code">{pkg.code}</div>
                    </td>
                    <td>{roleLabel(pkg.targetRole)}</td>
                    <td className="right">{money(pkg.price)}</td>
                    <td>{pkg.duration} ngày</td>
                    <td>{(pkg.entitlements || []).length} mục</td>
                    <td><span className={`tag ${pkg.isActive ? "" : "off"}`}>{pkg.isActive ? "Đang mở bán" : "Đã đóng"}</span></td>
                    <td>
                      <div className="actions">
                        <button type="button" onClick={() => setDetail(pkg)}>Chi tiết</button>
                        <button type="button" onClick={() => setEditor({ open: true, pkg })}>Sửa</button>
                        <button type="button" onClick={() => setPending({ type: "status", pkg })}>{pkg.isActive ? "Đóng gói" : "Mở bán"}</button>
                        {normalizeTargetRole(pkg.targetRole) === "Business" && (
                          <button type="button" onClick={() => setPending({ type: "delete", pkg })}>Xóa</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="note">Đóng gói để ngừng bán và giữ lịch sử. Chỉ xóa được gói Doanh nghiệp chưa từng có đăng ký.</p>

      <PackageEditor
        open={editor.open}
        editing={editor.pkg}
        definitions={definitions}
        onClose={() => setEditor({ open: false, pkg: null })}
        onSaved={(message) => {
          setEditor({ open: false, pkg: null });
          done(message);
        }}
      />
      <PackageDetail pkg={detail} definitions={definitions} onClose={() => setDetail(null)} />
      <ConfirmDialog
        pending={pending}
        onClose={() => setPending(null)}
        onDone={(message) => {
          setPending(null);
          done(message);
        }}
      />
    </section>
  );
}

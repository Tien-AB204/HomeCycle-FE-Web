import { useEffect, useRef, useState } from "react";
import disputeCategoryApi from "../../../services/apis/disputeCategoryApi";
import { formatDateTime } from "../operations/operationsPresentation";
import { TARGET_TYPE_LABELS, TARGET_TYPE_OPTIONS } from "./disputeAdminPresentation";

const errorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error?.message ||
  error?.message ||
  fallback;

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

function CategoryEditor({ editing, onClose, onSaved }) {
  const open = editing !== null;
  const ref = useDialog(open);
  const isNew = editing === "new";
  const [form, setForm] = useState({ code: "", name: "", description: "", targetTypes: [] });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const source = isNew ? {} : editing;
    void Promise.resolve().then(() => {
      setForm({
        code: source.code || "",
        name: source.name || "",
        description: source.description || "",
        targetTypes: Array.isArray(source.targetTypes) ? source.targetTypes : [],
      });
      setError("");
    });
  }, [editing, isNew, open]);

  const toggleTarget = (key) =>
    setForm((current) => ({
      ...current,
      targetTypes: current.targetTypes.includes(key)
        ? current.targetTypes.filter((item) => item !== key)
        : [...current.targetTypes, key],
    }));

  const submit = async (event) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!form.name.trim() || form.targetTypes.length === 0) {
      setError("Nhập tên danh mục và chọn ít nhất một đối tượng.");
      return;
    }
    if (isNew && !/^[A-Z0-9_]+$/.test(code)) {
      setError("Mã danh mục chỉ gồm chữ in hoa, số và dấu gạch dưới.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await disputeCategoryApi.create({ ...form, code });
      } else {
        await disputeCategoryApi.update(editing.disputeCategoryId, form);
      }
      onSaved(isNew ? "Đã thêm danh mục." : "Đã lưu danh mục.");
    } catch (requestError) {
      setError(errorMessage(requestError, "Không thể lưu danh mục."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={ref} style={{ maxWidth: 570 }} onClose={onClose}>
      {open && (
        <>
          <div className="modalhead row">
            <h2>{isNew ? "Thêm danh mục" : "Sửa danh mục"}</h2>
            <button type="button" onClick={onClose}>Đóng</button>
          </div>
          <form className="modalbody editform" onSubmit={submit}>
            <label>
              Mã danh mục
              <input
                value={form.code}
                readOnly={!isNew}
                maxLength={50}
                placeholder="VD: ITEM_MISMATCH"
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              />
              <span className="muted">Chữ in hoa, số và dấu gạch dưới. Mã không đổi khi sửa.</span>
            </label>
            <label>
              Tên danh mục
              <input value={form.name} maxLength={150} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              Mô tả
              <textarea value={form.description} maxLength={500} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <fieldset>
              <legend className="muted">Áp dụng cho</legend>
              {TARGET_TYPE_OPTIONS.map((key) => (
                <label key={key}>
                  <input type="checkbox" checked={form.targetTypes.includes(key)} onChange={() => toggleTarget(key)} />
                  {TARGET_TYPE_LABELS[key]}
                </label>
              ))}
            </fieldset>
            <p className="field-error" role="alert">{error}</p>
            <div className="modalfoot">
              <button type="button" onClick={onClose}>Hủy</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </form>
        </>
      )}
    </dialog>
  );
}

function StateConfirm({ category, onClose, onDone }) {
  const ref = useDialog(Boolean(category));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await disputeCategoryApi.updateStatus(category.disputeCategoryId, !category.isActive);
      onDone(category.isActive ? "Đã ngừng sử dụng danh mục." : "Đã kích hoạt danh mục.");
    } catch (requestError) {
      setError(errorMessage(requestError, "Không thể đổi trạng thái danh mục."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} style={{ maxWidth: 480 }} onClose={onClose}>
      {category && (
        <>
          <div className="modalhead">
            <h2>{category.isActive ? "Ngừng sử dụng danh mục?" : "Kích hoạt danh mục?"}</h2>
          </div>
          <div className="modalbody">
            <p>
              {category.name}
              {category.isActive ? " sẽ không còn được chọn cho báo cáo mới." : " sẽ được chọn cho báo cáo mới."}
            </p>
            <p className="muted">Hồ sơ lịch sử vẫn được giữ.</p>
            <p className="field-error" role="alert">{error}</p>
            <div className="modalfoot">
              <button type="button" onClick={onClose}>Hủy</button>
              <button type="button" className="primary" disabled={busy} onClick={confirm}>{busy ? "Đang xử lý..." : "Xác nhận"}</button>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}

export default function DisputeCategoriesTab({ categories, loading, error, onReload, onToast }) {
  const [keyword, setKeyword] = useState("");
  const [target, setTarget] = useState("");
  const [state, setState] = useState("");
  const [editing, setEditing] = useState(null);
  const [stateTarget, setStateTarget] = useState(null);

  const q = keyword.trim().toLowerCase();
  const list = categories.filter(
    (category) =>
      (!q || `${category.name} ${category.code}`.toLowerCase().includes(q)) &&
      (!target || (category.targetTypes || []).includes(target)) &&
      (!state || category.isActive === (state === "active")),
  );
  const activeCount = categories.filter((category) => category.isActive).length;

  const finish = (message) => {
    setEditing(null);
    setStateTarget(null);
    onToast(message);
    onReload();
  };

  return (
    <section>
      <div className="row">
        <div><h1>Danh mục nguyên nhân</h1></div>
        <button type="button" className="primary" onClick={() => setEditing("new")}>+ Thêm danh mục</button>
      </div>
      <section className="panel">
        <div className="filters">
          <label className="search">
            Tìm danh mục
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên hoặc mã danh mục" />
          </label>
          <label>
            Áp dụng cho
            <select value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value="">Tất cả đối tượng</option>
              {TARGET_TYPE_OPTIONS.map((key) => <option key={key} value={key}>{TARGET_TYPE_LABELS[key]}</option>)}
            </select>
          </label>
          <label>
            Trạng thái
            <select value={state} onChange={(event) => setState(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="active">Đang sử dụng</option>
              <option value="inactive">Ngừng sử dụng</option>
            </select>
          </label>
        </div>
        <p className="muted">{list.length} danh mục · {activeCount} đang sử dụng trên toàn hệ thống</p>
        {error && <div className="notice error">{error}</div>}
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Mã</th><th>Tên</th><th>Mô tả</th><th>Áp dụng cho</th><th>Trạng thái</th><th>Cập nhật</th><th className="right">Thao tác</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty">Đang tải danh mục...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={7} className="empty">Không có danh mục phù hợp.</td></tr>
              ) : (
                list.map((category) => (
                  <tr key={category.disputeCategoryId}>
                    <td><span className="categorycode">{category.code}</span></td>
                    <td><div className="categoryname">{category.name}</div></td>
                    <td className="category-description">{category.description || "Không có mô tả"}</td>
                    <td>
                      <div className="scopechips">
                        {(category.targetTypes || []).map((key) => (
                          <span className="badge" key={key}>{TARGET_TYPE_LABELS[key] || key}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${category.isActive ? "green" : "gray"}`}>
                        {category.isActive ? "Đang hoạt động" : "Ngừng sử dụng"}
                      </span>
                    </td>
                    <td className="category-date">{formatDateTime(category.updatedAt || category.createdAt)}</td>
                    <td>
                      <div className="category-actions">
                        <button type="button" className="category-action" title="Sửa" aria-label={`Sửa ${category.name}`} onClick={() => setEditing(category)}>
                          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                        </button>
                        <button
                          type="button"
                          className={`category-action ${category.isActive ? "off" : "on"}`}
                          title={category.isActive ? "Ngừng sử dụng" : "Kích hoạt"}
                          aria-label={`${category.isActive ? "Ngừng sử dụng" : "Kích hoạt"} ${category.name}`}
                          onClick={() => setStateTarget(category)}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">{category.isActive ? "visibility_off" : "visibility"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CategoryEditor editing={editing} onClose={() => setEditing(null)} onSaved={finish} />
      <StateConfirm category={stateTarget} onClose={() => setStateTarget(null)} onDone={finish} />
    </section>
  );
}

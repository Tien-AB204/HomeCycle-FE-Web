import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import adminUserApi from "../../../services/apis/adminUserApi";
import { getUserId } from "../../../utils/authUtils";
import { getSafeProblemDetail } from "../../../utils/safeErrorMessage";
import UserDetailDialog from "./UserDetailDialog";
import { ROLES, STATUSES, formatDate, getAvailableAction, roleLabel, statusLabel, statusTone } from "./userAdminPresentation";

const PAGE_SIZE = 10;
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isCanceled = (error) => error?.name === "CanceledError" || error?.code === "ERR_CANCELED";
const errorCode = (error) => String(error?.response?.data?.code || error?.response?.data?.error?.code || "").trim();
const errorMessage = (error) =>
  getSafeProblemDetail(error?.response?.data?.error?.message) ||
  getSafeProblemDetail(error?.response?.data?.message) ||
  "Không thể thực hiện yêu cầu quản lý người dùng.";

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

function ModeratorDialog({ open, onClose, onCreated }) {
  const ref = useDialog(open);
  const [form, setForm] = useState({ email: "", username: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setForm({ email: "", username: "" });
    setErrors({});
    onClose();
  };

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const email = form.email.trim();
    const username = form.username.trim();
    const nextErrors = {};
    if (!email) nextErrors.email = "Vui lòng nhập thư điện tử.";
    else if (email.length > 255) nextErrors.email = "Thư điện tử không được vượt quá 255 ký tự.";
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = "Thư điện tử không hợp lệ.";
    if (!username) nextErrors.username = "Vui lòng nhập tên đăng nhập.";
    else if (username.length > 100) nextErrors.username = "Tên đăng nhập không được vượt quá 100 ký tự.";
    else if (!USERNAME_PATTERN.test(username)) nextErrors.username = "Tên đăng nhập chỉ được chứa chữ cái Latin, số và dấu gạch dưới.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setBusy(true);
    try {
      await adminUserApi.createModerator({ email, username });
      setForm({ email: "", username: "" });
      onCreated("Đã tạo tài khoản và gửi email xác nhận cho kiểm duyệt viên.");
    } catch (error) {
      const code = errorCode(error);
      if (code === "AUTH_MODERATOR_EMAIL_FAILED") {
        // BE đã tạo tài khoản Pending trước khi gửi mail: không tạo lại.
        setForm({ email: "", username: "" });
        onCreated("Tài khoản kiểm duyệt viên đã được tạo nhưng email xác nhận chưa gửi được. Không tạo lại tài khoản này.");
      } else if (code === "AUTH_EMAIL_EXISTS") setErrors({ email: "Thư điện tử này đã được sử dụng." });
      else if (code === "AUTH_USERNAME_EXISTS") setErrors({ username: "Tên đăng nhập này đã được sử dụng." });
      else if (code === "AUTH_MODERATOR_CREATION_FORBIDDEN") setErrors({ form: "Chỉ tài khoản Admin đang hoạt động mới được tạo kiểm duyệt viên." });
      else setErrors({ form: "Không thể tạo tài khoản kiểm duyệt viên. Vui lòng kiểm tra dữ liệu và thử lại." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} onCancel={(event) => { event.preventDefault(); close(); }} aria-labelledby="hcu-mod-title">
      <form onSubmit={submit}>
        <div className="dialog-head">
          <h2 id="hcu-mod-title">Tạo kiểm duyệt viên</h2>
          <button type="button" onClick={close} disabled={busy}>Đóng</button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
          Chỉ nhập email và tên đăng nhập. Kiểm duyệt viên tự xác nhận email và đặt mật khẩu.
        </p>
        <div className="editform">
          <label>
            Thư điện tử
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={255} autoComplete="off" disabled={busy} placeholder="kiemduyet@homecycle.vn" />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>
          <label>
            Tên đăng nhập
            <input value={form.username} onChange={(event) => update("username", event.target.value)} maxLength={100} autoComplete="off" disabled={busy} placeholder="kiemduyet_01" />
            <span className="muted">Chỉ chữ cái Latin, số và dấu gạch dưới.</span>
            {errors.username && <span className="field-error">{errors.username}</span>}
          </label>
        </div>
        {errors.form && <p className="field-error" style={{ marginTop: 12 }}>{errors.form}</p>}
        <div className="modalfoot">
          <button type="button" onClick={close} disabled={busy}>Hủy</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? "Đang tạo..." : "Tạo tài khoản"}</button>
        </div>
      </form>
    </dialog>
  );
}

function ConfirmDialog({ pending, onClose, onDone }) {
  const ref = useDialog(Boolean(pending));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = pending?.type === "lock";

  const close = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  const confirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError("");
    try {
      if (lock) await adminUserApi.lock(pending.account.userId);
      else await adminUserApi.unlock(pending.account.userId);
      onDone(lock ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} onCancel={(event) => { event.preventDefault(); close(); }} aria-labelledby="hcu-confirm-title">
      <div className="dialog-head">
        <h2 id="hcu-confirm-title">{lock ? "Khóa tài khoản?" : "Mở khóa tài khoản?"}</h2>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
        <strong>{pending?.account?.username}</strong>
        {lock
          ? " sẽ không thể tiếp tục đăng nhập và sử dụng các chức năng yêu cầu tài khoản."
          : " sẽ có thể đăng nhập và sử dụng lại tài khoản."}
      </p>
      {error && <p className="field-error" style={{ marginTop: 12 }}>{error}</p>}
      <div className="modalfoot">
        <button type="button" onClick={close} disabled={busy}>Hủy</button>
        <button type="button" className={lock ? "danger" : "primary"} onClick={confirm} disabled={busy}>
          {busy ? "Đang xử lý..." : lock ? "Xác nhận khóa" : "Xác nhận mở khóa"}
        </button>
      </div>
    </dialog>
  );
}

export default function UsersListTab({ linkedUserId = "" }) {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const requestKey = `${debouncedKeyword}:${role}:${status}:${page}:${version}`;
  const [list, setList] = useState({ key: "", result: null, error: "" });
  const [detailUserId, setDetailUserId] = useState(linkedUserId);
  const [pending, setPending] = useState(null);
  const [moderatorOpen, setModeratorOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const next = keyword.trim();
    if (next === debouncedKeyword) return undefined;
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(next);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [keyword, debouncedKeyword]);

  useEffect(() => {
    const controller = new AbortController();
    adminDashboardApi
      .getUsers({
        role: role || undefined,
        status: status || undefined,
        keyword: debouncedKeyword || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => setList({ key: requestKey, result, error: "" }))
      .catch((error) => {
        if (!isCanceled(error)) setList({ key: requestKey, result: null, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [debouncedKeyword, role, status, page, requestKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loading = list.key !== requestKey;
  const items = Array.isArray(list.result?.items) ? list.result.items : [];
  const totalCount = Number(list.result?.totalCount) || 0;
  const totalPages = Math.max(1, Number(list.result?.totalPages) || 1);

  const reset = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setRole("");
    setStatus("");
    setPage(1);
  };

  const refresh = (message) => {
    setToast(message);
    setVersion((current) => current + 1);
  };

  return (
    <section>
      <div className="heading">
        <div>
          <h1>Quản lý người dùng</h1>
          <p className="muted">Tìm kiếm, theo dõi trạng thái và kiểm soát truy cập tài khoản.</p>
        </div>
        <button type="button" className="primary" onClick={() => setModeratorOpen(true)}>Tạo kiểm duyệt viên</button>
      </div>

      <div className="panel">
        <div className="filters">
          <label>
            Tìm tài khoản
            <input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} maxLength={200} placeholder="Tên đăng nhập, email, số điện thoại" />
          </label>
          <label>
            Vai trò
            <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
              <option value="">Tất cả vai trò</option>
              {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Trạng thái
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">Tất cả trạng thái</option>
              {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={reset} disabled={!keyword.trim() && !role && !status}>Xóa bộ lọc</button>
        </div>

        <div className="tablewrap" style={{ opacity: loading && list.result ? 0.55 : 1 }}>
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Số điện thoại</th>
                <th>Thư điện tử</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.error && !loading && (
                <tr>
                  <td colSpan="7">
                    {list.error}{" "}
                    <button type="button" className="text" onClick={() => setVersion((current) => current + 1)}>Thử lại</button>
                  </td>
                </tr>
              )}
              {!list.error && loading && !list.result && (
                <tr><td colSpan="7">Đang tải danh sách người dùng...</td></tr>
              )}
              {!list.error && list.result && items.length === 0 && (
                <tr><td colSpan="7">Không có tài khoản phù hợp.</td></tr>
              )}
              {!list.error &&
                items.map((account) => {
                  const action = getAvailableAction(account, currentUserId);
                  return (
                    <tr key={account.userId}>
                      <td>
                        <strong>{account.username || "Người dùng HomeCycle"}</strong>
                        <span className="email">{account.email || "Chưa có thư điện tử"}</span>
                      </td>
                      <td><span className="pill">{roleLabel(account.role)}</span></td>
                      <td>{account.phoneNumber || "—"}</td>
                      <td>{account.isEmailVerified ? "Đã xác thực" : "Chưa xác thực"}</td>
                      <td><span className={`pill ${statusTone(account.status)}`}>{statusLabel(account.status)}</span></td>
                      <td>{formatDate(account.createdAt)}</td>
                      <td>
                        <div className="list-actions">
                          <button type="button" onClick={() => setDetailUserId(account.userId)}>Chi tiết</button>
                          <button
                            type="button"
                            className={action.type === "lock" ? "danger" : ""}
                            disabled={!action.type}
                            title={action.type ? "" : action.label}
                            onClick={() => setPending({ account, type: action.type })}
                          >
                            {action.label}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span aria-live="polite">{list.result ? `${totalCount.toLocaleString("vi-VN")} tài khoản` : ""}</span>
          <div>
            <button type="button" onClick={() => setPage((current) => current - 1)} disabled={!list.result?.hasPreviousPage || loading}>← Trước</button>{" "}
            <span>{page} / {totalPages}</span>{" "}
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={!list.result?.hasNextPage || loading}>Sau →</button>
          </div>
        </div>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}

      <UserDetailDialog userId={detailUserId} onClose={() => setDetailUserId("")} />
      <ModeratorDialog
        open={moderatorOpen}
        onClose={() => setModeratorOpen(false)}
        onCreated={(message) => {
          setModeratorOpen(false);
          refresh(message);
        }}
      />
      <ConfirmDialog
        pending={pending}
        onClose={() => setPending(null)}
        onDone={(message) => {
          setPending(null);
          refresh(message);
        }}
      />
    </section>
  );
}

import { useEffect, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";

const ROLE_LABELS = {
  personal: "Cá nhân",
  business: "Doanh nghiệp",
  moderator: "Kiểm duyệt viên",
  admin: "Quản trị viên",
};

const STATUS_LABELS = {
  pending: "Chờ kích hoạt",
  active: "Đang hoạt động",
  suspended: "Đang tạm khóa",
  deleted: "Đã xóa",
};

const BUSINESS_PROFILE_LABELS = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
};

const VERIFY_LABELS = {
  pending: "Chờ xác minh",
  verified: "Đã xác minh",
  approved: "Đã xác minh",
  rejected: "Bị từ chối",
  unverified: "Chưa xác minh",
};

const labelOf = (dictionary, value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : dictionary[String(value).trim().toLowerCase()] || "Chưa xác định";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-wide text-textLight">{label}</p>
    <p className="mt-1 break-words text-sm font-bold text-text">{value ?? "—"}</p>
  </div>
);

export default function AdminUserDetailModal({ userId, onClose }) {
  const [state, setState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    if (!userId) return undefined;

    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState({ loading: true, data: null, error: "" }),
    );

    adminDashboardApi
      .getUserDetail(userId, { signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setState({
          loading: false,
          data: null,
          error:
            Number(error?.response?.status) === 404
              ? "Không tìm thấy tài khoản."
              : "Không thể tải chi tiết tài khoản. Vui lòng thử lại.",
        });
      });

    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [userId, onClose]);

  if (!userId) return null;

  const detail = state.data;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-detail-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_70px_rgba(24,63,65,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Chi tiết tài khoản</p>
            <h2 id="admin-user-detail-title" className="mt-1 text-lg font-black text-text">
              {detail?.username || "Đang tải..."}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1 text-textLight transition hover:bg-background hover:text-text"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {state.loading && (
            <p className="rounded-xl bg-background px-4 py-6 text-center text-sm font-semibold text-textLight">
              Đang tải chi tiết tài khoản...
            </p>
          )}

          {!state.loading && state.error && (
            <p className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
              {state.error}
            </p>
          )}

          {!state.loading && detail && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" value={detail.email} />
                <Field label="Số điện thoại" value={detail.phoneNumber || "—"} />
                <Field label="Vai trò" value={labelOf(ROLE_LABELS, detail.role)} />
                <Field label="Trạng thái tài khoản" value={labelOf(STATUS_LABELS, detail.status)} />
                <Field label="Xác thực email" value={detail.isEmailVerified ? "Đã xác thực" : "Chưa xác thực"} />
                <Field label="Ngày tạo" value={formatDateTime(detail.createdAt)} />
              </div>

              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">Hồ sơ & xác minh</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Tên hồ sơ" value={detail.profileName || "—"} />
                  {detail.businessProfileStatus !== null && detail.businessProfileStatus !== undefined && (
                    <Field label="Hồ sơ doanh nghiệp" value={labelOf(BUSINESS_PROFILE_LABELS, detail.businessProfileStatus)} />
                  )}
                  {detail.personalVerificationStatus !== null && detail.personalVerificationStatus !== undefined && (
                    <Field label="Xác minh cá nhân" value={labelOf(VERIFY_LABELS, detail.personalVerificationStatus)} />
                  )}
                  <Field label="Thời điểm xác minh" value={formatDateTime(detail.verifiedAt)} />
                  {detail.verificationRejectReason && (
                    <Field label="Lý do từ chối" value={detail.verificationRejectReason} />
                  )}
                  <Field
                    label="Điểm uy tín"
                    value={
                      detail.reputationScore === null || detail.reputationScore === undefined
                        ? "—"
                        : new Intl.NumberFormat("vi-VN").format(detail.reputationScore)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

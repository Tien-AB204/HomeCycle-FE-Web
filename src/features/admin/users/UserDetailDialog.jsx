import { useEffect, useRef, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { formatDate, roleLabel, statusLabel } from "./userAdminPresentation";

const BUSINESS_PROFILE = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Đã từ chối" };
const VERIFICATION = {
  pending: "Chờ xác minh",
  verified: "Đã xác minh",
  approved: "Đã xác minh",
  rejected: "Bị từ chối",
  unverified: "Chưa xác minh",
};
const lookup = (dictionary, value) =>
  value === null || value === undefined || value === "" ? "" : dictionary[String(value).trim().toLowerCase()] || "";

export default function UserDetailDialog({ userId, onClose }) {
  const ref = useRef(null);
  const [state, setState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (userId && !dialog.open) dialog.showModal();
    if (!userId && dialog.open) dialog.close();
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    void Promise.resolve().then(() => setState({ loading: true, data: null, error: "" }));
    adminDashboardApi
      .getUserDetail(userId, { signal: controller.signal })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setState({
          loading: false,
          data: null,
          error: Number(error?.response?.status) === 404 ? "Không tìm thấy tài khoản." : "Không thể tải chi tiết tài khoản.",
        });
      });
    return () => controller.abort();
  }, [userId]);

  const detail = state.data;
  const rows = detail
    ? [
        ["Tên đăng nhập", detail.username],
        ["Người dùng / Hồ sơ", detail.profileName],
        ["Vai trò", roleLabel(detail.role)],
        ["Email", detail.email],
        ["Xác thực email", detail.isEmailVerified ? "Đã xác thực" : "Chưa xác thực"],
        ["Điện thoại", detail.phoneNumber || "Chưa cập nhật"],
        ["Trạng thái", statusLabel(detail.status)],
        ["Ngày tạo", formatDate(detail.createdAt)],
        ["Hồ sơ doanh nghiệp", lookup(BUSINESS_PROFILE, detail.businessProfileStatus)],
        ["Xác minh cá nhân", lookup(VERIFICATION, detail.personalVerificationStatus)],
        ["Thời điểm xác minh", detail.verifiedAt ? formatDate(detail.verifiedAt) : ""],
        ["Lý do từ chối", detail.verificationRejectReason],
        [
          "Điểm uy tín",
          detail.reputationScore === null || detail.reputationScore === undefined
            ? ""
            : Number(detail.reputationScore).toLocaleString("vi-VN"),
        ],
      ].filter(([, value]) => value !== null && value !== undefined && value !== "")
    : [];

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="hcu-detail-title">
      <div className="dialog-head">
        <h2 id="hcu-detail-title">Chi tiết tài khoản</h2>
        <button type="button" onClick={onClose} aria-label="Đóng chi tiết">Đóng</button>
      </div>
      {state.loading && <div className="empty">Đang tải chi tiết tài khoản...</div>}
      {!state.loading && state.error && <div className="empty">{state.error}</div>}
      {!state.loading &&
        rows.map(([label, value]) => (
          <div className="detail-row" key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
    </dialog>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Avatar from "../../components/shared/Avatar";
import publicProfileApi from "../../services/apis/publicProfileApi";
import { getApiErrorMessage, isCanceledRequest } from "../../utils/apiError";
import { formatDate } from "../../utils/formatter";
import {
  composeBusinessAddress,
  formatStarRating,
  getBusinessModelLabel,
  getProfileDisplayName,
  getProfileKindLabel,
} from "../../features/profile/publicProfile";

const getErrorMessage = (error) => {
  const status = Number(error?.response?.status);

  if (status === 404) return "Hồ sơ công khai của người dùng này hiện không khả dụng.";
  if (status === 401) return "Vui lòng đăng nhập để xem hồ sơ người dùng.";
  return getApiErrorMessage(error, "Không thể tải hồ sơ người dùng. Vui lòng thử lại.");
};

const InfoRow = ({ label, value }) => (
  <div>
    <dt className="text-xs font-semibold text-textLight">{label}</dt>
    <dd className="mt-1 text-sm font-semibold leading-6 text-text">{value || "Chưa cập nhật"}</dd>
  </div>
);

const StatCard = ({ value, label }) => (
  <div className="rounded-xl border border-border bg-white px-3 py-4 text-center">
    <p className="text-lg font-black text-text">{value}</p>
    <p className="mt-1 text-xs font-semibold text-textLight">{label}</p>
  </div>
);

/*
 * Hồ sơ công khai, chỉ đọc. Không có huy hiệu xác minh vì Backend không trả
 * trạng thái này cho hồ sơ công khai.
 */
const PublicProfilePage = () => {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const requestKey = `${userId}:${version}`;
  const [state, setState] = useState({ key: "", profile: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();

    publicProfileApi
      .getProfile(userId, { signal: controller.signal })
      .then((profile) => setState({ key: requestKey, profile, error: "" }))
      .catch((error) => {
        if (!isCanceledRequest(error)) {
          setState({ key: requestKey, profile: null, error: getErrorMessage(error) });
        }
      });

    return () => controller.abort();
  }, [requestKey, userId]);

  const loading = state.key !== requestKey;
  const { profile, error } = state;
  const displayName = profile ? getProfileDisplayName(profile) : "";

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-3xl px-4 pb-14 pt-7 sm:px-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-bold text-primary transition hover:text-text"
      >
        <span aria-hidden="true">←</span> Quay lại
      </button>

      {loading && (
        <div role="status" className="mt-5 rounded-xl border border-border bg-white p-12 text-center text-textLight">
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: 30 }}>refresh</span>
          <p className="mt-2 text-sm font-semibold">Đang tải hồ sơ...</p>
        </div>
      )}

      {!loading && (error || !profile) && (
        <div role="alert" className="mt-5 rounded-xl border border-border bg-white p-10 text-center">
          <span className="material-symbols-outlined text-textLight" style={{ fontSize: 44 }} aria-hidden="true">
            account_circle
          </span>
          <p className="mt-3 text-sm font-semibold text-text">
            {error || "Không thể tải hồ sơ người dùng. Vui lòng thử lại."}
          </p>
          <button
            type="button"
            onClick={() => setVersion((current) => current + 1)}
            className="mt-4 rounded-lg border border-primary px-5 py-2 text-sm font-bold text-primary hover:bg-primary/10"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && profile && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-border bg-white p-6 text-center shadow-[0_8px_24px_rgba(23,40,48,0.05)]">
            <Avatar src={profile.avatarUrl} alt={displayName} className="mx-auto h-24 w-24" />
            <h1 className="mt-3 text-2xl font-black text-text">{displayName}</h1>
            {profile.username && profile.username !== displayName && (
              <p className="mt-1 text-sm text-textLight">@{profile.username}</p>
            )}
            <p className="mt-2 text-xs font-bold text-primary">{getProfileKindLabel(profile.kind)}</p>
            <p className="mt-2 text-sm text-textLight">
              Tham gia: {formatDate(profile.joinedAt, "Chưa có")}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard value={profile.reputationScore} label="Điểm uy tín" />
            <StatCard value={formatStarRating(profile.displayStarRating)} label="Đánh giá" />
            <StatCard value={profile.activePostCount} label="Bài đăng đang hoạt động" />
          </div>

          {profile.kind === "personal" && (
            <div className="rounded-xl border border-border bg-white p-5">
              <h2 className="font-black text-text">Thông tin cá nhân</h2>
              <dl className="mt-3">
                <InfoRow label="Họ và tên" value={profile.fullName} />
              </dl>
            </div>
          )}

          {profile.kind === "business" && (
            <>
              <div className="rounded-xl border border-border bg-white p-5">
                <h2 className="font-black text-text">Giới thiệu doanh nghiệp</h2>
                <p className={`mt-3 text-sm leading-6 ${profile.businessDescription ? "text-text" : "italic text-textLight"}`}>
                  {profile.businessDescription || "Doanh nghiệp chưa cập nhật mô tả."}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white p-5">
                <h2 className="font-black text-text">Thông tin doanh nghiệp</h2>
                <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                  <InfoRow label="Tên doanh nghiệp" value={profile.businessName} />
                  <InfoRow label="Mô hình" value={getBusinessModelLabel(profile.businessModel)} />
                  <InfoRow label="Phạm vi hoạt động" value={profile.operatingScope} />
                  <InfoRow label="Địa chỉ" value={composeBusinessAddress(profile)} />
                </dl>
              </div>
            </>
          )}

          <Link
            to={`/danh-gia/nguoi-dung/${encodeURIComponent(profile.userId || userId)}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">star</span>
            Xem đánh giá
          </Link>
        </div>
      )}
    </section>
  );
};

export default PublicProfilePage;

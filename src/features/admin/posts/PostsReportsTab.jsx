import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { formatDate, isCanceled, num, stateKey, stateLabel } from "./postsAdminPresentation";

const PAGE_SIZE = 10;

const reasonName = (reason) => {
  const name = String(reason?.name ?? "").trim();
  return name && !["unknown", "unspecified"].includes(name.toLowerCase()) ? name : "Chưa xác định";
};

export default function PostsReportsTab({ onOpenPost }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [page, setPage] = useState(1);
  const requestKey = JSON.stringify([keyword, openOnly, page]);
  const [list, setList] = useState({ key: "", result: null, error: "" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = input.trim();
      if (next === keyword) return;
      setKeyword(next);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input, keyword]);

  useEffect(() => {
    const controller = new AbortController();
    adminDashboardApi
      .getReportedListings({ openOnly, keyword, pageNumber: page, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((response) => setList({ key: requestKey, result: response?.data ?? response, error: "" }))
      .catch((error) => {
        if (!isCanceled(error)) setList({ key: requestKey, result: null, error: "Không thể tải danh sách bài đăng bị báo cáo." });
      });
    return () => controller.abort();
  }, [keyword, openOnly, page, requestKey]);

  const loading = list.key !== requestKey;
  const rows = Array.isArray(list.result?.items) ? list.result.items : [];
  const totalPages = Math.max(1, Number(list.result?.totalPages) || 1);

  const openOwner = (ownerId) => {
    if (ownerId) navigate(`/admin/dashboard/users?tab=list&userId=${encodeURIComponent(ownerId)}`);
  };
  const openCase = (disputeId) => {
    if (disputeId) navigate("/admin/dashboard/disputes", { state: { notificationDisputeId: disputeId } });
  };

  return (
    <section>
      <div className="heading">
        <div>
          <h1>Bài đăng bị báo cáo</h1>
          <p className="muted">Xem nội dung bị phản ánh và hồ sơ liên quan.</p>
        </div>
      </div>
      <section className="panel">
        <div className="filters">
          <label className="search">
            Tìm bài hoặc người đăng
            <input type="search" value={input} onChange={(event) => setInput(event.target.value)} maxLength={200} placeholder="Tên sản phẩm, người đăng" />
          </label>
          <label>
            Phạm vi
            <select
              value={openOnly ? "open" : "all"}
              onChange={(event) => {
                setOpenOnly(event.target.value === "open");
                setPage(1);
              }}
            >
              <option value="open">Báo cáo chưa giải quyết</option>
              <option value="all">Tất cả báo cáo</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setInput("");
              setKeyword("");
              setOpenOnly(true);
              setPage(1);
            }}
          >
            Xóa bộ lọc
          </button>
        </div>

        <div style={{ opacity: loading && list.result ? 0.55 : 1 }}>
          {list.error && !loading && <div className="empty">{list.error}</div>}
          {!list.error && !list.result && <div className="empty">Đang tải dữ liệu...</div>}
          {!list.error && list.result && rows.length === 0 && <div className="empty">Không có bài bị báo cáo phù hợp.</div>}
          {!list.error && rows.length > 0 && (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Bài đăng</th>
                    <th>Người đăng</th>
                    <th>Trạng thái</th>
                    <th className="right">Lượt báo cáo</th>
                    <th>Lý do</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.postId}>
                      <td>
                        <button type="button" className="text post-title" onClick={() => onOpenPost(row)}>
                          {row.productName || "Bài đăng chưa đặt tên"}
                        </button>
                        <span className="sub">Báo cáo gần nhất {formatDate(row.latestReportedAt)}</span>
                      </td>
                      <td>{row.ownerName || "—"}</td>
                      <td><span className={`badge ${stateKey(row.status)}`}>{stateLabel(row.status)}</span></td>
                      <td className="right">
                        <strong>{num(row.reportCount)}</strong>
                        <span className="sub">{num(row.reporterCount)} người báo cáo</span>
                      </td>
                      <td>
                        {Array.isArray(row.reasons) && row.reasons.length > 0 ? (
                          <ul className="reasons">
                            {row.reasons.map((reason, index) => (
                              <li key={`${reason?.categoryId ?? reason?.name}-${index}`}>
                                {reasonName(reason)}
                                {reason?.count ? <span className="muted"> · {num(reason.count)} lượt</span> : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <div className="actions">
                          <button type="button" onClick={() => onOpenPost(row)}>Xem bài</button>
                          <button type="button" onClick={() => openOwner(row.ownerId)} disabled={!row.ownerId}>Tài khoản</button>
                          <button type="button" onClick={() => openCase(row.latestReportId)} disabled={!row.latestReportId}>Hồ sơ báo cáo</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="result">
          <span aria-live="polite">{list.result ? `${num(list.result.totalCount)} bài có báo cáo trong phạm vi đã chọn.` : ""}</span>
          <div className="actions">
            <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1 || loading}>Trước</button>
            <span>{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages || loading}>Sau</button>
          </div>
        </div>
        <p className="note">Có báo cáo chưa đồng nghĩa vi phạm. Việc xử lý nội dung thực hiện tại Trung tâm kiểm duyệt.</p>
      </section>
    </section>
  );
}

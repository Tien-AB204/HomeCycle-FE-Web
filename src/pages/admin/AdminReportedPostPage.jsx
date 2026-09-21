import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import { POST_SECTION_TABS } from "../../constants/adminSections";
import AdminPostDetailModal from "../../features/admin/posts/AdminPostDetailModal";
import adminDashboardApi from "../../services/apis/adminDashboardApi";
import { getSafeProblemDetail } from "../../utils/safeErrorMessage";

const PAGE_SIZE = 10;

const STATUS_META = {
  draft: {
    label: "Bản nháp",
    className: "border-border bg-textLight/10 text-textLight",
  },
  active: {
    label: "Đang hoạt động",
    className: "border-success/20 bg-success/10 text-success",
  },
  suspended: {
    label: "Đã đình chỉ",
    className: "border-warning/20 bg-warning/10 text-warning",
  },
  closed: {
    label: "Đã đóng",
    className: "border-border bg-background text-textLight",
  },
  deleted: {
    label: "Đã xóa",
    className: "border-error/20 bg-error/10 text-error",
  },
};

const normalize = (value) => String(value ?? "").trim().toLowerCase();

const statusMetaFor = (value) =>
  STATUS_META[normalize(value)] || {
    label: "Chưa xác định",
    className: "border-border bg-background text-textLight",
  };

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatNumber = (value) => {
  const number = toFiniteNumber(value);
  return number === null ? "—" : new Intl.NumberFormat("vi-VN").format(number);
};

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

const getErrorMessage = (error) => {
  const response = error?.response?.data;
  return (
    getSafeProblemDetail(response?.error?.message) ||
    getSafeProblemDetail(response?.message) ||
    getSafeProblemDetail(response?.title) ||
    "Không thể tải danh sách bài đăng bị báo cáo."
  );
};

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const normalizePage = (response, fallbackPage) => {
  const source = response?.data ?? response ?? {};
  return {
    items: Array.isArray(source.items) ? source.items : [],
    pageNumber: toFiniteNumber(source.pageNumber) ?? fallbackPage,
    pageSize: toFiniteNumber(source.pageSize) ?? PAGE_SIZE,
    totalCount: toFiniteNumber(source.totalCount) ?? 0,
    totalPages: toFiniteNumber(source.totalPages) ?? 0,
    hasPreviousPage: Boolean(source.hasPreviousPage),
    hasNextPage: Boolean(source.hasNextPage),
  };
};

const reasonLabel = (reason) => {
  const name = String(reason?.name ?? "").trim();
  return name && !["unknown", "unspecified"].includes(normalize(name))
    ? name
    : "Chưa xác định";
};

function StatusBadge({ status }) {
  const meta = statusMetaFor(status);
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function ReasonList({ reasons }) {
  const rows = Array.isArray(reasons) ? reasons : [];

  if (rows.length === 0) {
    return <span className="text-textLight">—</span>;
  }

  return (
    <ul className="space-y-1 text-xs text-textLight">
      {rows.map((reason, index) => (
        <li key={`${reason?.categoryId ?? reason?.name ?? "reason"}-${index}`}>
          <span className="font-bold text-text">{reasonLabel(reason)}</span>
          {toFiniteNumber(reason?.count) !== null && (
            <span> · {formatNumber(reason.count)} lượt</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function AdminReportedPostPage() {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);
  const requestKey = JSON.stringify([
    keyword,
    openOnly,
    pageNumber,
    requestVersion,
  ]);
  const [state, setState] = useState({
    requestKey: "",
    data: null,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    adminDashboardApi
      .getReportedListings({
        openOnly,
        keyword,
        pageNumber,
        pageSize: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((response) => {
        if (!active) return;
        setState({
          requestKey,
          data: normalizePage(response, pageNumber),
          error: "",
        });
      })
      .catch((error) => {
        if (!active || isCanceled(error)) return;
        setState({ requestKey, data: null, error: getErrorMessage(error) });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [keyword, openOnly, pageNumber, requestKey]);

  const loading = state.requestKey !== requestKey;
  const rows = useMemo(
    () => (Array.isArray(state.data?.items) ? state.data.items : []),
    [state.data],
  );

  const applyKeyword = (event) => {
    event.preventDefault();
    setPageNumber(1);
    setKeyword(keywordInput.trim());
  };

  const openPost = (row) => {
    setSelectedPost({
      postId: row.postId,
      productName: row.productName,
      ownerId: row.ownerId,
      status: row.status,
    });
  };

  const openOwner = (ownerId) => {
    const id = String(ownerId || "").trim();
    if (!id) return;
    navigate(`/admin/users?userId=${encodeURIComponent(id)}`);
  };

  const openCase = (disputeId) => {
    const id = String(disputeId || "").trim();
    if (!id) return;
    navigate("/admin/dashboard/disputes/history", {
      state: { notificationDisputeId: id },
    });
  };

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <AdminSectionTabs ariaLabel="Khu vực Bài đăng" items={POST_SECTION_TABS} />

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Vận hành · Chỉ xem
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text">
          Bài đăng bị báo cáo
        </h1>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-textLight">
          Theo dõi bài đăng có báo cáo và mở hồ sơ liên quan. Quản trị viên không
          đình chỉ, cảnh cáo hoặc xử lý case tại màn hình này; các thao tác đó thuộc
          Trung tâm kiểm duyệt.
        </p>
      </header>

      <form
        onSubmit={applyKeyword}
        className="grid gap-3 rounded-xl border border-border bg-white p-4 shadow-sm lg:grid-cols-[minmax(260px,1fr)_220px_auto_auto]"
      >
        <label className="relative block">
          <span className="sr-only">Tìm bài đăng bị báo cáo</span>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-textLight">
            search
          </span>
          <input
            type="search"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Tên sản phẩm hoặc từ khóa..."
            className="w-full rounded-lg border border-border py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </label>

        <select
          value={openOnly ? "open" : "all"}
          onChange={(event) => {
            setOpenOnly(event.target.value === "open");
            setPageNumber(1);
          }}
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          aria-label="Phạm vi báo cáo"
        >
          <option value="open">Còn báo cáo chưa giải quyết</option>
          <option value="all">Tất cả báo cáo</option>
        </select>

        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
        >
          Tìm kiếm
        </button>

        <button
          type="button"
          onClick={() => setRequestVersion((version) => version + 1)}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-text transition hover:bg-background"
        >
          Làm mới
        </button>
      </form>

      {loading && (
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-sm">
          <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
          <span className="ml-3 text-sm font-semibold">Đang tải bài đăng bị báo cáo...</span>
        </div>
      )}

      {!loading && state.error && (
        <div role="alert" className="rounded-xl border border-error/20 bg-error/10 p-8 text-center">
          <h2 className="font-bold text-error">Không thể tải dữ liệu báo cáo</h2>
          <p className="mt-2 text-sm text-error">{state.error}</p>
          <button
            type="button"
            onClick={() => setRequestVersion((version) => version + 1)}
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !state.error && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-border">report_off</span>
          <h2 className="mt-3 font-bold text-text">Không có bài đăng phù hợp</h2>
          <p className="mt-1 text-sm text-textLight">
            Không tìm thấy bài đăng trong phạm vi báo cáo đã chọn.
          </p>
        </div>
      )}

      {!loading && !state.error && rows.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-white shadow-sm md:block">
            <table className="w-full min-w-[1180px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[16%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[20%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-background text-xs uppercase tracking-wide text-textLight">
                  <th className="px-4 py-3">Bài đăng</th>
                  <th className="px-4 py-3">Chủ sở hữu</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Người / lượt báo cáo</th>
                  <th className="px-4 py-3">Lý do</th>
                  <th className="px-4 py-3">Báo cáo gần nhất</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.postId} className="align-top transition hover:bg-background/70">
                    <td className="px-4 py-4">
                      <p className="line-clamp-2 font-bold text-text">
                        {row.productName || "Bài đăng chưa có tên"}
                      </p>
                      <p className="mt-1 break-all text-xs text-textLight">
                        {row.postId || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-text">{row.ownerName || "Chưa có tên"}</p>
                      <p className="mt-1 break-all text-xs text-textLight">{row.ownerId || "—"}</p>
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-black text-text">
                        {formatNumber(row.reporterCount)} / {formatNumber(row.reportCount)}
                      </p>
                      <p className="mt-1 text-xs text-textLight">người / lượt</p>
                    </td>
                    <td className="px-4 py-4"><ReasonList reasons={row.reasons} /></td>
                    <td className="px-4 py-4 text-textLight">{formatDateTime(row.latestReportedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => openPost(row)} title="Xem bài đăng" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-textLight hover:border-primary hover:text-primary">
                          <span className="material-symbols-outlined text-[19px]">visibility</span>
                        </button>
                        <button type="button" onClick={() => openOwner(row.ownerId)} disabled={!row.ownerId} title="Xem tài khoản chủ sở hữu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-textLight hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
                          <span className="material-symbols-outlined text-[19px]">person</span>
                        </button>
                        <button type="button" onClick={() => openCase(row.latestReportId)} disabled={!row.latestReportId} title="Xem case báo cáo gần nhất" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-textLight hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
                          <span className="material-symbols-outlined text-[19px]">gavel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <article key={row.postId} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-text">{row.productName || "Bài đăng chưa có tên"}</h2>
                    <p className="mt-1 text-sm text-textLight">{row.ownerName || "Chưa có tên chủ sở hữu"}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
                  <div><dt className="text-textLight">Người báo cáo</dt><dd className="mt-1 font-bold text-text">{formatNumber(row.reporterCount)}</dd></div>
                  <div><dt className="text-textLight">Lượt báo cáo</dt><dd className="mt-1 font-bold text-text">{formatNumber(row.reportCount)}</dd></div>
                  <div className="col-span-2"><dt className="text-textLight">Lý do</dt><dd className="mt-1"><ReasonList reasons={row.reasons} /></dd></div>
                  <div className="col-span-2"><dt className="text-textLight">Báo cáo gần nhất</dt><dd className="mt-1 font-semibold text-text">{formatDateTime(row.latestReportedAt)}</dd></div>
                </dl>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => openPost(row)} className="rounded-lg border border-primary px-2 py-2 text-xs font-bold text-primary">Xem bài</button>
                  <button type="button" onClick={() => openOwner(row.ownerId)} disabled={!row.ownerId} className="rounded-lg border border-border px-2 py-2 text-xs font-bold text-text disabled:opacity-40">Tài khoản</button>
                  <button type="button" onClick={() => openCase(row.latestReportId)} disabled={!row.latestReportId} className="rounded-lg border border-border px-2 py-2 text-xs font-bold text-text disabled:opacity-40">Xem case</button>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm sm:flex-row">
            <p className="text-sm text-textLight">
              Trang {formatNumber(state.data?.pageNumber)} / {formatNumber(state.data?.totalPages)} · Tổng {formatNumber(state.data?.totalCount)} bài đăng
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPageNumber((page) => Math.max(1, page - 1))} disabled={!state.data?.hasPreviousPage} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-text disabled:cursor-not-allowed disabled:opacity-40">Trang trước</button>
              <button type="button" onClick={() => setPageNumber((page) => page + 1)} disabled={!state.data?.hasNextPage} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Trang sau</button>
            </div>
          </div>
        </>
      )}

      {selectedPost && (
        <AdminPostDetailModal
          postSummary={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </section>
  );
}

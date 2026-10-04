import { useCallback, useEffect, useState } from "react";
import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import { POST_SECTION_TABS } from "../../constants/adminSections";
import AdminPostDetailModal from "../../features/admin/posts/AdminPostDetailModal";
import ListingMonitorFilters from "../../features/admin/posts/ListingMonitorFilters";
import {
  EMPTY_LISTING_FILTERS,
  formatListingDateTime,
  formatListingPrice,
  getListingStatusLabel,
} from "../../features/admin/posts/listingMonitorPresentation";
import adminDashboardApi from "../../services/apis/adminDashboardApi";
import { getSafeProblemDetail } from "../../utils/safeErrorMessage";

const PAGE_SIZE = 10;

const LIST_TYPE_TABS = [
  { value: "Sell", label: "Tin đăng bán" },
  { value: "Buy", label: "Tin thu mua" },
];

const SORT_OPTIONS = [
  { value: "Newest", label: "Mới nhất" },
  { value: "MostOpenReports", label: "Nhiều báo cáo chưa xử lý" },
];

const STATUS_CLASS = {
  Active: "border-success/20 bg-success/10 text-success",
  Suspended: "border-warning/20 bg-warning/10 text-warning",
  Closed: "border-border bg-background text-textLight",
  Deleted: "border-error/20 bg-error/10 text-error",
};

const formatQuantity = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : new Intl.NumberFormat("vi-VN").format(value);

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (error?.response?.status === 403) {
    return "Phiên quản trị hiện tại không có quyền xem danh sách này. Vui lòng đăng nhập lại hoặc kiểm tra quyền tài khoản.";
  }

  return (
    getSafeProblemDetail(responseData?.error?.message) ||
    getSafeProblemDetail(responseData?.message) ||
    getSafeProblemDetail(responseData?.title) ||
    "Không thể tải danh sách bài đăng."
  );
};

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
        STATUS_CLASS[status] || "border-border bg-background text-textLight"
      }`}
    >
      {getListingStatusLabel(status)}
    </span>
  );
}

function ReportNote({ item }) {
  if (!item.openReportCount) {
    return item.totalReportCount ? (
      <p className="mt-1 text-xs text-textLight">
        {formatQuantity(item.totalReportCount)} báo cáo đã xử lý
      </p>
    ) : null;
  }

  return (
    <p className="mt-1 text-xs font-bold text-error">
      {formatQuantity(item.openReportCount)} báo cáo chưa xử lý
    </p>
  );
}

function ExpiryCell({ item }) {
  return (
    <>
      <span>{formatListingDateTime(item.expiryDate)}</span>
      {item.isExpired && (
        <span className="mt-1 block text-xs font-bold text-error">Đã hết hạn</span>
      )}
    </>
  );
}

export default function PostManagementPage() {
  const [listType, setListType] = useState("Sell");
  const [filters, setFilters] = useState({ ...EMPTY_LISTING_FILTERS });
  const [sortBy, setSortBy] = useState("Newest");
  const [pageNumber, setPageNumber] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [listState, setListState] = useState({ loading: true, error: "", result: null });
  const [selectedPost, setSelectedPost] = useState(null);

  const handleFiltersChange = useCallback((next) => {
    setFilters(next);
    setPageNumber(1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setListState((current) => ({ ...current, loading: true, error: "" })),
    );

    adminDashboardApi
      .getListingMonitorItems(
        {
          ...filters,
          PostType: listType,
          SortBy: sortBy,
          PageNumber: pageNumber,
          PageSize: PAGE_SIZE,
        },
        { signal: controller.signal },
      )
      .then((result) => setListState({ loading: false, error: "", result }))
      .catch((error) => {
        if (isCanceledRequest(error)) return;
        setListState({ loading: false, error: getErrorMessage(error), result: null });
      });

    return () => controller.abort();
  }, [filters, listType, sortBy, pageNumber, requestVersion]);

  const items = Array.isArray(listState.result?.items) ? listState.result.items : [];
  const totalCount = listState.result?.totalCount ?? 0;
  const totalPages = Math.max(1, listState.result?.totalPages || 1);
  const isBuy = listType === "Buy";

  const changeListType = (nextType) => {
    if (nextType === listType) return;
    setListType(nextType);
    setPageNumber(1);
    setSelectedPost(null);
  };

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <AdminSectionTabs ariaLabel="Khu vực Bài đăng" items={POST_SECTION_TABS} />

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Quản trị nội dung
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text">Quản lý bài đăng</h1>
        <p className="mt-1 text-sm text-textLight">
          Theo dõi bài đăng bán và tin thu mua ở chế độ chỉ xem (không gồm bản nháp). Việc xử lý nội dung thuộc Trung tâm kiểm duyệt.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Loại tin" className="inline-flex rounded-xl border border-border bg-white p-1 shadow-sm">
          {LIST_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={listType === tab.value}
              onClick={() => changeListType(tab.value)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                listType === tab.value ? "bg-primary text-white" : "text-textLight hover:bg-background"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-textLight">
          Sắp xếp
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPageNumber(1);
            }}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ListingMonitorFilters value={filters} onChange={handleFiltersChange} />

      {listState.error && (
        <div role="alert" className="rounded-xl border border-error/20 bg-error/10 p-8 text-center">
          <h2 className="font-bold text-error">Không thể tải danh sách bài đăng</h2>
          <p className="mt-2 text-sm text-error">{listState.error}</p>
          <button
            type="button"
            onClick={() => setRequestVersion((current) => current + 1)}
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {listState.loading && !listState.result && !listState.error && (
        <div role="status" className="flex min-h-64 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-sm">
          <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
          <span className="ml-3 text-sm font-semibold">Đang tải danh sách bài đăng...</span>
        </div>
      )}

      {!listState.error && listState.result && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-border">inventory_2</span>
          <h2 className="mt-3 font-bold text-text">Không tìm thấy bài đăng</h2>
          <p className="mt-1 text-sm text-textLight">Không có bài đăng nào phù hợp bộ lọc hiện tại.</p>
        </div>
      )}

      {!listState.error && items.length > 0 && (
        <div className={listState.loading ? "opacity-60 transition" : "transition"}>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-white shadow-sm md:block">
            <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[15%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-background text-xs uppercase tracking-wide text-textLight">
                  <th className="px-4 py-3 font-semibold">Bài đăng</th>
                  <th className="px-4 py-3 font-semibold">{isBuy ? "Khoảng giá mua" : "Giá bán"}</th>
                  <th className="px-4 py-3 font-semibold">Số lượng</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-3 font-semibold">Ngày hết hạn</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.postId} className="align-top transition hover:bg-background/70">
                    <td className="px-4 py-4">
                      <p className="line-clamp-2 font-bold leading-5 text-text">
                        {item.productName || "Bài đăng chưa có tên"}
                      </p>
                      <p className="mt-1 truncate text-xs text-textLight">
                        {item.categoryName || "Chưa có danh mục"} · {item.ownerName || "Không rõ người đăng"}
                      </p>
                      <p title={item.postId} className="mt-0.5 truncate text-[11px] text-textLight">
                        Mã bài: {item.postId}
                      </p>
                      <ReportNote item={item} />
                    </td>
                    <td className="px-4 py-4 font-bold text-text">{formatListingPrice(item)}</td>
                    <td className="px-4 py-4 text-textLight">{formatQuantity(item.quantity)}</td>
                    <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-4 text-textLight">{formatListingDateTime(item.createdAt)}</td>
                    <td className="px-4 py-4 text-textLight"><ExpiryCell item={item} /></td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedPost(item)}
                          title="Xem chi tiết"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-textLight transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-[19px]">visibility</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <article key={item.postId} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <h2 className="line-clamp-2 font-bold text-text">
                  {item.productName || "Bài đăng chưa có tên"}
                </h2>
                <p className="mt-1 text-xs text-textLight">
                  {item.categoryName || "Chưa có danh mục"} · {item.ownerName || "Không rõ người đăng"}
                </p>
                <ReportNote item={item} />
                <p className="mt-2 font-bold text-text">{formatListingPrice(item)}</p>
                <div className="mt-2"><StatusBadge status={item.status} /></div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
                  <div>
                    <dt className="text-textLight">Ngày tạo</dt>
                    <dd className="mt-1 font-semibold text-text">{formatListingDateTime(item.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-textLight">Ngày hết hạn</dt>
                    <dd className="mt-1 font-semibold text-text"><ExpiryCell item={item} /></dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setSelectedPost(item)}
                  className="mt-4 w-full rounded-lg border border-primary px-3 py-2.5 text-sm font-bold text-primary"
                >
                  Xem chi tiết
                </button>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm sm:flex-row">
            <p className="text-sm text-textLight">
              Trang {pageNumber} / {totalPages} · {formatQuantity(totalCount)} bài đăng
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((current) => current - 1)}
                disabled={pageNumber <= 1 || listState.loading}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((current) => current + 1)}
                disabled={pageNumber >= totalPages || listState.loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>
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

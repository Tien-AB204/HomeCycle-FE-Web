import { useEffect, useState } from "react";
import adminDashboardApi from "../../../services/apis/adminDashboardApi";
import { categoryApi } from "../../../services/apis/categoryApi";
import PostTable from "./PostTable";
import { EMPTY_POST_FILTERS, POST_STATES, isCanceled, num } from "./postsAdminPresentation";

const PAGE_SIZE = 10;

export default function PostsListTab({ preset, onOpenPost }) {
  const [filters, setFilters] = useState({ ...EMPTY_POST_FILTERS, ...preset });
  const [keyword, setKeyword] = useState(preset?.Keyword || "");
  const [city, setCity] = useState(preset?.City || "");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const requestKey = JSON.stringify([filters, page]);
  const [list, setList] = useState({ key: "", result: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    categoryApi
      .getAll({ pageNumber: 1, pageSize: 100, signal: controller.signal })
      .then((result) => setCategories(Array.isArray(result?.items) ? result.items : []))
      .catch(() => setCategories([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextKeyword = keyword.trim();
      const nextCity = city.trim();
      if (nextKeyword === filters.Keyword && nextCity === filters.City) return;
      setFilters((current) => ({ ...current, Keyword: nextKeyword, City: nextCity }));
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [keyword, city, filters.Keyword, filters.City]);

  useEffect(() => {
    const controller = new AbortController();
    adminDashboardApi
      .getListingMonitorItems({ ...filters, PageNumber: page, PageSize: PAGE_SIZE }, { signal: controller.signal })
      .then((result) => setList({ key: requestKey, result, error: "" }))
      .catch((error) => {
        if (!isCanceled(error)) setList({ key: requestKey, result: null, error: "Không thể tải danh sách bài đăng." });
      });
    return () => controller.abort();
  }, [filters, page, requestKey]);

  const loading = list.key !== requestKey;
  const items = Array.isArray(list.result?.items) ? list.result.items : [];
  const totalPages = Math.max(1, Number(list.result?.totalPages) || 1);
  const update = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const reset = () => {
    setKeyword("");
    setCity("");
    setFilters({ ...EMPTY_POST_FILTERS });
    setPage(1);
  };
  const advancedActive = Boolean(filters.CategoryId || filters.City || filters.OwnerRole || filters.HasOpenReports || filters.SortBy !== "Newest");
  const activeAdvancedCount = [filters.CategoryId, filters.City, filters.OwnerRole, filters.HasOpenReports, filters.SortBy !== "Newest"].filter(Boolean).length;
  const hasActiveFilters = Boolean(keyword.trim() || city.trim() || filters.PostType || filters.Status || advancedActive);

  return (
    <section>
      <div className="heading">
        <div>
          <h1>Danh sách bài đăng</h1>
          <p className="muted">Tìm tin bán, tin mua và xem thông tin chi tiết.</p>
        </div>
      </div>
      <section className="panel">
        <div className="filters post-filter-row">
          <label className="search">
            Tìm bài đăng
            <input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} maxLength={200} placeholder="Tên sản phẩm, mã bài hoặc người đăng" />
          </label>
          <label>
            Loại tin
            <select value={filters.PostType} onChange={(event) => update("PostType", event.target.value)}>
              <option value="">Tất cả loại tin</option>
              <option value="Sell">Tin bán</option>
              <option value="Buy">Tin mua</option>
            </select>
          </label>
          <label>
            Trạng thái
            <select value={filters.Status} onChange={(event) => update("Status", event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {POST_STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={reset} disabled={!hasActiveFilters}>Xóa bộ lọc</button>
        </div>
        <details className="fold post-advanced-filters" open={advancedActive || undefined}>
          <summary>
            <span>Lọc nâng cao</span>
            {activeAdvancedCount > 0 && <span className="filter-count">{activeAdvancedCount} đang áp dụng</span>}
          </summary>
          <div className="filters">
            <label>
              Danh mục
              <select value={filters.CategoryId} onChange={(event) => update("CategoryId", event.target.value)}>
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>{category.categoryName || category.name}</option>
                ))}
              </select>
            </label>
            <label>
              Khu vực
              <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} placeholder="Tỉnh/thành phố" />
            </label>
            <label>
              Người đăng
              <select value={filters.OwnerRole} onChange={(event) => update("OwnerRole", event.target.value)}>
                <option value="">Tất cả</option>
                <option value="Personal">Cá nhân</option>
                <option value="Business">Doanh nghiệp</option>
              </select>
            </label>
            <label>
              Báo cáo
              <select value={filters.HasOpenReports} onChange={(event) => update("HasOpenReports", event.target.value)}>
                <option value="">Tất cả bài đăng</option>
                <option value="true">Có báo cáo chưa giải quyết</option>
                <option value="false">Không có báo cáo chưa giải quyết</option>
              </select>
            </label>
            <label>
              Sắp xếp
              <select value={filters.SortBy} onChange={(event) => update("SortBy", event.target.value)}>
                <option value="Newest">Ngày tạo mới nhất</option>
                <option value="MostOpenReports">Nhiều báo cáo chưa giải quyết</option>
              </select>
            </label>
          </div>
        </details>

        <div style={{ opacity: loading && list.result ? 0.55 : 1 }}>
          {list.error && !loading && <div className="empty">{list.error}</div>}
          {!list.error && !list.result && <div className="empty">Đang tải danh sách bài đăng...</div>}
          {!list.error && list.result && <PostTable rows={items} onOpen={onOpenPost} />}
        </div>
        <div className="result">
          <span aria-live="polite">{loading ? "Đang cập nhật danh sách…" : list.result ? `${num(list.result.totalCount)} bài phù hợp · Không gồm nháp` : ""}</span>
          <div className="actions">
            <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1 || loading}>Trước</button>
            <span>{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages || loading}>Sau</button>
          </div>
        </div>
      </section>
    </section>
  );
}

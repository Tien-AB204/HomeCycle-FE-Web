import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PostThumbnail from "../../components/shared/PostThumbnail";
import {
  ORDER_PERSPECTIVE,
  ORDER_STATUS,
  getOrderStatusMeta,
  getPaymentDisplayMeta,
  isOrderStatus,
} from "../../constants/orders";
import {
  MetricTile,
  SegmentedControl,
  StatusRing,
  WorkspaceHeader,
  WorkspacePanel,
} from "../business-workspace/WorkspaceWidgets";
import {
  ORDER_RING_STATUSES,
  ORDER_SCOPE,
  countOrdersByStatus,
  filterOrders,
  getOrderRingRows,
  getOrdersForPerspective,
  getPriorityOrders,
  hasSellerOrders,
} from "./businessOrderOverview";

const PAGE_SIZE = 10;
const PRIORITY_LIMIT = 5;
const LIST_ID = "business-order-list";

const PERSPECTIVE_OPTIONS = [
  { value: ORDER_PERSPECTIVE.BUYER, label: "Đơn mua" },
  { value: ORDER_PERSPECTIVE.SELLER, label: "Đơn bán" },
];

const SCOPE_OPTIONS = [
  { value: ORDER_SCOPE.ALL, label: "Tất cả" },
  { value: ORDER_SCOPE.OPEN, label: "Đang diễn ra" },
  { value: ORDER_SCOPE.HISTORY, label: "Lịch sử" },
];

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatCreatedAt = (value) => {
  const date = new Date(value);

  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date)
    : "—";
};

const StatusBadge = ({ meta }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.className}`}
  >
    {meta.label}
  </span>
);

export default function BusinessOrdersOverview({
  items,
  loading,
  error,
  onRefresh,
}) {
  const [perspective, setPerspective] = useState(ORDER_PERSPECTIVE.BUYER);
  const [scope, setScope] = useState(ORDER_SCOPE.ALL);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  const showPerspective = hasSellerOrders(items);
  const activePerspective = showPerspective
    ? perspective
    : ORDER_PERSPECTIVE.BUYER;
  const rows = useMemo(
    () => getOrdersForPerspective(items, activePerspective),
    [activePerspective, items],
  );
  const filteredRows = useMemo(
    () => filterOrders(rows, { scope, status, keyword }),
    [keyword, rows, scope, status],
  );
  const priorityRows = useMemo(() => getPriorityOrders(rows), [rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const hasFilter = scope !== ORDER_SCOPE.ALL || status !== "" || keyword;
  const roleNoun = activePerspective === ORDER_PERSPECTIVE.SELLER ? "bán" : "mua";

  const resetFilters = () => {
    setScope(ORDER_SCOPE.ALL);
    setStatus("");
    setKeyword("");
    setPageNumber(1);
  };

  const showStatus = (nextStatus) => {
    setScope(ORDER_SCOPE.ALL);
    setStatus(nextStatus);
    setPageNumber(1);
    document
      .getElementById(LIST_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-7xl space-y-5 px-4 pb-14 pt-7 sm:px-6">
      <WorkspaceHeader
        title="Đơn hàng của tôi"
        description="Theo dõi đơn thu mua đang xử lý và lịch sử giao dịch của doanh nghiệp."
      >
        {showPerspective && (
          <SegmentedControl
            label="Loại đơn"
            options={PERSPECTIVE_OPTIONS}
            value={activePerspective}
            onChange={(value) => {
              setPerspective(value);
              resetFilters();
            }}
          />
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-white px-3 py-1.5 text-xs font-black text-primary transition hover:bg-primary/10 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            refresh
          </span>
          Làm mới
        </button>
      </WorkspaceHeader>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error"
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-border bg-white p-12 text-center font-semibold text-textLight">
          Đang tải đơn hàng...
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile
              label={`Tổng đơn ${roleNoun}`}
              value={rows.length}
              caption="Bao gồm mọi trạng thái"
              highlighted
              active={status === "" && scope === ORDER_SCOPE.ALL}
              onClick={() => showStatus("")}
            />
            <MetricTile
              label="Chờ xử lý"
              value={countOrdersByStatus(rows, ORDER_STATUS.PENDING)}
              caption="Mở đơn để xem bước tiếp theo"
              tone="text-warning"
              active={status === ORDER_STATUS.PENDING}
              onClick={() => showStatus(ORDER_STATUS.PENDING)}
            />
            <MetricTile
              label="Đang xử lý"
              value={countOrdersByStatus(rows, ORDER_STATUS.PROCESSING)}
              caption="Theo dõi tiến trình giao dịch"
              tone="text-primary"
              active={status === ORDER_STATUS.PROCESSING}
              onClick={() => showStatus(ORDER_STATUS.PROCESSING)}
            />
            <MetricTile
              label="Đang tranh chấp"
              value={countOrdersByStatus(rows, ORDER_STATUS.DISPUTING)}
              caption="Cần theo dõi hồ sơ liên quan"
              tone="text-error"
              active={status === ORDER_STATUS.DISPUTING}
              onClick={() => showStatus(ORDER_STATUS.DISPUTING)}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <WorkspacePanel
              title="Đơn hàng đang ở bước nào?"
              description="Chọn trạng thái để xem các đơn tương ứng"
            >
              <StatusRing
                rows={getOrderRingRows(rows)}
                unit="đơn hàng"
                activeKey={status}
                onSelect={showStatus}
              />
            </WorkspacePanel>

            <WorkspacePanel
              title="Ưu tiên theo dõi"
              description="Đơn chờ xử lý, đang xử lý hoặc đang tranh chấp"
              aside={
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                  {priorityRows.length} đơn
                </span>
              }
            >
              {priorityRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-textLight">
                  Không có đơn cần theo dõi.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {priorityRows.slice(0, PRIORITY_LIMIT).map((order) => (
                    <div
                      key={order.orderId}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-text">
                          {order.productName || "Sản phẩm trong đơn hàng"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-textLight">
                          {order.orderCode || "Mã đơn chưa cập nhật"} ·{" "}
                          {getOrderStatusMeta(order.orderStatus).label}
                        </p>
                      </div>
                      <Link
                        to={`/don-hang/${order.orderId}`}
                        className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-black text-primary transition hover:border-primary hover:bg-primary/10"
                      >
                        {isOrderStatus(order.orderStatus, "Disputing")
                          ? "Xem đơn tranh chấp"
                          : "Xem đơn"}
                      </Link>
                    </div>
                  ))}
                  {priorityRows.length > PRIORITY_LIMIT && (
                    <button
                      type="button"
                      onClick={() => {
                        setScope(ORDER_SCOPE.OPEN);
                        setStatus("");
                        setPageNumber(1);
                        document
                          .getElementById(LIST_ID)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="w-full pt-3 text-left text-xs font-black text-primary hover:underline"
                    >
                      Xem thêm {priorityRows.length - PRIORITY_LIMIT} đơn đang diễn ra
                    </button>
                  )}
                </div>
              )}
            </WorkspacePanel>
          </div>

          <WorkspacePanel
            id={LIST_ID}
            title="Đơn đang diễn ra & lịch sử"
            description="Sắp xếp theo ngày tạo đơn · Gần nhất trước"
          >
            <SegmentedControl
              label="Phạm vi đơn hàng"
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={(value) => {
                setScope(value);
                setPageNumber(1);
              }}
            />

            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(240px,1fr)_220px_auto]">
              <label className="relative min-w-0">
                <span className="sr-only">Tìm đơn hàng</span>
                <span
                  className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-textLight"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPageNumber(1);
                  }}
                  placeholder="Mã đơn hoặc tên sản phẩm"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-text outline-none focus:border-primary focus:bg-white"
                />
              </label>

              <select
                aria-label="Trạng thái đơn hàng"
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value === "" ? "" : Number(event.target.value),
                  );
                  setPageNumber(1);
                }}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold text-textLight outline-none focus:border-primary"
              >
                <option value="">Tất cả trạng thái</option>
                {ORDER_RING_STATUSES.map(({ status: value }) => (
                  <option key={value} value={value}>
                    {getOrderStatusMeta(value).label}
                  </option>
                ))}
              </select>

              {hasFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-lg px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <div className="hidden grid-cols-[130px_minmax(220px,1.4fr)_130px_minmax(150px,1fr)_minmax(150px,0.9fr)_96px] items-center gap-3 bg-background px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-textLight lg:grid">
                <span>Ngày tạo</span>
                <span>Đơn hàng</span>
                <span className="text-right">Giá trị đơn</span>
                <span className="text-right">Đã thanh toán</span>
                <span>Trạng thái</span>
                <span className="sr-only">Thao tác</span>
              </div>

              {pageRows.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-textLight">
                  Không có đơn phù hợp.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {pageRows.map((order) => (
                    <article
                      key={`${order.orderId}-${order.viewPerspective}`}
                      className="grid gap-3 px-4 py-3.5 transition hover:bg-background lg:grid-cols-[130px_minmax(220px,1.4fr)_130px_minmax(150px,1fr)_minmax(150px,0.9fr)_96px] lg:items-center"
                    >
                      <p className="text-xs font-semibold text-textLight">
                        {formatCreatedAt(order.createdAt)}
                      </p>

                      <div className="flex min-w-0 items-center gap-3">
                        <PostThumbnail
                          src={order.thumbnailUrl}
                          alt={order.productName || "Sản phẩm"}
                          className="h-12 w-12 shrink-0 rounded-lg"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-text">
                            {order.productName || "Sản phẩm trong đơn hàng"}
                          </h3>
                          <p className="mt-0.5 truncate text-xs text-textLight">
                            {order.orderCode || "Mã đơn chưa cập nhật"} ·{" "}
                            {order.quantity || 0} sản phẩm
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-black tabular-nums text-text lg:text-right">
                        {formatCurrency(order.finalTotalAmount)}
                      </p>

                      <div className="tabular-nums lg:text-right">
                        <p className="text-xs font-bold text-success">
                          {formatCurrency(order.amountPaid)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-textLight">
                          Còn lại {formatCurrency(order.amountRemaining)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge meta={getOrderStatusMeta(order.orderStatus)} />
                        <StatusBadge meta={getPaymentDisplayMeta(order)} />
                      </div>

                      <div className="lg:text-right">
                        <Link
                          to={`/don-hang/${order.orderId}`}
                          className="inline-flex rounded-lg border border-primary bg-white px-3 py-1.5 text-xs font-black text-primary transition hover:bg-primary hover:text-white"
                        >
                          Chi tiết
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-textLight">
                {filteredRows.length} đơn phù hợp · Trang {currentPage} / {totalPages}
              </span>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPageNumber(currentPage - 1)}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPageNumber(currentPage + 1)}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </WorkspacePanel>
        </>
      )}
    </section>
  );
}

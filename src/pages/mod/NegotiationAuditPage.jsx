import { Alert, Button, Drawer, Empty, Input, Pagination, Spin, Table } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { getDisputeStatusMeta } from "../../constants/disputes";
import {
  getNegotiationStatusMeta,
  getProposalStatusMeta,
} from "../../constants/negotiations";
import ListMonthDropdown from "../../components/shared/ListMonthDropdown";
import ListSortDropdown from "../../components/shared/ListSortDropdown";
import moderatorNegotiationApi from "../../services/apis/moderatorNegotiationApi";
import {
  filterItemsByMonth,
  sortItemsByDate,
} from "../../utils/sortListItems";

const LIST_PAGE_SIZE = 10;
const MESSAGE_PAGE_SIZE = 50;
const NOT_FOUND_MESSAGE = "Không tìm thấy dữ liệu thương lượng liên quan đến tranh chấp.";

const isCanceled = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
};

const StatusBadge = ({ meta }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>
    {meta.label}
  </span>
);

const DetailField = ({ label, value }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-wide text-textLight">{label}</p>
    <div className="mt-1 text-sm font-bold text-text">{value || "—"}</div>
  </div>
);

const MESSAGE_TYPES = Object.freeze({
  0: "Text",
  1: "Media",
  2: "Offer",
  3: "CounterOffer",
  4: "System",
  5: "Agreement",
});

const normalizeMessageType = (value) =>
  typeof value === "number" ? MESSAGE_TYPES[value] || "Unknown" : String(value || "Unknown");

const getOfferTypeLabel = (type) =>
  type === "CounterOffer" ? "Đề nghị điều chỉnh" : "Đề nghị";

const getModeratorProposalStatusMeta = (status) => {
  if (status === 4 || String(status || "").toLowerCase() === "cancelled") {
    return {
      label: "Đã hủy",
      className: "border-border bg-textLight/10 text-textLight",
    };
  }
  return getProposalStatusMeta(status);
};

const isSafeMediaUrl = (value) => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

function MessageCard({ message }) {
  const type = normalizeMessageType(message.messageType);
  const sender = message.senderUsername || "Hệ thống";

  if (type === "Offer" || type === "CounterOffer") {
    return (
      <article className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-black text-text">{getOfferTypeLabel(type)}</p><p className="text-xs text-textLight">Người gửi: {sender}</p></div>
          <StatusBadge meta={getModeratorProposalStatusMeta(message.offerStatus)} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <DetailField label="Giá" value={formatCurrency(message.offerPrice)} />
          <DetailField label="Số lượng" value={message.offerQuantity ?? "—"} />
        </div>
        {message.basePriceSnapshot !== null && message.basePriceSnapshot !== undefined && (
          <p className="mt-3 text-xs text-textLight">Giá niêm yết tại thời điểm gửi: {formatCurrency(message.basePriceSnapshot)}</p>
        )}
        {message.messageContent && <p className="mt-3 whitespace-pre-wrap text-sm text-text">{message.messageContent}</p>}
        <p className="mt-3 text-xs text-textLight">{formatDateTime(message.createdAt)}</p>
      </article>
    );
  }

  const systemEvent = type === "System" || type === "Agreement";
  return (
    <article className={`rounded-2xl border p-4 ${systemEvent ? "border-warning/20 bg-warning/5" : "border-border bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black text-text">{systemEvent ? "Sự kiện hệ thống" : sender}</p>
        <p className="text-xs text-textLight">{formatDateTime(message.createdAt)}</p>
      </div>
      {message.messageContent && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text">{message.messageContent}</p>}
      {message.mediaUrl && isSafeMediaUrl(message.mediaUrl) && (
        <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-primary hover:underline">Mở tệp đính kèm</a>
      )}
      {!message.messageContent && !message.mediaUrl && (
        <p className="mt-2 text-sm text-textLight">Sự kiện thương lượng được ghi nhận.</p>
      )}
    </article>
  );
}

function NegotiationDetailDrawer({ negotiationId, onClose }) {
  const [messagePage, setMessagePage] = useState(1);
  const [state, setState] = useState({
    loading: false,
    detail: null,
    messages: [],
    totalMessages: 0,
    error: "",
  });

  useEffect(() => {
    if (!negotiationId) return undefined;
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    Promise.all([
      moderatorNegotiationApi.getById(negotiationId, { signal: controller.signal }),
      moderatorNegotiationApi.getMessages(negotiationId, {
        pageNumber: messagePage,
        pageSize: MESSAGE_PAGE_SIZE,
        signal: controller.signal,
      }),
    ])
      .then(([detail, messageResult]) =>
        setState({
          loading: false,
          detail,
          messages: messageResult.items,
          totalMessages: messageResult.totalCount,
          error: "",
        }),
      )
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({
          loading: false,
          detail: null,
          messages: [],
          totalMessages: 0,
          error: Number(error?.response?.status) === 404
            ? NOT_FOUND_MESSAGE
            : "Không thể tải chi tiết lịch sử thương lượng.",
        });
      });
    return () => controller.abort();
  }, [messagePage, negotiationId]);

  const detail = state.detail;

  return (
    <Drawer title="Chi tiết thương lượng liên quan tranh chấp" open={Boolean(negotiationId)} onClose={onClose} width={820} destroyOnClose>
      {state.loading && <div className="flex min-h-48 items-center justify-center"><Spin /></div>}
      {!state.loading && state.error && <Alert type="error" showIcon message={state.error} />}
      {!state.loading && detail && (
        <div className="space-y-5">
          <section className="grid gap-3 rounded-2xl border border-border bg-background/50 p-4 sm:grid-cols-2">
            <DetailField label="Đơn hàng" value={detail.orderCode} />
            <DetailField label="Sản phẩm" value={detail.productName} />
            <DetailField label="Trạng thái tranh chấp" value={<StatusBadge meta={getDisputeStatusMeta(detail.disputeStatus)} />} />
            <DetailField label="Phát sinh tranh chấp" value={formatDateTime(detail.disputeCreatedAt)} />
            <DetailField label="Giải quyết tranh chấp" value={formatDateTime(detail.disputeResolvedAt)} />
            <DetailField label="Trạng thái thương lượng" value={<StatusBadge meta={getNegotiationStatusMeta(detail.negotiationStatus)} />} />
          </section>

          <section className="grid gap-3 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2">
            <DetailField label="Người mua" value={detail.buyerUsername} />
            <DetailField label="Người bán" value={detail.sellerUsername} />
            <DetailField label="Giá chốt" value={formatCurrency(detail.finalPrice)} />
            <DetailField label="Số lượng chốt" value={detail.finalQuantity ?? "—"} />
            <DetailField label="Tạo thương lượng" value={formatDateTime(detail.createdAt)} />
            <DetailField label="Tin nhắn cuối" value={formatDateTime(detail.lastMessageAt)} />
          </section>

          <section>
            <h3 className="text-lg font-black text-text">Lịch sử thương lượng</h3>
            <div className="mt-3 space-y-3">
              {state.messages.length > 0
                ? state.messages.map((message) => <MessageCard key={message.messageId} message={message} />)
                : <Empty description="Chưa có nội dung thương lượng." />}
            </div>
            {state.totalMessages > MESSAGE_PAGE_SIZE && (
              <div className="mt-4 flex justify-end">
                <Pagination current={messagePage} pageSize={MESSAGE_PAGE_SIZE} total={state.totalMessages} showSizeChanger={false} onChange={setMessagePage} />
              </div>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default function NegotiationAuditPage() {
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [sortOption, setSortOption] = useState("newest");
  const [monthFilter, setMonthFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [state, setState] = useState({ loading: true, items: [], totalCount: 0, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      setState((current) => ({ ...current, loading: true, error: "" })),
    );
    moderatorNegotiationApi
      .getAll({ keyword, pageNumber, pageSize: LIST_PAGE_SIZE, signal: controller.signal })
      .then((result) => setState({ loading: false, items: result.items, totalCount: result.totalCount, error: "" }))
      .catch((error) => {
        if (isCanceled(error)) return;
        setState({ loading: false, items: [], totalCount: 0, error: "Không thể tải danh sách thương lượng liên quan tranh chấp." });
      });
    return () => controller.abort();
  }, [keyword, pageNumber]);

  const sortedItems = useMemo(
    () =>
      sortItemsByDate(
        filterItemsByMonth(
          state.items,
          monthFilter,
          (item) =>
            item?.disputeCreatedAt ??
            item?.lastMessageAt ??
            item?.createdAt,
        ),
        sortOption,
        (item) =>
          item?.disputeCreatedAt ??
          item?.lastMessageAt ??
          item?.createdAt,
      ),
    [monthFilter, state.items, sortOption],
  );

  const columns = useMemo(() => [
    {
      title: "Đơn hàng",
      render: (_, item) => <button type="button" onClick={() => setSelectedId(item.negotiationId)} className="font-black text-primary hover:underline">{item.orderCode}</button>,
    },
    { title: "Sản phẩm", dataIndex: "productName", render: (value) => value || "—" },
    { title: "Người mua", dataIndex: "buyerUsername" },
    { title: "Người bán", dataIndex: "sellerUsername" },
    { title: "Trạng thái tranh chấp", dataIndex: "disputeStatus", render: (value) => <StatusBadge meta={getDisputeStatusMeta(value)} /> },
    { title: "Trạng thái thương lượng", dataIndex: "negotiationStatus", render: (value) => <StatusBadge meta={getNegotiationStatusMeta(value)} /> },
    {
      title: "Giá / Số lượng chốt",
      render: (_, item) => <div><p className="font-bold text-text">{formatCurrency(item.finalPrice)}</p><p className="text-xs text-textLight">Số lượng: {item.finalQuantity ?? "—"}</p></div>,
    },
    { title: "Tin nhắn cuối", dataIndex: "lastMessageAt", render: formatDateTime },
  ], []);

  const applySearch = () => {
    setPageNumber(1);
    setKeyword(keywordInput.trim());
  };

  return (
    <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Trung tâm kiểm duyệt</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Lịch sử thương lượng</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">Tra cứu nội dung thương lượng của các đơn hàng đã phát sinh tranh chấp. Màn hình chỉ dùng để điều tra và không cho phép thay đổi dữ liệu.</p>
      </header>

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} onPressEnter={applySearch} allowClear prefix={<SearchOutlined />} placeholder="Mã đơn hàng, sản phẩm, người mua hoặc người bán..." />
          <ListSortDropdown
            value={sortOption}
            onChange={setSortOption}
            scopeLabel="thương lượng trong trang hiện tại"
          />
          <ListMonthDropdown
            items={state.items}
            value={monthFilter}
            onChange={setMonthFilter}
            getValue={(item) =>
              item?.disputeCreatedAt ??
              item?.lastMessageAt ??
              item?.createdAt
            }
            scopeLabel="thương lượng trong trang hiện tại"
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={applySearch}>Tìm kiếm</Button>
        </div>
        {state.error && <Alert type="error" showIcon message={state.error} className="mb-4" />}
        <Table
          rowKey={(item) => item.negotiationId}
          columns={columns}
          dataSource={sortedItems}
          loading={state.loading}
          locale={{ emptyText: <Empty description="Không có thương lượng liên quan tranh chấp phù hợp." /> }}
          pagination={{ current: pageNumber, pageSize: LIST_PAGE_SIZE, total: state.totalCount, showSizeChanger: false, onChange: setPageNumber }}
          onRow={(item) => ({
            onClick: () => setSelectedId(item.negotiationId),
            style: { cursor: "pointer" },
          })}
          scroll={{ x: 1200 }}
        />
      </div>

      <NegotiationDetailDrawer key={selectedId || "closed"} negotiationId={selectedId} onClose={() => setSelectedId("")} />
    </section>
  );
}

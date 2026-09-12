import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  Modal,
  Select,
  Table,
  Tag,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import {
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from "../../constants/orders";
import { getDeliveryMethodLabel } from "../../constants/agreements";
import { getAppointmentStatusMeta } from "../../constants/appointments";
import moderatorOrderApi from "../../services/apis/moderatorOrderApi";

const { RangePicker } = DatePicker;

const PAGE_SIZE = 10;

const ORDER_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái đơn" },
  { value: "Pending", label: "Chờ xử lý" },
  { value: "Processing", label: "Đang xử lý" },
  { value: "Completed", label: "Hoàn tất" },
  { value: "Cancelled", label: "Đã hủy" },
  { value: "Disputing", label: "Đang tranh chấp" },
  { value: "Returned", label: "Đã trả hàng" },
];

const PAYMENT_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái thanh toán" },
  { value: "Pending", label: "Chờ thanh toán" },
  { value: "Completed", label: "Đã thanh toán" },
  { value: "Failed", label: "Thanh toán thất bại" },
  { value: "Refunded", label: "Đã hoàn tiền" },
  { value: "PartiallyRefunded", label: "Đã hoàn tiền một phần" },
  { value: "Expired", label: "Đã hết hạn thanh toán" },
  { value: "Cancelled", label: "Đã hủy thanh toán" },
];

const TRI_STATE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "true", label: "Có" },
  { value: "false", label: "Không" },
];

/*
 * Tiền nullable từ Backend (decimal?) - null/undefined/"" phải hiển thị "—",
 * không được ép thành 0 đ. Chỉ số hợp lệ (kể cả 0) mới được định dạng.
 */
const formatCurrency = (value) => {
  if (typeof value !== "number" && typeof value !== "string") {
    return "—";
  }

  const raw = typeof value === "string" ? value.trim() : value;

  if (raw === "") {
    return "—";
  }

  const amount = Number(raw);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "—";
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const PAYMENT_METHOD_LABELS = {
  PayOS: "PayOS",
  Internal_Wallet: "Ví nội bộ HomeCycle",
  Unknown: "Chưa xác định",
};

const getPaymentMethodLabel = (value) => {
  const key = String(value ?? "").trim();

  return PAYMENT_METHOD_LABELS[key] || "Chưa xác định";
};

const SHIPMENT_STATUS_META = {
  ReadyToPick: { label: "Chờ lấy hàng", color: "gold" },
  Delivering: { label: "Đang giao hàng", color: "processing" },
  Delivered: { label: "Đã giao hàng", color: "success" },
  Cancelled: { label: "Đã hủy", color: "error" },
  Returning: { label: "Đang chuyển hoàn", color: "warning" },
  Returned: { label: "Đã hoàn trả", color: "default" },
  Damage_Lost: { label: "Hư hỏng/thất lạc", color: "error" },
  Exception: { label: "Ngoại lệ vận hành", color: "warning" },
};

const getShipmentStatusMeta = (value) => {
  const key = String(value ?? "").trim();

  return (
    SHIPMENT_STATUS_META[key] || {
      label: "Không xác định",
      color: "default",
    }
  );
};

const ORDER_COMPLETION_SOURCE_LABELS = {
  BuyerConfirmed: "Người mua tự xác nhận",
  AutoConfirmed: "Hệ thống tự động xác nhận",
  ModeratorResolved: "Kiểm duyệt viên xử lý",
};

const getCompletionSourceLabel = (value) => {
  const key = String(value ?? "").trim();

  return ORDER_COMPLETION_SOURCE_LABELS[key] || "";
};

const TIMELINE_STEP_STATUS_META = {
  Upcoming: { label: "Sắp diễn ra", color: "default" },
  InProgress: { label: "Đang diễn ra", color: "processing" },
  Completed: { label: "Đã hoàn tất", color: "success" },
  Failed: { label: "Thất bại", color: "error" },
  Cancelled: { label: "Đã hủy", color: "error" },
};

const getTimelineStepStatusMeta = (value) => {
  const key = String(value ?? "").trim();

  return (
    TIMELINE_STEP_STATUS_META[key] || {
      label: "Không xác định",
      color: "default",
    }
  );
};

/*
 * Backend OrderTimelineStepDto có subSteps[] (vd bước GHN: lấy hàng, giao hàng,
 * chuyển hoàn). Render đệ quy để giữ quan hệ cha/con thay vì làm phẳng.
 */
const OrderTimelineStep = ({ step, stepKey, depth = 0 }) => {
  const statusMeta = getTimelineStepStatusMeta(step?.status);
  const subSteps = Array.isArray(step?.subSteps) ? step.subSteps : [];
  const isSubStep = depth > 0;

  return (
    <div
      className={
        isSubStep
          ? "rounded-lg border border-dashed border-border bg-background/60 p-2.5"
          : "rounded-xl border border-border bg-white p-3"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={
            isSubStep
              ? "text-xs font-bold text-text"
              : "text-sm font-bold text-text"
          }
        >
          {step?.title || "—"}
        </p>
        <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
      </div>
      {step?.description && (
        <p className="mt-1 text-xs text-textLight">{step.description}</p>
      )}
      {step?.occurredAt && (
        <p className="mt-1 text-[11px] text-textLight">
          {formatDateTime(step.occurredAt)}
        </p>
      )}
      {subSteps.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-primary/20 pl-3">
          {subSteps.map((subStep, index) => (
            <OrderTimelineStep
              key={`${stepKey}-${subStep?.code || index}`}
              step={subStep}
              stepKey={`${stepKey}-${subStep?.code || index}`}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DISPUTE_STATUS_LABELS = {
  Pending: "Đang chờ xử lý",
  Resolved: "Đã giải quyết",
  Rejected: "Đã từ chối",
  Closed: "Đã đóng",
  UnderReview: "Đang xử lý",
  AwaitingReturn: "Chờ hoàn trả hàng",
};

const getDisputeStatusLabel = (value) => {
  const key = String(value ?? "").trim();

  return DISPUTE_STATUS_LABELS[key] || "Không xác định";
};

const WALLET_TRANSACTION_STATUS_META = {
  Pending: { label: "Đang chờ", color: "gold" },
  Completed: { label: "Hoàn tất", color: "success" },
  Failed: { label: "Thất bại", color: "error" },
  Cancelled: { label: "Đã hủy", color: "default" },
};

const getWalletTransactionStatusMeta = (status) => {
  const key = String(status ?? "").trim();

  return (
    WALLET_TRANSACTION_STATUS_META[key] || {
      label: "Không xác định",
      color: "default",
    }
  );
};

const ORDER_TRANSACTION_TYPE_LABELS = {
  Escrow_Deposit: "Tiền đặt cọc vào ví tạm giữ",
  Wallet_Payment: "Thanh toán từ ví",
  Payout_Release: "Giải ngân cho người bán",
  Order_Refund: "Hoàn tiền đơn hàng",
  Commission_Fee: "Phí hoa hồng sàn",
  Shipping_Fee_Collected: "Thu phí vận chuyển",
};

const getOrderTransactionTypeLabel = (value) => {
  const key = String(value ?? "").trim();

  return ORDER_TRANSACTION_TYPE_LABELS[key] || "Diễn biến tài chính";
};

const TransactionOrderManagementPage = () => {
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [hasActiveDispute, setHasActiveDispute] = useState("");
  const [hasInspection, setHasInspection] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [state, setState] = useState({
    items: [],
    totalCount: 0,
    loading: true,
    error: "",
  });

  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [detailState, setDetailState] = useState({
    orderId: "",
    loading: false,
    data: null,
    error: "",
  });

  const [financialState, setFinancialState] = useState({
    orderId: "",
    loading: false,
    items: [],
    error: "",
  });

  const listRequestRef = useRef(0);
  const listControllerRef = useRef(null);
  const detailRequestRef = useRef(0);
  const detailControllerRef = useRef(null);
  const financialControllerRef = useRef(null);

  const toTriStateBool = (value) =>
    value === "true" ? true : value === "false" ? false : undefined;

  const listParams = useMemo(() => {
    const createdFrom = dateRange?.[0]?.startOf("day").toISOString();
    const createdTo = dateRange?.[1]?.endOf("day").toISOString();

    return {
      pageNumber,
      pageSize,
      keyword,
      status,
      paymentStatus,
      hasActiveDispute: toTriStateBool(hasActiveDispute),
      hasInspection: toTriStateBool(hasInspection),
      createdFrom,
      createdTo,
    };
  }, [
    pageNumber,
    pageSize,
    keyword,
    status,
    paymentStatus,
    hasActiveDispute,
    hasInspection,
    dateRange,
  ]);

  /*
   * Loader danh sách duy nhất cho cả auto-load (filter/page) lẫn "Làm mới":
   * huỷ request trước, cấp request id mới, và chỉ request id hiện hành
   * mới được ghi state - response cũ về muộn không đè lên kết quả mới.
   */
  const loadOrders = useCallback(async () => {
    listControllerRef.current?.abort();

    const controller = new AbortController();
    listControllerRef.current = controller;

    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;

    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await moderatorOrderApi.getOrders({
        ...listParams,
        signal: controller.signal,
      });

      if (listRequestRef.current !== requestId) {
        return;
      }

      setState({
        items: result.items,
        totalCount: result.totalCount,
        loading: false,
        error: "",
      });
    } catch (error) {
      if (listRequestRef.current !== requestId) {
        return;
      }

      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return;
      }

      setState({
        items: [],
        totalCount: 0,
        loading: false,
        error: "Không thể tải danh sách đơn hàng. Vui lòng thử lại.",
      });
    }
  }, [listParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      listRequestRef.current += 1;
      listControllerRef.current?.abort();
    };
  }, [loadOrders]);

  const applyKeyword = () => {
    setPageNumber(1);
    setKeyword(keywordInput.trim());
  };

  const changeStatus = (next) => {
    setPageNumber(1);
    setStatus(next || "");
  };

  const changePaymentStatus = (next) => {
    setPageNumber(1);
    setPaymentStatus(next || "");
  };

  const changeHasActiveDispute = (next) => {
    setPageNumber(1);
    setHasActiveDispute(next || "");
  };

  const changeHasInspection = (next) => {
    setPageNumber(1);
    setHasInspection(next || "");
  };

  const changeDateRange = (nextRange) => {
    setPageNumber(1);
    setDateRange(nextRange);
  };

  const loadFinancialHistory = (orderId) => {
    financialControllerRef.current?.abort();

    const controller = new AbortController();
    financialControllerRef.current = controller;

    setFinancialState({
      orderId,
      loading: true,
      items: [],
      error: "",
    });

    moderatorOrderApi
      .getOrderFinancialHistory(orderId, { signal: controller.signal })
      .then((items) => {
        setFinancialState({ orderId, loading: false, items, error: "" });
      })
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }

        setFinancialState({
          orderId,
          loading: false,
          items: [],
          error:
            "Không thể tải lịch sử tài chính của đơn hàng. Vui lòng thử lại.",
        });
      });
  };

  const loadOrderDetail = (orderId) => {
    detailControllerRef.current?.abort();

    const controller = new AbortController();
    detailControllerRef.current = controller;

    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;

    setDetailState({ orderId, loading: true, data: null, error: "" });

    moderatorOrderApi
      .getOrderById(orderId, { signal: controller.signal })
      .then((data) => {
        if (detailRequestRef.current !== requestId) {
          return;
        }

        setDetailState({ orderId, loading: false, data, error: "" });
        loadFinancialHistory(orderId);
      })
      .catch((error) => {
        if (detailRequestRef.current !== requestId) {
          return;
        }

        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }

        const httpStatus = error?.response?.status;
        const code =
          error?.response?.data?.code ??
          error?.response?.data?.error?.code ??
          "";

        const isNotFound = httpStatus === 404 || code === "Order.NotFound";

        setDetailState({
          orderId,
          loading: false,
          data: null,
          error: isNotFound
            ? "Không tìm thấy đơn hàng."
            : "Không thể tải chi tiết đơn hàng. Vui lòng thử lại.",
        });
      });
  };

  const openOrderDetail = (orderId) => {
    const id = String(orderId || "").trim();

    if (!id) {
      return;
    }

    if (selectedOrderId === id && detailState.loading) {
      return;
    }

    setSelectedOrderId(id);
    loadOrderDetail(id);
  };

  const closeOrderDetail = () => {
    detailControllerRef.current?.abort();
    financialControllerRef.current?.abort();

    setSelectedOrderId("");

    setDetailState({ orderId: "", loading: false, data: null, error: "" });
    setFinancialState({ orderId: "", loading: false, items: [], error: "" });
  };

  const columns = [
    {
      title: "Đơn hàng",
      dataIndex: "orderCode",
      key: "orderCode",
      render: (orderCode, record) => (
        <div>
          <p className="font-bold text-text">{orderCode || "—"}</p>
          <p className="text-xs text-textLight">
            {record?.productName || "Sản phẩm HomeCycle"}
          </p>
        </div>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Giá trị",
      key: "amount",
      render: (_, record) => (
        <div>
          <p className="font-black text-text">
            {formatCurrency(record?.finalTotalAmount)}
          </p>
          <p className="text-xs text-textLight">
            Đã trả {formatCurrency(record?.amountPaid)} · Còn lại{" "}
            {formatCurrency(record?.amountRemaining)}
          </p>
        </div>
      ),
    },
    {
      title: "Trạng thái đơn",
      dataIndex: "orderStatus",
      key: "orderStatus",
      render: (value) => <Tag>{getOrderStatusMeta(value).label}</Tag>,
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (value) => {
        const meta = getPaymentStatusMeta(value);
        return <Tag>{meta.label}</Tag>;
      },
    },
    {
      title: "Người mua",
      dataIndex: "buyer",
      key: "buyer",
      render: (buyer) => buyer?.username || "—",
    },
    {
      title: "Người bán",
      dataIndex: "seller",
      key: "seller",
      render: (seller) => seller?.username || "—",
    },
    {
      title: "Ghi chú",
      key: "flags",
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record?.hasActiveDispute && <Tag color="error">Tranh chấp</Tag>}
          {record?.hasInspection && <Tag color="blue">Kiểm định</Tag>}
        </div>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => formatDateTime(value),
    },
    {
      title: "",
      key: "detailAction",
      render: (_, record) => (
        <Button size="small" onClick={() => openOrderDetail(record.orderId)}>
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const detail = detailState.data;

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_50px_rgba(23,40,48,0.14)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">
          Trung tâm kiểm duyệt
        </p>

        <h1 className="mt-2 text-3xl font-black">Giao dịch &amp; đơn hàng</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
          Theo dõi toàn bộ đơn hàng trên hệ thống theo trạng thái, thanh toán,
          tranh chấp và kiểm định.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Tìm kiếm
          </label>
          <Input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onPressEnter={applyKeyword}
            placeholder="Mã đơn, sản phẩm, người mua, người bán..."
            prefix={<SearchOutlined />}
            allowClear
          />
        </div>

        <div className="min-w-[170px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Trạng thái đơn
          </label>
          <Select
            value={status || ""}
            onChange={changeStatus}
            options={ORDER_STATUS_FILTER_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[190px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Trạng thái thanh toán
          </label>
          <Select
            value={paymentStatus || ""}
            onChange={changePaymentStatus}
            options={PAYMENT_STATUS_FILTER_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[130px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Đang tranh chấp
          </label>
          <Select
            value={hasActiveDispute || ""}
            onChange={changeHasActiveDispute}
            options={TRI_STATE_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[130px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Có kiểm định
          </label>
          <Select
            value={hasInspection || ""}
            onChange={changeHasInspection}
            options={TRI_STATE_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[260px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Ngày tạo
          </label>
          <RangePicker
            value={dateRange}
            onChange={changeDateRange}
            className="w-full"
            allowClear
          />
        </div>

        <Button type="primary" icon={<SearchOutlined />} onClick={applyKeyword}>
          Tìm kiếm
        </Button>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => void loadOrders()}
          disabled={state.loading}
        >
          Làm mới
        </Button>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-5">
        {state.error && (
          <Alert
            type="error"
            showIcon
            message={state.error}
            className="mb-4"
          />
        )}

        <Table
          rowKey={(record) => record.orderId}
          columns={columns}
          dataSource={state.items}
          loading={state.loading}
          locale={{
            emptyText: <Empty description="Chưa có đơn hàng phù hợp." />,
          }}
          pagination={{
            current: pageNumber,
            pageSize,
            total: state.totalCount,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPageNumber(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          scroll={{ x: true }}
        />
      </div>

      <Modal
        title="Chi tiết đơn hàng"
        open={Boolean(selectedOrderId)}
        onCancel={closeOrderDetail}
        footer={<Button onClick={closeOrderDetail}>Đóng</Button>}
        destroyOnClose
        width={720}
      >
        {detailState.loading && (
          <div
            role="status"
            className="rounded-xl border border-border bg-background p-5 text-center text-sm font-semibold text-textLight"
          >
            Đang tải chi tiết đơn hàng...
          </div>
        )}

        {!detailState.loading && detailState.error && (
          <Alert type="error" showIcon message={detailState.error} />
        )}

        {!detailState.loading && !detailState.error && detail && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-textLight">
                    {detail.orderCode || "Đơn hàng"}
                  </p>
                  <p className="mt-1 font-bold text-text">
                    {detail.productName || "Sản phẩm HomeCycle"}
                  </p>
                  <p className="mt-1 text-xs text-textLight">
                    Số lượng: {detail.quantity ?? "—"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Tag>{getOrderStatusMeta(detail.orderStatus).label}</Tag>
                  <Tag>{getPaymentStatusMeta(detail.paymentStatus).label}</Tag>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-textLight sm:grid-cols-2">
                <span>
                  Giá gốc: {formatCurrency(detail.originalTotalAmount)}
                </span>
                <span>
                  Tổng tiền: {formatCurrency(detail.finalTotalAmount)}
                </span>
                <span>Đã trả: {formatCurrency(detail.amountPaid)}</span>
                <span>Còn lại: {formatCurrency(detail.amountRemaining)}</span>
                <span>Phí vận chuyển: {formatCurrency(detail.shippingFee)}</span>
                <span>
                  Phương thức giao nhận:{" "}
                  {getDeliveryMethodLabel(detail.deliveryMethod)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-textLight">
                <span>Tạo lúc {formatDateTime(detail.createdAt)}</span>
                <span>Cập nhật {formatDateTime(detail.updatedAt)}</span>
                {detail.completedAt && (
                  <span>Hoàn tất {formatDateTime(detail.completedAt)}</span>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Người mua
                </p>
                <p className="mt-2 font-bold text-text">
                  {detail.buyer?.username || "—"}
                </p>
                {detail.buyer?.phoneNumber && (
                  <p className="text-xs text-textLight">
                    {detail.buyer.phoneNumber}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Người bán
                </p>
                <p className="mt-2 font-bold text-text">
                  {detail.seller?.username || "—"}
                </p>
                {detail.seller?.phoneNumber && (
                  <p className="text-xs text-textLight">
                    {detail.seller.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            {detail.payment && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Thanh toán
                </p>
                <div className="mt-2 grid gap-2 text-xs text-textLight sm:grid-cols-2">
                  <span>
                    Phương thức:{" "}
                    {getPaymentMethodLabel(detail.payment.paymentMethod)}
                  </span>
                  <span>
                    Trạng thái:{" "}
                    {getPaymentStatusMeta(detail.payment.paymentStatus).label}
                  </span>
                  <span>Số tiền: {formatCurrency(detail.payment.amount)}</span>
                  <span>
                    Thanh toán lúc: {formatDateTime(detail.payment.paidAt)}
                  </span>
                </div>
              </div>
            )}

            {detail.shipment && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Vận chuyển
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Tag
                    color={
                      getShipmentStatusMeta(detail.shipment.shipmentStatus)
                        .color
                    }
                  >
                    {getShipmentStatusMeta(detail.shipment.shipmentStatus).label}
                  </Tag>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-textLight sm:grid-cols-2">
                  <span>
                    Sẵn sàng giao:{" "}
                    {formatDateTime(detail.shipment.sellerReadyAt)}
                  </span>
                  <span>
                    Đã lấy hàng: {formatDateTime(detail.shipment.pickedUpAt)}
                  </span>
                  <span>
                    Đã giao hàng: {formatDateTime(detail.shipment.deliveredAt)}
                  </span>
                </div>
              </div>
            )}

            {Array.isArray(detail.appointments) &&
              detail.appointments.length > 0 && (
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-primary">
                    Lịch hẹn liên quan
                  </p>
                  <div className="mt-2 space-y-2">
                    {detail.appointments.map((appointment, index) => (
                      <div
                        key={appointment.appointmentId ?? index}
                        className="rounded-xl border border-border bg-white p-3 text-xs text-textLight"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-text">
                            {appointment.appointmentType === "Inspection"
                              ? "Kiểm định"
                              : appointment.appointmentType === "Collection"
                                ? "Thu gom"
                                : "Lịch hẹn"}
                          </span>
                          <Tag>
                            {
                              getAppointmentStatusMeta(
                                appointment.appointmentStatus,
                              ).label
                            }
                          </Tag>
                        </div>
                        <p className="mt-1">
                          Dự kiến: {formatDateTime(appointment.scheduledAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Tranh chấp
              </p>

              {detail.dispute?.latestDisputeId ? (
                <>
                  {/* Hiển thị tranh chấp gần nhất kể cả khi đã kết thúc - không ẩn lịch sử */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Tag
                      color={
                        detail.dispute.hasActiveDispute ? "error" : "default"
                      }
                    >
                      {detail.dispute.hasActiveDispute
                        ? "Đang có tranh chấp"
                        : "Tranh chấp đã kết thúc"}
                    </Tag>
                    <span className="text-sm font-bold text-text">
                      {getDisputeStatusLabel(detail.dispute.latestDisputeStatus)}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-textLight sm:grid-cols-2">
                    {detail.dispute.latestDisputeCreatedAt && (
                      <span>
                        Gửi lúc:{" "}
                        {formatDateTime(detail.dispute.latestDisputeCreatedAt)}
                      </span>
                    )}
                    {detail.dispute.latestDisputeResolvedAt && (
                      <span>
                        Xử lý xong lúc:{" "}
                        {formatDateTime(detail.dispute.latestDisputeResolvedAt)}
                      </span>
                    )}
                  </div>
                  <Link
                    to="/mod/disputes"
                    className="mt-2 inline-block text-xs font-bold text-primary underline underline-offset-2"
                  >
                    Xem trong quản lý tranh chấp
                  </Link>
                </>
              ) : (
                <p className="mt-2 text-sm text-textLight">Chưa có tranh chấp.</p>
              )}

              {detail.disputeWindowEndsAt && (
                <p className="mt-2 text-xs text-textLight">
                  Hạn gửi tranh chấp: {formatDateTime(detail.disputeWindowEndsAt)}
                </p>
              )}
            </div>

            {detail.cancellation && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Hủy đơn
                </p>
                <p className="mt-2 text-xs text-textLight">
                  Hủy lúc {formatDateTime(detail.cancellation.cancelledAt)}
                </p>
                {detail.cancellation.reason && (
                  <p className="mt-1 text-xs text-error">
                    Lý do: {detail.cancellation.reason}
                  </p>
                )}
              </div>
            )}

            {(detail.buyerReturnConfirmedAt ||
              detail.sellerReturnReceivedAt ||
              detail.returnDueAt ||
              detail.returnedAt ||
              detail.completionSource) && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Hoàn tất / Trả hàng
                </p>
                <div className="mt-2 grid gap-2 text-xs text-textLight sm:grid-cols-2">
                  {detail.completionSource && (
                    <span>
                      Nguồn hoàn tất:{" "}
                      {getCompletionSourceLabel(detail.completionSource)}
                    </span>
                  )}
                  <span>
                    Người bán bàn giao:{" "}
                    {formatDateTime(detail.sellerHandoverConfirmedAt)}
                  </span>
                  <span>
                    Người mua nhận hàng:{" "}
                    {formatDateTime(detail.buyerReceivedConfirmedAt)}
                  </span>
                  <span>
                    Người mua trả hàng:{" "}
                    {formatDateTime(detail.buyerReturnConfirmedAt)}
                  </span>
                  <span>
                    Người bán nhận lại:{" "}
                    {formatDateTime(detail.sellerReturnReceivedAt)}
                  </span>
                  <span>
                    Hạn trả hàng: {formatDateTime(detail.returnDueAt)}
                  </span>
                  <span>Đã trả hàng: {formatDateTime(detail.returnedAt)}</span>
                </div>
              </div>
            )}

            {Array.isArray(detail.timeline) && detail.timeline.length > 0 && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Tiến trình đơn hàng
                </p>
                <div className="mt-2 space-y-2">
                  {detail.timeline.map((step, index) => (
                    <OrderTimelineStep
                      key={step?.code || index}
                      step={step}
                      stepKey={String(step?.code || index)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Lịch sử tài chính
              </p>

              {financialState.loading && (
                <p className="mt-2 text-sm text-textLight">
                  Đang tải lịch sử tài chính...
                </p>
              )}

              {!financialState.loading && financialState.error && (
                <Alert
                  type="error"
                  showIcon
                  message={financialState.error}
                  className="mt-2"
                />
              )}

              {!financialState.loading &&
                !financialState.error &&
                financialState.items.length === 0 && (
                  <p className="mt-2 text-sm text-textLight">
                    Chưa có diễn biến tài chính.
                  </p>
                )}

              {!financialState.loading &&
                !financialState.error &&
                financialState.items.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {financialState.items.map((event, index) => {
                      const eventStatusMeta = getWalletTransactionStatusMeta(
                        event.status,
                      );

                      return (
                        <div
                          key={event.walletTransactionId ?? index}
                          className="rounded-xl border border-border bg-white p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-sm font-bold text-text">
                              {getOrderTransactionTypeLabel(
                                event.transactionType,
                              )}
                            </p>
                            <span className="text-sm font-black text-text">
                              {formatCurrency(event.amount)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-textLight">
                            <Tag color={eventStatusMeta.color}>
                              {eventStatusMeta.label}
                            </Tag>
                            <span>{formatDateTime(event.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default TransactionOrderManagementPage;

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
  Image,
  Input,
  Modal,
  Select,
  Table,
  Tag,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { getAppointmentStatusMeta } from "../../constants/appointments";
import { getDeliveryMethodLabel } from "../../constants/agreements";
import moderatorAppointmentApi from "../../services/apis/moderatorAppointmentApi";

const { RangePicker } = DatePicker;

const PAGE_SIZE = 10;

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả loại lịch" },
  { value: "Inspection", label: "Kiểm định" },
  { value: "Collection", label: "Thu gom" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Proposed", label: "Đang chờ" },
  { value: "Scheduled", label: "Đã xác nhận" },
  { value: "Completed", label: "Đã hoàn tất" },
  { value: "Cancelled", label: "Đã hủy" },
  { value: "Expired", label: "Đã lỡ hẹn" },
  { value: "InProgress", label: "Đang diễn ra" },
];

const TRI_STATE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "true", label: "Có" },
  { value: "false", label: "Không" },
];

const getAppointmentTypeLabel = (value) => {
  const key = String(value ?? "").trim();

  if (key === "Inspection") return "Kiểm định";
  if (key === "Collection") return "Thu gom";
  return "Lịch hẹn";
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

const INSPECTION_STATUS_LABELS = {
  Draft: "Bản nháp",
  PendingSellerConfirmation: "Chờ người bán xác nhận",
  Accepted: "Người bán đã đồng ý",
  Rejected: "Người bán từ chối",
};

const getInspectionStatusLabel = (value) => {
  const key = String(value ?? "").trim();

  return INSPECTION_STATUS_LABELS[key] || "Không xác định";
};

const INSPECTION_CONCLUSION_LABELS = {
  Passed: "Đạt yêu cầu",
  PriceAdjustment: "Cần điều chỉnh giá",
  Failed: "Không đạt yêu cầu",
};

const getInspectionConclusionLabel = (value) => {
  const key = String(value ?? "").trim();

  return INSPECTION_CONCLUSION_LABELS[key] || "";
};

const INSPECTION_OPERATING_STATUS_LABELS = {
  WorkingWell: "Hoạt động tốt",
  WorkingWithMinorIssue: "Hoạt động, có lỗi nhỏ",
  Unstable: "Hoạt động không ổn định",
  NotWorking: "Không hoạt động",
  UnableToTest: "Không thể kiểm tra",
};

const INSPECTION_APPEARANCE_STATUS_LABELS = {
  Intact: "Nguyên vẹn",
  MinorScratches: "Trầy xước nhẹ",
  HeavyScratches: "Trầy xước nặng",
  DeformedOrCracked: "Biến dạng/nứt vỡ",
  PreviouslyRepaired: "Đã từng sửa chữa",
};

const INSPECTION_PARTS_STATUS_LABELS = {
  Complete: "Đầy đủ",
  MissingParts: "Thiếu phụ kiện",
};

const INSPECTION_MATCH_STATUS_LABELS = {
  MatchesDescription: "Đúng như mô tả",
  MinorDifference: "Khác biệt nhỏ",
  SignificantDifference: "Khác biệt đáng kể",
  DoesNotMatch: "Không đúng như mô tả",
};

const INSPECTION_COLLECT_ACTION_LABELS = {
  CollectNow: "Thu gom ngay",
  ScheduleCollection: "Đặt lịch thu gom",
};

const getLabelFromMap = (map, value, fallback = "Chưa xác định") => {
  const key = String(value ?? "").trim();

  return key ? map[key] || fallback : fallback;
};

const AppointmentMonitoringPage = () => {
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [isOverdue, setIsOverdue] = useState("");
  const [hasInspectionForm, setHasInspectionForm] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [state, setState] = useState({
    items: [],
    totalCount: 0,
    loading: true,
    error: "",
  });

  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  const [detailState, setDetailState] = useState({
    appointmentId: "",
    loading: false,
    data: null,
    error: "",
  });

  const [showInspectionForm, setShowInspectionForm] = useState(false);

  const [inspectionFormState, setInspectionFormState] = useState({
    loading: false,
    data: null,
    error: "",
  });

  const listRequestRef = useRef(0);
  const listControllerRef = useRef(null);
  const detailRequestRef = useRef(0);
  const detailControllerRef = useRef(null);
  const inspectionFormControllerRef = useRef(null);

  const toTriStateBool = (value) =>
    value === "true" ? true : value === "false" ? false : undefined;

  const listParams = useMemo(() => {
    const scheduledFrom = dateRange?.[0]?.startOf("day").toISOString();
    const scheduledTo = dateRange?.[1]?.endOf("day").toISOString();

    return {
      pageNumber,
      pageSize,
      keyword,
      type,
      status,
      isOverdue: toTriStateBool(isOverdue),
      hasInspectionForm: toTriStateBool(hasInspectionForm),
      scheduledFrom,
      scheduledTo,
    };
  }, [
    pageNumber,
    pageSize,
    keyword,
    type,
    status,
    isOverdue,
    hasInspectionForm,
    dateRange,
  ]);

  /*
   * Loader danh sách duy nhất cho cả auto-load (filter/page) lẫn "Làm mới":
   * huỷ request trước, cấp request id mới, và chỉ request id hiện hành
   * mới được ghi state - response cũ về muộn không đè lên kết quả mới.
   */
  const loadAppointments = useCallback(async () => {
    listControllerRef.current?.abort();

    const controller = new AbortController();
    listControllerRef.current = controller;

    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;

    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await moderatorAppointmentApi.getAppointments({
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
        error: "Không thể tải danh sách lịch hẹn. Vui lòng thử lại.",
      });
    }
  }, [listParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAppointments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      listRequestRef.current += 1;
      listControllerRef.current?.abort();
    };
  }, [loadAppointments]);

  const applyKeyword = () => {
    setPageNumber(1);
    setKeyword(keywordInput.trim());
  };

  const changeType = (next) => {
    setPageNumber(1);
    setType(next || "");
  };

  const changeStatus = (next) => {
    setPageNumber(1);
    setStatus(next || "");
  };

  const changeIsOverdue = (next) => {
    setPageNumber(1);
    setIsOverdue(next || "");
  };

  const changeHasInspectionForm = (next) => {
    setPageNumber(1);
    setHasInspectionForm(next || "");
  };

  const changeDateRange = (nextRange) => {
    setPageNumber(1);
    setDateRange(nextRange);
  };

  const loadAppointmentDetail = (appointmentId) => {
    detailControllerRef.current?.abort();

    const controller = new AbortController();
    detailControllerRef.current = controller;

    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;

    setDetailState({
      appointmentId,
      loading: true,
      data: null,
      error: "",
    });

    moderatorAppointmentApi
      .getAppointmentById(appointmentId, { signal: controller.signal })
      .then((data) => {
        if (detailRequestRef.current !== requestId) {
          return;
        }

        setDetailState({ appointmentId, loading: false, data, error: "" });
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

        const isNotFound =
          httpStatus === 404 || code === "Appointment.NotFound";

        setDetailState({
          appointmentId,
          loading: false,
          data: null,
          error: isNotFound
            ? "Không tìm thấy lịch hẹn."
            : "Không thể tải chi tiết lịch hẹn. Vui lòng thử lại.",
        });
      });
  };

  const openAppointmentDetail = (appointmentId) => {
    const id = String(appointmentId || "").trim();

    if (!id) {
      return;
    }

    if (selectedAppointmentId === id && detailState.loading) {
      return;
    }

    setSelectedAppointmentId(id);
    setShowInspectionForm(false);
    setInspectionFormState({ loading: false, data: null, error: "" });
    loadAppointmentDetail(id);
  };

  const closeAppointmentDetail = () => {
    detailControllerRef.current?.abort();
    inspectionFormControllerRef.current?.abort();

    setSelectedAppointmentId("");
    setShowInspectionForm(false);

    setDetailState({
      appointmentId: "",
      loading: false,
      data: null,
      error: "",
    });

    setInspectionFormState({ loading: false, data: null, error: "" });
  };

  const openInspectionFormEvidence = () => {
    if (!selectedAppointmentId) {
      return;
    }

    setShowInspectionForm(true);

    inspectionFormControllerRef.current?.abort();
    const controller = new AbortController();
    inspectionFormControllerRef.current = controller;

    setInspectionFormState({ loading: true, data: null, error: "" });

    moderatorAppointmentApi
      .getInspectionForm(selectedAppointmentId, { signal: controller.signal })
      .then((data) => {
        setInspectionFormState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }

        setInspectionFormState({
          loading: false,
          data: null,
          error:
            "Không thể tải biên bản kiểm định. Vui lòng thử lại.",
        });
      });
  };

  const columns = [
    {
      title: "Loại lịch",
      dataIndex: "appointmentType",
      key: "appointmentType",
      render: (value) => (
        <Tag>{getAppointmentTypeLabel(value)}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "appointmentStatus",
      key: "appointmentStatus",
      render: (value, record) => (
        <div className="flex flex-col items-start gap-1">
          <Tag>{getAppointmentStatusMeta(value).label}</Tag>
          {record?.isOverdue && <Tag color="error">Quá hạn</Tag>}
        </div>
      ),
    },
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
      title: "Thời gian hẹn",
      dataIndex: "scheduledAt",
      key: "scheduledAt",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Địa điểm",
      dataIndex: "location",
      key: "location",
      ellipsis: true,
      render: (value) => value || "—",
    },
    {
      title: "Biên bản kiểm định",
      dataIndex: "hasInspectionForm",
      key: "hasInspectionForm",
      render: (value) =>
        value ? <Tag color="blue">Có</Tag> : <Tag>Không</Tag>,
    },
    {
      title: "",
      key: "detailAction",
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => openAppointmentDetail(record.appointmentId)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  const detail = detailState.data;
  const isInspectionType = detail?.appointmentType === "Inspection";
  const inspectionFormReference = detail?.inspection?.inspectionForm;
  const form = inspectionFormState.data;

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-7 text-white shadow-[0_18px_50px_rgba(23,40,48,0.14)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">
          Trung tâm kiểm duyệt
        </p>

        <h1 className="mt-2 text-3xl font-black">Theo dõi lịch hẹn</h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
          Theo dõi thống nhất lịch hẹn kiểm định và thu gom trên toàn hệ
          thống.
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
            placeholder="Mã đơn, sản phẩm, người mua, người bán, địa chỉ..."
            prefix={<SearchOutlined />}
            allowClear
          />
        </div>

        <div className="min-w-[150px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Loại lịch
          </label>
          <Select
            value={type || ""}
            onChange={changeType}
            options={TYPE_FILTER_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[170px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Trạng thái
          </label>
          <Select
            value={status || ""}
            onChange={changeStatus}
            options={STATUS_FILTER_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[130px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Quá hạn
          </label>
          <Select
            value={isOverdue || ""}
            onChange={changeIsOverdue}
            options={TRI_STATE_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[150px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Có biên bản kiểm định
          </label>
          <Select
            value={hasInspectionForm || ""}
            onChange={changeHasInspectionForm}
            options={TRI_STATE_OPTIONS}
            className="w-full"
          />
        </div>

        <div className="min-w-[260px]">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-textLight">
            Thời gian hẹn
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
          onClick={() => void loadAppointments()}
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
          rowKey={(record) => record.appointmentId}
          columns={columns}
          dataSource={state.items}
          loading={state.loading}
          locale={{
            emptyText: <Empty description="Chưa có lịch hẹn phù hợp." />,
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
        title="Chi tiết lịch hẹn"
        open={Boolean(selectedAppointmentId)}
        onCancel={closeAppointmentDetail}
        footer={<Button onClick={closeAppointmentDetail}>Đóng</Button>}
        destroyOnClose
        width={720}
      >
        {detailState.loading && (
          <div
            role="status"
            className="rounded-xl border border-border bg-background p-5 text-center text-sm font-semibold text-textLight"
          >
            Đang tải chi tiết lịch hẹn...
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
                    {detail.order?.orderCode || "Lịch hẹn"}
                  </p>
                  <p className="mt-1 font-bold text-text">
                    {detail.order?.productName || "Sản phẩm HomeCycle"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Tag>{getAppointmentTypeLabel(detail.appointmentType)}</Tag>
                  <Tag>
                    {getAppointmentStatusMeta(detail.appointmentStatus).label}
                  </Tag>
                  {detail.isOverdue && <Tag color="error">Quá hạn</Tag>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-textLight">
                <span>Tạo lúc {formatDateTime(detail.createdAt)}</span>
                <span>Cập nhật {formatDateTime(detail.updatedAt)}</span>
                {detail.completedAt && (
                  <span>Hoàn tất {formatDateTime(detail.completedAt)}</span>
                )}
                {detail.lateThresholdAt && (
                  <span>
                    Hạn xử lý: {formatDateTime(detail.lateThresholdAt)}
                  </span>
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
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Người bán
                </p>
                <p className="mt-2 font-bold text-text">
                  {detail.seller?.username || "—"}
                </p>
              </div>
            </div>

            {isInspectionType && detail.inspection && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Thông tin kiểm định
                </p>
                <div className="mt-2 grid gap-2 text-xs text-textLight sm:grid-cols-2">
                  <span>
                    Ngày kiểm định:{" "}
                    {formatDateTime(detail.inspection.inspectionDate)}
                  </span>
                  <span>
                    Địa chỉ: {detail.inspection.inspectionAddress || "—"}
                  </span>
                  <span>
                    Người mua check-in:{" "}
                    {formatDateTime(detail.inspection.checkIn?.buyerCheckAt)}
                  </span>
                  <span>
                    Người bán check-in:{" "}
                    {formatDateTime(detail.inspection.checkIn?.sellerCheckAt)}
                  </span>
                </div>

                {inspectionFormReference && (
                  <div className="mt-3 rounded-xl border border-border bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-textLight">
                        Biên bản kiểm định phiên bản{" "}
                        {inspectionFormReference.revision ?? "—"} —{" "}
                        {getInspectionStatusLabel(
                          inspectionFormReference.inspectionStatus,
                        )}
                        {inspectionFormReference.conclusion &&
                          ` · ${getInspectionConclusionLabel(
                            inspectionFormReference.conclusion,
                          )}`}
                      </p>

                      <Button
                        size="small"
                        onClick={openInspectionFormEvidence}
                      >
                        Xem biên bản kiểm định
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isInspectionType && detail.collection && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Thông tin thu gom
                </p>
                <div className="mt-2 grid gap-2 text-xs text-textLight sm:grid-cols-2">
                  <span>
                    Ngày thu gom:{" "}
                    {formatDateTime(detail.collection.collectionDate)}
                  </span>
                  <span>
                    Phương thức giao nhận:{" "}
                    {getDeliveryMethodLabel(detail.collection.deliveryMethod)}
                  </span>
                  <span>
                    Địa chỉ lấy hàng: {detail.collection.pickupAddress || "—"}
                  </span>
                  <span>
                    Địa chỉ nhận hàng:{" "}
                    {detail.collection.deliveryAddress || "—"}
                  </span>
                </div>
              </div>
            )}

            {detail.cancellation && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Hủy lịch hẹn
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

            {detail.reschedule && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Yêu cầu đổi lịch
                </p>
                <div className="mt-2 grid gap-2 text-xs text-textLight sm:grid-cols-2">
                  <span>
                    Yêu cầu lúc:{" "}
                    {formatDateTime(detail.reschedule.requestedAt)}
                  </span>
                  <span>
                    Đề xuất lúc:{" "}
                    {formatDateTime(detail.reschedule.proposedAt)}
                  </span>
                </div>
              </div>
            )}

            {showInspectionForm && (
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Biên bản kiểm định
                </p>

                {inspectionFormState.loading && (
                  <p className="mt-2 text-sm text-textLight">
                    Đang tải biên bản kiểm định...
                  </p>
                )}

                {!inspectionFormState.loading && inspectionFormState.error && (
                  <Alert
                    type="error"
                    showIcon
                    message={inspectionFormState.error}
                    className="mt-2"
                  />
                )}

                {!inspectionFormState.loading &&
                  !inspectionFormState.error &&
                  form && (
                    <div className="mt-2 space-y-3">
                      <div className="grid gap-2 text-xs text-textLight sm:grid-cols-2">
                        <span>
                          Trạng thái:{" "}
                          {getInspectionStatusLabel(form.inspectionStatus)}
                        </span>
                        <span>
                          Thời điểm kiểm định:{" "}
                          {formatDateTime(form.inspectionTime)}
                        </span>
                        <span>
                          Hoạt động:{" "}
                          {getLabelFromMap(
                            INSPECTION_OPERATING_STATUS_LABELS,
                            form.operatingStatus,
                          )}
                        </span>
                        <span>
                          Ngoại quan:{" "}
                          {getLabelFromMap(
                            INSPECTION_APPEARANCE_STATUS_LABELS,
                            form.appearanceStatus,
                          )}
                        </span>
                        <span>
                          Phụ kiện:{" "}
                          {getLabelFromMap(
                            INSPECTION_PARTS_STATUS_LABELS,
                            form.partsStatus,
                          )}
                        </span>
                        <span>
                          Đối chiếu mô tả:{" "}
                          {getLabelFromMap(
                            INSPECTION_MATCH_STATUS_LABELS,
                            form.matchStatus,
                          )}
                        </span>
                        <span>
                          Kết luận:{" "}
                          {getInspectionConclusionLabel(form.conclusion) ||
                            "Chưa có kết luận"}
                        </span>
                        <span>
                          Hành động thu gom:{" "}
                          {getLabelFromMap(
                            INSPECTION_COLLECT_ACTION_LABELS,
                            form.collectAction,
                            "—",
                          )}
                        </span>
                        <span>
                          Giá gốc: {formatCurrency(form.originalPrice)}
                        </span>
                        <span>
                          Giá đề xuất: {formatCurrency(form.suggestedPrice)}
                        </span>
                      </div>

                      {(form.submittedAt || form.sellerDecisionAt) && (
                        <div className="grid gap-2 text-xs text-textLight sm:grid-cols-2">
                          {form.submittedAt && (
                            <span>
                              Gửi biên bản lúc:{" "}
                              {formatDateTime(form.submittedAt)}
                            </span>
                          )}
                          {form.sellerDecisionAt && (
                            <span>
                              Người bán phản hồi lúc:{" "}
                              {formatDateTime(form.sellerDecisionAt)}
                            </span>
                          )}
                        </div>
                      )}

                      {form.inspectorNotes && (
                        <p className="text-xs text-textLight">
                          Ghi chú kiểm định viên: {form.inspectorNotes}
                        </p>
                      )}

                      {form.sellerDecisionReason && (
                        <p className="text-xs text-textLight">
                          Lý do phản hồi của người bán: {form.sellerDecisionReason}
                        </p>
                      )}

                      {Array.isArray(form.images) && form.images.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-black uppercase tracking-wide text-textLight">
                            Hình ảnh minh chứng
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Image.PreviewGroup>
                              {form.images.map((image) => (
                                <Image
                                  key={image.mediaId}
                                  src={image.url}
                                  width={96}
                                  height={96}
                                  className="rounded-lg object-cover"
                                />
                              ))}
                            </Image.PreviewGroup>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
};

export default AppointmentMonitoringPage;

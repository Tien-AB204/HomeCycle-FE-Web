import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CollapsibleListPanel from "../../components/mod/CollapsibleListPanel";
import useStoredFlag from "../../hooks/useStoredFlag";
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Image,
  Input,
  Modal,
  Pagination,
  Radio,
  Select,
  Spin,
  Tabs,
  Tag,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import Avatar from "../../components/shared/Avatar";
import ListMonthDropdown from "../../components/shared/ListMonthDropdown";
import ListSortDropdown from "../../components/shared/ListSortDropdown";
import { getDeliveryMethodLabel } from "../../constants/agreements";
import { getAppointmentStatusMeta } from "../../constants/appointments";
import {
  getAppearanceStatusLabel,
  getInspectionConclusionLabel,
  getInspectionStatusLabel,
  getMatchStatusLabel,
  getOperatingStatusLabel,
  getPartsStatusLabel,
} from "../../constants/inspections";
import useActionToast from "../../hooks/useActionToast";
import useRealtimeRefresh from "../../hooks/useRealtimeRefresh";
import moderatorDisputeApi from "../../services/apis/moderatorDisputeApi";
import {
  filterItemsByMonth,
  sortItemsByDate,
} from "../../utils/sortListItems";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const STATUS_OPTIONS = [
  { value: 0, label: "Chờ xử lý" },
  { value: 1, label: "Đã giải quyết" },
  { value: 2, label: "Đã từ chối" },
  { value: 3, label: "Đã đóng" },
  { value: 4, label: "Đang xử lý" },
  { value: 6, label: "Chờ bên kia phản hồi" },
];

const TARGET_TYPE_OPTIONS = [
  { value: 1, label: "Lịch hẹn" },
  { value: 2, label: "Đơn hàng" },
  { value: 3, label: "Đánh giá" },
  { value: 4, label: "Bài đăng" },
];

const ENUM_NAME_TO_VALUE = {
  status: {
    pending: 0,
    resolved: 1,
    rejected: 2,
    closed: 3,
    underreview: 4,
    awaitingreturn: 5,
    awaitingresponse: 6,
  },
  targetType: {
    appointment: 1,
    order: 2,
    review: 3,
    post: 4,
  },
};

const ROLE_LABELS = {
  personal: "Cá nhân",
  business: "Doanh nghiệp",
  moderator: "Kiểm duyệt viên",
  admin: "Quản trị viên",
};

const ORDER_STATUS_LABELS = {
  "0": "Chờ xử lý",
  pending: "Chờ xử lý",

  "1": "Đang xử lý",
  processing: "Đang xử lý",

  "2": "Hoàn tất",
  completed: "Hoàn tất",

  "3": "Đã hủy",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",

  "4": "Đang tranh chấp",
  disputing: "Đang tranh chấp",

  "5": "Đã hoàn trả",
  returned: "Đã hoàn trả",
};

const PAYMENT_STATUS_LABELS = {
  "0": "Chờ thanh toán",
  pending: "Chờ thanh toán",

  "1": "Đã thanh toán",
  completed: "Đã thanh toán",

  "2": "Thanh toán thất bại",
  failed: "Thanh toán thất bại",

  "3": "Đã hoàn tiền",
  refunded: "Đã hoàn tiền",

  "4": "Đã hoàn tiền một phần",
  partiallyrefunded: "Đã hoàn tiền một phần",
};

const RESOLUTION_OUTCOME_LABELS = {
  "1": "Có lợi cho người mua",
  buyerfavored: "Có lợi cho người mua",

  "2": "Có lợi cho người bán",
  sellerfavored: "Có lợi cho người bán",

  "3": "Xác nhận vi phạm",
  violationconfirmed: "Xác nhận vi phạm",

  "4": "Không vi phạm",
  noviolation: "Không vi phạm",
};

const DISPUTE_ORIGIN_LABELS = {
  "1": "Người dùng báo cáo",
  userreported: "Người dùng báo cáo",

  "2": "Kết quả kiểm định bị từ chối",
  inspectionrejected: "Kết quả kiểm định bị từ chối",

  "3": "Không đủ check-in tại lịch kiểm định",
  inspectionnoshow: "Không đủ check-in tại lịch kiểm định",

  "4": "Quá thời gian chờ giao nhận",
  collectionnoshow: "Quá thời gian chờ giao nhận",
};

const SYSTEM_DISPUTE_ORIGINS = [
  "3",
  "inspectionnoshow",
  "4",
  "collectionnoshow",
];

const RESOLUTION_SOURCE_LABELS = {
  "1": "Hai bên tự thỏa thuận",
  mutualagreement: "Hai bên tự thỏa thuận",

  "2": "Kiểm duyệt viên quyết định",
  moderatordecision: "Kiểm duyệt viên quyết định",

  "3": "Hệ thống tự đóng",
  systemautoclosed: "Hệ thống tự đóng",
};

const RESPONSE_TYPE_META = {
  "1": { label: "Chấp nhận", color: "var(--color-success)", background: "color-mix(in srgb, var(--color-success) 10%, transparent)" },
  accept: { label: "Chấp nhận", color: "var(--color-success)", background: "color-mix(in srgb, var(--color-success) 10%, transparent)" },

  "2": { label: "Phản biện", color: "var(--color-error)", background: "color-mix(in srgb, var(--color-error) 8%, transparent)" },
  rebut: { label: "Phản biện", color: "var(--color-error)", background: "color-mix(in srgb, var(--color-error) 8%, transparent)" },

  "3": { label: "Trình bày", color: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 10%, transparent)" },
  statement: { label: "Trình bày", color: "var(--color-primary)", background: "color-mix(in srgb, var(--color-primary) 10%, transparent)" },
};

const APPOINTMENT_TYPE_LABELS = {
  "0": "Lịch kiểm định",
  inspection: "Lịch kiểm định",

  "1": "Lịch thu gom",
  collection: "Lịch thu gom",
};

const INSPECTION_MODE_LABELS = {
  "1": "Kiểm định chi tiết",
  detailed: "Kiểm định chi tiết",

  "2": "Chấp nhận nhanh",
  quickaccept: "Chấp nhận nhanh",
};

const SAFE_ACTION_ERRORS = {
  DISPUTE_NOT_FOUND: "Không tìm thấy tranh chấp.",
  DISPUTE_FORBIDDEN:
    "Bạn không có quyền thực hiện thao tác này.",
  DISPUTE_ALREADY_CLAIMED:
    "Tranh chấp đã được kiểm duyệt viên khác tiếp nhận.",
  DISPUTE_CLAIM_NOT_ALLOWED:
    "Tranh chấp hiện không thể được tiếp nhận.",
  DISPUTE_DECISION_NOT_ALLOWED:
    "Tranh chấp hiện chưa cho phép đưa ra kết luận.",
  DISPUTE_NOT_ASSIGNED_MODERATOR:
    "Bạn không phải kiểm duyệt viên đang phụ trách tranh chấp này.",
  DISPUTE_TARGET_NOT_SUPPORTED:
    "Loại đối tượng tranh chấp này hiện chưa hỗ trợ thao tác kết luận.",
  DISPUTE_CONTENT_UNAVAILABLE:
    "Nội dung gốc hiện không còn khả dụng. Dữ liệu tranh chấp đã được tải lại.",
  POST_NOT_FOUND:
    "Không tìm thấy bài đăng được báo cáo.",
  "Review.NotFound":
    "Không tìm thấy đánh giá được báo cáo.",
  "Review.NotVisible":
    "Đánh giá được báo cáo hiện không còn hiển thị.",
  "Order.NotDisputing":
    "Đơn hàng hiện không còn ở trạng thái tranh chấp.",
  "Order.InvalidCompletionState":
    "Trạng thái hoàn tất của đơn hàng hiện không phù hợp.",
};

const normalizeKey = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const normalizeEnumValue = (value, type) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const text = String(value).trim();

  if (/^-?\d+$/.test(text)) {
    return Number(text);
  }

  return (
    ENUM_NAME_TO_VALUE[type]?.[
      normalizeKey(text)
    ] ?? null
  );
};

const optionLabel = (options, value, type) => {
  const normalized = normalizeEnumValue(
    value,
    type,
  );

  return (
    options.find(
      (option) => option.value === normalized,
    )?.label || "Chưa xác định"
  );
};

const getCategoryLabel = (category) => {
  if (!category || typeof category !== "object") {
    return "Chưa xác định";
  }

  return (
    String(category.name || "").trim() ||
    "Chưa xác định"
  );
};

const getPostTypeLabel = (value) => {
  const normalized = normalizeKey(value);

  if (normalized === "buy" || normalized === "2") {
    return "Tin thu mua";
  }

  if (normalized === "sell" || normalized === "1") {
    return "Tin đăng bán";
  }

  return "Chưa xác định";
};

const POST_STATUS_LABELS = {
  "0": "Bản nháp",
  draft: "Bản nháp",
  "1": "Đang hoạt động",
  active: "Đang hoạt động",
  "2": "Đã đình chỉ",
  suspended: "Đã đình chỉ",
  "3": "Đã đóng",
  closed: "Đã đóng",
  "4": "Đã xóa",
  deleted: "Đã xóa",
};

const REVIEW_STATUS_LABELS = {
  "0": "Đang hiển thị",
  visible: "Đang hiển thị",
  active: "Đang hiển thị",
  "1": "Đã ẩn",
  hidden: "Đã ẩn",
};

const getContentStatusLabel = (labels, value) =>
  labels[normalizeKey(value)] || "Chưa xác định";

const normalizeMediaItems = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          key: `${item}-${index}`,
          url: item,
          fileName: "Ảnh nội dung",
          displayOrder: index,
        };
      }

      const url =
        item?.url ||
        item?.imageUrl ||
        item?.mediaUrl ||
        item?.fileUrl;

      if (!url) {
        return null;
      }

      return {
        ...item,
        key:
          item.mediaId ||
          item.imageId ||
          `${url}-${index}`,
        url,
        fileName:
          item.fileName ||
          item.altText ||
          "Ảnh nội dung",
        displayOrder:
          item.displayOrder ?? index,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );

const getPenaltyPointsApplied = (response) => {
  const payload = response?.data ?? response;
  const value = payload?.penaltyPointsApplied;

  return value === null || value === undefined
    ? null
    : value;
};

const shouldRefetchAfterActionError = (error) => {
  const code = getErrorCode(error);

  return (
    error?.response?.status === 409 ||
    [
      "DISPUTE_ALREADY_CLAIMED",
      "DISPUTE_NOT_ASSIGNED_MODERATOR",
      "DISPUTE_DECISION_NOT_ALLOWED",
      "DISPUTE_TARGET_NOT_SUPPORTED",
      "DISPUTE_CONTENT_UNAVAILABLE",
      "POST_NOT_FOUND",
      "Review.NotFound",
      "Review.NotVisible",
    ].includes(code)
  );
};

const getStatusMeta = (status) => {
  const normalized = normalizeEnumValue(
    status,
    "status",
  );

  switch (normalized) {
    case 0:
      return {
        label: "Chờ xử lý",
        color: "var(--color-warning)",
        background: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
      };

    case 1:
      return {
        label: "Đã giải quyết",
        color: "var(--color-success)",
        background: "color-mix(in srgb, var(--color-success) 10%, transparent)",
      };

    case 2:
      return {
        label: "Đã từ chối",
        color: "var(--color-error)",
        background: "color-mix(in srgb, var(--color-error) 8%, transparent)",
      };

    case 3:
      return {
        label: "Đã đóng",
        color: "var(--color-textLight)",
        background: "color-mix(in srgb, var(--color-textLight) 10%, transparent)",
      };

    case 4:
      return {
        label: "Đang xử lý",
        color: "var(--color-primary)",
        background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
      };

    case 5:
      return {
        label: "Chờ hoàn trả",
        color: "var(--color-warning)",
        background: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
      };

    case 6:
      return {
        label: "Chờ bên kia phản hồi",
        color: "var(--color-warning)",
        background: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
      };

    default:
      return {
        label: "Chưa xác định",
        color: "var(--color-textLight)",
        background: "color-mix(in srgb, var(--color-textLight) 10%, transparent)",
      };
  }
};

const getRoleLabel = (role) =>
  ROLE_LABELS[normalizeKey(role)] ||
  "Chưa xác định";

const getMappedLabel = (
  labels,
  value,
  emptyLabel = "Chưa có",
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return emptyLabel;
  }

  return (
    labels[normalizeKey(value)] ||
    "Chưa xác định"
  );
};

const isSystemOrigin = (origin) =>
  SYSTEM_DISPUTE_ORIGINS.includes(
    normalizeKey(origin),
  );

const hasValue = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "";

const getOrderStatusLabel = (value) =>
  ORDER_STATUS_LABELS[normalizeKey(value)] ||
  "Chưa xác định";

const getPaymentStatusLabel = (value) =>
  PAYMENT_STATUS_LABELS[
    normalizeKey(value)
  ] || "Chưa xác định";

const getResolutionOutcomeLabel = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Chưa có";
  }

  return (
    RESOLUTION_OUTCOME_LABELS[
      normalizeKey(value)
    ] || "Chưa xác định"
  );
};

const getDisputeResolutionLabel = (
  resolutionOutcome,
  targetType,
  status,
) => {
  const normalizedTargetType = normalizeEnumValue(
    targetType,
    "targetType",
  );
  const normalizedStatus = normalizeEnumValue(
    status,
    "status",
  );

  if ([3, 4].includes(normalizedTargetType)) {
    if (normalizedStatus === 1) {
      return "Đã xác nhận vi phạm";
    }

    if (normalizedStatus === 2) {
      return "Đã từ chối báo cáo";
    }

    return "Chưa có";
  }

  return getResolutionOutcomeLabel(resolutionOutcome);
};

const formatDateTime = (value) => {
  if (!value) {
    return "Chưa có";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa xác định";
  }

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Chưa có";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "Chưa xác định";
  }

  return `${number.toLocaleString("vi-VN")} ₫`;
};

const getDisputeTitle = (dispute) => {
  const targetType = normalizeEnumValue(
    dispute?.targetType,
    "targetType",
  );

  if (targetType === 2 && dispute?.orderCode) {
    return dispute.orderCode;
  }

  const targetLabel = optionLabel(
    TARGET_TYPE_OPTIONS,
    targetType,
    "targetType",
  );
  const targetId = String(
    dispute?.targetId || "",
  ).trim();

  if (targetId) {
    return `${targetLabel} ${targetId.slice(0, 8)}`;
  }

  return `Tranh chấp ${String(
    dispute?.disputeId || "",
  ).slice(0, 8)}`;
};

const extractPagedData = (response) => {
  const payload =
    response?.data ?? response ?? {};

  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    items,
    pageNumber: payload?.pageNumber || 1,
    pageSize: payload?.pageSize || 10,
    totalCount:
      payload?.totalCount ?? items.length,
  };
};

const getErrorCode = (error) =>
  error?.response?.data?.code ??
  error?.response?.data?.error?.code ??
  error?.response?.data?.Error?.Code ??
  null;

const getSafeActionError = (
  error,
  fallback,
) => {
  const code = getErrorCode(error);

  if (code && SAFE_ACTION_ERRORS[code]) {
    return SAFE_ACTION_ERRORS[code];
  }

  const status = error?.response?.status;

  if (status === 404) {
    return "Không tìm thấy dữ liệu cần xử lý.";
  }

  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  if (status === 409) {
    return "Dữ liệu vừa thay đổi hoặc thao tác hiện không còn hợp lệ. Vui lòng tải lại.";
  }

  return fallback;
};

const getActionFlag = (
  actions,
  name,
) => {
  const pascalName =
    name.charAt(0).toUpperCase() +
    name.slice(1);

  return Boolean(
    actions?.[name] ??
      actions?.[pascalName],
  );
};

const LIST_COLLAPSED_KEY = "homecycle.disputeListCollapsed";


const DisputeManagementPage = ({
  initialTargetType,
  api = moderatorDisputeApi,
  readOnly = false,
  title = "Quản lý tranh chấp",
} = {}) => {
  const location = useLocation();
  const actionToast = useActionToast();

  const normalizedInitialTargetType =
    normalizeEnumValue(
      initialTargetType,
      "targetType",
    ) ?? undefined;

  const [disputes, setDisputes] =
    useState([]);
  const [loadingList, setLoadingList] =
    useState(false);
  const [listError, setListError] =
    useState(null);

  const [
    selectedDisputeId,
    setSelectedDisputeId,
  ] = useState(null);
  const handledNotificationLocationRef =
    useRef("");
  const [detail, setDetail] =
    useState(null);
  const [
    loadingDetail,
    setLoadingDetail,
  ] = useState(false);
  const [detailError, setDetailError] =
    useState(null);

  const [keywordInput, setKeywordInput] =
    useState("");
  const [keyword, setKeyword] =
    useState("");
  const [status, setStatus] =
    useState(undefined);
  const [disputeCategoryId, setDisputeCategoryId] =
    useState(undefined);
  const [targetType, setTargetType] =
    useState(normalizedInitialTargetType);
  const [dateRange, setDateRange] =
    useState(null);
  const [sortOption, setSortOption] =
    useState("newest");
  const [monthFilter, setMonthFilter] =
    useState("");

  const [categoryOptions, setCategoryOptions] =
    useState([]);
  const [loadingCategories, setLoadingCategories] =
    useState(false);
  const [categoryError, setCategoryError] =
    useState(null);

  const [pageNumber, setPageNumber] =
    useState(1);
  const [pageSize, setPageSize] =
    useState(10);
  const [totalCount, setTotalCount] =
    useState(0);

  const [listCollapsed, setListCollapsed] =
    useStoredFlag(LIST_COLLAPSED_KEY);

  const [actionMode, setActionMode] =
    useState(null);
  const [actionNote, setActionNote] =
    useState("");
  const [
    resolutionOutcome,
    setResolutionOutcome,
  ] = useState("BuyerFavored");
  const [
    submittingAction,
    setSubmittingAction,
  ] = useState(false);
  const [
    actionFeedback,
    setActionFeedback,
  ] = useState(null);

  useEffect(() => {
    const disputeId = String(
      location.state?.notificationDisputeId || "",
    ).trim();

    if (
      !disputeId ||
      handledNotificationLocationRef.current === location.key
    ) {
      return undefined;
    }

    handledNotificationLocationRef.current = location.key;
    const timeoutId = window.setTimeout(() => {
      setDetail(null);
      setDetailError(null);
      setActionFeedback(null);
      setSelectedDisputeId(disputeId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [location.key, location.state]);

  const listParams = useMemo(() => {
    const fromDate =
      dateRange?.[0]
        ?.startOf("day")
        .toISOString();

    const toDate =
      dateRange?.[1]
        ?.endOf("day")
        .toISOString();

    return {
      pageNumber,
      pageSize,
      ...(keyword
        ? { keyword }
        : {}),
      ...(status !== undefined
        ? { status }
        : {}),
      ...(disputeCategoryId !== undefined
        ? { disputeCategoryId }
        : {}),
      ...(targetType !== undefined
        ? { targetType }
        : {}),
      ...(fromDate
        ? { fromDate }
        : {}),
      ...(toDate
        ? { toDate }
        : {}),
    };
  }, [
    pageNumber,
    pageSize,
    keyword,
    status,
    disputeCategoryId,
    targetType,
    dateRange,
  ]);

  const fetchDisputes = useCallback(
    async () => {
      setLoadingList(true);
      setListError(null);

      try {
        const response =
          await api.getAll(
            listParams,
          );

        const paged =
          extractPagedData(response);

        setDisputes(paged.items);
        setTotalCount(
          paged.totalCount,
        );

        if (
          paged.pageNumber !==
          pageNumber
        ) {
          setPageNumber(
            paged.pageNumber,
          );
        }

        if (
          paged.pageSize !== pageSize
        ) {
          setPageSize(
            paged.pageSize,
          );
        }
      } catch {
        setDisputes([]);
        setTotalCount(0);
        setListError(
          "Không thể tải danh sách tranh chấp. Vui lòng thử lại.",
        );
      } finally {
        setLoadingList(false);
      }
    },
    [
      api,
      listParams,
      pageNumber,
      pageSize,
    ],
  );

  const fetchDetail = useCallback(
    async (disputeId) => {
      if (!disputeId) {
        return null;
      }

      setLoadingDetail(true);
      setDetailError(null);

      try {
        const response =
          await api.getById(
            disputeId,
          );

        const nextDetail =
          response?.data ??
          response ??
          null;

        setDetail(nextDetail);

        return nextDetail;
      } catch {
        setDetailError(
          "Không thể tải chi tiết tranh chấp. Vui lòng thử lại.",
        );

        return null;
      } finally {
        setLoadingDetail(false);
      }
    },
    [api],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadCategories = async () => {
      setLoadingCategories(true);
      setCategoryError(null);

      try {
        const categories =
          await api.getCategories({
            targetType,
            signal: controller.signal,
          });

        if (!active) {
          return;
        }

        setCategoryOptions(
          categories
            .filter(
              (item) =>
                item?.disputeCategoryId !== null &&
                item?.disputeCategoryId !== undefined,
            )
            .map((item) => ({
              value: item.disputeCategoryId,
              label:
                String(item.name || "").trim() ||
                String(item.code || "").trim() ||
                "Danh mục chưa đặt tên",
            }))
            .sort((a, b) =>
              a.label.localeCompare(b.label, "vi"),
            ),
        );
      } catch (error) {
        if (
          !active ||
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError"
        ) {
          return;
        }

        setCategoryOptions([]);
        setCategoryError(
          "Không thể tải danh mục tranh chấp. Các bộ lọc khác vẫn có thể sử dụng.",
        );
      } finally {
        if (active) {
          setLoadingCategories(false);
        }
      }
    };

    void loadCategories();

    return () => {
      active = false;
      controller.abort();
    };
  }, [api, targetType]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void fetchDisputes();
      }, 0);

    return () =>
      window.clearTimeout(timeoutId);
  }, [fetchDisputes]);

  useEffect(() => {
    if (!selectedDisputeId) {
      return undefined;
    }

    const timeoutId =
      window.setTimeout(() => {
        void fetchDetail(
          selectedDisputeId,
        );
      }, 0);

    return () =>
      window.clearTimeout(timeoutId);
  }, [
    selectedDisputeId,
    fetchDetail,
  ]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        setPageNumber(1);
        setKeyword(
          keywordInput.trim(),
        );
      }, 350);

    return () =>
      window.clearTimeout(timeoutId);
  }, [keywordInput]);



  // Có tranh chấp mới/được chuyển cho kiểm duyệt viên: tải lại danh sách hàng chờ.
  useRealtimeRefresh(() => void fetchDisputes(), { notificationTargets: ["dispute"] });

  const refreshSelected = async () => {
    const tasks = [
      fetchDisputes(),
    ];

    if (selectedDisputeId) {
      tasks.push(
        fetchDetail(
          selectedDisputeId,
        ),
      );
    }

    await Promise.all(tasks);
  };

  const clearFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setStatus(undefined);
    setDisputeCategoryId(undefined);
    setTargetType(normalizedInitialTargetType);
    setDateRange(null);
    setPageNumber(1);
  };

  const openActionModal = (
    mode,
  ) => {
    setActionMode(mode);
    setActionNote("");
    setResolutionOutcome("BuyerFavored");
    setActionFeedback(null);
  };

  const closeActionModal = () => {
    if (submittingAction) {
      return;
    }

    setActionMode(null);
    setActionNote("");
  };

  const trimmedActionNote =
    actionNote.trim();

  const actionNeedsNote =
    actionMode === "resolve" ||
    actionMode === "reject";

  const noteIsValid =
    !actionNeedsNote ||
    (trimmedActionNote.length >= 10 &&
      trimmedActionNote.length <=
        2000);

  const performAction = async () => {
    if (
      !selectedDisputeId ||
      !actionMode ||
      !noteIsValid
    ) {
      return;
    }

    setSubmittingAction(true);
    setActionFeedback(null);

    try {
      let successMessage =
        "Thao tác đã được thực hiện.";
      let actionResponse = null;

      if (actionMode === "claim") {
        actionResponse =
          await moderatorDisputeApi.claim(
            selectedDisputeId,
          );

        successMessage =
          "Đã tiếp nhận tranh chấp.";
      }

      if (actionMode === "resolve") {
        actionResponse =
          await moderatorDisputeApi.resolve(
            selectedDisputeId,
            isOrderTarget
              ? {
                  resolutionOutcome,
                  moderatorNote:
                    trimmedActionNote,
                }
              : {
                  moderatorNote:
                    trimmedActionNote,
                },
          );

        successMessage = isContentTarget
          ? "Đã xác nhận nội dung vi phạm."
          : "Đã ghi nhận kết luận tranh chấp.";
      }

      if (actionMode === "reject") {
        actionResponse =
          await moderatorDisputeApi.reject(
            selectedDisputeId,
            {
              moderatorNote:
                trimmedActionNote,
            },
          );

        successMessage = isContentTarget
          ? "Đã từ chối báo cáo."
          : "Đã từ chối tranh chấp.";
      }

      const penaltyPointsApplied =
        getPenaltyPointsApplied(actionResponse);

      if (penaltyPointsApplied !== null) {
        successMessage += ` Mức phạt thực tế: ${penaltyPointsApplied} điểm uy tín.`;
      }

      setActionMode(null);
      setActionNote("");

      setActionFeedback({
        type: "success",
        message: successMessage,
      });
      actionToast.success(successMessage);

      await refreshSelected();
    } catch (error) {
      setActionFeedback({
        type: "error",
        message: getSafeActionError(
          error,
          "Không thể thực hiện thao tác. Vui lòng tải lại dữ liệu và thử lại.",
        ),
      });

      if (shouldRefetchAfterActionError(error)) {
        await refreshSelected();
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const sortedDisputes = useMemo(
    () =>
      sortItemsByDate(
        filterItemsByMonth(
          disputes,
          monthFilter,
          (item) => item?.createdAt,
        ),
        sortOption,
        (item) => item?.createdAt,
      ),
    [disputes, monthFilter, sortOption],
  );

  const renderMediaGallery = (
    title,
    description,
    mediaItems,
    emptyMessage,
  ) => (
    <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-text">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-xs text-textLight">
              {description}
            </p>
          )}
        </div>

        <span className="text-xs font-bold text-textLight">
          {mediaItems.length} tệp
        </span>
      </div>

      {mediaItems.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={emptyMessage}
        />
      ) : (
        <Image.PreviewGroup>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {mediaItems.map((media) => (
              <div
                key={media.key}
                className="overflow-hidden rounded-xl border border-border bg-background"
              >
                <Image
                  src={media.url}
                  alt={media.fileName}
                  rootClassName="block"
                  style={{ height: 140, width: "100%", objectFit: "cover" }}
                />

                <div className="p-2">
                  <p className="truncate text-xs font-bold text-textLight">
                    {media.fileName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Image.PreviewGroup>
      )}
    </div>
  );

  const detailStatus =
    getStatusMeta(detail?.status);

  const order =
    detail?.target?.order ?? null;

  const post =
    detail?.target?.post ?? null;

  const review =
    detail?.target?.review ?? null;

  const evidenceImages = normalizeMediaItems(
    detail?.evidenceImages,
  );

  const disputeResponses = (
    Array.isArray(detail?.responses)
      ? detail.responses
      : []
  )
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt) -
        new Date(b.createdAt),
    );

  const timelineSteps = (
    Array.isArray(detail?.timeline)
      ? detail.timeline
      : []
  )
    .slice()
    .sort(
      (a, b) =>
        new Date(a.occurredAt) -
        new Date(b.occurredAt),
    );

  const appointmentContext =
    detail?.appointmentContext ?? null;

  const inspectionContext =
    detail?.inspectionContext ?? null;

  const inspectionImages = normalizeMediaItems(
    inspectionContext?.images,
  );

  const isAwaitingResponse =
    normalizeEnumValue(
      detail?.status,
      "status",
    ) === 6;

  // Giữ số ô của bảng thông tin chẵn để Descriptions 2 cột không lệch hàng.
  const optionalDisputeInfoCount = [
    detail?.resolutionSource,
    detail?.proposedResolutionOutcome,
    detail?.responseDeadlineAt,
    detail?.escalatedAt,
    detail?.moderatorClaimedAt,
  ].filter(hasValue).length;

  const postImages = normalizeMediaItems(
    post?.images,
  );

  const reviewImages = normalizeMediaItems(
    review?.images,
  );

  const timestamps = detail?.timestamps ?? {};

  const actions =
    detail?.actions ??
    detail?.Actions ??
    {};

  const detailTargetType =
    normalizeEnumValue(
      detail?.target?.targetType ??
        detail?.targetType,
      "targetType",
    );

  const isOrderTarget =
    detailTargetType === 2;

  const isReviewTarget =
    detailTargetType === 3;

  const isPostTarget =
    detailTargetType === 4;

  const isContentTarget =
    isReviewTarget || isPostTarget;

  const canClaim =
    !readOnly &&
    getActionFlag(
      actions,
      "canClaimDispute",
    );

  const canResolve =
    !readOnly &&
    getActionFlag(
      actions,
      "canResolveDispute",
    );

  const canReject =
    !readOnly &&
    getActionFlag(
      actions,
      "canRejectDispute",
    );

  const hasModeratorAction =
    canClaim ||
    canResolve ||
    canReject;

  // Chia phản hồi theo từng bên để đối chiếu; phản hồi không thuộc bên nào hiển thị riêng.
  const senderUserId = detail?.sender?.userId;
  const targetUserId = detail?.targetUser?.userId;
  const senderResponses = disputeResponses.filter(
    (response) =>
      senderUserId &&
      response.responder?.userId === senderUserId,
  );
  const targetResponses = disputeResponses.filter(
    (response) =>
      targetUserId &&
      response.responder?.userId === targetUserId,
  );
  const otherResponses = disputeResponses.filter(
    (response) =>
      !senderResponses.includes(response) &&
      !targetResponses.includes(response),
  );

  const renderThumbs = (mediaItems) =>
    mediaItems.length === 0 ? null : (
      <Image.PreviewGroup>
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
          {mediaItems.map((media) => (
            <Image
              key={media.key}
              src={media.url}
              alt={media.fileName}
              rootClassName="block overflow-hidden rounded-lg border border-border"
              style={{ height: 88, width: "100%", objectFit: "cover" }}
            />
          ))}
        </div>
      </Image.PreviewGroup>
    );

  const renderResponse = (response, showResponder = false) => {
    const typeMeta =
      RESPONSE_TYPE_META[normalizeKey(response.responseType)] || {
        label: "Phản hồi",
        color: "var(--color-textLight)",
        background: "color-mix(in srgb, var(--color-textLight) 10%, transparent)",
      };

    return (
      <div
        key={response.disputeResponseId}
        className="rounded-xl border border-border bg-background p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-textLight">
            {showResponder
              ? `${response.responder?.username || "Chưa có"} (${getRoleLabel(response.responder?.role)}) · `
              : ""}
            {formatDateTime(response.createdAt)}
          </span>

          <Tag
            className="m-0"
            style={{
              color: typeMeta.color,
              background: typeMeta.background,
              borderColor: typeMeta.color,
            }}
          >
            {typeMeta.label}
          </Tag>
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm text-text">
          {response.content || "Không có nội dung"}
        </p>

        {renderThumbs(normalizeMediaItems(response.evidenceImages))}
      </div>
    );
  };

  const renderPartyHeader = (label, user, accentClassName) => (
    <div className="flex items-center gap-3">
      {user ? (
        <Avatar
          src={user.avatarUrl}
          alt={user.username || label}
          className="h-11 w-11 border border-border"
        />
      ) : (
        <span
          className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[22px] text-primary"
          aria-hidden="true"
        >
          smart_toy
        </span>
      )}

      <div className="min-w-0">
        <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${accentClassName}`}>
          {label}
        </p>
        <p className="truncate font-bold text-text">
          {user ? user.username || "Chưa có" : "Hệ thống HomeCycle"}
        </p>
        <p className="truncate text-xs text-textLight" title={user?.userId}>
          {user
            ? `${getRoleLabel(user.role)} · ${user.userId || "Chưa có mã"}`
            : isSystemOrigin(detail?.origin)
              ? `Tự động tạo: ${getMappedLabel(DISPUTE_ORIGIN_LABELS, detail?.origin)}`
              : "Tranh chấp được hệ thống tạo tự động"}
        </p>
      </div>
    </div>
  );

  const renderPartyBlock = (blockTitle, children) => (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-textLight">
        {blockTitle}
      </p>
      {children}
    </div>
  );

  const modalTitle = {
    claim: "Tiếp nhận tranh chấp",
    resolve: isPostTarget
      ? "Xác nhận bài đăng vi phạm?"
      : isReviewTarget
        ? "Xác nhận đánh giá vi phạm?"
        : "Đưa ra kết luận tranh chấp",
    reject: isContentTarget
      ? "Từ chối báo cáo"
      : "Từ chối tranh chấp",
  }[actionMode];

  const modalOkText = {
    claim: "Tiếp nhận",
    resolve: isContentTarget
      ? "Xác nhận vi phạm"
      : "Xác nhận kết luận",
    reject: isContentTarget
      ? "Từ chối báo cáo"
      : "Từ chối tranh chấp",
  }[actionMode];

  return (
    <>
      <div className="flex h-[calc(100vh-72px)] min-h-0 overflow-hidden bg-background text-text">
        <CollapsibleListPanel
          collapsed={listCollapsed}
          onCollapsedChange={setListCollapsed}
          title={title}
          icon="gavel"
          count={totalCount}
          defaultWidth={420}
        >
          {({ collapseButton }) => (
          <>
          <div className="border-b border-border p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-xl font-black text-text">
                {title}
              </h1>

              <div className="flex shrink-0 items-center gap-2">
                <div className="rounded-full bg-textLight/10 px-3 py-1 text-xs font-black text-primary">
                  {totalCount}
                </div>

                {collapseButton}
              </div>
            </div>

            <Input
              value={keywordInput}
              onChange={(event) =>
                setKeywordInput(
                  event.target.value,
                )
              }
              prefix={
                <SearchOutlined className="text-textLight" />
              }
              placeholder="Tìm mã, người dùng hoặc nội dung..."
              allowClear
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Select
                allowClear
                placeholder="Trạng thái"
                value={status}
                options={
                  STATUS_OPTIONS
                }
                onChange={(value) => {
                  setStatus(value);
                  setPageNumber(1);
                }}
              />

              <Select
                allowClear
                placeholder="Đối tượng"
                value={targetType}
                options={
                  TARGET_TYPE_OPTIONS
                }
                onChange={(value) => {
                  setTargetType(value);
                  setDisputeCategoryId(undefined);
                  setPageNumber(1);
                }}
              />

              <Select
                allowClear
                className="col-span-2"
                placeholder={
                  loadingCategories
                    ? "Đang tải lý do báo cáo..."
                    : "Lý do báo cáo"
                }
                value={disputeCategoryId}
                options={categoryOptions}
                loading={loadingCategories}
                onChange={(value) => {
                  setDisputeCategoryId(value);
                  setPageNumber(1);
                }}
              />

              <RangePicker
                className="col-span-2 w-full"
                value={dateRange}
                onChange={(values) => {
                  setDateRange(values);
                  setPageNumber(1);
                }}
                placeholder={[
                  "Từ ngày",
                  "Đến ngày",
                ]}
                format="DD/MM/YYYY"
                allowClear
              />
            </div>

            {categoryError && (
              <Alert
                className="mt-3"
                type="warning"
                showIcon
                message={categoryError}
              />
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button
                type="link"
                onClick={clearFilters}
                className="px-0 text-textLight"
              >
                Xóa bộ lọc
              </Button>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <ListSortDropdown
                  value={sortOption}
                  onChange={setSortOption}
                  compact
                  scopeLabel="tranh chấp trong trang hiện tại"
                />
                <ListMonthDropdown
                  items={disputes}
                  value={monthFilter}
                  onChange={setMonthFilter}
                  getValue={(item) => item?.createdAt}
                  compact
                  scopeLabel="tranh chấp trong trang hiện tại"
                />

                <Button
                  icon={
                    <ReloadOutlined />
                  }
                  title="Làm mới"
                  aria-label="Làm mới danh sách"
                  onClick={() => {
                    void refreshSelected();
                  }}
                  loading={
                    loadingList ||
                    loadingDetail
                  }
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {listError && (
              <Alert
                type="error"
                showIcon
                message={listError}
                className="m-4"
              />
            )}

            {loadingList &&
            disputes.length === 0 ? (
              <div className="flex h-full items-center justify-center p-10">
                <Spin />
              </div>
            ) : sortedDisputes.length ===
              0 ? (
              <Empty
                description="Không có tranh chấp phù hợp"
                className="mt-14"
              />
            ) : (
              <div className="divide-y divide-border">
                {sortedDisputes.map(
                  (item) => {
                    const statusMeta =
                      getStatusMeta(
                        item.status,
                      );

                    const isSelected =
                      selectedDisputeId ===
                      item.disputeId;

                    return (
                      <button
                        type="button"
                        key={
                          item.disputeId
                        }
                        onClick={() => {
                          setDetail(null);
                          setDetailError(
                            null,
                          );
                          setActionFeedback(
                            null,
                          );
                          setSelectedDisputeId(
                            item.disputeId,
                          );
                        }}
                        className={`w-full border-l-4 p-4 text-left transition ${
                          isSelected
                            ? "border-primary bg-textLight/10"
                            : "border-transparent bg-white hover:bg-background"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-text">
                              {getDisputeTitle(item)}
                            </p>

                            <p className="mt-1 truncate text-xs text-textLight">
                              Người gửi:{" "}
                              {item.senderUsername ||
                                (item.senderId
                                  ? "Chưa có"
                                  : "Hệ thống")}
                            </p>

                            <p className="mt-1 truncate text-xs text-textLight">
                              Người bị báo cáo:{" "}
                              {item.targetUsername ||
                                "Chưa có"}
                            </p>
                          </div>

                          <Tag
                            className="m-0 shrink-0"
                            style={{
                              color:
                                statusMeta.color,
                              background:
                                statusMeta.background,
                              borderColor:
                                statusMeta.color,
                            }}
                          >
                            {
                              statusMeta.label
                            }
                          </Tag>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-textLight">
                          {item.description ||
                            "Không có mô tả"}
                        </p>

                        {(item.resolutionOutcome ||
                          [1, 2].includes(
                            normalizeEnumValue(
                              item.status,
                              "status",
                            ),
                          )) && (
                          <p className="mt-2 text-xs font-semibold text-primary">
                            Kết quả:{" "}
                            {getDisputeResolutionLabel(
                              item.resolutionOutcome,
                              item.targetType,
                              item.status,
                            )}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-textLight">
                          <span>
                            {getCategoryLabel(
                              item.category,
                            )}
                            {" · "}
                            {optionLabel(
                              TARGET_TYPE_OPTIONS,
                              item.targetType,
                              "targetType",
                            )}
                          </span>

                          <span>
                            {formatDateTime(
                              item.createdAt,
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <Pagination
              className="flex flex-wrap items-center justify-center gap-y-2"
              current={pageNumber}
              pageSize={pageSize}
              total={totalCount}
              showSizeChanger
              size="small"
              onChange={(
                nextPage,
                nextSize,
              ) => {
                setPageNumber(
                  nextPage,
                );
                setPageSize(
                  nextSize,
                );
              }}
              showTotal={(total) =>
                `${total} tranh chấp`
              }
            />
          </div>

          </>
          )}
        </CollapsibleListPanel>

        <section className="@container min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-background/60">
          {!selectedDisputeId ? (
            <div className="flex h-full items-center justify-center p-8">
              <Empty description="Chọn một tranh chấp để xem chi tiết">
                {listCollapsed && (
                  <Button onClick={() => setListCollapsed(false)}>
                    Mở danh sách tranh chấp
                  </Button>
                )}
              </Empty>
            </div>
          ) : loadingDetail &&
            !detail ? (
            <div className="flex h-full items-center justify-center">
              <Spin size="large" />
            </div>
          ) : detailError &&
            !detail ? (
            <div className="p-6">
              <Alert
                type="error"
                showIcon
                message={
                  detailError
                }
                action={
                  <Button
                    size="small"
                    onClick={() => {
                      void fetchDetail(
                        selectedDisputeId,
                      );
                    }}
                  >
                    Thử lại
                  </Button>
                }
              />
            </div>
          ) : detail ? (
            <div className="mx-auto w-full max-w-[1600px] p-5">
              <div className="sticky top-0 z-20 -mx-5 -mt-5 mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-white/95 px-5 py-3 shadow-sm backdrop-blur">
                <div className="flex min-w-0 items-center gap-3">
                  <h2 className="truncate text-lg font-black text-text">
                    {order?.orderCode ||
                      post?.productName ||
                      (isReviewTarget
                        ? `Đánh giá ${String(
                            review?.reviewId ||
                              detail.target?.targetId ||
                              "",
                          ).slice(0, 8)}`
                        : `Tranh chấp ${String(
                            detail.disputeId,
                          ).slice(0, 8)}`)}
                  </h2>

                  <Tag
                    className="m-0 shrink-0"
                    style={{
                      color:
                        detailStatus.color,
                      background:
                        detailStatus.background,
                      borderColor:
                        detailStatus.color,
                    }}
                  >
                    {
                      detailStatus.label
                    }
                  </Tag>

                  {loadingDetail && (
                    <Spin size="small" />
                  )}
                </div>

                {!readOnly &&
                  (hasModeratorAction ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {canClaim && (
                        <Button
                          type="primary"
                          onClick={() =>
                            openActionModal(
                              "claim",
                            )
                          }
                        >
                          Tiếp nhận tranh chấp
                        </Button>
                      )}

                      {canResolve && (
                        <Button
                          type="primary"
                          onClick={() =>
                            openActionModal(
                              "resolve",
                            )
                          }
                        >
                          {isContentTarget
                            ? "Xác nhận vi phạm"
                            : "Đưa ra kết luận"}
                        </Button>
                      )}

                      {canReject && (
                        <Button
                          onClick={() =>
                            openActionModal(
                              "reject",
                            )
                          }
                          style={{
                            borderColor:
                              "var(--color-error)",
                            color:
                              "var(--color-error)",
                          }}
                        >
                          {isContentTarget
                            ? "Từ chối báo cáo"
                            : "Từ chối tranh chấp"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-textLight">
                      Không có thao tác kiểm duyệt ở trạng thái này
                    </span>
                  ))}
              </div>

              {actionFeedback && (
                <Alert
                  className="mb-5"
                  showIcon
                  type={
                    actionFeedback.type
                  }
                  message={
                    actionFeedback.message
                  }
                  closable
                  onClose={() =>
                    setActionFeedback(
                      null,
                    )
                  }
                />
              )}

              <div className="grid items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-text">
                    Đối chiếu hai bên
                  </h3>
                  <p className="mt-0.5 text-xs text-textLight">
                    Trình bày, bằng chứng và phản hồi của mỗi bên đặt cạnh nhau để đánh giá.
                  </p>
                </div>

              </div>

              <div className="grid gap-4 @2xl:grid-cols-2">
                <section className="min-w-0 rounded-2xl border border-border border-t-4 border-t-primary bg-white p-4 shadow-sm">
                  {renderPartyHeader(
                    isContentTarget
                      ? "Người báo cáo"
                      : "Bên khiếu nại",
                    detail.sender,
                    "text-primary",
                  )}

                  {renderPartyBlock(
                    "Trình bày",
                    <>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text">
                        {detail.description ||
                          "Không có mô tả"}
                      </p>

                      {hasValue(detail.proposedResolutionOutcome) && (
                        <p className="mt-2 text-xs font-semibold text-primary">
                          Đề xuất:{" "}
                          {getResolutionOutcomeLabel(
                            detail.proposedResolutionOutcome,
                          )}
                        </p>
                      )}
                    </>,
                  )}

                  {renderPartyBlock(
                    `Bằng chứng (${evidenceImages.length})`,
                    evidenceImages.length === 0 ? (
                      <p className="mt-1 text-sm text-textLight">
                        Không có ảnh bằng chứng
                      </p>
                    ) : (
                      renderThumbs(evidenceImages)
                    ),
                  )}

                  {senderResponses.length > 0 &&
                    renderPartyBlock(
                      "Phản hồi thêm",
                      <div className="mt-2 space-y-2">
                        {senderResponses.map((response) =>
                          renderResponse(response),
                        )}
                      </div>,
                    )}
                </section>

                <section className="min-w-0 rounded-2xl border border-border border-t-4 border-t-warning bg-white p-4 shadow-sm">
                  {detail.targetUser ? (
                    renderPartyHeader(
                      isPostTarget
                        ? "Chủ bài đăng"
                        : isReviewTarget
                          ? "Người bị báo cáo"
                          : "Bên bị khiếu nại",
                      detail.targetUser,
                      "text-warning",
                    )
                  ) : (
                    <p className="text-sm text-textLight">
                      Không có dữ liệu bên bị khiếu nại
                    </p>
                  )}

                  {isPostTarget &&
                    renderPartyBlock(
                      "Bài đăng bị báo cáo",
                      post ? (
                        <>
                          <p className="mt-1 font-bold text-text">
                            {post.productName || "Chưa có tên"}
                          </p>
                          <p className="text-xs text-textLight">
                            {getPostTypeLabel(post.postType)} ·{" "}
                            {formatMoney(post.basePrice)} ·{" "}
                            {getContentStatusLabel(
                              POST_STATUS_LABELS,
                              post.status,
                            )}
                          </p>
                          <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-text">
                            {post.description || "Không có mô tả"}
                          </p>
                          {renderThumbs(postImages)}
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-textLight">
                          Bài đăng gốc hiện không còn khả dụng.
                        </p>
                      ),
                    )}

                  {isReviewTarget &&
                    renderPartyBlock(
                      "Đánh giá bị báo cáo",
                      review ? (
                        <>
                          <p className="mt-1 text-sm font-bold text-text">
                            {review.rating === null ||
                            review.rating === undefined
                              ? "Chưa có số sao"
                              : `${review.rating} / 5 sao`}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text">
                            {review.comment || "Không có nội dung"}
                          </p>
                          {renderThumbs(reviewImages)}
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-textLight">
                          Đánh giá gốc hiện không còn khả dụng.
                        </p>
                      ),
                    )}

                  {(isOrderTarget || targetResponses.length > 0) &&
                    renderPartyBlock(
                      `Phản hồi (${targetResponses.length})`,
                      targetResponses.length === 0 ? (
                        <p className="mt-1 text-sm text-textLight">
                          {isAwaitingResponse
                            ? `Đang chờ phản hồi${
                                detail.responseDeadlineAt
                                  ? ` đến ${formatDateTime(detail.responseDeadlineAt)}`
                                  : ""
                              }.`
                            : "Bên này chưa gửi phản hồi."}
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {targetResponses.map((response) =>
                            renderResponse(response),
                          )}
                        </div>
                      ),
                    )}
                </section>
              </div>

              {otherResponses.length > 0 && (
                <div className="mt-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-black text-text">
                    Phản hồi khác
                  </h3>
                  <div className="mt-2 space-y-2">
                    {otherResponses.map((response) =>
                      renderResponse(response, true),
                    )}
                  </div>
                </div>
              )}

              <Tabs
                key={detail.disputeId}
                className="mt-6"
                items={[
                  order && {
                    key: "order",
                    label: "Đơn hàng",
                    children: (
                      <>
              {order && (
                <>
                  <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-base font-black text-text">
                      Thông tin đơn hàng liên quan
                    </h3>

                    <Descriptions
                      bordered
                      column={{
                        xs: 1,
                        sm: 1,
                        md: 2,
                      }}
                      size="small"
                    >
                      <Descriptions.Item label="Mã đơn hàng">
                        {order.orderCode ||
                          "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Mã định danh đơn hàng">
                        {order.orderId ||
                          "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Sản phẩm">
                        {order.productName ||
                          "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Số lượng">
                        {order.quantity ??
                          "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Tổng tiền">
                        {formatMoney(
                          order.finalTotalAmount,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Trạng thái đơn">
                        {getOrderStatusLabel(
                          order.orderStatus,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Trạng thái thanh toán">
                        {getPaymentStatusLabel(
                          order.paymentStatus,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Hạn tạo tranh chấp">
                        {formatDateTime(
                          order.disputeDeadlineUtc,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item
                        label="Hình thức giao hàng"
                        span={2}
                      >
                        {hasValue(order.deliveryMethod)
                          ? getDeliveryMethodLabel(
                              order.deliveryMethod,
                            )
                          : "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Người bán xác nhận đã giao">
                        {formatDateTime(
                          order.sellerHandoverConfirmedAt,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Người mua xác nhận đã nhận">
                        {formatDateTime(
                          order.buyerReceivedConfirmedAt,
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </>
              )}

                      </>
                    ),
                  },
                  appointmentContext && {
                    key: "appointment",
                    label: "Lịch hẹn",
                    children: (
                      <>
              {appointmentContext && (
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-base font-black text-text">
                    Lịch hẹn liên quan
                  </h3>

                  <Descriptions
                    bordered
                    column={{
                      xs: 1,
                      sm: 1,
                      md: 2,
                    }}
                    size="small"
                  >
                    <Descriptions.Item label="Loại lịch">
                      {getMappedLabel(
                        APPOINTMENT_TYPE_LABELS,
                        appointmentContext.appointmentType,
                      )}
                    </Descriptions.Item>

                    <Descriptions.Item label="Trạng thái lịch">
                      {hasValue(appointmentContext.appointmentStatus)
                        ? getAppointmentStatusMeta(
                            appointmentContext.appointmentStatus,
                          ).label
                        : "Chưa có"}
                    </Descriptions.Item>

                    <Descriptions.Item label="Thời gian hẹn">
                      {formatDateTime(appointmentContext.scheduledAt)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Mốc tính trễ">
                      {formatDateTime(appointmentContext.lateThresholdAt)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Người mua check-in">
                      {formatDateTime(appointmentContext.buyerCheckAt)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Người bán check-in">
                      {formatDateTime(appointmentContext.sellerCheckAt)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Địa điểm" span={2}>
                      {appointmentContext.location || "Chưa có"}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              )}

                      </>
                    ),
                  },
                  inspectionContext && {
                    key: "inspection",
                    label: "Kiểm định",
                    children: (
                      <>
              {inspectionContext && (
                <>
                  <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-base font-black text-text">
                      Biên bản kiểm định liên quan
                    </h3>

                    <Descriptions
                      bordered
                      column={{
                        xs: 1,
                        sm: 1,
                        md: 2,
                      }}
                      size="small"
                    >
                      <Descriptions.Item label="Hình thức">
                        {getMappedLabel(
                          INSPECTION_MODE_LABELS,
                          inspectionContext.inspectionMode,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Trạng thái biên bản">
                        {hasValue(inspectionContext.inspectionStatus)
                          ? getInspectionStatusLabel(
                              inspectionContext.inspectionStatus,
                            )
                          : "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Tình trạng vận hành">
                        {hasValue(inspectionContext.operatingStatus)
                          ? getOperatingStatusLabel(
                              inspectionContext.operatingStatus,
                            )
                          : "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Ngoại quan">
                        {hasValue(inspectionContext.appearanceStatus)
                          ? getAppearanceStatusLabel(
                              inspectionContext.appearanceStatus,
                            )
                          : "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Phụ kiện">
                        {hasValue(inspectionContext.partsStatus)
                          ? getPartsStatusLabel(
                              inspectionContext.partsStatus,
                            )
                          : "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Mức khớp mô tả">
                        {hasValue(inspectionContext.matchStatus)
                          ? getMatchStatusLabel(
                              inspectionContext.matchStatus,
                            )
                          : "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Kết luận">
                        {getInspectionConclusionLabel(
                          inspectionContext.conclusion,
                        ) || "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Thời điểm gửi biên bản">
                        {formatDateTime(inspectionContext.submittedAt)}
                      </Descriptions.Item>

                      <Descriptions.Item label="Người bán quyết định lúc">
                        {formatDateTime(inspectionContext.sellerDecisionAt)}
                      </Descriptions.Item>

                      <Descriptions.Item label="Lý do của người bán">
                        {inspectionContext.sellerDecisionReason || "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Ghi chú kiểm định" span={2}>
                        <span className="whitespace-pre-wrap">
                          {inspectionContext.inspectorNotes || "Chưa có ghi chú"}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>

                  {inspectionImages.length > 0 &&
                    renderMediaGallery(
                      "Ảnh trong biên bản kiểm định",
                      "Hình ảnh được ghi nhận khi kiểm định sản phẩm.",
                      inspectionImages,
                      "Không có ảnh kiểm định",
                    )}
                </>
              )}

                      </>
                    ),
                  },
                  post && {
                    key: "post",
                    label: "Bài đăng gốc",
                    children: (
                      <>
              {post && (
                <>
                  <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-base font-black text-text">
                      Bài đăng gốc
                    </h3>

                    <Descriptions
                      bordered
                      column={{
                        xs: 1,
                        sm: 1,
                        md: 2,
                      }}
                      size="small"
                    >
                      <Descriptions.Item label="Mã bài đăng">
                        {post.postId ||
                          detail.target?.targetId ||
                          "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Mã chủ bài đăng">
                        {post.ownerId ||
                          detail.targetUser?.userId ||
                          "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Tên sản phẩm">
                        {post.productName || "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Loại tin">
                        {getPostTypeLabel(post.postType)}
                      </Descriptions.Item>

                      <Descriptions.Item label="Giá cơ bản">
                        {formatMoney(post.basePrice)}
                      </Descriptions.Item>

                      <Descriptions.Item label="Trạng thái bài đăng">
                        {getContentStatusLabel(
                          POST_STATUS_LABELS,
                          post.status,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Ngày đăng">
                        {formatDateTime(post.createdAt)}
                      </Descriptions.Item>

                      <Descriptions.Item label="Cập nhật bài đăng">
                        {formatDateTime(post.updatedAt)}
                      </Descriptions.Item>

                      <Descriptions.Item
                        label="Mô tả bài đăng"
                        span={2}
                      >
                        <span className="whitespace-pre-wrap">
                          {post.description ||
                            "Không có mô tả"}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>

                </>
              )}

                      </>
                    ),
                  },
                  review && {
                    key: "review",
                    label: "Đánh giá gốc",
                    children: (
                      <>
              {review && (
                <>
                  <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-base font-black text-text">
                      Đánh giá gốc
                    </h3>

                    <Descriptions
                      bordered
                      column={{
                        xs: 1,
                        sm: 1,
                        md: 2,
                      }}
                      size="small"
                    >
                      <Descriptions.Item label="Mã đánh giá">
                        {review.reviewId ||
                          detail.target?.targetId ||
                          "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Mã đơn hàng liên quan">
                        {review.orderId || "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Người đánh giá">
                        {review.reviewerUsername
                          ? `${review.reviewerUsername} (${review.reviewerId || "chưa có mã"})`
                          : review.reviewerId || "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Người được đánh giá">
                        {review.revieweeUsername
                          ? `${review.revieweeUsername} (${review.revieweeId || "chưa có mã"})`
                          : review.revieweeId || "Chưa có"}
                      </Descriptions.Item>

                      <Descriptions.Item label="Số sao">
                        {review.rating === null ||
                        review.rating === undefined
                          ? "Chưa có"
                          : `${review.rating} / 5 sao`}
                      </Descriptions.Item>

                      <Descriptions.Item label="Trạng thái đánh giá">
                        {getContentStatusLabel(
                          REVIEW_STATUS_LABELS,
                          review.status,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Ngày đánh giá">
                        {formatDateTime(review.createdAt)}
                      </Descriptions.Item>

                      <Descriptions.Item label="Cập nhật đánh giá">
                        {formatDateTime(review.updatedAt)}
                      </Descriptions.Item>

                      <Descriptions.Item
                        label="Nội dung đánh giá"
                        span={2}
                      >
                        <span className="whitespace-pre-wrap">
                          {review.comment ||
                            "Không có nội dung"}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>

                </>
              )}

                      </>
                    ),
                  },
                  {
                    key: "info",
                    label: "Mã & mốc thời gian",
                    children: (
                      <>
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-black text-text">
                  Mã và mốc thời gian
                </h3>

                <Descriptions
                  bordered
                  column={{
                    xs: 1,
                    sm: 1,
                    md: 2,
                  }}
                  size="small"
                >
                  <Descriptions.Item label="Mã tranh chấp">
                    {detail.disputeId ||
                      "Chưa có"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Trạng thái">
                    {
                      detailStatus.label
                    }
                  </Descriptions.Item>

                  <Descriptions.Item label="Lý do báo cáo">
                    {getCategoryLabel(
                      detail.category,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Đối tượng">
                    {optionLabel(
                      TARGET_TYPE_OPTIONS,
                      detail.target?.targetType ??
                        detail.targetType,
                      "targetType",
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Mã đối tượng">
                    {detail.target
                      ?.targetId ||
                      detail.targetId ||
                      "Chưa có"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Kết quả giải quyết">
                    {getDisputeResolutionLabel(
                      detail.resolutionOutcome,
                      detail.target?.targetType,
                      detail.status,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Kiểm duyệt viên phụ trách">
                    {detail.moderatorId ||
                      "Chưa có"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày gửi">
                    {formatDateTime(
                      detail.createdAt ??
                        timestamps.createdAt,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Cập nhật lần cuối">
                    {formatDateTime(
                      detail.updatedAt ??
                        timestamps.updatedAt,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Thời gian giải quyết">
                    {formatDateTime(
                      detail.resolvedAt ??
                        timestamps.resolvedAt,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item
                    label="Nguồn tạo"
                    span={
                      optionalDisputeInfoCount % 2 === 0
                        ? 2
                        : 1
                    }
                  >
                    {getMappedLabel(
                      DISPUTE_ORIGIN_LABELS,
                      detail.origin,
                    )}
                  </Descriptions.Item>

                  {hasValue(detail.resolutionSource) ? (
                    <Descriptions.Item label="Hình thức giải quyết">
                      {getMappedLabel(
                        RESOLUTION_SOURCE_LABELS,
                        detail.resolutionSource,
                      )}
                    </Descriptions.Item>
                  ) : null}

                  {hasValue(detail.proposedResolutionOutcome) ? (
                    <Descriptions.Item label="Phương án người gửi đề xuất">
                      {getResolutionOutcomeLabel(
                        detail.proposedResolutionOutcome,
                      )}
                    </Descriptions.Item>
                  ) : null}

                  {hasValue(detail.responseDeadlineAt) ? (
                    <Descriptions.Item label="Hạn phản hồi của bên bị khiếu nại">
                      {formatDateTime(
                        detail.responseDeadlineAt,
                      )}
                    </Descriptions.Item>
                  ) : null}

                  {hasValue(detail.escalatedAt) ? (
                    <Descriptions.Item label="Chuyển lên kiểm duyệt">
                      {formatDateTime(
                        detail.escalatedAt,
                      )}
                    </Descriptions.Item>
                  ) : null}

                  {hasValue(detail.moderatorClaimedAt) ? (
                    <Descriptions.Item label="Kiểm duyệt viên tiếp nhận">
                      {formatDateTime(
                        detail.moderatorClaimedAt,
                      )}
                    </Descriptions.Item>
                  ) : null}

                  <Descriptions.Item
                    label="Ghi chú kiểm duyệt"
                    span={2}
                  >
                    <span className="whitespace-pre-wrap">
                      {detail.moderatorNote ||
                        "Chưa có ghi chú"}
                    </span>
                  </Descriptions.Item>
                </Descriptions>

              </div>

                      </>
                    ),
                  },
                ].filter(Boolean)}
              />
              </div>

              <aside className="min-w-0 space-y-4 @5xl:sticky @5xl:top-[72px]">
                <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-black text-text">
                    Tóm tắt
                  </h3>

                  <dl className="mt-3 space-y-2.5 text-sm">
                    {[
                      ["Lý do", getCategoryLabel(detail.category)],
                      [
                        "Đối tượng",
                        optionLabel(
                          TARGET_TYPE_OPTIONS,
                          detail.target?.targetType ?? detail.targetType,
                          "targetType",
                        ),
                      ],
                      [
                        "Kết quả",
                        getDisputeResolutionLabel(
                          detail.resolutionOutcome,
                          detail.target?.targetType,
                          detail.status,
                        ),
                      ],
                      hasValue(detail.resolutionSource) && [
                        "Hình thức",
                        getMappedLabel(
                          RESOLUTION_SOURCE_LABELS,
                          detail.resolutionSource,
                        ),
                      ],
                      [
                        "Ngày gửi",
                        formatDateTime(detail.createdAt ?? timestamps.createdAt),
                      ],
                      hasValue(detail.responseDeadlineAt) && [
                        "Hạn phản hồi",
                        formatDateTime(detail.responseDeadlineAt),
                      ],
                      hasValue(detail.resolvedAt ?? timestamps.resolvedAt) && [
                        "Giải quyết lúc",
                        formatDateTime(detail.resolvedAt ?? timestamps.resolvedAt),
                      ],
                    ]
                      .filter(Boolean)
                      .map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3">
                          <dt className="shrink-0 text-textLight">{label}</dt>
                          <dd className="text-right font-semibold text-text">{value}</dd>
                        </div>
                      ))}
                  </dl>

                  {detail.moderatorNote && (
                    <div className="mt-3 rounded-xl bg-background p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-textLight">
                        Ghi chú kiểm duyệt
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                        {detail.moderatorNote}
                      </p>
                    </div>
                  )}

                  {isAwaitingResponse && (
                    <Alert
                      className="mt-3"
                      type="info"
                      showIcon
                      message={`Đang chờ bên bị khiếu nại phản hồi${
                        detail.responseDeadlineAt
                          ? ` đến ${formatDateTime(detail.responseDeadlineAt)}`
                          : ""
                      }. Tranh chấp chỉ chuyển sang kiểm duyệt viên khi bên kia phản biện hoặc hết thời hạn phản hồi.`}
                    />
                  )}
                </section>

                {timelineSteps.length > 0 && (
                  <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-black text-text">
                      Tiến trình
                    </h3>

                    <ol className="mt-3 space-y-3 border-l border-border pl-4">
                      {timelineSteps.map((step, index) => {
                        // Backend ghi hạn phản hồi dạng ISO trong mô tả; hiển thị lại theo giờ Việt Nam.
                        const stepDescription =
                          step.code === "response_window_opened" &&
                          detail.responseDeadlineAt
                            ? `Hạn phản hồi: ${formatDateTime(detail.responseDeadlineAt)}`
                            : step.description;

                        return (
                          <li
                            key={`${step.code}-${index}`}
                            className="relative"
                            title={stepDescription || undefined}
                          >
                            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                            <p className="text-sm font-bold leading-5 text-text">
                              {step.title || step.code}
                            </p>
                            <p className="text-xs text-textLight">
                              {formatDateTime(step.occurredAt)}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                )}
              </aside>
              </div>

            </div>
          ) : null}
        </section>
      </div>

      <Modal
        open={Boolean(actionMode)}
        title={modalTitle}
        okText={modalOkText}
        cancelText="Hủy"
        confirmLoading={submittingAction}
        maskClosable={!submittingAction}
        keyboard={!submittingAction}
        closable={!submittingAction}
        okButtonProps={{
          disabled:
            !noteIsValid ||
            submittingAction,
          ...(actionMode === "reject"
            ? {
                style: {
                  background: "var(--color-error)",
                  borderColor: "var(--color-error)",
                  color: "#FFFFFF",
                  opacity:
                    !noteIsValid ||
                    submittingAction
                      ? 0.6
                      : 1,
                },
              }
            : {}),
        }}
        onCancel={closeActionModal}
        onOk={() => {
          void performAction();
        }}
      >
        {actionFeedback?.type === "error" && (
          <Alert
            className="mb-4"
            type="error"
            showIcon
            message={actionFeedback.message}
          />
        )}

        {actionMode === "claim" && (
          <Alert
            type="info"
            showIcon
            message="Sau khi tiếp nhận, tranh chấp sẽ được gán cho tài khoản kiểm duyệt hiện tại."
          />
        )}

        {actionMode === "resolve" &&
          isContentTarget && (
            <Alert
              className="mb-4"
              type="warning"
              showIcon
              message={
                isPostTarget
                  ? "Bài đăng sẽ bị đình chỉ và tác giả có thể bị trừ điểm uy tín theo chính sách hiện hành."
                  : "Đánh giá sẽ bị ẩn, điểm sao liên quan sẽ được tính lại và tác giả đánh giá có thể bị trừ điểm uy tín theo chính sách hiện hành."
              }
              description="Áp dụng mức phạt theo chính sách hiện hành nếu nội dung chưa từng bị xác nhận vi phạm."
            />
          )}

        {actionMode === "reject" &&
          isContentTarget && (
            <Alert
              className="mb-4"
              type="warning"
              showIcon
              message="Từ chối báo cáo này? Nội dung hiện tại sẽ không bị thay đổi bởi quyết định này."
            />
          )}

        {actionMode ===
          "resolve" &&
          isOrderTarget && (
          <>
            <p className="mb-2 font-semibold text-text">
              Kết luận
            </p>

            <Radio.Group
              className="mb-4 flex flex-col gap-2"
              value={
                resolutionOutcome
              }
              onChange={(event) =>
                setResolutionOutcome(
                  event.target
                    .value,
                )
              }
            >
              <Radio value="BuyerFavored">
                Có lợi cho người mua
              </Radio>

              <Radio value="SellerFavored">
                Có lợi cho người bán
              </Radio>
            </Radio.Group>
          </>
        )}

        {actionNeedsNote && (
          <div>
            <p className="mb-2 font-semibold text-text">
              Ghi chú kiểm duyệt
            </p>

            <TextArea
              value={actionNote}
              onChange={(event) =>
                setActionNote(
                  event.target.value,
                )
              }
              rows={5}
              maxLength={2000}
              placeholder="Nhập kết luận rõ ràng, tối thiểu 10 ký tự..."
            />

            <div className="mt-1 text-right text-xs text-textLight">
              {actionNote.length} / 2000
            </div>

            {trimmedActionNote.length >
              0 &&
              trimmedActionNote.length <
                10 && (
                <p className="mt-2 text-sm text-error">
                  Ghi chú phải có ít nhất 10 ký tự.
                </p>
              )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default DisputeManagementPage;

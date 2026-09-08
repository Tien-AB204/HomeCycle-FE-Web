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
  Descriptions,
  Empty,
  Image,
  Input,
  Modal,
  Pagination,
  Radio,
  Select,
  Spin,
  Tag,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import axiosClient from "../../services/apis/axiosClient";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const STATUS_OPTIONS = [
  { value: 0, label: "Chờ xử lý" },
  { value: 1, label: "Đã giải quyết" },
  { value: 2, label: "Đã từ chối" },
  { value: 3, label: "Đã đóng" },
  { value: 4, label: "Đang xử lý" },
  { value: 5, label: "Chờ hoàn trả" },
];

const CATEGORY_OPTIONS = [
  { value: 1, label: "Không xuất hiện" },
  { value: 2, label: "Sản phẩm không khớp" },
  { value: 3, label: "Người bán chưa gửi hàng" },
  { value: 4, label: "Hư hỏng hoặc thất lạc" },
  { value: 5, label: "Chưa nhận được hàng" },
  { value: 6, label: "Gian lận / lừa đảo" },
  { value: 7, label: "Đánh giá mang tính công kích" },
  { value: 8, label: "Thanh toán chưa hoàn tất" },
  { value: 9, label: "Vi phạm cam kết" },
  { value: 99, label: "Khác" },
];

const TARGET_TYPE_OPTIONS = [
  { value: 1, label: "Lịch hẹn" },
  { value: 2, label: "Đơn hàng" },
  { value: 3, label: "Đánh giá" },
];

const ENUM_NAME_TO_VALUE = {
  status: {
    pending: 0,
    resolved: 1,
    rejected: 2,
    closed: 3,
    underreview: 4,
    awaitingreturn: 5,
  },
  category: {
    noshow: 1,
    itemmismatch: 2,
    sellernotshipped: 3,
    damagedorlost: 4,
    itemnotreceived: 5,
    fraudorscam: 6,
    abusivereview: 7,
    paymentnotcompleted: 8,
    commitmentviolation: 9,
    other: 99,
  },
  targetType: {
    appointment: 1,
    order: 2,
    review: 3,
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
  DISPUTE_RETURN_VERIFICATION_NOT_ALLOWED:
    "Tranh chấp hiện chưa cho phép xác minh hoàn trả.",
  DISPUTE_RETURN_VERIFICATION_NOT_DUE:
    "Chưa đến thời điểm được phép xác minh hoàn trả.",
  DISPUTE_TARGET_NOT_SUPPORTED:
    "Loại đối tượng tranh chấp này hiện chưa hỗ trợ thao tác kết luận.",
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

const getStatusMeta = (status) => {
  const normalized = normalizeEnumValue(
    status,
    "status",
  );

  switch (normalized) {
    case 0:
      return {
        label: "Chờ xử lý",
        color: "#9A6418",
        background: "rgba(154,100,24,0.10)",
      };

    case 1:
      return {
        label: "Đã giải quyết",
        color: "#2F765D",
        background: "rgba(47,118,93,0.10)",
      };

    case 2:
      return {
        label: "Đã từ chối",
        color: "#7A1012",
        background: "rgba(122,16,18,0.08)",
      };

    case 3:
      return {
        label: "Đã đóng",
        color: "#547B7D",
        background: "rgba(84,123,125,0.10)",
      };

    case 4:
      return {
        label: "Đang xử lý",
        color: "#2B5659",
        background: "rgba(43,86,89,0.10)",
      };

    case 5:
      return {
        label: "Chờ hoàn trả",
        color: "#9A6418",
        background: "rgba(154,100,24,0.10)",
      };

    default:
      return {
        label: "Chưa xác định",
        color: "#547B7D",
        background: "rgba(84,123,125,0.10)",
      };
  }
};

const getRoleLabel = (role) =>
  ROLE_LABELS[normalizeKey(role)] ||
  "Chưa xác định";

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

const DisputeManagementPage = () => {
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
  const [category, setCategory] =
    useState(undefined);
  const [targetType, setTargetType] =
    useState(undefined);
  const [dateRange, setDateRange] =
    useState(null);

  const [pageNumber, setPageNumber] =
    useState(1);
  const [pageSize, setPageSize] =
    useState(10);
  const [totalCount, setTotalCount] =
    useState(0);

  const [sidebarWidth, setSidebarWidth] =
    useState(420);
  const [isResizing, setIsResizing] =
    useState(false);
  const resizeSessionRef = useRef(null);

  const [actionMode, setActionMode] =
    useState(null);
  const [actionNote, setActionNote] =
    useState("");
  const [
    resolutionOutcome,
    setResolutionOutcome,
  ] = useState("BuyerFavored");
  const [
    returnCompleted,
    setReturnCompleted,
  ] = useState(true);
  const [
    submittingAction,
    setSubmittingAction,
  ] = useState(false);
  const [
    actionFeedback,
    setActionFeedback,
  ] = useState(null);

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
      ...(category !== undefined
        ? { category }
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
    category,
    targetType,
    dateRange,
  ]);

  const fetchDisputes = useCallback(
    async () => {
      setLoadingList(true);
      setListError(null);

      try {
        const response =
          await axiosClient.get(
            "/moderator/disputes",
            {
              params: listParams,
            },
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
          await axiosClient.get(
            `/moderator/disputes/${disputeId}`,
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
    [],
  );

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

  useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    const handleMouseMove = (
      event,
    ) => {
      const session =
        resizeSessionRef.current;

      if (!session) {
        return;
      }

      const delta =
        event.clientX -
        session.startX;

      const nextWidth =
        session.startWidth + delta;

      setSidebarWidth(
        Math.min(
          600,
          Math.max(300, nextWidth),
        ),
      );
    };

    const handleMouseUp = () => {
      resizeSessionRef.current =
        null;
      setIsResizing(false);
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove,
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp,
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove,
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp,
      );
    };
  }, [isResizing]);

  const startResizing = (event) => {
    event.preventDefault();

    resizeSessionRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };

    setIsResizing(true);
  };

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
    setCategory(undefined);
    setTargetType(undefined);
    setDateRange(null);
    setPageNumber(1);
  };

  const openActionModal = (
    mode,
  ) => {
    setActionMode(mode);
    setActionNote("");
    setResolutionOutcome(
      "BuyerFavored",
    );
    setReturnCompleted(true);
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
    actionMode === "reject" ||
    actionMode === "verify-return";

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

      if (actionMode === "claim") {
        await axiosClient.post(
          `/moderator/disputes/${selectedDisputeId}/claim`,
        );

        successMessage =
          "Đã tiếp nhận tranh chấp.";
      }

      if (actionMode === "resolve") {
        await axiosClient.post(
          `/moderator/disputes/${selectedDisputeId}/resolve`,
          {
            resolutionOutcome,
            moderatorNote:
              trimmedActionNote,
          },
        );

        successMessage =
          "Đã ghi nhận kết luận tranh chấp.";
      }

      if (actionMode === "reject") {
        await axiosClient.post(
          `/moderator/disputes/${selectedDisputeId}/reject`,
          {
            moderatorNote:
              trimmedActionNote,
          },
        );

        successMessage =
          "Đã từ chối tranh chấp.";
      }

      if (
        actionMode ===
        "verify-return"
      ) {
        await axiosClient.post(
          `/moderator/disputes/${selectedDisputeId}/verify-return`,
          {
            isReturnCompleted:
              returnCompleted,
            moderatorNote:
              trimmedActionNote,
          },
        );

        successMessage =
          "Đã xác minh tình trạng hoàn trả.";
      }

      setActionMode(null);
      setActionNote("");

      setActionFeedback({
        type: "success",
        message: successMessage,
      });

      await refreshSelected();
    } catch (error) {
      setActionFeedback({
        type: "error",
        message: getSafeActionError(
          error,
          "Không thể thực hiện thao tác. Vui lòng tải lại dữ liệu và thử lại.",
        ),
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const renderUserCard = (
    title,
    user,
  ) => {
    if (!user) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-textLight">
          {title}: Không có dữ liệu
        </div>
      );
    }

    const initial = (
      user.username || "?"
    )
      .charAt(0)
      .toUpperCase();

    return (
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-textLight">
          {title}
        </p>

        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={
                user.username ||
                title
              }
              className="h-11 w-11 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(84,123,125,0.10)] font-black text-primary">
              {initial}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate font-bold text-text">
              {user.username ||
                "Chưa có"}
            </p>

            <p className="truncate text-xs text-textLight">
              Mã:{" "}
              {user.userId ||
                "Chưa có"}
            </p>

            <p className="mt-1 text-xs text-textLight">
              Vai trò:{" "}
              {getRoleLabel(
                user.role,
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const detailStatus =
    getStatusMeta(detail?.status);

  const order =
    detail?.target?.order ?? null;

  const evidenceImages =
    Array.isArray(
      detail?.evidenceImages,
    )
      ? [...detail.evidenceImages].sort(
          (a, b) =>
            (a.displayOrder || 0) -
            (b.displayOrder || 0),
        )
      : [];

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

  const canClaim =
    getActionFlag(
      actions,
      "canClaimDispute",
    );

  const canResolve =
    getActionFlag(
      actions,
      "canResolveDispute",
    ) && isOrderTarget;

  const canReject =
    getActionFlag(
      actions,
      "canRejectDispute",
    ) && isOrderTarget;

  const canVerifyReturn =
    getActionFlag(
      actions,
      "canVerifyReturn",
    ) && isOrderTarget;

  const backendOffersDecision =
    getActionFlag(
      actions,
      "canResolveDispute",
    ) ||
    getActionFlag(
      actions,
      "canRejectDispute",
    );

  const unsupportedDecisionTarget =
    backendOffersDecision &&
    !isOrderTarget;

  const hasModeratorAction =
    canClaim ||
    canResolve ||
    canReject ||
    canVerifyReturn;

  const modalTitle = {
    claim: "Tiếp nhận tranh chấp",
    resolve:
      "Đưa ra kết luận tranh chấp",
    reject: "Từ chối tranh chấp",
    "verify-return":
      "Xác minh hoàn trả",
  }[actionMode];

  const modalOkText = {
    claim: "Tiếp nhận",
    resolve: "Xác nhận kết luận",
    reject: "Từ chối tranh chấp",
    "verify-return": "Xác minh",
  }[actionMode];

  return (
    <>
      <div className="flex h-full min-h-0 bg-background text-text">
        <section
          style={{
            width: `${sidebarWidth}px`,
          }}
          className="relative flex shrink-0 select-none flex-col border-r border-border bg-white"
        >
          <div className="border-b border-border p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                  Kiểm duyệt
                </p>

                <h1 className="text-xl font-black text-text">
                  Quản lý tranh chấp
                </h1>
              </div>

              <div className="rounded-full bg-[rgba(84,123,125,0.10)] px-3 py-1 text-xs font-black text-primary">
                {totalCount}
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
              placeholder="Tìm mã, người dùng, đơn hàng..."
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
                  setPageNumber(1);
                }}
              />

              <Select
                allowClear
                className="col-span-2"
                placeholder="Loại tranh chấp"
                value={category}
                options={
                  CATEGORY_OPTIONS
                }
                onChange={(value) => {
                  setCategory(value);
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

            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                type="link"
                onClick={clearFilters}
                className="px-0 text-textLight"
              >
                Xóa bộ lọc
              </Button>

              <Button
                icon={
                  <ReloadOutlined />
                }
                onClick={() => {
                  void refreshSelected();
                }}
                loading={
                  loadingList ||
                  loadingDetail
                }
              >
                Làm mới
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
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
            ) : disputes.length ===
              0 ? (
              <Empty
                description="Không có tranh chấp phù hợp"
                className="mt-14"
              />
            ) : (
              <div className="divide-y divide-border">
                {disputes.map(
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
                            ? "border-primary bg-[rgba(84,123,125,0.10)]"
                            : "border-transparent bg-white hover:bg-background"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-text">
                              {item.orderCode ||
                                `Tranh chấp ${String(
                                  item.disputeId,
                                ).slice(
                                  0,
                                  8,
                                )}`}
                            </p>

                            <p className="mt-1 truncate text-xs text-textLight">
                              Người gửi:{" "}
                              {item.senderUsername ||
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

                        {item.resolutionOutcome && (
                          <p className="mt-2 text-xs font-semibold text-primary">
                            Kết quả:{" "}
                            {getResolutionOutcomeLabel(
                              item.resolutionOutcome,
                            )}
                          </p>
                        )}

                        {item.returnDueAt && (
                          <p className="mt-1 text-xs text-[#9A6418]">
                            Hạn hoàn trả:{" "}
                            {formatDateTime(
                              item.returnDueAt,
                            )}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-textLight">
                          <span>
                            {optionLabel(
                              CATEGORY_OPTIONS,
                              item.category,
                              "category",
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
                `Tổng ${total} tranh chấp`
              }
            />
          </div>

          <div
            onMouseDown={
              startResizing
            }
            role="separator"
            aria-orientation="vertical"
            aria-label="Thay đổi độ rộng danh sách tranh chấp"
            title="Kéo để thay đổi độ rộng danh sách"
            className={`absolute right-0 top-0 z-20 h-full w-1.5 cursor-col-resize transition-colors ${
              isResizing
                ? "bg-primary/50"
                : "bg-transparent hover:bg-primary/40"
            }`}
          />
        </section>

        <section className="min-w-0 flex-1 overflow-y-auto">
          {!selectedDisputeId ? (
            <div className="flex h-full items-center justify-center p-8">
              <Empty description="Chọn một tranh chấp để xem chi tiết" />
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
            <div className="mx-auto w-full max-w-6xl p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-textLight">
                    Chi tiết tranh chấp
                  </p>

                  <h2 className="mt-1 break-all text-xl font-black text-text">
                    {detail.target?.order
                      ?.orderCode ||
                      `Tranh chấp ${String(
                        detail.disputeId,
                      ).slice(
                        0,
                        8,
                      )}`}
                  </h2>
                </div>

                <Tag
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

              {unsupportedDecisionTarget && (
                <Alert
                  className="mb-5"
                  type="warning"
                  showIcon
                  icon={
                    <WarningOutlined />
                  }
                  message="Loại đối tượng tranh chấp này hiện chưa hỗ trợ thao tác kết luận hoặc từ chối."
                />
              )}

              <div className="mb-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-black text-text">
                    Thao tác kiểm duyệt
                  </h3>

                  {loadingDetail && (
                    <Spin size="small" />
                  )}
                </div>

                {hasModeratorAction ? (
                  <div className="flex flex-wrap gap-2">
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
                        Đưa ra kết luận
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
                            "#7A1012",
                          color:
                            "#7A1012",
                        }}
                      >
                        Từ chối tranh chấp
                      </Button>
                    )}

                    {canVerifyReturn && (
                      <Button
                        type="primary"
                        onClick={() =>
                          openActionModal(
                            "verify-return",
                          )
                        }
                      >
                        Xác minh hoàn trả
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-textLight">
                    Hiện không có thao tác kiểm duyệt nào được hệ thống cho phép đối với trạng thái này.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {renderUserCard(
                  "Người gửi",
                  detail.sender,
                )}

                {renderUserCard(
                  "Người bị khiếu nại",
                  detail.targetUser,
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-black text-text">
                  Thông tin tranh chấp
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

                  <Descriptions.Item label="Loại tranh chấp">
                    {optionLabel(
                      CATEGORY_OPTIONS,
                      detail.category,
                      "category",
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Đối tượng">
                    {optionLabel(
                      TARGET_TYPE_OPTIONS,
                      detail.target
                        ?.targetType,
                      "targetType",
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Mã đối tượng">
                    {detail.target
                      ?.targetId ||
                      "Chưa có"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Kết quả giải quyết">
                    {getResolutionOutcomeLabel(
                      detail.resolutionOutcome,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Kiểm duyệt viên phụ trách">
                    {detail.moderatorId ||
                      "Chưa có"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày gửi">
                    {formatDateTime(
                      detail.createdAt,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Cập nhật lần cuối">
                    {formatDateTime(
                      detail.updatedAt,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Thời gian giải quyết">
                    {formatDateTime(
                      detail.resolvedAt,
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item
                    label="Mô tả"
                    span={2}
                  >
                    <span className="whitespace-pre-wrap">
                      {detail.description ||
                        "Không có mô tả"}
                    </span>
                  </Descriptions.Item>

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

              {order && (
                <>
                  <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
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
                    </Descriptions>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-base font-black text-text">
                      Tiến trình hoàn trả
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
                      <Descriptions.Item label="Người mua xác nhận đã trả hàng">
                        {formatDateTime(
                          order.buyerReturnConfirmedAt,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Người bán xác nhận đã nhận lại hàng">
                        {formatDateTime(
                          order.sellerReturnReceivedAt,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Hạn phản hồi hoàn trả">
                        {formatDateTime(
                          order.returnDueAt,
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Thời gian hoàn trả hoàn tất">
                        {formatDateTime(
                          order.returnedAt,
                        )}
                      </Descriptions.Item>
                    </Descriptions>

                    {normalizeEnumValue(
                      detail.status,
                      "status",
                    ) === 5 &&
                      order.returnDueAt && (
                        <Alert
                          className="mt-4"
                          type="warning"
                          showIcon
                          message={`Đang chờ quy trình hoàn trả. Mốc hiện tại: ${formatDateTime(
                            order.returnDueAt,
                          )}.`}
                        />
                      )}
                  </div>
                </>
              )}

              <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-text">
                    Bằng chứng
                  </h3>

                  <span className="text-xs font-bold text-textLight">
                    {
                      evidenceImages.length
                    }{" "}
                    tệp
                  </span>
                </div>

                {evidenceImages.length ===
                0 ? (
                  <Empty
                    image={
                      Empty.PRESENTED_IMAGE_SIMPLE
                    }
                    description="Không có ảnh bằng chứng"
                  />
                ) : (
                  <Image.PreviewGroup>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {evidenceImages.map(
                        (media) => (
                          <div
                            key={
                              media.mediaId ||
                              media.url
                            }
                            className="overflow-hidden rounded-xl border border-border bg-background"
                          >
                            <Image
                              src={
                                media.url
                              }
                              alt={
                                media.fileName ||
                                "Bằng chứng tranh chấp"
                              }
                              className="h-40 w-full object-cover"
                              width="100%"
                            />

                            <div className="p-2">
                              <p className="truncate text-xs font-bold text-textLight">
                                {media.fileName ||
                                  "Ảnh bằng chứng"}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </Image.PreviewGroup>
                )}
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
                  background: "#7A1012",
                  borderColor: "#7A1012",
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
        {actionMode === "claim" && (
          <Alert
            type="info"
            showIcon
            message="Sau khi tiếp nhận, tranh chấp sẽ được gán cho tài khoản kiểm duyệt hiện tại."
          />
        )}

        {actionMode ===
          "resolve" && (
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

        {actionMode ===
          "verify-return" && (
          <>
            <p className="mb-2 font-semibold text-text">
              Kết quả xác minh
            </p>

            <Radio.Group
              className="mb-4 flex flex-col gap-2"
              value={
                returnCompleted
              }
              onChange={(event) =>
                setReturnCompleted(
                  event.target
                    .value,
                )
              }
            >
              <Radio value={true}>
                Đã hoàn trả đầy đủ
              </Radio>

              <Radio value={false}>
                Chưa hoàn trả đầy đủ
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
                <p className="mt-2 text-sm text-[#7A1012]">
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
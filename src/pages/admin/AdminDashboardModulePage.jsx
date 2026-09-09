import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import adminDashboardApi from "../../services/apis/adminDashboardApi";
import productTypeApi from "../../services/apis/productTypeApi";

const GROUP_OPTIONS = [
  { value: "Day", label: "Theo ngày" },
  { value: "Week", label: "Theo tuần" },
  { value: "Month", label: "Theo tháng" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Pending", label: "Chờ thanh toán" },
  { value: "Completed", label: "Đã hoàn tất" },
  { value: "Failed", label: "Thất bại" },
  { value: "Refunded", label: "Đã hoàn tiền" },
  { value: "PartiallyRefunded", label: "Hoàn tiền một phần" },
  { value: "Expired", label: "Đã hết hạn" },
  { value: "Cancelled", label: "Đã hủy" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "Tất cả phương thức" },
  { value: "PayOS", label: "PayOS" },
  { value: "Internal_Wallet", label: "Ví nội bộ" },
  { value: "Unknown", label: "Chưa xác định" },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "", label: "Tất cả loại thanh toán" },
  { value: "Deposit", label: "Đặt cọc" },
  { value: "Full_Payment", label: "Thanh toán toàn bộ" },
  { value: "Subscription", label: "Gói dịch vụ" },
];

const ORDER_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Pending", label: "Đang chờ" },
  { value: "Processing", label: "Đang xử lý" },
  { value: "Completed", label: "Đã hoàn tất" },
  { value: "Cancelled", label: "Đã hủy" },
  { value: "Disputing", label: "Đang tranh chấp" },
  { value: "Returned", label: "Đã hoàn trả" },
];

const APPOINTMENT_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Proposed", label: "Đang đề xuất" },
  { value: "Scheduled", label: "Đã thống nhất" },
  { value: "Completed", label: "Đã hoàn tất" },
  {
    value: "Cancelled",
    label: "Đã hủy hoặc thay thế",
  },
  { value: "Expired", label: "Đã quá hạn" },
  { value: "InProgress", label: "Đang diễn ra" },
];

const APPOINTMENT_TYPE_OPTIONS = [
  { value: "", label: "Tất cả loại lịch" },
  { value: "Inspection", label: "Kiểm định" },
  { value: "Collection", label: "Thu gom" },
];

const DISPUTE_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Pending", label: "Chờ xử lý" },
  { value: "Resolved", label: "Đã giải quyết" },
  { value: "Rejected", label: "Đã từ chối" },
  { value: "Closed", label: "Đã đóng" },
  { value: "UnderReview", label: "Đang xem xét" },
  {
    value: "AwaitingReturn",
    label: "Đang chờ hoàn trả",
  },
];

const DISPUTE_TARGET_OPTIONS = [
  { value: "", label: "Tất cả đối tượng" },
  { value: "Appointment", label: "Lịch hẹn" },
  { value: "Order", label: "Đơn hàng" },
  { value: "Review", label: "Đánh giá" },
];

const DISPUTE_CATEGORY_OPTIONS = [
  { value: "", label: "Tất cả nguyên nhân" },
  { value: "NoShow", label: "Không có mặt" },
  {
    value: "ItemMismatch",
    label: "Sản phẩm không đúng thỏa thuận",
  },
  {
    value: "SellerNotShipped",
    label: "Người bán chưa giao hàng",
  },
  {
    value: "DamagedOrLost",
    label: "Hư hỏng hoặc thất lạc",
  },
  {
    value: "ItemNotReceived",
    label: "Chưa nhận được sản phẩm",
  },
  {
    value: "FraudOrScam",
    label: "Có dấu hiệu gian lận",
  },
  {
    value: "AbusiveReview",
    label: "Đánh giá không phù hợp",
  },
  {
    value: "PaymentNotCompleted",
    label: "Thanh toán chưa hoàn tất",
  },
  {
    value: "CommitmentViolation",
    label: "Vi phạm cam kết",
  },
  { value: "Other", label: "Khác" },
];

const BUSINESS_MODEL_OPTIONS = [
  { value: "", label: "Tất cả mô hình" },
  {
    value: "HouseholdBusiness",
    label: "Hộ kinh doanh",
  },
  {
    value: "Enterprise",
    label: "Doanh nghiệp",
  },
];

const BUSINESS_PROFILE_STATUS_OPTIONS = [
  { value: "", label: "Tất cả hồ sơ" },
  { value: "Pending", label: "Chờ duyệt" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Rejected", label: "Đã từ chối" },
];

const USER_STATUS_OPTIONS = [
  { value: "", label: "Tất cả tài khoản" },
  { value: "Pending", label: "Chờ kích hoạt" },
  { value: "Active", label: "Đang hoạt động" },
  { value: "Suspended", label: "Đang tạm khóa" },
  { value: "Deleted", label: "Đã xóa" },
];

const MODULES = {
  payments: {
    type: "operation",
    title: "Giao dịch",
    eyebrow: "DASHBOARD VẬN HÀNH",
    description:
      "Theo dõi số bản ghi thanh toán, trạng thái, phương thức và lượt thanh toán phát sinh trong kỳ.",
    apiMethod: "getPayments",
  },
  orders: {
    type: "operation",
    title: "Đơn hàng",
    eyebrow: "DASHBOARD VẬN HÀNH",
    description:
      "Theo dõi đơn hàng tạo mới và các sự kiện hoàn tất, hủy, hoàn trả trong kỳ.",
    apiMethod: "getOrders",
  },
  appointments: {
    type: "operation",
    title: "Lịch hẹn",
    eyebrow: "DASHBOARD VẬN HÀNH",
    description:
      "Theo dõi lịch kiểm định, thu gom, đề xuất đổi lịch và ngày hẹn trong kỳ.",
    apiMethod: "getAppointments",
  },
  disputes: {
    type: "dispute",
    title: "Tranh chấp",
    eyebrow: "DASHBOARD VẬN HÀNH",
    description:
      "Theo dõi phân bố nguyên nhân, trạng thái và mức độ lựa chọn các nhóm tranh chấp.",
    apiMethod: "getDisputes",
  },
  "business-overview": {
    type: "business-overview",
    title: "Tổng quan doanh nghiệp",
    eyebrow: "DASHBOARD DOANH NGHIỆP",
    description:
      "Theo dõi tài khoản doanh nghiệp, hồ sơ, khảo sát và mức độ hoàn thiện dữ liệu.",
    apiMethod: "getBusinessOverview",
  },
  "business-demand": {
    type: "business-demand",
    title: "Nhu cầu doanh nghiệp",
    eyebrow: "DASHBOARD DOANH NGHIỆP",
    description:
      "Tổng hợp nhu cầu khảo sát hiện tại theo từng nhóm câu hỏi và phạm vi phục vụ.",
    apiMethod: "getBusinessDemand",
  },
  "business-performance": {
    type: "business-performance",
    title: "Hiệu quả kinh doanh",
    eyebrow: "DASHBOARD DOANH NGHIỆP",
    description:
      "Theo dõi tỷ trọng thanh toán và giá trị mua bán của tài khoản doanh nghiệp.",
    apiMethod: "getBusinessPerformance",
  },
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const LABELS = {
  pending: "Chờ xử lý",
  active: "Đang hoạt động",
  suspended: "Đang tạm khóa",
  deleted: "Đã xóa",
  processing: "Đang xử lý",
  completed: "Đã hoàn tất",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
  partiallyrefunded: "Hoàn tiền một phần",
  expired: "Đã hết hạn",
  cancelled: "Đã hủy",
  disputing: "Đang tranh chấp",
  returned: "Đã hoàn trả",
  proposed: "Đang đề xuất",
  scheduled: "Đã thống nhất",
  inprogress: "Đang diễn ra",
  inspection: "Kiểm định",
  collection: "Thu gom",
  resolved: "Đã giải quyết",
  rejected: "Đã từ chối",
  closed: "Đã đóng",
  underreview: "Đang xem xét",
  awaitingreturn: "Đang chờ hoàn trả",
  appointment: "Lịch hẹn",
  order: "Đơn hàng",
  review: "Đánh giá",
  noshow: "Không có mặt",
  itemmismatch: "Sản phẩm không đúng thỏa thuận",
  sellernotshipped: "Người bán chưa giao hàng",
  damagedorlost: "Hư hỏng hoặc thất lạc",
  itemnotreceived: "Chưa nhận được sản phẩm",
  fraudorscam: "Có dấu hiệu gian lận",
  abusivereview: "Đánh giá không phù hợp",
  paymentnotcompleted: "Thanh toán chưa hoàn tất",
  commitmentviolation: "Vi phạm cam kết",
  other: "Khác",
  payos: "PayOS",
  internalwallet: "Ví nội bộ",
  unknown: "Chưa xác định",
  deposit: "Đặt cọc",
  fullpayment: "Thanh toán toàn bộ",
  subscription: "Gói dịch vụ",
  householdbusiness: "Hộ kinh doanh",
  enterprise: "Doanh nghiệp",
  approved: "Đã duyệt",
  personal: "Cá nhân",
  business: "Doanh nghiệp",
  moderator: "Điều phối viên",
  admin: "Quản trị viên",
};

const labelFor = (
  value,
  dashboard,
) => {
  const key =
    normalize(value);

  if (key === "pending") {
    if (dashboard === "payments") {
      return "Chờ thanh toán";
    }

    if (dashboard === "orders") {
      return "Đang chờ";
    }

    if (
      dashboard ===
      "business-user-status"
    ) {
      return "Chờ kích hoạt";
    }

    if (
      dashboard ===
      "business-profile-status"
    ) {
      return "Chờ duyệt";
    }
  }

  if (
    dashboard ===
      "appointments" &&
    key === "cancelled"
  ) {
    return "Đã hủy hoặc thay thế";
  }

  return (
    LABELS[key] ||
    String(value || "Chưa xác định")
  );
};

const formatNumber = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
  ).format(Number(value) || 0);

const formatDecimal = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
    {
      maximumFractionDigits: 1,
    },
  ).format(Number(value) || 0);

const formatMoney = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    },
  ).format(Number(value) || 0);

const formatPercent = (value) =>
  value === null ||
  value === undefined
    ? "—"
    : `${formatDecimal(value)}%`;

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const parts =
    String(value).split("-");

  if (parts.length !== 3) {
    return "—";
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Asia/Ho_Chi_Minh",
    },
  ).format(date);
};

const LoadingBlock = ({
  className = "",
}) => (
  <span
    className={[
      "inline-block animate-pulse rounded-lg bg-background",
      className,
    ].join(" ")}
  />
);

const KpiCard = ({
  label,
  value,
  hint,
  loading,
  valueClassName = "text-text",
}) => (
  <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
      {label}
    </p>

    <p
      className={[
        "mt-3 text-3xl font-black",
        valueClassName,
      ].join(" ")}
    >
      {loading ? (
        <LoadingBlock className="h-9 w-20" />
      ) : (
        value
      )}
    </p>

    {hint && (
      <p className="mt-2 text-xs leading-5 text-textLight">
        {hint}
      </p>
    )}
  </article>
);

const DistributionPanel = ({
  title,
  description,
  rows,
  dashboard,
}) => (
  <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
    <div className="border-b border-border pb-4">
      <h3 className="text-lg font-black text-text">
        {title}
      </h3>

      {description && (
        <p className="mt-1 text-xs leading-5 text-textLight">
          {description}
        </p>
      )}
    </div>

    <div className="mt-5 space-y-4">
      {!Array.isArray(rows) ||
      rows.length === 0 ? (
        <div className="rounded-xl bg-background px-4 py-7 text-center text-sm font-semibold text-textLight">
          Chưa có dữ liệu.
        </div>
      ) : (
        rows.map((item, index) => {
          const percentage =
            Number(
              item.percentage,
            ) || 0;

          const width =
            percentage > 0
              ? Math.max(
                  2,
                  Math.min(
                    100,
                    percentage,
                  ),
                )
              : 0;

          return (
            <div
              key={`${item.key}-${index}`}
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-text">
                  {labelFor(
                    item.label ||
                      item.key,
                    dashboard,
                  )}
                </span>

                <span className="text-sm font-black text-text">
                  {formatNumber(
                    item.count,
                  )}
                  {" · "}
                  {formatDecimal(
                    percentage,
                  )}
                  %
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${width}%`,
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  </section>
);

const SeriesTable = ({
  title,
  rows,
  amount = false,
}) => (
  <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
    <h3 className="text-lg font-black text-text">
      {title}
    </h3>

    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-textLight">
            <th className="px-3 py-3">
              Từ ngày
            </th>
            <th className="px-3 py-3">
              Đến trước
            </th>
            <th className="px-3 py-3 text-right">
              {amount
                ? "Giá trị"
                : "Số lượng"}
            </th>
          </tr>
        </thead>

        <tbody>
          {!Array.isArray(rows) ||
          rows.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="px-3 py-8 text-center text-textLight"
              >
                Chưa có dữ liệu.
              </td>
            </tr>
          ) : (
            rows.map(
              (item, index) => (
                <tr
                  key={`${item.from}-${index}`}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-3 py-3 font-semibold text-text">
                    {formatDate(
                      item.from,
                    )}
                  </td>

                  <td className="px-3 py-3 text-textLight">
                    {formatDate(
                      item.toExclusive,
                    )}
                  </td>

                  <td className="px-3 py-3 text-right font-black text-text">
                    {amount
                      ? formatMoney(
                          item.amount,
                        )
                      : formatNumber(
                          item.count,
                        )}
                  </td>
                </tr>
              ),
            )
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const TradeTable = ({
  title,
  rows,
}) => (
  <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
    <h3 className="text-lg font-black text-text">
      {title}
    </h3>

    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-textLight">
            <th className="px-3 py-3">
              Bên mua
            </th>
            <th className="px-3 py-3">
              Bên bán
            </th>
            <th className="px-3 py-3 text-right">
              Số lượng
            </th>
            <th className="px-3 py-3 text-right">
              Giá trị
            </th>
          </tr>
        </thead>

        <tbody>
          {!Array.isArray(rows) ||
          rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-8 text-center text-textLight"
              >
                Chưa có dữ liệu.
              </td>
            </tr>
          ) : (
            rows.map(
              (item, index) => (
                <tr
                  key={`${item.buyerRole}-${item.sellerRole}-${index}`}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-3 py-3 font-bold text-text">
                    {labelFor(
                      item.buyerRole,
                    )}
                  </td>

                  <td className="px-3 py-3 font-bold text-text">
                    {labelFor(
                      item.sellerRole,
                    )}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {formatNumber(
                      item.count,
                    )}
                  </td>

                  <td className="px-3 py-3 text-right font-black text-text">
                    {formatMoney(
                      item.amount,
                    )}
                  </td>
                </tr>
              ),
            )
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const DemandGroup = ({
  title,
  group,
}) => (
  <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
    <h3 className="text-base font-black text-text">
      {title}
    </h3>

    <p className="mt-2 text-xs leading-5 text-textLight">
      Có trả lời:{" "}
      <strong className="text-text">
        {formatNumber(
          group?.respondentCount,
        )}
      </strong>
      {" · thiếu: "}
      <strong className="text-text">
        {formatNumber(
          group?.missingResponseCount,
        )}
      </strong>
      {" · dữ liệu không hợp lệ: "}
      <strong className="text-text">
        {formatNumber(
          group?.invalidResponseBusinessCount,
        )}
      </strong>
    </p>

    <div className="mt-4 space-y-3">
      {!Array.isArray(
        group?.items,
      ) ||
      group.items.length === 0 ? (
        <p className="rounded-xl bg-background px-4 py-5 text-center text-sm text-textLight">
          Chưa có dữ liệu.
        </p>
      ) : (
        group.items.map(
          (item, index) => (
            <div
              key={`${item.key}-${index}`}
              className="flex items-start justify-between gap-4 rounded-xl bg-background px-3 py-3"
            >
              <span className="text-sm font-bold text-text">
                {item.label ||
                  item.key}
              </span>

              <span className="shrink-0 text-right text-sm font-black text-text">
                {formatNumber(
                  item.businessCount,
                )}
                {" · "}
                {formatDecimal(
                  item.percentage,
                )}
                %
              </span>
            </div>
          ),
        )
      )}
    </div>
  </section>
);

const initialFilters = {
  from: "",
  to: "",
  groupBy: "Day",
  paymentStatus: "",
  paymentMethod: "",
  paymentType: "",
  orderStatus: "",
  appointmentStatus: "",
  appointmentType: "",
  status: "",
  targetType: "",
  category: "",
  businessModel: "",
  profileStatus: "",
  userStatus: "",
  targetCity: "",
  serviceCity: "",
  productTypeId: "",
};

const validatePeriod = (
  from,
  to,
) => {
  if (
    Boolean(from) !==
    Boolean(to)
  ) {
    return "Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.";
  }

  if (!from && !to) {
    return "";
  }

  const start =
    new Date(
      `${from}T00:00:00Z`,
    );

  const end =
    new Date(
      `${to}T00:00:00Z`,
    );

  const days =
    Math.round(
      (
        end.getTime() -
        start.getTime()
      ) /
        86400000,
    );

  if (
    !Number.isFinite(days) ||
    days < 1 ||
    days > 366
  ) {
    return "Khoảng thời gian phải từ 1 đến 366 ngày.";
  }

  return "";
};

export default function AdminDashboardModulePage({
  dashboard,
}) {
  const config =
    MODULES[dashboard];

  const [draft, setDraft] =
    useState({
      ...initialFilters,
    });

  const [filters, setFilters] =
    useState({
      ...initialFilters,
    });

  const [
    filterError,
    setFilterError,
  ] = useState("");

  const [
    requestVersion,
    setRequestVersion,
  ] = useState(0);

  const [state, setState] =
    useState({
      requestKey: "",
      data: null,
      error: "",
    });

  const [
    productTypeOptions,
    setProductTypeOptions,
  ] = useState([]);

  const [
    productTypeLoading,
    setProductTypeLoading,
  ] = useState(false);

  const [
    productTypeError,
    setProductTypeError,
  ] = useState("");

  const usesPeriod =
    config?.type ===
      "operation" ||
    config?.type ===
      "dispute" ||
    config?.type ===
      "business-performance";

  const requestKey =
    useMemo(
      () =>
        JSON.stringify([
          dashboard,
          filters,
          requestVersion,
        ]),
      [
        dashboard,
        filters,
        requestVersion,
      ],
    );

  useEffect(() => {
    if (!config) {
      return undefined;
    }

    const controller =
      new AbortController();

    let active = true;

    const method =
      adminDashboardApi[
        config.apiMethod
      ];

    method({
      ...filters,
      signal:
        controller.signal,
    })
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          requestKey,
          data,
          error: "",
        });
      })
      .catch((error) => {
        if (
          !active ||
          error?.name ===
            "CanceledError" ||
          error?.code ===
            "ERR_CANCELED"
        ) {
          return;
        }

        setState({
          requestKey,
          data: null,
          error:
            "Không thể tải dữ liệu thống kê lúc này.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    config,
    filters,
    requestKey,
  ]);

  useEffect(() => {
    if (
      dashboard !==
      "business-demand"
    ) {
      return undefined;
    }

    const controller =
      new AbortController();

    let active = true;

    const loadProductTypes =
      async () => {
        setProductTypeLoading(true);
        setProductTypeError("");

        try {
          const allItems = [];
          let pageNumber = 1;
          let hasNextPage = true;

          while (
            active &&
            hasNextPage
          ) {
            const result =
              await productTypeApi.getAll({
                pageNumber,
                pageSize: 100,
                signal:
                  controller.signal,
              });

            if (!active) {
              return;
            }

            allItems.push(
              ...(Array.isArray(
                result?.items,
              )
                ? result.items
                : []),
            );

            hasNextPage =
              Boolean(
                result?.hasNextPage,
              );

            pageNumber += 1;
          }

          if (!active) {
            return;
          }

          const seen =
            new Set();

          const options =
            allItems
              .filter((item) => {
                const id =
                  item?.productTypeId;

                if (
                  !id ||
                  seen.has(id)
                ) {
                  return false;
                }

                seen.add(id);

                return true;
              })
              .map((item) => ({
                value:
                  item.productTypeId,
                label:
                  `${
                    item.productTypeName ||
                    "Loại sản phẩm chưa đặt tên"
                  }${
                    item.isActive ===
                    false
                      ? " (đã ẩn)"
                      : ""
                  }`,
              }))
              .sort((a, b) =>
                a.label.localeCompare(
                  b.label,
                  "vi",
                ),
              );

          setProductTypeOptions(
            options,
          );
        } catch (error) {
          if (
            !active ||
            error?.name ===
              "CanceledError" ||
            error?.code ===
              "ERR_CANCELED"
          ) {
            return;
          }

          setProductTypeOptions([]);

          setProductTypeError(
            "Không thể tải danh sách loại sản phẩm. Các bộ lọc khác vẫn có thể sử dụng.",
          );
        } finally {
          if (active) {
            setProductTypeLoading(
              false,
            );
          }
        }
      };

    loadProductTypes();

    return () => {
      active = false;
      controller.abort();
    };
  }, [dashboard]);

  if (!config) {
    return null;
  }

  const loading =
    state.requestKey !==
    requestKey;

  const data =
    state.data;

  const businessProductTypeOptions = [
    {
      value: "",
      label:
        productTypeLoading
          ? "Đang tải loại sản phẩm..."
          : "Tất cả loại sản phẩm",
    },
    ...productTypeOptions,
  ];

  const applyFilters = (
    event,
  ) => {
    event.preventDefault();

    if (usesPeriod) {
      const message =
        validatePeriod(
          draft.from,
          draft.to,
        );

      if (message) {
        setFilterError(
          message,
        );
        return;
      }
    }

    setFilterError("");

    setFilters({
      ...draft,
    });

    setRequestVersion(
      (current) =>
        current + 1,
    );
  };

  const resetFilters = () => {
    const next = {
      ...initialFilters,
    };

    setDraft(next);
    setFilters(next);
    setFilterError("");

    setRequestVersion(
      (current) =>
        current + 1,
    );
  };

  const renderSelect = (
    label,
    field,
    options,
  ) => (
    <label key={field}>
      <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
        {label}
      </span>

      <select
        value={draft[field]}
        onChange={(event) =>
          setDraft(
            (current) => ({
              ...current,
              [field]:
                event.target
                  .value,
            }),
          )
        }
        className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value ||
                "all"
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );

  const renderPeriodFilters =
    () => (
      <>
        <label>
          <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
            Từ ngày
          </span>

          <input
            type="date"
            value={draft.from}
            onChange={(event) =>
              setDraft(
                (current) => ({
                  ...current,
                  from:
                    event.target
                      .value,
                }),
              )
            }
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          />
        </label>

        <label>
          <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
            Đến ngày
          </span>

          <input
            type="date"
            value={draft.to}
            onChange={(event) =>
              setDraft(
                (current) => ({
                  ...current,
                  to:
                    event.target
                      .value,
                }),
              )
            }
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          />
        </label>

        {renderSelect(
          "Nhóm dữ liệu",
          "groupBy",
          GROUP_OPTIONS,
        )}
      </>
    );

  const renderFilters =
    () => {
      const fields = [];

      if (usesPeriod) {
        fields.push(
          <div
            key="period-from"
            className="contents"
          >
            {renderPeriodFilters()}
          </div>,
        );
      }

      if (
        dashboard ===
        "payments"
      ) {
        fields.push(
          renderSelect(
            "Trạng thái",
            "paymentStatus",
            PAYMENT_STATUS_OPTIONS,
          ),
          renderSelect(
            "Phương thức",
            "paymentMethod",
            PAYMENT_METHOD_OPTIONS,
          ),
          renderSelect(
            "Loại thanh toán",
            "paymentType",
            PAYMENT_TYPE_OPTIONS,
          ),
        );
      }

      if (
        dashboard ===
        "orders"
      ) {
        fields.push(
          renderSelect(
            "Trạng thái",
            "orderStatus",
            ORDER_STATUS_OPTIONS,
          ),
        );
      }

      if (
        dashboard ===
        "appointments"
      ) {
        fields.push(
          renderSelect(
            "Trạng thái",
            "appointmentStatus",
            APPOINTMENT_STATUS_OPTIONS,
          ),
          renderSelect(
            "Loại lịch",
            "appointmentType",
            APPOINTMENT_TYPE_OPTIONS,
          ),
        );
      }

      if (
        dashboard ===
        "disputes"
      ) {
        fields.push(
          renderSelect(
            "Trạng thái",
            "status",
            DISPUTE_STATUS_OPTIONS,
          ),
          renderSelect(
            "Đối tượng",
            "targetType",
            DISPUTE_TARGET_OPTIONS,
          ),
          renderSelect(
            "Nguyên nhân",
            "category",
            DISPUTE_CATEGORY_OPTIONS,
          ),
        );
      }

      if (
        dashboard ===
          "business-overview" ||
        dashboard ===
          "business-demand"
      ) {
        fields.push(
          renderSelect(
            "Mô hình",
            "businessModel",
            BUSINESS_MODEL_OPTIONS,
          ),
          renderSelect(
            "Trạng thái hồ sơ",
            "profileStatus",
            BUSINESS_PROFILE_STATUS_OPTIONS,
          ),
          renderSelect(
            "Trạng thái tài khoản",
            "userStatus",
            USER_STATUS_OPTIONS,
          ),
        );
      }

      if (
        dashboard ===
        "business-demand"
      ) {
        fields.push(
          renderSelect(
            "Loại sản phẩm",
            "productTypeId",
            businessProductTypeOptions,
          ),
          <label key="targetCity">
            <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
              Thành phố mục tiêu
            </span>

            <input
              value={
                draft.targetCity
              }
              maxLength={100}
              onChange={(
                event,
              ) =>
                setDraft(
                  (current) => ({
                    ...current,
                    targetCity:
                      event.target
                        .value,
                  }),
                )
              }
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
            />
          </label>,
          <label key="serviceCity">
            <span className="text-xs font-black uppercase tracking-[0.11em] text-textLight">
              Thành phố phục vụ
            </span>

            <input
              value={
                draft.serviceCity
              }
              maxLength={100}
              onChange={(
                event,
              ) =>
                setDraft(
                  (current) => ({
                    ...current,
                    serviceCity:
                      event.target
                        .value,
                  }),
                )
              }
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
            />
          </label>,
        );
      }

      return fields;
    };

  const renderOperation =
    () => {
      const trend =
        data?.createdTrend;

      const extraCards = [];

      if (
        dashboard ===
        "payments"
      ) {
        extraCards.push({
          label:
            "Đã thanh toán trong kỳ",
          value:
            formatNumber(
              data
                ?.paidInPeriodCount,
            ),
        });
      }

      if (
        dashboard ===
        "orders"
      ) {
        extraCards.push(
          {
            label:
              "Hoàn tất trong kỳ",
            value:
              formatNumber(
                data
                  ?.completedInPeriodCount,
              ),
          },
          {
            label:
              "Hủy trong kỳ",
            value:
              formatNumber(
                data
                  ?.cancelledInPeriodCount,
              ),
          },
          {
            label:
              "Hoàn trả trong kỳ",
            value:
              formatNumber(
                data
                  ?.returnedInPeriodCount,
              ),
          },
        );
      }

      if (
        dashboard ===
        "appointments"
      ) {
        extraCards.push(
          {
            label:
              "Đề xuất đổi lịch",
            value:
              formatNumber(
                data
                  ?.rescheduleProposalsCreatedInPeriodCount,
              ),
          },
          {
            label:
              "Ngày hẹn trong kỳ",
            value:
              formatNumber(
                data
                  ?.scheduledDateInPeriodCount,
              ),
          },
        );
      }

      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Tổng toàn thời gian"
              value={formatNumber(
                data?.totalCount,
              )}
              loading={loading}
            />

            <KpiCard
              label="Tạo mới kỳ hiện tại"
              value={formatNumber(
                trend
                  ?.currentPeriodCount,
              )}
              loading={loading}
              valueClassName="text-primary"
            />

            <KpiCard
              label="Kỳ trước"
              value={formatNumber(
                trend
                  ?.previousPeriodCount,
              )}
              loading={loading}
            />

            <KpiCard
              label="Thay đổi"
              value={formatNumber(
                trend?.change,
              )}
              hint={
                trend
                  ?.growthPercent ===
                  null
                  ? "Không có tỷ lệ tăng trưởng do kỳ trước bằng 0."
                  : `Tỷ lệ ${formatPercent(
                      trend
                        ?.growthPercent,
                    )}`
              }
              loading={loading}
            />

            {extraCards.map(
              (item) => (
                <KpiCard
                  key={
                    item.label
                  }
                  label={
                    item.label
                  }
                  value={
                    item.value
                  }
                  loading={
                    loading
                  }
                />
              ),
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DistributionPanel
              title="Trạng thái hiện tại"
              description="Phân bố trạng thái hiện tại của các bản ghi được tạo trong kỳ."
              rows={
                data
                  ?.createdInPeriodByCurrentStatus
              }
              dashboard={
                dashboard
              }
            />

            {dashboard ===
              "payments" && (
              <DistributionPanel
                title="Phương thức thanh toán"
                rows={
                  data
                    ?.createdInPeriodByMethod
                }
                dashboard={
                  dashboard
                }
              />
            )}

            {dashboard ===
              "appointments" && (
              <DistributionPanel
                title="Loại lịch hẹn"
                rows={
                  data
                    ?.createdInPeriodByType
                }
                dashboard={
                  dashboard
                }
              />
            )}
          </div>

          <SeriesTable
            title="Xu hướng tạo mới"
            rows={
              data?.createdSeries
            }
          />
        </>
      );
    };

  const renderDispute =
    () => (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tổng tranh chấp"
            value={formatNumber(
              data?.totalCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Tạo trong kỳ"
            value={formatNumber(
              data?.periodCount,
            )}
            loading={loading}
            valueClassName="text-error"
          />

          <KpiCard
            label="Nguyên nhân chưa xác định"
            value={formatNumber(
              data
                ?.unknownCategoryCount,
            )}
            loading={loading}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DistributionPanel
            title="Theo nguyên nhân"
            rows={data?.byCategory}
            dashboard="disputes"
          />

          <DistributionPanel
            title="Theo trạng thái"
            rows={data?.byStatus}
            dashboard="disputes"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title:
                "Được chọn nhiều nhất",
              rows:
                data
                  ?.mostSelectedCategories,
            },
            {
              title:
                "Ít nhất trong nhóm đã dùng",
              rows:
                data
                  ?.leastSelectedUsedCategories,
            },
            {
              title:
                "Chưa được chọn",
              rows:
                data
                  ?.unselectedCategories,
            },
          ].map((group) => (
            <section
              key={group.title}
              className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]"
            >
              <h3 className="font-black text-text">
                {group.title}
              </h3>

              <div className="mt-4 flex flex-wrap gap-2">
                {!Array.isArray(
                  group.rows,
                ) ||
                group.rows
                  .length ===
                  0 ? (
                  <span className="text-sm text-textLight">
                    Chưa có dữ liệu.
                  </span>
                ) : (
                  group.rows.map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full bg-background px-3 py-1.5 text-xs font-bold text-text"
                      >
                        {labelFor(
                          item,
                          "disputes",
                        )}
                      </span>
                    ),
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </>
    );

  const renderBusinessOverview =
    () => (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tài khoản doanh nghiệp"
            value={formatNumber(
              data
                ?.totalBusinessAccounts,
            )}
            loading={loading}
          />

          <KpiCard
            label="Đã có hồ sơ"
            value={formatNumber(
              data?.withProfileCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Chưa có hồ sơ"
            value={formatNumber(
              data
                ?.withoutProfileCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Độ phủ khảo sát"
            value={formatPercent(
              data
                ?.surveyCoveragePercent,
            )}
            loading={loading}
            valueClassName="text-primary"
          />

          <KpiCard
            label="Đã có khảo sát"
            value={formatNumber(
              data?.withSurveyCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Chưa có khảo sát"
            value={formatNumber(
              data
                ?.withoutSurveyCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Có loại sản phẩm"
            value={formatNumber(
              data
                ?.withProductTypesCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Có khu vực phục vụ"
            value={formatNumber(
              data
                ?.withServiceAreasCount,
            )}
            loading={loading}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <DistributionPanel
            title="Trạng thái tài khoản"
            rows={data?.byUserStatus}
            dashboard="business-user-status"
          />

          <DistributionPanel
            title="Trạng thái hồ sơ"
            rows={
              data?.byProfileStatus
            }
            dashboard="business-profile-status"
          />

          <DistributionPanel
            title="Mô hình kinh doanh"
            rows={
              data?.byBusinessModel
            }
            dashboard="business-model"
          />
        </div>
      </>
    );

  const renderBusinessDemand =
    () => (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Doanh nghiệp trong mẫu"
            value={formatNumber(
              data?.businessCount,
            )}
            loading={loading}
          />
        </div>

        <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm leading-6 text-text">
          Mỗi nhóm câu hỏi có mẫu số người trả lời riêng.
          Với câu hỏi chọn nhiều đáp án, tổng tỷ lệ có thể vượt 100%.
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DemandGroup
            title="Thành phố mục tiêu"
            group={data?.targetCities}
          />

          <DemandGroup
            title="Mức độ hư hỏng"
            group={data?.damageLevels}
          />

          <DemandGroup
            title="Tình trạng sử dụng"
            group={
              data?.functionalityStatuses
            }
          />

          <DemandGroup
            title="Quy mô thu mua"
            group={
              data?.procurementScales
            }
          />

          <DemandGroup
            title="Loại sản phẩm"
            group={data?.productTypes}
          />

          <DemandGroup
            title="Thành phố phục vụ"
            group={data?.serviceCities}
          />

          <DemandGroup
            title="Phường/xã phục vụ"
            group={data?.serviceWards}
          />
        </div>
      </>
    );

  const renderBusinessPerformance =
    () => (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Thanh toán đủ điều kiện"
            value={formatNumber(
              data
                ?.eligiblePaidPaymentCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Thanh toán có doanh nghiệp"
            value={formatNumber(
              data
                ?.businessPaymentCount,
            )}
            hint={`Tỷ trọng ${formatPercent(
              data
                ?.businessPaymentSharePercent,
            )}`}
            loading={loading}
          />

          <KpiCard
            label="Đơn hoàn tất"
            value={formatNumber(
              data
                ?.completedOrderCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Tổng giá trị đơn hoàn tất"
            value={formatMoney(
              data
                ?.totalCompletedOrderValue,
            )}
            loading={loading}
            valueClassName="text-primary"
          />

          <KpiCard
            label="Giá trị doanh nghiệp mua"
            value={formatMoney(
              data
                ?.businessPurchaseValue,
            )}
            loading={loading}
          />

          <KpiCard
            label="Giá trị doanh nghiệp bán"
            value={formatMoney(
              data
                ?.businessSalesValue,
            )}
            hint={`Tỷ trọng ${formatPercent(
              data
                ?.businessSalesSharePercent,
            )}`}
            loading={loading}
          />

          <KpiCard
            label="Doanh nghiệp mua"
            value={formatNumber(
              data
                ?.purchasingBusinessCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Doanh nghiệp bán"
            value={formatNumber(
              data
                ?.sellingBusinessCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Thanh toán chưa phân loại"
            value={formatNumber(
              data
                ?.unclassifiedPaymentCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Đơn thiếu giá trị"
            value={formatNumber(
              data
                ?.ordersWithMissingAmountCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Đơn chưa phân loại"
            value={formatNumber(
              data
                ?.unclassifiedOrderCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Đơn doanh nghiệp mua"
            value={formatNumber(
              data
                ?.businessPurchaseOrderCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Đơn doanh nghiệp bán"
            value={formatNumber(
              data
                ?.businessSalesOrderCount,
            )}
            loading={loading}
          />
        </div>

        <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm leading-6 text-text">
          Giá trị đơn hoàn tất sử dụng tổng tiền cuối cùng
          và có thể bao gồm phí giao hàng đã cấu hình.
          Đây không phải doanh thu thuần của nền tảng.
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <TradeTable
            title="Cơ cấu thanh toán"
            rows={data?.paymentGroups}
          />

          <TradeTable
            title="Cơ cấu đơn hoàn tất"
            rows={
              data
                ?.completedOrderGroups
            }
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SeriesTable
            title="Thanh toán có doanh nghiệp theo kỳ"
            rows={
              data
                ?.businessPaymentSeries
            }
          />

          <SeriesTable
            title="Giá trị bán của doanh nghiệp theo kỳ"
            rows={
              data
                ?.businessSalesSeries
            }
            amount
          />
        </div>
      </>
    );

  const renderBody = () => {
    if (
      config.type ===
      "operation"
    ) {
      return renderOperation();
    }

    if (
      config.type ===
      "dispute"
    ) {
      return renderDispute();
    }

    if (
      config.type ===
      "business-overview"
    ) {
      return renderBusinessOverview();
    }

    if (
      config.type ===
      "business-demand"
    ) {
      return renderBusinessDemand();
    }

    return renderBusinessPerformance();
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              {config.eyebrow}
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              {config.title}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              {config.description}
            </p>

            {!loading &&
              data?.generatedAtUtc && (
                <p className="mt-3 text-xs font-semibold text-white/60">
                  Cập nhật lúc{" "}
                  {formatDateTime(
                    data.generatedAtUtc,
                  )}
                </p>
              )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
            >
              <span className="material-symbols-outlined text-[20px]">
                space_dashboard
              </span>
              Tổng quan
            </Link>

            <button
              type="button"
              onClick={() =>
                setRequestVersion(
                  (current) =>
                    current + 1,
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
            >
              <span className="material-symbols-outlined text-[20px]">
                refresh
              </span>
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.04)]"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {renderFilters()}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90"
          >
            Áp dụng
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-black text-text transition hover:bg-background"
          >
            Mặc định
          </button>
        </div>

        {filterError && (
          <p className="mt-3 text-sm font-semibold text-error">
            {filterError}
          </p>
        )}

        {dashboard ===
          "business-demand" &&
          productTypeError && (
            <p className="mt-3 text-sm font-semibold text-warning">
              {productTypeError}
            </p>
          )}
      </form>

      {!loading &&
        data?.period && (
          <div className="rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-xs leading-5 text-textLight">
            Kỳ hiện tại:{" "}
            <strong className="text-text">
              {formatDate(
                data.period.from,
              )}
            </strong>
            {" → trước "}
            <strong className="text-text">
              {formatDate(
                data.period
                  .toExclusive,
              )}
            </strong>
            {" · kỳ trước từ "}
            <strong className="text-text">
              {formatDate(
                data.period
                  .previousFrom,
              )}
            </strong>
            {" · UTC+7"}
          </div>
        )}

      {!loading &&
        data?.period
          ?.isPartialPeriod && (
          <div className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-text">
            Dữ liệu kỳ hiện tại chưa hoàn tất.
          </div>
        )}

      {state.error &&
        !loading && (
          <div
            role="alert"
            className="rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm font-semibold text-error"
          >
            {state.error}
          </div>
        )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LoadingBlock className="h-36 w-full" />
          <LoadingBlock className="h-36 w-full" />
          <LoadingBlock className="h-36 w-full" />
          <LoadingBlock className="h-36 w-full" />
        </div>
      ) : (
        renderBody()
      )}
    </section>
  );
}
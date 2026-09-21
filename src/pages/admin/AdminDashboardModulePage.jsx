import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DashboardColumnChart,
  DashboardDonutChart,
  DashboardHorizontalBarChart,
  DashboardLineChart,
} from "../../components/admin/AdminDashboardCharts";
import { FinanceAmountBarChart } from "../../components/admin/AdminFinanceCharts";
import adminDashboardApi from "../../services/apis/adminDashboardApi";
import disputeCategoryApi from "../../services/apis/disputeCategoryApi";
import productTypeApi from "../../services/apis/productTypeApi";
import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import {
  APPOINTMENT_SECTION_TABS,
  DISPUTE_SECTION_TABS,
  ORDER_SECTION_TABS,
} from "../../constants/adminSections";

const GROUP_OPTIONS = [
  { value: "Day", label: "Mỗi ngày" },
  { value: "Week", label: "Mỗi tuần" },
  { value: "Month", label: "Mỗi tháng" },
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

const DELIVERY_METHOD_OPTIONS = [
  { value: "", label: "Tất cả cách giao nhận" },
  { value: "GhnDelivery", label: "Giao hàng nhanh (GHN)" },
  { value: "SellerDelivers", label: "Người bán giao hàng" },
  { value: "BuyerPickUp", label: "Người mua tự đến lấy" },
  { value: "Unknown", label: "Chưa xác định" },
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
    title: "Thanh toán",
    eyebrow: "TỔNG QUAN VẬN HÀNH",
    description:
      "Theo dõi trạng thái thanh toán hiện tại, thời gian chờ và các lượt thanh toán thành công trong kỳ.",
    apiMethod: "getPayments",
  },
  orders: {
    type: "operation",
    title: "Đơn hàng",
    eyebrow: "TỔNG QUAN VẬN HÀNH",
    description:
      "Theo dõi các đơn hàng đang xử lý và các sự kiện hoàn tất, hủy, hoàn trả trong kỳ.",
    apiMethod: "getOrders",
  },
  appointments: {
    type: "operation",
    title: "Lịch hẹn",
    eyebrow: "TỔNG QUAN VẬN HÀNH",
    description:
      "Theo dõi lịch kiểm định, thu gom, đề xuất đổi lịch và ngày hẹn trong kỳ.",
    apiMethod: "getAppointments",
  },
  disputes: {
    type: "dispute",
    title: "Tranh chấp",
    eyebrow: "TỔNG QUAN VẬN HÀNH",
    description:
      "Theo dõi các tranh chấp chưa giải quyết, thời gian xử lý và số tranh chấp mở mới, được giải quyết trong kỳ.",
    apiMethod: "getDisputes",
  },
  "business-overview": {
    type: "business-overview",
    title: "Tổng quan doanh nghiệp",
    eyebrow: "TỔNG QUAN DOANH NGHIỆP",
    description:
      "Theo dõi tài khoản doanh nghiệp, hồ sơ, khảo sát và mức độ hoàn thiện dữ liệu.",
    apiMethod: "getBusinessOverview",
  },
  "business-demand": {
    type: "business-demand",
    title: "Nhu cầu doanh nghiệp",
    eyebrow: "TỔNG QUAN DOANH NGHIỆP",
    description:
      "Tổng hợp nhu cầu khảo sát hiện tại theo từng nhóm câu hỏi và phạm vi phục vụ.",
    apiMethod: "getBusinessDemand",
  },
  "business-performance": {
    type: "business-performance",
    title: "Hoạt động mua bán của doanh nghiệp",
    eyebrow: "TỔNG QUAN DOANH NGHIỆP",
    description:
      "Theo dõi tỷ trọng thanh toán và giá trị mua bán của tài khoản doanh nghiệp.",
    apiMethod: "getBusinessPerformance",
  },
};

const PERIOD_SCOPE_NOTES = {
  "business-performance":
    "Toàn bộ số liệu Hoạt động mua bán của doanh nghiệp được giới hạn theo khoảng thời gian đã chọn.",
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
  ghndelivery: "Giao hàng nhanh (GHN)",
  sellerdelivers: "Người bán giao hàng",
  buyerpickup: "Người mua tự đến lấy",
  unspecified: "Chưa xác định",
  buyerfavored: "Nghiêng về người mua",
  sellerfavored: "Nghiêng về người bán",
  violationconfirmed: "Xác nhận có vi phạm",
  noviolation: "Không vi phạm",
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

const BUSINESS_DEMAND_LABELS = {
  cosmeticdamage: "Hư hỏng ngoại quan",
  minordamage: "Hư hỏng nhẹ",
  none: "Không hư hỏng",
  moderatedamage: "Hư hỏng vừa",
  severedamage: "Hư hỏng nặng",
  totalloss: "Hư hỏng hoàn toàn",
  fullyfunctional: "Hoạt động đầy đủ",
  partiallyfunctional: "Hoạt động một phần",
  nonfunctional: "Không hoạt động",
  bulklot: "Thu mua theo lô",
  retail: "Thu mua lẻ",
};

const demandLabelFor = (value) =>
  BUSINESS_DEMAND_LABELS[
    normalize(value)
  ] ||
  String(value || "Chưa xác định");
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

const formatCompactMoney = (value) =>
  `${new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)} ₫`;
const formatPercent = (value) =>
  value === null ||
  value === undefined
    ? "—"
    : `${formatDecimal(value)}%`;

const formatHours = (value) =>
  value === null ||
  value === undefined
    ? "—"
    : `${formatDecimal(value)} giờ`;

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

const PaymentMethodTable = ({
  rows,
}) => (
  <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
    <h3 className="text-lg font-black text-text">
      Kết quả theo phương thức thanh toán
    </h3>

    <p className="mt-1 text-xs leading-5 text-textLight">
      Tính trên toàn bộ thanh toán theo bộ lọc, không giới hạn theo kỳ. Thành công là thanh toán đã có thời điểm thanh toán.
    </p>

    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-textLight">
            <th className="px-3 py-3">
              Phương thức
            </th>
            <th className="px-3 py-3 text-right">
              Tổng
            </th>
            <th className="px-3 py-3 text-right">
              Thành công
            </th>
            <th className="px-3 py-3 text-right">
              Thất bại
            </th>
            <th className="px-3 py-3 text-right">
              Tỷ lệ thành công
            </th>
          </tr>
        </thead>

        <tbody>
          {!Array.isArray(rows) ||
          rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-8 text-center text-textLight"
              >
                Chưa có dữ liệu.
              </td>
            </tr>
          ) : (
            rows.map(
              (item, index) => (
                <tr
                  key={`${item.method}-${index}`}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-3 py-3 font-bold text-text">
                    {labelFor(
                      item.method,
                      "payments",
                    )}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {formatNumber(
                      item.totalCount,
                    )}
                  </td>

                  <td className="px-3 py-3 text-right font-black text-success">
                    {formatNumber(
                      item.paidCount,
                    )}
                  </td>

                  <td className="px-3 py-3 text-right font-black text-error">
                    {formatNumber(
                      item.failedCount,
                    )}
                  </td>

                  <td className="px-3 py-3 text-right font-black text-text">
                    {item.successRate ===
                      null ||
                    item.successRate ===
                      undefined
                      ? "—"
                      : `${formatDecimal(
                          item.successRate,
                        )}%`}
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
const isSupportedTradePair = (item) => {
  const buyerRole = normalize(item?.buyerRole);
  const sellerRole = normalize(item?.sellerRole);

  return (
    (buyerRole === "business" &&
      sellerRole === "personal") ||
    (buyerRole === "personal" &&
      sellerRole === "personal")
  );
};

const TradeChart = ({
  title,
  rows,
}) => {
  const visibleRows = (
    Array.isArray(rows)
      ? rows.filter(isSupportedTradePair)
      : []
  ).filter(
    (item) =>
      (Number(item?.count) || 0) > 0 ||
      (Number(item?.amount) || 0) > 0,
  );

  const maxCount = Math.max(
    1,
    ...visibleRows.map(
      (item) => Number(item?.count) || 0,
    ),
  );

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
      <h3 className="text-lg font-black text-text">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-textLight">
        Phân bố số giao dịch theo vai trò bên mua / bên bán trong kỳ.
        Giá trị tiền được giữ làm thông tin bổ sung.
      </p>

      {visibleRows.length === 0 ? (
        <div className="mt-5 flex min-h-40 items-center justify-center rounded-xl bg-background px-4 text-center text-sm font-semibold text-textLight">
          Chưa có giao dịch phù hợp trong kỳ.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {visibleRows.map(
            (item, index) => {
              const count =
                Number(item?.count) || 0;
              const width =
                count > 0
                  ? Math.max(
                      4,
                      (count / maxCount) * 100,
                    )
                  : 0;

              return (
                <div
                  key={`${item.buyerRole}-${item.sellerRole}-${index}`}
                >
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-bold text-text">
                      {labelFor(
                        item.buyerRole,
                      )}
                      {" mua → "}
                      {labelFor(
                        item.sellerRole,
                      )}
                      {" bán"}
                    </span>

                    <span className="text-sm font-black text-text">
                      {formatNumber(count)}
                      {" giao dịch · "}
                      {formatMoney(
                        item.amount,
                      )}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </section>
  );
};

const hasPositiveSeriesValue = (
  rows,
  key,
) =>
  Array.isArray(rows) &&
  rows.some(
    (item) =>
      (Number(item?.[key]) || 0) > 0,
  );

const EmptyPerformanceChart = ({
  title,
  message,
}) => (
  <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
    <h3 className="text-lg font-black text-text">
      {title}
    </h3>

    <div className="mt-5 flex min-h-64 items-center justify-center rounded-xl bg-background px-6 text-center text-sm font-semibold leading-6 text-textLight">
      {message}
    </div>
  </section>
);
const DemandGroup = ({
  title,
  group,
}) => {
  const items = Array.isArray(group?.items)
    ? group.items
    : [];

  return (
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

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl bg-background px-4 py-5 text-center text-sm text-textLight">
          Chưa có dữ liệu.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map(
            (item, index) => {
              const percentage =
                Math.max(
                  0,
                  Math.min(
                    100,
                    Number(
                      item.percentage,
                    ) || 0,
                  ),
                );

              return (
                <div
                  key={`${item.key}-${index}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <span className="min-w-0 text-sm font-bold text-text">
                      {demandLabelFor(
                        item.label ||
                          item.key,
                      )}
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

                  <div
                    className="h-3 overflow-hidden rounded-full bg-background"
                    role="img"
                    aria-label={`${demandLabelFor(
                      item.label ||
                        item.key,
                    )}: ${formatDecimal(
                      item.percentage,
                    )}%`}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{
                        width:
                          percentage > 0
                            ? `${Math.max(
                                3,
                                percentage,
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </section>
  );
};

const initialFilters = {
  from: "",
  to: "",
  groupBy: "Day",
  paymentStatus: "",
  paymentMethod: "",
  paymentType: "",
  orderStatus: "",
  deliveryMethod: "",
  appointmentStatus: "",
  appointmentType: "",
  status: "",
  targetType: "",
  disputeCategoryId: "",
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

  const [
    disputeCategoryOptions,
    setDisputeCategoryOptions,
  ] = useState([]);

  const [
    disputeCategoryLoading,
    setDisputeCategoryLoading,
  ] = useState(false);

  const [
    disputeCategoryError,
    setDisputeCategoryError,
  ] = useState("");

  const usesPeriod =
    config?.type ===
      "operation" ||
    config?.type ===
      "dispute" ||
    config?.type ===
      "business-performance";

  const splitsPeriod =
    config?.type === "operation" ||
    config?.type === "dispute" ||
    dashboard === "business-overview";

  const [periodError, setPeriodError] =
    useState("");

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

  /*
   * Nguyên nhân tranh chấp không còn là enum tĩnh - tải danh mục động
   * từ Admin API thay vì hard-code danh sách. Chỉ lấy danh mục đang hoạt
   * động cho bộ lọc (dữ liệu lịch sử vẫn hiển thị đúng tên Backend trả về
   * qua labelFor, không phụ thuộc danh sách này).
   */
  useEffect(() => {
    if (dashboard !== "disputes") {
      return undefined;
    }

    const controller =
      new AbortController();

    let active = true;

    const loadDisputeCategories =
      async () => {
        setDisputeCategoryLoading(
          true,
        );
        setDisputeCategoryError(
          "",
        );

        try {
          const items =
            await disputeCategoryApi.getAll(
              {
                isActive: true,
                signal:
                  controller.signal,
              },
            );

          if (!active) {
            return;
          }

          const options = (
            Array.isArray(items)
              ? items
              : []
          )
            .map((item) => ({
              value: String(
                item.disputeCategoryId,
              ),
              label:
                item.name ||
                item.code ||
                "Danh mục chưa đặt tên",
            }))
            .sort((a, b) =>
              a.label.localeCompare(
                b.label,
                "vi",
              ),
            );

          setDisputeCategoryOptions(
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

          setDisputeCategoryOptions(
            [],
          );

          setDisputeCategoryError(
            "Không thể tải danh mục tranh chấp. Các bộ lọc khác vẫn có thể sử dụng.",
          );
        } finally {
          if (active) {
            setDisputeCategoryLoading(
              false,
            );
          }
        }
      };

    loadDisputeCategories();

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

  const disputeCategoryFilterOptions = [
    {
      value: "",
      label:
        disputeCategoryLoading
          ? "Đang tải nguyên nhân..."
          : "Tất cả nguyên nhân",
    },
    ...disputeCategoryOptions,
  ];

  const applyPeriod = (event) => {
    event.preventDefault();

    const message = validatePeriod(
      draft.from,
      draft.to,
    );

    if (message) {
      setPeriodError(message);
      return;
    }

    setPeriodError("");

    setFilters((current) => ({
      ...current,
      from: draft.from,
      to: draft.to,
      groupBy: draft.groupBy,
    }));

    setRequestVersion(
      (current) => current + 1,
    );
  };

  const resetPeriod = () => {
    const period = {
      from: "",
      to: "",
      groupBy: "Day",
    };

    setDraft((current) => ({
      ...current,
      ...period,
    }));

    setFilters((current) => ({
      ...current,
      ...period,
    }));

    setPeriodError("");

    setRequestVersion(
      (current) => current + 1,
    );
  };

  const applyFilters = (
    event,
  ) => {
    event.preventDefault();

    if (splitsPeriod) {
      setFilterError("");

      setFilters((current) => ({
        ...draft,
        from: current.from,
        to: current.to,
        groupBy: current.groupBy,
      }));

      setRequestVersion(
        (current) => current + 1,
      );

      return;
    }

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
    if (splitsPeriod) {
      const keepPeriod = (current) => ({
        ...initialFilters,
        from: current.from,
        to: current.to,
        groupBy: current.groupBy,
      });

      setDraft(keepPeriod);
      setFilters(keepPeriod);
      setFilterError("");

      setRequestVersion(
        (current) => current + 1,
      );

      return;
    }

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
          "Nhóm biểu đồ theo",
          "groupBy",
          GROUP_OPTIONS,
        )}
      </>
    );

  const renderFilters =
    () => {
      const fields = [];

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
          renderSelect(
            "Cách giao nhận",
            "deliveryMethod",
            DELIVERY_METHOD_OPTIONS,
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
            "disputeCategoryId",
            disputeCategoryFilterOptions,
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

      if (usesPeriod && !splitsPeriod) {
        fields.push(
          <div
            key="period-range"
            className="contents"
          >
            {renderPeriodFilters()}
          </div>,
        );
      }

      return fields;
    };

  const renderOperation =
    () => {
      if (
        dashboard ===
        "payments"
      ) {
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Tổng thanh toán"
                value={formatNumber(
                  data?.totalPayments,
                )}
                hint="Toàn bộ yêu cầu thanh toán theo bộ lọc, không giới hạn theo kỳ."
                loading={loading}
              />

              <KpiCard
                label="Chờ thanh toán"
                value={formatNumber(
                  data?.pendingCount,
                )}
                hint="Số yêu cầu thanh toán hiện đang ở trạng thái chờ."
                loading={loading}
                valueClassName="text-warning"
              />

              <KpiCard
                label="Thời gian chờ trung bình"
                value={formatHours(
                  data?.averagePendingAgeHours,
                )}
                hint="Tính từ khi yêu cầu thanh toán được tạo đến hiện tại, cho các thanh toán vẫn đang chờ."
                loading={loading}
                valueClassName="text-warning"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DashboardDonutChart
                title="Cơ cấu trạng thái thanh toán"
                description="Trạng thái hiện tại của các thanh toán sau khi áp dụng bộ lọc; không giới hạn theo kỳ."
                rows={
                  data?.currentStatusDistribution
                }
                getLabel={(item) =>
                  labelFor(
                    item.label ||
                      item.key,
                    "payments",
                  )
                }
              />

              <DashboardColumnChart
                title="Thời gian chờ thanh toán"
                description="Phân bố các thanh toán đang chờ theo thời gian đã trôi qua kể từ khi yêu cầu thanh toán được tạo."
                rows={
                  data?.pendingAgingDistribution
                }
                getLabel={(item) =>
                  item.label ||
                  item.key
                }
              />
            </div>

            <PaymentMethodTable
              rows={
                data?.paymentMethodPerformance
              }
            />

          </>
        );
      }

      if (
        dashboard ===
        "orders"
      ) {
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Tổng đơn"
                value={formatNumber(
                  data?.totalOrders,
                )}
                hint="Toàn bộ đơn hàng theo bộ lọc, không giới hạn theo kỳ."
                loading={loading}
              />

              <KpiCard
                label="Đơn đang hoạt động"
                value={formatNumber(
                  data?.activeOrderCount,
                )}
                hint="Đơn hiện ở trạng thái chờ xử lý, đang xử lý hoặc đang tranh chấp."
                loading={loading}
                valueClassName="text-primary"
              />

              <KpiCard
                label="Đơn đang hoạt động lâu nhất"
                value={formatHours(
                  data?.oldestActiveOrderAgeHours,
                )}
                hint={`Thời gian trung bình kể từ khi tạo: ${formatHours(
                  data?.averageActiveOrderAgeHours,
                )}. Tính cho các đơn đang hoạt động, từ lúc tạo đơn đến hiện tại.`}
                loading={loading}
                valueClassName="text-error"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DashboardDonutChart
                title="Cơ cấu trạng thái đơn hàng"
                description="Trạng thái hiện tại của toàn bộ đơn sau khi áp dụng bộ lọc; không giới hạn theo kỳ."
                rows={
                  data?.currentStatusDistribution
                }
                getLabel={(item) =>
                  labelFor(
                    item.label ||
                      item.key,
                    "orders",
                  )
                }
              />

              <DashboardColumnChart
                title="Thời gian kể từ khi tạo đơn"
                description="Phân bố các đơn đang hoạt động theo thời gian đã trôi qua kể từ lúc tạo đơn (không phải thời gian ở trạng thái hiện tại)."
                rows={
                  data?.activeOrderAgingDistribution
                }
                getLabel={(item) =>
                  item.label ||
                  item.key
                }
              />
            </div>

          </>
        );
      }

      return (
        <>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6 text-text">
            Trang này chỉ hiển thị dữ liệu của các lịch hẹn đang có hiệu lực.
            Đề xuất đổi lịch chưa được chấp nhận và lịch cũ đã bị thay thế không được tính như một lịch hiệu lực.
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Tổng lịch hiệu lực"
              value={formatNumber(
                data?.totalAppointments,
              )}
              hint="Lịch hẹn đang có hiệu lực theo bộ lọc, không giới hạn theo kỳ."
              loading={loading}
            />

            <KpiCard
              label="Lịch hôm nay"
              value={formatNumber(
                data?.todayCount,
              )}
              loading={loading}
            />

            <KpiCard
              label="Lịch sắp tới"
              value={formatNumber(
                data?.upcomingCount,
              )}
              loading={loading}
              valueClassName="text-primary"
            />

            <KpiCard
              label="Quá thời gian hẹn"
              value={formatNumber(
                data?.overdueCount,
              )}
              hint="Lịch đã qua giờ hẹn (kể cả thời gian chờ cho phép) nhưng chưa hoàn tất hoặc chưa đủ hai bên điểm danh."
              loading={loading}
              valueClassName="text-error"
            />

            <KpiCard
              label="Đề xuất đổi lịch"
              value={formatNumber(
                data?.rescheduleProposalCount,
              )}
              hint="Đề xuất dời lịch đang chờ bên còn lại chấp nhận."
              loading={loading}
              valueClassName="text-warning"
            />

            <KpiCard
              label="Lịch có tranh chấp mở"
              value={formatNumber(data?.openDisputeAppointmentCount)}
              hint="Lịch hẹn hiệu lực đang gắn với tranh chấp chưa giải quyết."
              loading={loading}
              valueClassName="text-error"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardDonutChart
              title="Trạng thái lịch hiệu lực"
              description="Trạng thái hiện tại của các lịch hẹn, sau khi loại các đề xuất chưa được chấp nhận và lịch đã bị thay thế."
              rows={
                data?.currentStatusDistribution
              }
              getLabel={(item) =>
                labelFor(
                  item.label ||
                    item.key,
                  "appointments",
                )
              }
            />

          </div>

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
              data?.totalDisputes,
            )}
            loading={loading}
          />

          <KpiCard
            label="Chưa xử lý xong"
            value={formatNumber(
              data?.unresolvedDisputeCount,
            )}
            loading={loading}
            valueClassName="text-error"
          />

          <KpiCard
            label="Tranh chấp chờ xử lý lâu nhất"
            value={formatHours(
              data?.oldestUnresolvedAgeHours,
            )}
            hint="Thời gian kể từ khi tranh chấp chưa giải quyết được tạo đến hiện tại."
            loading={loading}
            valueClassName="text-error"
          />

          <KpiCard
            label="Nguyên nhân chưa xác định"
            value={formatNumber(
              data?.unknownCategoryCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Tiền đang tạm giữ do tranh chấp"
            value={formatMoney(data?.currentDisputedHeldAmount)}
            hint="Số tiền hiện đang tạm giữ của các đơn có tranh chấp chưa giải quyết; là tiền của người dùng đang bị giữ, không phải doanh thu hay thiệt hại."
            loading={loading}
            valueClassName="text-warning"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardDonutChart
            title="Cơ cấu trạng thái tranh chấp"
            description="Trạng thái hiện tại của toàn bộ tranh chấp sau khi áp dụng bộ lọc."
            rows={
              data?.currentStatusDistribution
            }
            getLabel={(item) =>
              labelFor(
                item.label ||
                  item.key,
                "disputes",
              )
            }
          />

          <DistributionPanel
            title="Theo nguyên nhân"
            description="Phân bố tất cả tranh chấp theo nguyên nhân."
            rows={
              data?.categoryDistribution
            }
            dashboard="disputes"
          />

          <DashboardHorizontalBarChart
            title="Tranh chấp chưa xử lý theo nguyên nhân"
            description="Tập trung vào các nhóm nguyên nhân hiện còn tranh chấp chưa giải quyết."
            rows={
              data?.unresolvedByCategory
            }
            getLabel={(item) =>
              labelFor(
                item.label ||
                  item.key,
                "disputes",
              )
            }
            hideZero
          />

          <DashboardColumnChart
            title="Thời gian chờ xử lý tranh chấp"
            description="Phân bố các tranh chấp chưa giải quyết theo thời gian kể từ khi tranh chấp được tạo."
            rows={
              data?.unresolvedAgingDistribution
            }
            getLabel={(item) =>
              item.label ||
              item.key
            }
          />
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
            label="Tỷ lệ đã làm khảo sát"
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
            label="Hồ sơ doanh nghiệp được thống kê"
            value={formatNumber(
              data?.businessCount,
            )}
            hint="Số hồ sơ doanh nghiệp thỏa bộ lọc; các nhóm bên dưới thống kê theo khảo sát hiện tại của những hồ sơ này."
            loading={loading}
          />
        </div>

        <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm leading-6 text-text">
          Tỷ lệ của mỗi nhóm được tính trên số doanh nghiệp đã trả lời nhóm đó.
          Với câu hỏi cho phép chọn nhiều đáp án, tổng tỷ lệ có thể vượt 100%.
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
            label="Thanh toán đơn hàng thành công"
            value={formatNumber(
              data
                ?.eligiblePaidPaymentCount,
            )}
            hint="Thanh toán đặt cọc hoặc thanh toán toàn bộ đã thanh toán thành công trong kỳ."
            loading={loading}
          />

          <KpiCard
            label="Thanh toán có doanh nghiệp tham gia"
            value={formatNumber(
              data
                ?.businessPaymentCount,
            )}
            hint={`Chiếm ${formatPercent(
              data
                ?.businessPaymentSharePercent,
            )} số thanh toán đơn hàng thành công trong kỳ.`}
            loading={loading}
          />

          <KpiCard
            label="Đơn hoàn tất trong kỳ"
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
            hint="Tổng tiền cuối cùng của các đơn hoàn tất trong kỳ; là giá trị mua bán giữa người dùng, không phải doanh thu HomeCycle."
            loading={loading}
            valueClassName="text-primary"
          />

          <KpiCard
            label="Giá trị doanh nghiệp mua"
            value={formatMoney(
              data
                ?.businessPurchaseValue,
            )}
            hint="Giá trị đơn hoàn tất trong kỳ mà bên mua là doanh nghiệp."
            loading={loading}
          />

          <KpiCard
            label="Giá trị doanh nghiệp bán"
            value={formatMoney(
              data
                ?.businessSalesValue,
            )}
            hint={`Giá trị đơn hoàn tất mà bên bán là doanh nghiệp; chiếm ${formatPercent(
              data
                ?.businessSalesSharePercent,
            )} tổng giá trị đơn hoàn tất.`}
            loading={loading}
          />

          <KpiCard
            label="Số doanh nghiệp có mua"
            value={formatNumber(
              data
                ?.purchasingBusinessCount,
            )}
            loading={loading}
          />

          <KpiCard
            label="Số doanh nghiệp có bán"
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
            hint="Không xác định được vai trò bên mua hoặc bên bán."
            loading={loading}
          />

          <KpiCard
            label="Đơn chưa có tổng tiền"
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
            hint="Không xác định được vai trò bên mua hoặc bên bán."
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
          Giá trị đơn hoàn tất là tổng tiền cuối cùng của đơn (giá trị mua bán giữa người dùng)
          và có thể bao gồm phí giao hàng đã cấu hình.
          Đây không phải doanh thu của HomeCycle.
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <TradeChart
            title="Thanh toán theo vai trò bên mua / bên bán"
            rows={data?.paymentGroups}
          />

          <TradeChart
            title="Đơn hoàn tất theo vai trò bên mua / bên bán"
            rows={
              data
                ?.completedOrderGroups
            }
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {hasPositiveSeriesValue(
            data?.businessPaymentSeries,
            "count",
          ) ? (
            <DashboardLineChart
              title="Thanh toán có doanh nghiệp tham gia theo kỳ"
              description="Số thanh toán có ít nhất một bên là doanh nghiệp, được nhóm theo kỳ đang chọn."
              rows={
                data
                  ?.businessPaymentSeries
              }
              series={[
                {
                  key: "count",
                  label: "Thanh toán",
                  className:
                    "text-primary",
                },
              ]}
            />
          ) : (
            <EmptyPerformanceChart
              title="Thanh toán có doanh nghiệp tham gia theo kỳ"
              message="Chưa có thanh toán có doanh nghiệp tham gia trong kỳ đã chọn."
            />
          )}

          {hasPositiveSeriesValue(
            data?.businessSalesSeries,
            "amount",
          ) ? (
            <DashboardLineChart
              title="Giá trị bán của doanh nghiệp theo kỳ"
              description="Giá trị đơn hoàn tất có bên bán là doanh nghiệp, được nhóm theo kỳ đang chọn."
              rows={
                data
                  ?.businessSalesSeries
              }
              series={[
                {
                  key: "amount",
                  label: "Giá trị bán",
                  className:
                    "text-success",
                },
              ]}
              valueFormatter={
                formatMoney
              }
              axisValueFormatter={
                formatCompactMoney
              }
            />
          ) : (
            <EmptyPerformanceChart
              title="Giá trị bán của doanh nghiệp theo kỳ"
              message="Chưa có đơn hoàn tất có bên bán là doanh nghiệp trong kỳ đã chọn, nên không hiển thị chuỗi 0 ₫ kéo dài."
            />
          )}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            ĐƠN CÓ DOANH NGHIỆP THAM GIA
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Chất lượng đơn và xếp hạng doanh nghiệp
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Tính trên các đơn tạo trong kỳ mà bên mua hoặc bên bán hiện là doanh nghiệp; tỷ lệ dùng trạng thái hiện tại của các đơn đó.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Đơn tạo trong kỳ có doanh nghiệp"
            value={formatNumber(data?.createdBusinessOrderCount)}
            loading={loading}
          />

          <KpiCard
            label="Tỷ lệ hủy"
            value={formatPercent(data?.cancellationRate)}
            hint="Đơn hiện ở trạng thái đã hủy trên tổng đơn tạo trong kỳ có doanh nghiệp tham gia."
            loading={loading}
            valueClassName="text-warning"
          />

          <KpiCard
            label="Tỷ lệ phát sinh tranh chấp"
            value={formatPercent(data?.disputeRate)}
            hint="Đơn có tranh chấp về đơn hàng trên tổng đơn tạo trong kỳ có doanh nghiệp tham gia."
            loading={loading}
            valueClassName="text-error"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardHorizontalBarChart
            title="Lý do hủy đơn"
            description="Số đơn đã hủy (tạo trong kỳ, có doanh nghiệp tham gia) theo lý do hủy được ghi nhận."
            rows={(data?.cancellationReasons || []).map((item) => ({
              key: item.key,
              label: normalize(item.key) === "unspecified" ? "Không ghi lý do" : item.label,
              count: item.count,
            }))}
            getLabel={(item) => item.label}
            hideZero
          />

          <DashboardHorizontalBarChart
            title="Nguyên nhân tranh chấp"
            description="Số tranh chấp về đơn hàng của các đơn tạo trong kỳ có doanh nghiệp tham gia, theo danh mục nguyên nhân."
            rows={(data?.disputeReasons || []).map((item) => ({
              key: item.key,
              label: normalize(item.key) === "unspecified" ? "Chưa xác định" : item.label,
              count: item.count,
            }))}
            getLabel={(item) => item.label}
            hideZero
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <FinanceAmountBarChart
            title="Doanh nghiệp bán nhiều nhất"
            description="Tối đa 10 doanh nghiệp theo giá trị đơn hoàn tất trong kỳ mà họ là bên bán."
            rows={(data?.topSellers || []).map((item) => ({
              key: item.userId,
              label: `${item.name || "Doanh nghiệp"} · ${formatNumber(item.completedOrderCount)} đơn`,
              amount: item.gmv,
            }))}
            getLabel={(item) => item.label}
          />

          <FinanceAmountBarChart
            title="Doanh nghiệp mua nhiều nhất"
            description="Tối đa 10 doanh nghiệp theo giá trị đơn hoàn tất trong kỳ mà họ là bên mua."
            rows={(data?.topBuyers || []).map((item) => ({
              key: item.userId,
              label: `${item.name || "Doanh nghiệp"} · ${formatNumber(item.completedOrderCount)} đơn`,
              amount: item.gmv,
            }))}
            getLabel={(item) => item.label}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {(data?.contributionSeries || []).some(
            (point) =>
              (Number(point?.businessOrderCount) || 0) +
                (Number(point?.personalOrderCount) || 0) >
              0,
          ) ? (
            <DashboardLineChart
              title="Đơn hoàn tất: doanh nghiệp so với cá nhân"
              description="Số đơn hoàn tất theo kỳ, tách theo đơn có doanh nghiệp tham gia và đơn chỉ giữa cá nhân."
              rows={data?.contributionSeries}
              series={[
                { key: "businessOrderCount", label: "Có doanh nghiệp", className: "text-primary" },
                { key: "personalOrderCount", label: "Chỉ cá nhân", className: "text-textLight" },
              ]}
            />
          ) : (
            <EmptyPerformanceChart
              title="Đơn hoàn tất: doanh nghiệp so với cá nhân"
              message="Chưa có đơn hoàn tất trong kỳ đã chọn."
            />
          )}

          {(data?.contributionSeries || []).some(
            (point) =>
              (Number(point?.businessGmv) || 0) +
                (Number(point?.personalGmv) || 0) >
              0,
          ) ? (
            <DashboardLineChart
              title="Giá trị đơn hoàn tất: doanh nghiệp so với cá nhân"
              description="Tổng tiền cuối cùng của đơn hoàn tất theo kỳ; là giá trị mua bán giữa người dùng, không phải doanh thu HomeCycle."
              rows={data?.contributionSeries}
              series={[
                { key: "businessGmv", label: "Có doanh nghiệp", className: "text-primary" },
                { key: "personalGmv", label: "Chỉ cá nhân", className: "text-textLight" },
              ]}
              valueFormatter={formatMoney}
              axisValueFormatter={formatCompactMoney}
            />
          ) : (
            <EmptyPerformanceChart
              title="Giá trị đơn hoàn tất: doanh nghiệp so với cá nhân"
              message="Chưa có giá trị đơn hoàn tất trong kỳ đã chọn."
            />
          )}
        </div>

        <DashboardHorizontalBarChart
          title="Khu vực giao dịch của doanh nghiệp"
          description="Số đơn tạo trong kỳ có doanh nghiệp tham gia, theo thành phố của bài đăng."
          rows={(data?.transactionRegions || []).map((item) => ({
            key: item.city || "unspecified",
            label: item.city || "Chưa rõ",
            count: item.orderCount,
          }))}
          getLabel={(item) => item.label}
          hideZero
        />
      </>
    );

  const renderPeriodContent = () => {
    if (dashboard === "payments") {
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Đã thanh toán trong kỳ"
                value={formatNumber(
                  data?.paidInPeriodCount,
                )}
                loading={loading}
                valueClassName="text-success"
              />

          </div>

            <DashboardLineChart
              title="Thanh toán thành công theo kỳ"
              description="Xu hướng thanh toán thành công theo thời điểm thanh toán thực tế."
              rows={data?.paidSeries}
              series={[
                {
                  key: "count",
                  label: "Đã thanh toán",
                  className:
                    "text-success",
                },
              ]}
            />
        </>
      );
    }

    if (dashboard === "orders") {
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="Hoàn tất trong kỳ"
                value={formatNumber(
                  data?.completedInPeriodCount,
                )}
                loading={loading}
                valueClassName="text-success"
              />

              <KpiCard
                label="Đã hủy trong kỳ"
                value={formatNumber(
                  data?.cancelledInPeriodCount,
                )}
                loading={loading}
                valueClassName="text-warning"
              />

              <KpiCard
                label="Hoàn trả trong kỳ"
                value={formatNumber(
                  data?.returnedInPeriodCount,
                )}
                loading={loading}
              />

          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Đơn tạo trong kỳ"
              value={formatNumber(data?.createdInPeriodCount)}
              hint="Số đơn được tạo trong kỳ phân tích."
              loading={loading}
            />

            <KpiCard
              label="Giá trị giao dịch đơn hoàn tất"
              value={formatMoney(data?.gmv)}
              hint={`Tổng tiền cuối cùng (kể cả phí giao hàng đã cấu hình) của ${formatNumber(data?.successfulInPeriodCount)} đơn hoàn tất trong kỳ. Đây là giá trị mua bán giữa người dùng, không phải doanh thu HomeCycle.${Number(data?.successfulOrdersMissingAmountCount) > 0 ? ` ${formatNumber(data?.successfulOrdersMissingAmountCount)} đơn chưa có tổng tiền nên chưa được cộng.` : ""}`}
              loading={loading}
              valueClassName="text-primary"
            />

            <KpiCard
              label="Giá trị đơn trung bình"
              value={data?.averageOrderValue === null || data?.averageOrderValue === undefined ? "—" : formatMoney(data?.averageOrderValue)}
              hint={Number(data?.successfulOrdersMissingAmountCount) > 0 ? "Chưa tính được vì có đơn hoàn tất chưa có tổng tiền." : "Giá trị giao dịch chia cho số đơn hoàn tất trong kỳ."}
              loading={loading}
            />

            <KpiCard
              label="Tỷ lệ hoàn tất"
              value={formatPercent(data?.completionRate)}
              hint={`Tỷ lệ hủy/hoàn trả ${formatPercent(data?.cancellationReturnRate)}. Tính theo trạng thái hiện tại của các đơn tạo trong kỳ.`}
              loading={loading}
              valueClassName="text-success"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <DashboardDonutChart
              title="Trạng thái hiện tại của đơn tạo trong kỳ"
              description="Đơn được tạo trong kỳ, phân theo trạng thái hiện tại của chúng."
              rows={data?.createdStatusDistribution}
              getLabel={(item) => labelFor(item.label || item.key, "orders")}
            />

            <DashboardDonutChart
              title="Cách giao nhận của đơn tạo trong kỳ"
              description="Theo phương thức giao nhận mới nhất của từng đơn."
              rows={data?.deliveryMethodDistribution}
              getLabel={(item) => labelFor(item.label || item.key)}
            />

            <DashboardDonutChart
              title="Phương thức thanh toán trong kỳ"
              description="Theo các lượt thanh toán đặt cọc/thanh toán toàn bộ đã thanh toán thành công trong kỳ (kể cả khoản sau đó được hoàn tiền)."
              rows={data?.paymentMethodDistribution}
              getLabel={(item) => labelFor(item.label || item.key, "payments")}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardLineChart
              title="Đơn tạo mới và hoàn tất theo kỳ"
              description="Số đơn được tạo và số đơn hoàn tất theo thời điểm nghiệp vụ thực tế."
              rows={data?.tradeSeries}
              series={[
                { key: "createdCount", label: "Tạo mới", className: "text-primary" },
                { key: "completedCount", label: "Hoàn tất", className: "text-success" },
              ]}
            />

            <DashboardLineChart
              title="Giá trị giao dịch đơn hoàn tất theo kỳ"
              description="Tổng tiền cuối cùng của các đơn hoàn tất theo thời điểm hoàn tất; không phải doanh thu HomeCycle."
              rows={data?.tradeSeries}
              series={[
                { key: "gmv", label: "Giá trị giao dịch", className: "text-primary" },
              ]}
              valueFormatter={formatMoney}
              axisValueFormatter={formatCompactMoney}
            />
          </div>

            <DashboardLineChart
              title="Kết quả đơn hàng theo kỳ"
              description="Các sự kiện hoàn tất, hủy và hoàn trả theo thời điểm nghiệp vụ thực tế."
              rows={data?.outcomeSeries}
              series={[
                {
                  key: "completedCount",
                  label: "Hoàn tất",
                  className:
                    "text-success",
                },
                {
                  key: "cancelledCount",
                  label: "Hủy",
                  className:
                    "text-error",
                },
                {
                  key: "returnedCount",
                  label: "Hoàn trả",
                  className:
                    "text-warning",
                },
              ]}
            />
        </>
      );
    }

    if (dashboard === "appointments") {
      return (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardDonutChart
              title="Cơ cấu loại lịch trong kỳ"
              description="Phân bố lịch kiểm định và thu gom theo thời điểm hẹn thực tế trong kỳ phân tích."
              rows={
                data?.appointmentTypeDistribution
              }
              getLabel={(item) =>
                labelFor(
                  item.label ||
                    item.key,
                  "appointments",
                )
              }
            />
          </div>

          <DashboardLineChart
            title="Kiểm định và thu gom theo kỳ"
            description="Số lịch theo thời điểm hẹn thực tế; mỗi điểm sử dụng khoảng thời gian do hệ thống tổng hợp."
            rows={
              data?.appointmentTypeSeries
            }
            series={[
              {
                key: "inspectionCount",
                label: "Kiểm định",
                className:
                  "text-primary",
              },
              {
                key: "collectionCount",
                label: "Thu gom",
                className:
                  "text-success",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                Kết quả lịch đã kết thúc
              </p>

              <p className="mt-1 text-xs leading-5 text-textLight">
                Thành công là lịch đã hoàn tất trong kỳ; không thành công là lịch bị hủy hoặc hết hạn trong kỳ.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <KpiCard
                  label="Đã kết thúc"
                  value={formatNumber(
                    data?.outcome
                      ?.finalizedCount,
                  )}
                  loading={loading}
                />

                <KpiCard
                  label="Thành công"
                  value={formatNumber(
                    data?.outcome
                      ?.successfulCount,
                  )}
                  hint={formatPercent(
                    data?.outcome
                      ?.successRate,
                  )}
                  loading={loading}
                  valueClassName="text-success"
                />

                <KpiCard
                  label="Không thành công"
                  value={formatNumber(
                    data?.outcome
                      ?.failedCount,
                  )}
                  hint={formatPercent(
                    data?.outcome
                      ?.failureRate,
                  )}
                  loading={loading}
                  valueClassName="text-error"
                />
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[620px] w-full text-left text-sm">
                  <thead className="bg-background text-xs uppercase tracking-wide text-textLight">
                    <tr>
                      <th className="px-3 py-3 font-black">
                        Loại lịch
                      </th>
                      <th className="px-3 py-3 font-black">
                        Đã kết thúc
                      </th>
                      <th className="px-3 py-3 font-black">
                        Thành công
                      </th>
                      <th className="px-3 py-3 font-black">
                        Không thành công
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {(data?.outcomeByType || []).map(
                      (item) => (
                        <tr
                          key={
                            item.appointmentType
                          }
                        >
                          <td className="px-3 py-3 font-bold text-text">
                            {labelFor(
                              item.appointmentType,
                              "appointments",
                            )}
                          </td>
                          <td className="px-3 py-3 text-textLight">
                            {formatNumber(
                              item.finalizedCount,
                            )}
                          </td>
                          <td className="px-3 py-3 text-success">
                            {formatNumber(
                              item.successfulCount,
                            )}
                            {" · "}
                            {formatPercent(
                              item.successRate,
                            )}
                          </td>
                          <td className="px-3 py-3 text-error">
                            {formatNumber(
                              item.failedCount,
                            )}
                            {" · "}
                            {formatPercent(
                              item.failureRate,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                Điểm danh lịch kiểm định
              </p>

              <p className="mt-1 text-xs leading-5 text-textLight">
                Chỉ tính các lịch kiểm định đã đến giờ hẹn hoặc đã diễn ra, để cả hai bên thực sự có cơ hội điểm danh.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <KpiCard
                  label="Lịch đã đến giờ hẹn"
                  value={formatNumber(
                    data?.inspectionCheckIn
                      ?.eligibleInspectionCount,
                  )}
                  loading={loading}
                />

                <KpiCard
                  label="Tỷ lệ đủ hai bên điểm danh"
                  value={formatPercent(
                    data?.inspectionCheckIn
                      ?.fullCheckInRate,
                  )}
                  hint={`${formatNumber(
                    data?.inspectionCheckIn
                      ?.fullyCheckedInAppointmentCount,
                  )} lịch đủ hai bên`}
                  loading={loading}
                  valueClassName="text-success"
                />

                <KpiCard
                  label="Tỷ lệ điểm danh theo lượt"
                  value={formatPercent(
                    data?.inspectionCheckIn
                      ?.participantCheckInRate,
                  )}
                  hint={`${formatNumber(
                    data?.inspectionCheckIn
                      ?.successfulParticipantCheckIns,
                  )}/${formatNumber(
                    data?.inspectionCheckIn
                      ?.expectedParticipantCheckIns,
                  )} lượt`}
                  loading={loading}
                  valueClassName="text-primary"
                />

                <KpiCard
                  label="Thiếu điểm danh"
                  value={formatNumber(
                    (
                      Number(
                        data
                          ?.inspectionCheckIn
                          ?.partialCheckInAppointmentCount,
                      ) || 0
                    ) +
                      (
                        Number(
                          data
                            ?.inspectionCheckIn
                            ?.noCheckInAppointmentCount,
                        ) || 0
                      ),
                  )}
                  hint={`${formatNumber(
                    data?.inspectionCheckIn
                      ?.partialCheckInAppointmentCount,
                  )} một phần · ${formatNumber(
                    data?.inspectionCheckIn
                      ?.noCheckInAppointmentCount,
                  )} chưa điểm danh`}
                  loading={loading}
                  valueClassName="text-warning"
                />
              </div>

              <div className="mt-5 space-y-3">
                {(data?.checkInByParticipant || []).map(
                  (item) => (
                    <div
                      key={
                        item.participantType
                      }
                      className="rounded-xl border border-border bg-background/60 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-text">
                            {normalize(
                              item.participantType,
                            ) === "buyer"
                              ? "Người mua"
                              : normalize(
                                    item.participantType,
                                  ) === "seller"
                                ? "Người bán"
                                : item.participantType}
                          </p>

                          <p className="mt-1 text-xs text-textLight">
                            {formatNumber(
                              item.checkedInCount,
                            )}/
                            {formatNumber(
                              item.eligibleCount,
                            )} đã điểm danh
                          </p>
                        </div>

                        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-black text-primary">
                          {formatPercent(
                            item.checkInRate,
                          )}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/40">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                Number(
                                  item.checkInRate,
                                ) || 0,
                              ),
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-textLight">
                        Thiếu{" "}
                        {formatNumber(
                          item.missingCount,
                        )} lượt điểm danh.
                      </p>
                    </div>
                  ),
                )}
              </div>

              <p className="mt-4 text-xs leading-5 text-textLight">
                Chỉ thống kê việc điểm danh của lịch kiểm định đã đến giờ hẹn.
                Trang tổng quan không đánh giá việc điểm danh đúng giờ, trễ hay thời điểm rời lịch hẹn.
              </p>
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Lịch bị hủy trong kỳ"
              value={formatNumber(data?.cancelledInPeriodCount)}
              hint="Lịch hẹn hiệu lực bị hủy trong kỳ, theo thời điểm hủy."
              loading={loading}
              valueClassName="text-warning"
            />

            <KpiCard
              label="Kiểm định điểm danh trễ"
              value={formatNumber(data?.lateInspectionCount)}
              hint="Lịch kiểm định đã đến giờ hẹn trong kỳ mà có bên điểm danh sau mốc trễ, hoặc đã quá mốc trễ mà vẫn thiếu điểm danh."
              loading={loading}
              valueClassName="text-error"
            />

            <KpiCard
              label="Kiểm định chưa có mốc trễ"
              value={formatNumber(data?.missingLateThresholdCount)}
              hint="Lịch kiểm định đã đến giờ hẹn trong kỳ nhưng chưa được cấu hình mốc tính trễ."
              loading={loading}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                Điểm danh theo loại tài khoản
              </p>

              <p className="mt-1 text-xs leading-5 text-textLight">
                Lượt điểm danh của lịch kiểm định đã đến giờ hẹn trong kỳ, gộp theo vai trò tài khoản của người tham gia.
              </p>

              <div className="mt-4 space-y-3">
                {(data?.checkInByAccountRole || []).length === 0 ? (
                  <p className="rounded-xl bg-background px-4 py-5 text-center text-sm text-textLight">
                    Chưa có dữ liệu.
                  </p>
                ) : (
                  (data?.checkInByAccountRole || []).map((item) => (
                    <div
                      key={item.participantType}
                      className="rounded-xl border border-border bg-background/60 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-text">
                            {labelFor(item.participantType)}
                          </p>

                          <p className="mt-1 text-xs text-textLight">
                            {formatNumber(item.checkedInCount)}/
                            {formatNumber(item.eligibleCount)} đã điểm danh
                          </p>
                        </div>

                        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-black text-primary">
                          {formatPercent(item.checkInRate)}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/40">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, Math.max(0, Number(item.checkInRate) || 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <DashboardHorizontalBarChart
              title="Khu vực có lịch hẹn trong kỳ"
              description="Số lịch hẹn hiệu lực theo thời điểm hẹn trong kỳ, gộp theo thành phố/phường của bài đăng liên quan và cách giao nhận."
              rows={(data?.regions || []).map((item) => ({
                key: `${item.city}|${item.ward}|${item.deliveryMethod ?? ""}`,
                label: `${item.city || "Chưa rõ"}${item.ward ? ` / ${item.ward}` : ""} · ${labelFor(item.deliveryMethod ?? "Unspecified")}`,
                count: item.appointmentCount,
              }))}
              getLabel={(item) => item.label}
              hideZero
            />
          </div>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)] sm:p-6">
            <h3 className="text-lg font-black text-text">
              Kết quả theo cách giao nhận
            </h3>

            <p className="mt-1 text-xs leading-5 text-textLight">
              Trạng thái hiện tại của các lịch hẹn hiệu lực có thời điểm hẹn trong kỳ, gộp theo cách giao nhận mới nhất của đơn.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-textLight">
                    <th className="px-3 py-3">Cách giao nhận</th>
                    <th className="px-3 py-3 text-right">Tổng lịch</th>
                    <th className="px-3 py-3 text-right">Hoàn tất</th>
                    <th className="px-3 py-3 text-right">Đã hủy</th>
                    <th className="px-3 py-3 text-right">Tỷ lệ hoàn tất</th>
                  </tr>
                </thead>

                <tbody>
                  {(data?.deliveryPerformance || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-textLight">
                        Chưa có dữ liệu.
                      </td>
                    </tr>
                  ) : (
                    (data?.deliveryPerformance || []).map((item) => (
                      <tr key={item.method} className="border-b border-border/70 last:border-0">
                        <td className="px-3 py-3 font-bold text-text">{labelFor(item.method)}</td>
                        <td className="px-3 py-3 text-right">{formatNumber(item.totalCount)}</td>
                        <td className="px-3 py-3 text-right font-black text-success">{formatNumber(item.completedCount)}</td>
                        <td className="px-3 py-3 text-right font-black text-error">{formatNumber(item.cancelledCount)}</td>
                        <td className="px-3 py-3 text-right font-black text-text">{formatPercent(item.completionRate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      );
    }

    if (dashboard === "disputes") {
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard
            label="Đã giải quyết trong kỳ"
            value={formatNumber(
              data?.resolvedInPeriodCount,
            )}
            loading={loading}
            valueClassName="text-success"
          />

          <KpiCard
            label="Thời gian xử lý trung bình"
            value={formatHours(
              data?.averageResolutionTimeHours,
            )}
            hint="Tính từ lúc tạo tranh chấp đến lúc giải quyết, cho các tranh chấp được giải quyết trong kỳ."
            loading={loading}
          />

          <KpiCard
            label="Mở mới trong kỳ"
            value={formatNumber(data?.openedInPeriodCount)}
            hint="Số tranh chấp được tạo trong kỳ."
            loading={loading}
            valueClassName="text-error"
          />

          <KpiCard
            label="Tỷ lệ đơn phát sinh tranh chấp"
            value={formatPercent(data?.orderDisputeRate)}
            hint={`${formatNumber(data?.disputedOrdersCreatedInPeriodCount)}/${formatNumber(data?.ordersCreatedInPeriodCount)} đơn tạo trong kỳ có tranh chấp về đơn hàng. Chỉ tính khi bộ lọc đối tượng là "Tất cả" hoặc "Đơn hàng".`}
            loading={loading}
          />
          </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardDonutChart
            title="Kết quả giải quyết trong kỳ"
            description="Phân bố kết quả của các tranh chấp được giải quyết trong kỳ."
            rows={data?.resolutionDistribution}
            getLabel={(item) => labelFor(item.label || item.key)}
          />

        <DashboardLineChart
          title="Mở mới và giải quyết theo kỳ"
          description="So sánh số tranh chấp phát sinh và số tranh chấp được giải quyết theo thời gian."
          rows={
            data?.openedVsResolvedSeries
          }
          series={[
            {
              key: "openedCount",
              label: "Mở mới",
              className:
                "text-error",
            },
            {
              key: "resolvedCount",
              label: "Đã giải quyết",
              className:
                "text-success",
            },
          ]}
        />
        </div>
        </>
      );
    }

    if (dashboard === "business-overview") {
      const growthRows = Array.isArray(data?.growthSeries) ? data.growthSeries : [];
      const growthAllZero =
        growthRows.length > 0 &&
        growthRows.every((point) => !(Number(point?.registeredCount) || 0));

      return (
        <>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6 text-text">
            Số đăng ký là số tài khoản doanh nghiệp được tạo trong từng khoảng của kỳ (theo bộ lọc phía trên).
            Số đang hoạt động / đang tạm khóa là <strong>trạng thái hiện tại</strong> của chính các tài khoản đó,
            không phải trạng thái tại thời điểm trong quá khứ.
          </div>

          {growthAllZero ? (
            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
              <h3 className="text-lg font-black text-text">Tài khoản doanh nghiệp đăng ký theo kỳ</h3>
              <div className="mt-5 flex min-h-64 items-center justify-center rounded-xl bg-background text-sm font-semibold text-textLight">
                Không có tài khoản doanh nghiệp nào đăng ký trong kỳ này.
              </div>
            </section>
          ) : (
            <DashboardLineChart
              title="Tài khoản doanh nghiệp đăng ký theo kỳ"
              description="Số tài khoản đăng ký theo ngày tạo, kèm số trong đó hiện đang hoạt động hoặc đang tạm khóa."
              rows={growthRows}
              series={[
                { key: "registeredCount", label: "Đăng ký", className: "text-primary" },
                { key: "currentlyActiveCount", label: "Hiện đang hoạt động", className: "text-success" },
                { key: "currentlySuspendedCount", label: "Hiện đang tạm khóa", className: "text-error" },
              ]}
            />
          )}
        </>
      );
    }

    return null;
  };

  const renderPeriodSection = () => (
    <section className="space-y-4 rounded-3xl border border-primary/15 bg-primary/[0.025] p-4 sm:p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
          KỲ PHÂN TÍCH
        </p>

        <h3 className="mt-1 text-xl font-black text-text">
          Chỉ số và biểu đồ theo kỳ
        </h3>

        <p className="mt-1 text-sm text-textLight">
          Khoảng thời gian và cách nhóm chỉ áp dụng cho các chỉ số/biểu đồ trong phần này. Các số liệu phía trên là trạng thái hiện tại, không phụ thuộc kỳ.
        </p>
      </div>

      <form
        onSubmit={applyPeriod}
        className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.04)]"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {renderPeriodFilters()}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90"
          >
            Áp dụng kỳ
          </button>

          <button
            type="button"
            onClick={resetPeriod}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-black text-text transition hover:bg-background"
          >
            Mặc định kỳ
          </button>
        </div>

        {periodError && (
          <p className="mt-3 text-sm font-semibold text-error">
            {periodError}
          </p>
        )}
      </form>

      {!loading && data?.period && (
        <div className="rounded-xl border border-primary/10 bg-white px-4 py-3 text-xs leading-5 text-textLight">
          Kỳ đang áp dụng:{" "}
          <strong className="text-text">
            {formatDate(data.period.from)}
          </strong>
          {" → trước "}
          <strong className="text-text">
            {formatDate(data.period.toExclusive)}
          </strong>
          {" · UTC+7"}
          {!filters.from && " · Mặc định 30 ngày đã hoàn tất gần nhất, không gồm hôm nay"}
        </div>
      )}

      {!loading && data?.period?.isPartialPeriod && (
        <div className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-text">
          Dữ liệu kỳ hiện tại chưa hoàn tất.
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <LoadingBlock className="h-36 w-full" />
          <LoadingBlock className="h-36 w-full" />
        </div>
      ) : (
        renderPeriodContent()
      )}
    </section>
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
      {dashboard === "disputes" && (
        <AdminSectionTabs
          ariaLabel="Khu vực Tranh chấp"
          items={DISPUTE_SECTION_TABS}
        />
      )}

      {dashboard === "orders" && (
        <AdminSectionTabs
          ariaLabel="Khu vực Đơn hàng"
          items={ORDER_SECTION_TABS}
        />
      )}

      {dashboard === "appointments" && (
        <AdminSectionTabs
          ariaLabel="Khu vực Lịch hẹn"
          items={APPOINTMENT_SECTION_TABS}
        />
      )}

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
        {usesPeriod && !splitsPeriod && (
          <div className="mb-4 rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              {dashboard === "business-performance"
                ? "Kỳ dữ liệu toàn trang"
                : "Phạm vi bộ lọc thời gian"}
            </p>

            <p className="mt-1 text-xs leading-5 text-textLight">
              {PERIOD_SCOPE_NOTES[dashboard]}
            </p>
          </div>
        )}

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

        {dashboard ===
          "disputes" &&
          disputeCategoryError && (
            <p className="mt-3 text-sm font-semibold text-warning">
              {disputeCategoryError}
            </p>
          )}
      </form>

      {!loading &&
        !splitsPeriod &&
        data?.period && (
          <div className="rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-xs leading-5 text-textLight">
            {dashboard === "business-performance"
              ? "Kỳ dữ liệu toàn trang"
              : "Kỳ phân tích"}:{" "}
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
            {" · UTC+7"}
            {dashboard !==
              "business-performance" && (
              <>
                {" · "}
                Chỉ áp dụng cho các chỉ số/biểu đồ được ghi rõ là trong kỳ hoặc theo kỳ.
              </>
            )}
          </div>
        )}

      {!loading &&
        !splitsPeriod &&
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

      {splitsPeriod && renderPeriodSection()}
    </section>
  );
}
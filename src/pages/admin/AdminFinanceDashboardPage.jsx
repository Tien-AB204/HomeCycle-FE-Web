import {
  useEffect,
  useState,
} from "react";
import {
} from "../../components/admin/AdminDashboardCharts";
import {
  FinanceAmountBarChart,
  FinanceCashFlowChart,
} from "../../components/admin/AdminFinanceCharts";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const GROUP_OPTIONS = [
  {
    value: "Day",
    label: "Mỗi ngày",
  },
  {
    value: "Week",
    label: "Mỗi tuần",
  },
  {
    value: "Month",
    label: "Mỗi tháng",
  },
];

const BREAKDOWN_LABELS = {
  depositpayment:
    "Thanh toán đặt cọc",
  escrowdeposit:
    "Thanh toán đặt cọc",
  fullpayment:
    "Thanh toán toàn bộ",
  fullpaymentexcludingghn:
    "Thanh toán toàn bộ (không gồm phí vận chuyển GHN)",
  ghnshippingcollected:
    "Phí vận chuyển GHN đã thu",
  shippingfeecollected:
    "Phí vận chuyển GHN đã thu",
  subscriptionpayment:
    "Thanh toán gói đăng ký",
  subscriptionfee:
    "Thanh toán gói đăng ký",
  walletpayment:
    "Thanh toán bằng ví",
  orderrefund:
    "Hoàn tiền đơn hàng",
  payoutrelease:
    "Chuyển tiền cho người bán",
  withdrawallock:
    "Tiền của người dùng đang yêu cầu rút",
  withdrawalrevert:
    "Tiền được trả lại sau yêu cầu rút",
};

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/*
 * Khối doanh thu chỉ hiển thị khoản phí gói đăng ký do Backend trả trong
 * revenue.sources (nguồn SubscriptionFee). Không dùng revenue.totalRevenue vì
 * tổng đó theo hợp đồng cũ có thể gồm khoản không được trình bày trong giao
 * diện quản trị. Phí vận chuyển GHN là tiền thu hộ, không thuộc doanh thu.
 */

const findRevenueSourceAmount = (
  sources,
  type,
) => {
  const match = Array.isArray(
    sources,
  )
    ? sources.find(
        (item) =>
          normalize(
            item?.key ||
              item?.label,
          ) === normalize(type),
      )
    : null;

  return match?.amount;
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatMoney = (value) => {
  const number = toFiniteNumber(value);

  return number === null
    ? "—"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(number);
};

const formatMoneyOrDash = (value) => formatMoney(value);

const formatNumber = (value) => {
  const number = toFiniteNumber(value);
  return number === null
    ? "—"
    : new Intl.NumberFormat("vi-VN").format(number);
};

const formatDate = (value) => {
  const parts =
    String(value || "").split("-");

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
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Asia/Ho_Chi_Minh",
    },
  ).format(date);
};

const getVietnamToday = () => {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const map =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ],
      ),
    );

  return `${map.year}-${map.month}-${map.day}`;
};

const shiftIsoDate = (
  value,
  days,
) => {
  const date =
    new Date(
      `${value}T00:00:00Z`,
    );

  date.setUTCDate(
    date.getUTCDate() +
      days,
  );

  return date
    .toISOString()
    .slice(0, 10);
};

const validateRange = (
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

  const today =
    getVietnamToday();

  const latestTo =
    shiftIsoDate(
      today,
      1,
    );

  if (
    from > today ||
    to > latestTo
  ) {
    return "Khoảng thống kê không được vượt quá ngày hôm nay.";
  }

  return "";
};

const isCanceled = (error) =>
  error?.name ===
    "CanceledError" ||
  error?.code ===
    "ERR_CANCELED";

function MetricCard({
  label,
  value,
  hint,
  loading,
  valueClassName = "text-text",
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-textLight">
        {label}
      </p>

      {loading ? (
        <div className="mt-3 h-8 w-32 animate-pulse rounded-lg bg-background" />
      ) : (
        <p
          className={[
            "mt-3 break-words text-2xl font-black",
            valueClassName,
          ].join(" ")}
        >
          {value}
        </p>
      )}

      {hint && (
        <p className="mt-2 text-xs leading-5 text-textLight">
          {hint}
        </p>
      )}
    </article>
  );
}

function SectionError({
  message,
  onRetry,
}) {
  return (
    <div className="rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm font-semibold text-error">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {message}
        </span>

        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-error/20 bg-white px-3 py-1.5 text-xs font-black"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}

const DATA_ALERTS = [
  {
    field: "stalePendingPayments",
    label: "Thanh toán chờ đã quá hạn",
    severity: "warning",
    description: "Yêu cầu thanh toán vẫn đang chờ dù đã qua thời điểm hết hạn.",
  },
  {
    field: "pendingPaymentsWithoutExpiry",
    label: "Thanh toán chờ chưa có thời hạn",
    severity: "warning",
    description: "Yêu cầu thanh toán đang chờ nhưng chưa được đặt thời điểm hết hạn.",
  },
  {
    field: "overdueReleaseOrders",
    label: "Đơn đã hoàn tất nhưng tiền chưa được chuyển",
    severity: "warning",
    description: "Đã hết thời gian khiếu nại, không còn tranh chấp nhưng tiền vẫn nằm trong Order_Escrow.",
  },
  {
    field: "completedOrdersMissingReleaseDeadline",
    label: "Đơn hoàn tất chưa có mốc chuyển tiền",
    severity: "warning",
    description: "Tiền vẫn nằm trong Order_Escrow nhưng đơn chưa có thời điểm kết thúc khiếu nại.",
  },
  {
    field: "negativeWalletCount",
    label: "Ví có số dư âm",
    severity: "critical",
    description: "Ví có số dư khả dụng hoặc tạm giữ nhỏ hơn 0; cần kiểm tra ngay.",
    countOnly: true,
  },
  {
    field: "unclassifiedTransactionsInPeriod",
    label: "Giao dịch chưa phân loại trong kỳ",
    severity: "warning",
    description: "Chưa xếp được vào nhóm tiền vào, tiền ra hay dịch chuyển nội bộ.",
  },
];

const hasAlert = (metric, countOnly) =>
  (toFiniteNumber(countOnly ? metric : metric?.count) ?? 0) > 0;

const INTEGRITY_CHECKS = [
  { field: "walletBalanceMismatchCount", label: "Ví lệch giữa số dư và sổ cái" },
  { field: "completedTransactionWithoutLedgerCount", label: "Giao dịch hoàn tất thiếu bút toán sổ cái" },
  { field: "completedOrderPaymentWithoutEscrowPostingCount", label: "Thanh toán đơn hoàn tất chưa ghi vào Order_Escrow" },
  { field: "legacyOrderHoldCount", label: "Tiền đơn hàng còn nằm trong ví người dùng theo cách cũ" },
  { field: "negativeOrderEscrowPositionCount", label: "Đơn có số tiền đang giữ bị âm" },
  { field: "duplicatePayoutOrderCount", label: "Đơn bị chuyển tiền cho người bán nhiều lần" },
  { field: "overRefundedOrderCount", label: "Đơn bị hoàn tiền vượt số đã thanh toán" },
  { field: "payOsSuccessAccountingAnomalyCount", label: "Thanh toán PayOS thành công chưa được ghi nhận nội bộ" },
];

function IntegrityStatus({ integrity }) {
  if (!integrity) {
    return null;
  }

  const issues = INTEGRITY_CHECKS.filter(
    (check) => (toFiniteNumber(integrity[check.field]) ?? 0) > 0,
  );
  const escrowDifference = toFiniteNumber(integrity.orderEscrowDifference) ?? 0;
  const escrowUnbalanced =
    integrity.orderEscrowWalletExists === false ||
    integrity.orderEscrowBalanced === false;

  if (integrity.isHealthy && issues.length === 0 && !escrowUnbalanced) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 px-5 py-3 text-sm font-bold text-success">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          verified
        </span>
        Sổ sách khớp: số dư ví, sổ cái và ví giữ tiền đơn hàng (Order_Escrow) đều cân bằng.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-error/30 bg-error/10 px-5 py-4">
      <p className="flex items-center gap-2 text-sm font-black text-error">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          report
        </span>
        Sổ sách có điểm bất thường cần kiểm tra
      </p>

      <ul className="mt-2 space-y-1 text-sm text-text">
        {escrowUnbalanced && (
          <li>
            Ví giữ tiền đơn hàng (Order_Escrow){" "}
            {integrity.orderEscrowWalletExists === false
              ? "chưa được tạo"
              : `lệch ${formatMoney(escrowDifference)} so với sổ cái`}
          </li>
        )}
        {issues.map((check) => (
          <li key={check.field}>
            {check.label}: <strong>{formatNumber(integrity[check.field])}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HealthCard({
  label,
  metric,
  severity = "info",
  description,
  countOnly = false,
}) {
  const count = toFiniteNumber(
    countOnly ? metric : metric?.count,
  );

  const amount = countOnly
    ? null
    : toFiniteNumber(metric?.amount);

  const active =
    count !== null && count > 0;

  const unavailable = count === null;

  const style =
    unavailable
      ? {
          border: "border-border",
          background: "bg-background/70",
          value: "text-textLight",
        }
      : active
      ? {
          critical: {
            border:
              "border-error/30",
            background:
              "bg-error/10",
            value:
              "text-error",
          },
          warning: {
            border:
              "border-warning/30",
            background:
              "bg-warning/10",
            value:
              "text-warning",
          },
          info: {
            border:
              "border-primary/20",
            background:
              "bg-primary/[0.06]",
            value:
              "text-primary",
          },
        }[severity]
      : {
          border:
            "border-border",
          background:
            "bg-white",
          value:
            "text-success",
        };

  return (
    <article
      className={[
        "rounded-2xl border p-5",
        style.border,
        style.background,
      ].join(" ")}
    >
      <p className="text-xs font-black text-text">
        {label}
      </p>

      <p
        className={[
          "mt-3 text-2xl font-black",
          style.value,
        ].join(" ")}
      >
        {formatNumber(count)}
      </p>

      {!countOnly && (
        <p className="mt-1 text-sm font-bold text-text">
          {formatMoney(amount)}
        </p>
      )}

      <p className="mt-2 text-xs leading-5 text-textLight">
        {description}
      </p>
    </article>
  );
}

export default function AdminFinanceDashboardPage() {
  const [draft, setDraft] =
    useState({
      from: "",
      to: "",
      groupBy: "Day",
    });

  const [filters, setFilters] =
    useState({
      from: "",
      to: "",
      groupBy: "Day",
    });

  const [
    activePreset,
    setActivePreset,
  ] = useState("30");

  const [
    filterError,
    setFilterError,
  ] = useState("");

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  const [mainState, setMainState] =
    useState({
      requestKey: "",
      overview: null,
      cashFlow: null,
      health: null,
      revenue: null,
      errors: {},
    });

  const from =
    filters.from;

  const to =
    filters.to;

  const groupBy =
    filters.groupBy;

  const mainRequestKey = [
    from,
    to,
    groupBy,
    refreshVersion,
  ].join("|");

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    const args = {
      from:
        from || undefined,
      to:
        to || undefined,
      groupBy,
      signal:
        controller.signal,
    };

    Promise.allSettled([
      adminDashboardApi
        .getFinanceOverview(
          args,
        ),
      adminDashboardApi
        .getFinanceCashFlow(
          args,
        ),
      adminDashboardApi
        .getFinanceHealth(
          args,
        ),
      adminDashboardApi
        .getFinanceRevenue(
          args,
        ),
    ]).then((results) => {
      if (!active) {
        return;
      }

      const [
        overviewResult,
        cashFlowResult,
        healthResult,
        revenueResult,
      ] = results;

      const errors = {};

      if (
        overviewResult.status ===
        "rejected" &&
        !isCanceled(
          overviewResult.reason,
        )
      ) {
        errors.overview = true;
      }

      if (
        cashFlowResult.status ===
        "rejected" &&
        !isCanceled(
          cashFlowResult.reason,
        )
      ) {
        errors.cashFlow = true;
      }

      if (
        healthResult.status ===
        "rejected" &&
        !isCanceled(
          healthResult.reason,
        )
      ) {
        errors.health = true;
      }

      if (
        revenueResult.status ===
        "rejected" &&
        !isCanceled(
          revenueResult.reason,
        )
      ) {
        errors.revenue = true;
      }

      setMainState({
        requestKey:
          mainRequestKey,
        overview:
          overviewResult.status ===
          "fulfilled"
            ? overviewResult.value
            : null,
        cashFlow:
          cashFlowResult.status ===
          "fulfilled"
            ? cashFlowResult.value
            : null,
        health:
          healthResult.status ===
          "fulfilled"
            ? healthResult.value
            : null,
        revenue:
          revenueResult.status ===
          "fulfilled"
            ? revenueResult.value
            : null,
        errors,
      });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    from,
    to,
    groupBy,
    mainRequestKey,
  ]);

  const mainLoading =
    mainState.requestKey !==
    mainRequestKey;

  const overview =
    mainState.overview;

  const cashFlow =
    mainState.cashFlow;

  const health =
    mainState.health;

  const revenue =
    mainState.revenue;

  const position =
    overview?.position;

  const activity =
    overview?.activity;

  const period =
    overview?.period ||
    cashFlow?.period ||
    health?.period ||
    revenue?.period;

  const applyFilters = (
    event,
  ) => {
    event.preventDefault();

    const message =
      validateRange(
        draft.from,
        draft.to,
      );

    if (message) {
      setFilterError(message);
      return;
    }

    setFilterError("");

    setFilters({
      ...draft,
    });

    setActivePreset(
      draft.from ||
        draft.to
        ? "custom"
        : "30",
    );
  };

  const applyPreset = (
    preset,
  ) => {
    if (preset === "custom") {
      setActivePreset("custom");
      return;
    }

    const today =
      getVietnamToday();

    let next;

    if (preset === "7") {
      next = {
        from:
          shiftIsoDate(
            today,
            -7,
          ),
        to: today,
        groupBy: "Day",
      };
    } else if (
      preset === "month"
    ) {
      next = {
        from:
          `${today.slice(
            0,
            7,
          )}-01`,
        to:
          shiftIsoDate(
            today,
            1,
          ),
        groupBy: "Day",
      };
    } else {
      next = {
        from: "",
        to: "",
        groupBy: "Day",
      };
    }

    setDraft(next);
    setFilters(next);
    setActivePreset(preset);
    setFilterError("");
  };

  const refreshAll = () => {
    setRefreshVersion(
      (current) =>
        current + 1,
    );
  };

  const internalMovementRows =
    Array.isArray(
      cashFlow?.internalMovements,
    )
      ? cashFlow.internalMovements
      : [];

  const findInternalMovementAmount =
    (type) =>
      findRevenueSourceAmount(
        internalMovementRows,
        type,
      );

  const breakdownLabel = (
    item,
  ) =>
    BREAKDOWN_LABELS[
      normalize(
        item?.key ||
          item?.label,
      )
    ] || "Khác";

  const inflowSourceRows = (
    Array.isArray(cashFlow?.inflowSources)
      ? cashFlow.inflowSources
      : []
  ).filter(
    (item) =>
      normalize(item?.key || item?.label) !==
      "otherpayos",
  );

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              QUẢN TRỊ TÀI CHÍNH
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Tài chính hệ thống
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              Theo dõi số dư ví HomeCycle, dòng tiền, các khoản đang
              tạm giữ và những trường hợp cần kiểm tra.
            </p>

            {!mainLoading &&
              overview
                ?.generatedAtUtc && (
                <p className="mt-3 text-xs font-semibold text-white/60">
                  Cập nhật lúc{" "}
                  {formatDateTime(
                    overview
                      .generatedAtUtc,
                  )}
                </p>
              )}
          </div>

          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
          >
            <span className="material-symbols-outlined text-[20px]">
              refresh
            </span>
            Làm mới
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            SỐ DƯ HIỆN TẠI
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Tổng quan số dư
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Đây là số dư hiện tại của các ví HomeCycle. Các số này không thay đổi khi chỉnh “Kỳ phân tích” bên dưới.
          </p>
        </div>

        {mainState.errors
          .overview ? (
          <SectionError
            message="Không thể tải số dư hiện tại."
            onRetry={
              refreshAll
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Tổng số dư trong các ví HomeCycle"
              value={formatMoney(
                position
                  ?.totalRecordedWalletBalance,
              )}
              hint="Tổng số dư khả dụng và tạm giữ của các ví nội bộ HomeCycle; không phải số dư ngân hàng, PayOS hay doanh thu của nền tảng."
              loading={
                mainLoading
              }
              valueClassName="text-primary"
            />

            <MetricCard
              label="Tiền tạm giữ trong ví người dùng"
              value={formatMoney(
                position
                  ?.userFundsHeld,
              )}
              hint="Tiền bị khóa trong ví Cá nhân và Doanh nghiệp, ví dụ đang chờ rút. Tiền của đơn hàng không nằm ở đây."
              loading={
                mainLoading
              }
              valueClassName="text-warning"
            />

            <MetricCard
              label="Tiền đơn hàng HomeCycle đang giữ"
              value={formatMoney(
                position
                  ?.orderEscrowHeld,
              )}
              hint="Số dư ví Order_Escrow: tiền thanh toán của các đơn mà nền tảng đang giữ hộ, chưa hoàn cho người mua hay chuyển cho người bán. Không thuộc ví người dùng."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Tổng số dư ví hệ thống"
              value={formatMoney(
                position
                  ?.systemWalletBalance,
              )}
              hint="Tổng số dư các ví do HomeCycle quản lý: quỹ phí vận chuyển GHN, doanh thu nền tảng và ví giữ tiền đơn hàng (Order_Escrow)."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Số dư khả dụng của người dùng"
              value={formatMoney(
                position
                  ?.userAvailableFunds,
              )}
              hint="Phần tiền trong ví Cá nhân và Doanh nghiệp hiện có thể sử dụng."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Tiền của người dùng đang yêu cầu rút"
              value={formatMoney(
                position
                  ?.withdrawalLocked,
              )}
              hint="Khoản tiền đã tạm chuyển khỏi số dư khả dụng để xử lý yêu cầu rút; chưa phải tiền đã rời khỏi HomeCycle."
              loading={
                mainLoading
              }
              valueClassName="text-warning"
            />

            <MetricCard
              label="Số dư quỹ phí vận chuyển GHN"
              value={formatMoney(
                position
                  ?.shippingEscrowBalance,
              )}
              hint="Tổng số dư ví hệ thống dành cho các khoản phí vận chuyển GHN; không phải doanh thu HomeCycle."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Giá trị thanh toán đang chờ xử lý"
              value={formatMoney(
                position
                  ?.currentPendingPaymentAmount,
              )}
              hint="Tổng giá trị các yêu cầu thanh toán hiện vẫn ở trạng thái chờ."
              loading={
                mainLoading
              }
              valueClassName="text-warning"
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            KỲ PHÂN TÍCH
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Khoảng thời gian cho hoạt động tài chính
          </h3>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-textLight">
            Áp dụng cho hoạt động, dòng tiền và doanh thu; không ảnh hưởng số dư hiện tại.
          </p>
        </div>

        <form
          onSubmit={applyFilters}
        className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.04)]"
      >
        <div className="flex flex-wrap gap-2">
          {[
            ["7", "7 ngày"],
            ["30", "30 ngày"],
            [
              "month",
              "Tháng này",
            ],
            [
              "custom",
              "Tùy chỉnh",
            ],
          ].map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  applyPreset(
                    value,
                  )
                }
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black transition",
                  activePreset ===
                  value
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-text hover:bg-background",
                ].join(" ")}
              >
                {label}
              </button>
            ),
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label>
            <span className="text-xs font-black uppercase tracking-[0.1em] text-textLight">
              Từ ngày
            </span>

            <input
              type="date"
              value={draft.from}
              onChange={(event) => {
                setDraft(
                  (current) => ({
                    ...current,
                    from:
                      event.target
                        .value,
                  }),
                );
                setActivePreset(
                  "custom",
                );
              }}
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase tracking-[0.1em] text-textLight">
              Đến ngày
            </span>

            <input
              type="date"
              value={draft.to}
              onChange={(event) => {
                setDraft(
                  (current) => ({
                    ...current,
                    to:
                      event.target
                        .value,
                  }),
                );
                setActivePreset(
                  "custom",
                );
              }}
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
            />

            <span className="mt-1 block text-[11px] text-textLight">
              Ngày kết thúc không được tính vào kỳ.
            </span>
          </label>

          <label>
            <span className="text-xs font-black uppercase tracking-[0.1em] text-textLight">
              Nhóm dữ liệu
            </span>

            <select
              value={
                draft.groupBy
              }
              onChange={(event) =>
                setDraft(
                  (current) => ({
                    ...current,
                    groupBy:
                      event.target
                        .value,
                  }),
                )
              }
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
            >
              {GROUP_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
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

          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:opacity-90"
          >
            Áp dụng
          </button>
        </div>

        {filterError && (
          <p className="mt-3 text-sm font-semibold text-error">
            {filterError}
          </p>
        )}

        {!draft.from &&
          !draft.to && (
            <p className="mt-3 text-xs text-textLight">
              Không chọn ngày: máy chủ sử dụng kỳ 30 ngày mặc định.
            </p>
          )}
      </form>

      {!mainLoading &&
        period && (
          <div className="rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-xs leading-5 text-textLight">
            Kỳ phân tích:{" "}
            <strong className="text-text">
              {formatDate(
                period.from,
              )}
            </strong>
            {" → trước "}
            <strong className="text-text">
              {formatDate(
                period
                  .toExclusive,
              )}
            </strong>
            {" · UTC+7"}
          </div>
        )}

      {!mainLoading &&
        period?.isPartialPeriod && (
          <div className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-text">
            Dữ liệu kỳ hiện tại chưa hoàn tất.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            HOẠT ĐỘNG TRONG KỲ
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Tiền vào, tiền ra và thanh toán
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Tiền vào là thanh toán PayOS đã hoàn tất; tiền ra là rút tiền đã hoàn tất. Hoàn tiền và chuyển tiền cho người bán chỉ dịch chuyển bên trong ví HomeCycle.
          </p>
        </div>

        {mainState.errors
          .overview ? (
          <SectionError
            message="Không thể tải hoạt động tài chính trong kỳ."
            onRetry={
              refreshAll
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Tiền vào"
              value={formatMoney(
                activity
                  ?.externalInflow,
              )}
              hint="Tiền thanh toán qua PayOS đã hoàn tất trong kỳ, tức tiền từ bên ngoài đi vào HomeCycle."
              loading={
                mainLoading
              }
              valueClassName="text-success"
            />

            <MetricCard
              label="Tiền ra"
              value={formatMoney(
                activity
                  ?.externalOutflow,
              )}
              hint="Tiền đã rời khỏi HomeCycle qua các yêu cầu rút tiền hoàn tất trong kỳ."
              loading={
                mainLoading
              }
              valueClassName="text-warning"
            />

            <MetricCard
              label="Chênh lệch tiền vào/ra"
              value={formatMoney(
                activity
                  ?.netExternalCashFlow,
              )}
              hint="Tiền vào trừ tiền ra trong kỳ; số âm không mặc nhiên là bất thường."
              loading={
                mainLoading
              }
              valueClassName="text-primary"
            />

            <MetricCard
              label="Thanh toán thành công trong kỳ"
              value={formatMoney(
                activity
                  ?.processedPaymentAmount,
              )}
              hint="Tổng giá trị các thanh toán đã thanh toán thành công trong kỳ (mọi phương thức), kể cả khoản sau đó được hoàn tiền."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Giá trị hoàn tiền"
              value={formatMoney(
                activity
                  ?.refundedAmount,
              )}
              hint="Tiền hoàn lại cho người mua trong kỳ; đây là dịch chuyển bên trong ví HomeCycle, không phải tiền ra khỏi nền tảng."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Thanh toán thất bại tạo trong kỳ"
              value={formatMoney(
                activity
                  ?.createdFailedPaymentAmount,
              )}
              hint="Tổng giá trị các yêu cầu thanh toán được tạo trong kỳ và hiện ở trạng thái thất bại."
              loading={
                mainLoading
              }
              valueClassName="text-error"
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            DÒNG TIỀN THEO KỲ
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Diễn biến tiền vào, tiền ra và dịch chuyển nội bộ
          </h3>
        </div>

        {mainState.errors
          .cashFlow ? (
          <SectionError
            message="Không thể tải dữ liệu dòng tiền."
            onRetry={
              refreshAll
            }
          />
        ) : (
          <>
            <FinanceCashFlowChart
              rows={
                cashFlow?.series
              }
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <FinanceAmountBarChart
                title="Nguồn tiền vào"
                description="Các nguồn tạo nên tiền vào trong kỳ. Phí vận chuyển GHN đã thu nằm trong tổng tiền vào nhưng không phải doanh thu HomeCycle."
                rows={
                  inflowSourceRows
                }
                getLabel={
                  breakdownLabel
                }
              />

              <FinanceAmountBarChart
                title="Dịch chuyển tiền nội bộ"
                description="Tiền đổi chủ hoặc đổi trạng thái bên trong ví HomeCycle trong kỳ: hoàn tiền đơn hàng, chuyển tiền cho người bán, tiền đang yêu cầu rút và tiền được trả lại sau yêu cầu rút. Đây không phải tiền ra khỏi nền tảng."
                rows={
                  internalMovementRows
                }
                getLabel={
                  breakdownLabel
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Hoàn tiền đơn hàng trong kỳ"
                value={formatMoneyOrDash(
                  findInternalMovementAmount(
                    "OrderRefund",
                  ),
                )}
                hint="Tiền hoàn lại cho người mua bên trong ví HomeCycle trong kỳ; không phải tiền ra khỏi nền tảng."
                loading={
                  mainLoading
                }
              />

              <MetricCard
                label="Chuyển tiền cho người bán trong kỳ"
                value={formatMoneyOrDash(
                  findInternalMovementAmount(
                    "PayoutRelease",
                  ),
                )}
                hint="Tiền chuyển từ ví giữ tiền đơn hàng (Order_Escrow) sang ví người bán trong kỳ; không phải tiền ra khỏi nền tảng."
                loading={
                  mainLoading
                }
              />
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            DOANH THU NỀN TẢNG
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Doanh thu gói đăng ký theo kỳ
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Phí gói đăng ký doanh nghiệp đã được hệ thống ghi nhận vào ví doanh thu trong kỳ. Phí vận chuyển GHN là khoản thu hộ và không được tính vào doanh thu nền tảng.
          </p>
        </div>

        {mainState.errors
          .revenue ? (
          <SectionError
            message="Không thể tải dữ liệu doanh thu nền tảng."
            onRetry={
              refreshAll
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Doanh thu gói đăng ký trong kỳ"
              value={formatMoneyOrDash(
                findRevenueSourceAmount(
                  revenue?.sources,
                  "SubscriptionFee",
                ),
              )}
              hint="Khoản phí gói đăng ký được hệ thống ghi nhận là doanh thu trong kỳ; hiển thị “—” khi chưa có dữ liệu nguồn doanh thu này."
              loading={
                mainLoading
              }
              valueClassName="text-primary"
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            CÁC KHOẢN CẦN THEO DÕI
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Các trường hợp cần kiểm tra
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Các mục bất thường chỉ hiện khi có trường hợp cần kiểm tra.
          </p>
        </div>

        {mainState.errors
          .health ? (
          <SectionError
            message="Không thể tải các khoản cần theo dõi."
            onRetry={
              refreshAll
            }
          />
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-sm font-black text-text">Toàn vẹn sổ sách</h4>
              {health?.integrity ? (
                <IntegrityStatus integrity={health.integrity} />
              ) : (
                <p className="text-sm text-textLight">Chưa có dữ liệu kiểm tra sổ sách.</p>
              )}
            </div>

            <h4 className="text-sm font-black text-text">Vận hành</h4>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <HealthCard
                label="Yêu cầu rút tiền đang chờ"
                metric={health?.pendingWithdrawals}
                severity="info"
                description="Yêu cầu rút tiền đang chờ được xử lý."
              />

              <HealthCard
                label="Rút tiền đang xử lý"
                metric={health?.processingWithdrawals}
                severity="info"
                description="Đã duyệt và đang chuyển tiền, chưa có kết quả cuối."
              />

              <HealthCard
                label="Tiền đơn hàng đang giữ do tranh chấp"
                metric={health?.activeDisputeHeldFunds}
                severity="info"
                description="Tiền của đơn đang có tranh chấp chưa giải quyết."
              />

              {DATA_ALERTS.filter((alert) =>
                hasAlert(health?.[alert.field], alert.countOnly),
              ).map((alert) => (
                <HealthCard
                  key={alert.field}
                  label={alert.label}
                  metric={health?.[alert.field]}
                  severity={alert.severity}
                  description={alert.description}
                  countOnly={alert.countOnly}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

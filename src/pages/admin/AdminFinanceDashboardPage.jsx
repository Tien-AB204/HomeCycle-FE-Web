import {
  useEffect,
  useState,
} from "react";
import {
  DashboardDonutChart,
} from "../../components/admin/AdminDashboardCharts";
import {
  FinanceAmountBarChart,
  FinanceCashFlowChart,
} from "../../components/admin/AdminFinanceCharts";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const GROUP_OPTIONS = [
  {
    value: "Day",
    label: "Theo ngày",
  },
  {
    value: "Week",
    label: "Theo tuần",
  },
  {
    value: "Month",
    label: "Theo tháng",
  },
];

const PAYMENT_STATUS_LABELS = {
  "0": "Chờ thanh toán",
  "1": "Đã hoàn tất",
  "2": "Thất bại",
  "3": "Đã hoàn tiền",
  "4": "Hoàn tiền một phần",
  "5": "Đã hết hạn",
  "6": "Đã hủy",
  pending: "Chờ thanh toán",
  completed: "Đã hoàn tất",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
  partiallyrefunded:
    "Hoàn tiền một phần",
  expired: "Đã hết hạn",
  cancelled: "Đã hủy",
};

const TRANSACTION_TYPE_OPTIONS = [
  ["", "Tất cả loại giao dịch"],
  ["1", "Nạp ký quỹ đơn hàng"],
  ["2", "Thanh toán bằng ví"],
  ["3", "Giải ngân đơn hàng"],
  ["4", "Hoàn tiền đơn hàng"],
  ["5", "Khóa tiền rút"],
  ["6", "Rút tiền thành công"],
  ["7", "Hoàn tác rút tiền"],
  ["8", "Phí hoa hồng"],
  ["9", "Phí gói dịch vụ"],
  ["10", "Thu phí vận chuyển"],
];

const TRANSACTION_TYPE_LABELS = {
  "1": "Nạp ký quỹ đơn hàng",
  "2": "Thanh toán bằng ví",
  "3": "Giải ngân đơn hàng",
  "4": "Hoàn tiền đơn hàng",
  "5": "Khóa tiền rút",
  "6": "Rút tiền thành công",
  "7": "Hoàn tác rút tiền",
  "8": "Phí hoa hồng",
  "9": "Phí gói dịch vụ",
  "10": "Thu phí vận chuyển",
  escrowdeposit:
    "Nạp ký quỹ đơn hàng",
  walletpayment:
    "Thanh toán bằng ví",
  payoutrelease:
    "Giải ngân đơn hàng",
  orderrefund:
    "Hoàn tiền đơn hàng",
  withdrawallock:
    "Khóa tiền rút",
  withdrawalsuccess:
    "Rút tiền thành công",
  withdrawalrevert:
    "Hoàn tác rút tiền",
  commissionfee:
    "Phí hoa hồng",
  subscriptionfee:
    "Phí gói dịch vụ",
  shippingfeecollected:
    "Thu phí vận chuyển",
};

const TRANSACTION_STATUS_OPTIONS = [
  ["", "Tất cả trạng thái"],
  ["0", "Đang chờ"],
  ["1", "Đã hoàn tất"],
  ["2", "Thất bại"],
  ["3", "Đã hủy"],
];

const TRANSACTION_STATUS_LABELS = {
  "0": "Đang chờ",
  "1": "Đã hoàn tất",
  "2": "Thất bại",
  "3": "Đã hủy",
  pending: "Đang chờ",
  completed: "Đã hoàn tất",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

const REFERENCE_OPTIONS = [
  ["", "Tất cả đối tượng"],
  ["1", "Đơn hàng"],
  ["2", "Gói dịch vụ"],
  ["3", "Tranh chấp"],
  ["4", "Yêu cầu rút tiền"],
];

const REFERENCE_LABELS = {
  "1": "Đơn hàng",
  "2": "Gói dịch vụ",
  "3": "Tranh chấp",
  "4": "Yêu cầu rút tiền",
  order: "Đơn hàng",
  subscription: "Gói dịch vụ",
  dispute: "Tranh chấp",
  withdrawal: "Yêu cầu rút tiền",
};

const FLOW_OPTIONS = [
  ["", "Tất cả dòng tiền"],
  ["1", "Tiền vào thực"],
  ["2", "Tiền ra thực"],
  ["3", "Nội bộ"],
  ["0", "Chưa phân loại"],
];

const FLOW_LABELS = {
  "0": "Chưa phân loại",
  "1": "Tiền vào thực",
  "2": "Tiền ra thực",
  "3": "Nội bộ",
  unclassified: "Chưa phân loại",
  externalin: "Tiền vào thực",
  externalout: "Tiền ra thực",
  internal: "Nội bộ",
};

const PAYMENT_METHOD_LABELS = {
  "1": "PayOS",
  "2": "Ví nội bộ",
  "3": "Chưa xác định",
  payos: "PayOS",
  internalwallet: "Ví nội bộ",
  unknown: "Chưa xác định",
};

const BREAKDOWN_LABELS = {
  depositpayment:
    "Thanh toán đặt cọc",
  escrowdeposit:
    "Thanh toán đặt cọc",
  fullpayment:
    "Thanh toán toàn bộ",
  ghnshippingcollected:
    "Phí vận chuyển GHN đã thu",
  shippingfeecollected:
    "Phí vận chuyển GHN đã thu",
  subscriptionpayment:
    "Thanh toán gói dịch vụ",
  subscriptionfee:
    "Thanh toán gói dịch vụ",
  otherpayos:
    "PayOS khác",
  walletpayment:
    "Thanh toán bằng ví",
  orderrefund:
    "Hoàn tiền đơn hàng",
  payoutrelease:
    "Giải ngân đơn hàng",
  withdrawallock:
    "Khóa tiền rút",
  withdrawalrevert:
    "Hoàn tác rút tiền",
};

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const enumLabel = (
  value,
  dictionary,
  fallback = "Chưa xác định",
) =>
  dictionary[
    normalize(value)
  ] ||
  dictionary[
    String(value ?? "")
  ] ||
  fallback;

const formatMoney = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    },
  ).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
  ).format(Number(value) || 0);

const formatPercent = (value) =>
  `${new Intl.NumberFormat(
    "vi-VN",
    {
      maximumFractionDigits: 1,
    },
  ).format(Number(value) || 0)}%`;

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

function HealthCard({
  label,
  metric,
  severity = "info",
  description,
  countOnly = false,
}) {
  const count =
    Number(
      countOnly
        ? metric
        : metric?.count,
    ) || 0;

  const amount =
    Number(
      countOnly
        ? 0
        : metric?.amount,
    ) || 0;

  const active =
    count > 0;

  const style =
    active
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

const flowBadgeClass = (
  value,
) => {
  const key =
    normalize(value);

  if (
    key === "1" ||
    key === "externalin"
  ) {
    return "bg-success/10 text-success";
  }

  if (
    key === "2" ||
    key === "externalout"
  ) {
    return "bg-warning/10 text-warning";
  }

  if (
    key === "0" ||
    key === "unclassified"
  ) {
    return "bg-error/10 text-error";
  }

  return "bg-primary/10 text-primary";
};

const transactionStatusClass = (
  value,
) => {
  const key =
    normalize(value);

  if (
    key === "1" ||
    key === "completed"
  ) {
    return "bg-success/10 text-success";
  }

  if (
    key === "0" ||
    key === "pending"
  ) {
    return "bg-warning/10 text-warning";
  }

  if (
    key === "2" ||
    key === "failed" ||
    key === "3" ||
    key === "cancelled"
  ) {
    return "bg-error/10 text-error";
  }

  return "bg-background text-textLight";
};

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

  const [
    transactionFilters,
    setTransactionFilters,
  ] = useState({
    transactionType: "",
    status: "",
    referenceType: "",
    flowScope: "",
    pageNumber: 1,
    pageSize: 20,
  });

  const [mainState, setMainState] =
    useState({
      requestKey: "",
      overview: null,
      cashFlow: null,
      paymentStatus: null,
      health: null,
      errors: {},
    });

  const [
    transactionState,
    setTransactionState,
  ] = useState({
    requestKey: "",
    data: null,
    error: "",
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
        .getFinancePaymentStatus(
          args,
        ),
      adminDashboardApi
        .getFinanceHealth(
          args,
        ),
    ]).then((results) => {
      if (!active) {
        return;
      }

      const [
        overviewResult,
        cashFlowResult,
        paymentStatusResult,
        healthResult,
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
        paymentStatusResult.status ===
        "rejected" &&
        !isCanceled(
          paymentStatusResult.reason,
        )
      ) {
        errors.paymentStatus = true;
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
        paymentStatus:
          paymentStatusResult.status ===
          "fulfilled"
            ? paymentStatusResult.value
            : null,
        health:
          healthResult.status ===
          "fulfilled"
            ? healthResult.value
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

  const {
    transactionType,
    status,
    referenceType,
    flowScope,
    pageNumber,
    pageSize,
  } = transactionFilters;

  const transactionRequestKey = [
    from,
    to,
    groupBy,
    transactionType,
    status,
    referenceType,
    flowScope,
    pageNumber,
    pageSize,
    refreshVersion,
  ].join("|");

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    adminDashboardApi
      .getFinanceTransactions({
        from:
          from || undefined,
        to:
          to || undefined,
        groupBy,
        transactionType:
          transactionType ||
          undefined,
        status:
          status ||
          undefined,
        referenceType:
          referenceType ||
          undefined,
        flowScope:
          flowScope ||
          undefined,
        pageNumber,
        pageSize,
        signal:
          controller.signal,
      })
      .then((data) => {
        if (!active) {
          return;
        }

        setTransactionState({
          requestKey:
            transactionRequestKey,
          data,
          error: "",
        });
      })
      .catch((error) => {
        if (
          !active ||
          isCanceled(error)
        ) {
          return;
        }

        setTransactionState({
          requestKey:
            transactionRequestKey,
          data: null,
          error:
            "Không thể tải sổ giao dịch tài chính.",
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
    transactionType,
    status,
    referenceType,
    flowScope,
    pageNumber,
    pageSize,
    transactionRequestKey,
  ]);

  const mainLoading =
    mainState.requestKey !==
    mainRequestKey;

  const transactionsLoading =
    transactionState.requestKey !==
    transactionRequestKey;

  const overview =
    mainState.overview;

  const cashFlow =
    mainState.cashFlow;

  const paymentStatus =
    mainState.paymentStatus;

  const health =
    mainState.health;

  const position =
    overview?.position;

  const activity =
    overview?.activity;

  const period =
    overview?.period ||
    cashFlow?.period ||
    paymentStatus?.period ||
    health?.period;

  const paymentDonutRows =
    Array.isArray(
      paymentStatus?.statuses,
    )
      ? paymentStatus.statuses.map(
          (item) => ({
            key:
              item?.status ??
              item?.label,
            label:
              enumLabel(
                item?.status ??
                  item?.label,
                PAYMENT_STATUS_LABELS,
                item?.label ||
                  "Chưa xác định",
              ),
            count:
              item?.count,
          }),
        )
      : [];

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

    setTransactionFilters(
      (current) => ({
        ...current,
        pageNumber: 1,
      }),
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

    setTransactionFilters(
      (current) => ({
        ...current,
        pageNumber: 1,
      }),
    );
  };

  const refreshAll = () => {
    setRefreshVersion(
      (current) =>
        current + 1,
    );
  };

  const updateTransactionFilter = (
    field,
    value,
  ) => {
    setTransactionFilters(
      (current) => ({
        ...current,
        [field]: value,
        pageNumber: 1,
      }),
    );
  };

  const transactions =
    Array.isArray(
      transactionState.data
        ?.items,
    )
      ? transactionState.data
          .items
      : [];

  const breakdownLabel = (
    item,
  ) =>
    BREAKDOWN_LABELS[
      normalize(
        item?.key ||
          item?.label,
      )
    ] ||
    item?.label ||
    item?.key ||
    "Chưa xác định";

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
              Theo dõi vị thế tài chính hiện tại, dòng tiền thực,
              tiền đang bị giữ và các dấu hiệu bất thường.
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
            Kỳ hoạt động:{" "}
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

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            VỊ THẾ TÀI CHÍNH
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Số dư hiện tại
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Đây là ảnh chụp số dư hiện tại, không phải tổng phát sinh trong khoảng lọc.
          </p>
        </div>

        {mainState.errors
          .overview ? (
          <SectionError
            message="Không thể tải vị thế tài chính."
            onRetry={
              refreshAll
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Số dư ví ghi nhận"
              value={formatMoney(
                position
                  ?.totalRecordedWalletBalance,
              )}
              hint="Tổng số dư nội bộ đã ghi nhận. Không phải số dư ngân hàng hoặc tài khoản PayOS."
              loading={
                mainLoading
              }
              valueClassName="text-primary"
            />

            <MetricCard
              label="Tiền người dùng đang giữ"
              value={formatMoney(
                position
                  ?.userFundsHeld,
              )}
              hint="Tổng Hold của ví Cá nhân và Doanh nghiệp; có thể gồm nhiều mục đích giữ tiền."
              loading={
                mainLoading
              }
              valueClassName="text-warning"
            />

            <MetricCard
              label="Ký quỹ đơn hàng"
              value={formatMoney(
                position
                  ?.orderEscrowHeld,
              )}
              hint="Phần tiền còn được giữ theo đơn hàng."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Số dư ví hệ thống"
              value={formatMoney(
                position
                  ?.systemWalletBalance,
              )}
              hint={
                mainLoading
                  ? ""
                  : `Khả dụng ${formatMoney(
                      position
                        ?.systemWalletAvailableBalance,
                    )} · Tạm giữ ${formatMoney(
                      position
                        ?.systemWalletHoldBalance,
                    )}`
              }
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Tiền người dùng khả dụng"
              value={formatMoney(
                position
                  ?.userAvailableFunds,
              )}
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Tiền khóa chờ rút"
              value={formatMoney(
                position
                  ?.withdrawalLocked,
              )}
              hint="Đã chuyển từ khả dụng sang giữ; chưa phải tiền thực rời nền tảng."
              loading={
                mainLoading
              }
              valueClassName="text-warning"
            />

            <MetricCard
              label="Ký quỹ vận chuyển GHN"
              value={formatMoney(
                position
                  ?.shippingEscrowBalance,
              )}
              hint="Phí GHN HomeCycle đã thu và hiện còn nằm trong ví ký quỹ vận chuyển."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Thanh toán đang chờ"
              value={formatMoney(
                position
                  ?.currentPendingPaymentAmount,
              )}
              hint="Tổng giá trị Payment đang Pending ở thời điểm hiện tại."
              loading={
                mainLoading
              }
              valueClassName="text-warning"
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            HOẠT ĐỘNG TRONG KỲ
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Dòng tiền và thanh toán
          </h3>
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
              label="Tiền vào thực"
              value={formatMoney(
                activity
                  ?.externalInflow,
              )}
              hint="Tiền PayOS thực sự đi vào HomeCycle trong kỳ."
              loading={
                mainLoading
              }
              valueClassName="text-success"
            />

            <MetricCard
              label="Tiền ra thực"
              value={formatMoney(
                activity
                  ?.externalOutflow,
              )}
              hint="Hiện tại là tiền thực rời HomeCycle qua rút tiền thành công."
              loading={
                mainLoading
              }
              valueClassName="text-warning"
            />

            <MetricCard
              label="Dòng tiền thuần"
              value={formatMoney(
                activity
                  ?.netExternalCashFlow,
              )}
              hint="Máy chủ tính từ tiền vào thực trừ tiền ra thực; số âm không mặc nhiên là lỗi."
              loading={
                mainLoading
              }
              valueClassName="text-primary"
            />

            <MetricCard
              label="Thanh toán đã xử lý"
              value={formatMoney(
                activity
                  ?.processedPaymentAmount,
              )}
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
              hint="Hoàn tiền là dịch chuyển nội bộ, không được tính là tiền ra thực."
              loading={
                mainLoading
              }
            />

            <MetricCard
              label="Thanh toán lỗi được tạo trong kỳ"
              value={formatMoney(
                activity
                  ?.createdFailedPaymentAmount,
              )}
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
            DÒNG TIỀN
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Tiền vào, tiền ra và luồng nội bộ
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
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Tiền vào"
                value={formatMoney(
                  cashFlow
                    ?.totals
                    ?.externalInflow,
                )}
                loading={
                  mainLoading
                }
                valueClassName="text-success"
              />

              <MetricCard
                label="Tiền ra"
                value={formatMoney(
                  cashFlow
                    ?.totals
                    ?.externalOutflow,
                )}
                loading={
                  mainLoading
                }
                valueClassName="text-warning"
              />

              <MetricCard
                label="Dòng tiền thuần"
                value={formatMoney(
                  cashFlow
                    ?.totals
                    ?.netExternalCashFlow,
                )}
                loading={
                  mainLoading
                }
                valueClassName="text-primary"
              />
            </div>

            <FinanceCashFlowChart
              rows={
                cashFlow?.series
              }
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <FinanceAmountBarChart
                title="Nguồn tiền vào"
                description="Các nguồn cấu thành tiền vào thực. Phí GHN đã thu đã nằm trong tổng tiền vào, không cộng thêm lần nữa."
                rows={
                  cashFlow
                    ?.inflowSources
                }
                getLabel={
                  breakdownLabel
                }
              />

              <FinanceAmountBarChart
                title="Dịch chuyển tiền nội bộ"
                description="Các khoản đổi chủ sở hữu hoặc trạng thái số dư bên trong HomeCycle; không mặc nhiên là tiền ra khỏi nền tảng."
                rows={
                  cashFlow
                    ?.internalMovements
                }
                getLabel={
                  breakdownLabel
                }
              />
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            TRẠNG THÁI THANH TOÁN
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Payment được tạo trong kỳ
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Phân loại các Payment được tạo trong kỳ theo trạng thái hiện tại của chúng.
          </p>
        </div>

        {mainState.errors
          .paymentStatus ? (
          <SectionError
            message="Không thể tải trạng thái thanh toán."
            onRetry={
              refreshAll
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Payment được tạo"
                value={formatNumber(
                  paymentStatus
                    ?.totalCreatedCount,
                )}
                loading={
                  mainLoading
                }
              />

              <MetricCard
                label="Tổng giá trị"
                value={formatMoney(
                  paymentStatus
                    ?.totalCreatedAmount,
                )}
                loading={
                  mainLoading
                }
              />

              <MetricCard
                label="Tỷ lệ thanh toán"
                value={formatPercent(
                  paymentStatus
                    ?.paidRatePercent,
                )}
                loading={
                  mainLoading
                }
                valueClassName="text-success"
              />

              <MetricCard
                label="Tỷ lệ thất bại"
                value={formatPercent(
                  paymentStatus
                    ?.failureRatePercent,
                )}
                loading={
                  mainLoading
                }
                valueClassName="text-error"
              />

              <MetricCard
                label="Tỷ lệ hoàn tiền"
                value={formatPercent(
                  paymentStatus
                    ?.refundedPaymentRatePercent,
                )}
                loading={
                  mainLoading
                }
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DashboardDonutChart
                title="Cơ cấu trạng thái Payment"
                description="Số lượng Payment được tạo trong kỳ theo trạng thái hiện tại."
                rows={
                  paymentDonutRows
                }
                getLabel={(item) =>
                  item.label ||
                  "Chưa xác định"
                }
              />

              <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
                <div className="border-b border-border px-5 py-5 sm:px-6">
                  <h3 className="text-lg font-black text-text">
                    Chi tiết theo trạng thái
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-background/60 text-xs uppercase tracking-[0.08em] text-textLight">
                        <th className="px-5 py-3">
                          Trạng thái
                        </th>
                        <th className="px-5 py-3 text-right">
                          Số lượng
                        </th>
                        <th className="px-5 py-3 text-right">
                          Giá trị
                        </th>
                        <th className="px-5 py-3 text-right">
                          Tỷ trọng
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {Array.isArray(
                        paymentStatus
                          ?.statuses,
                      ) &&
                      paymentStatus
                        .statuses
                        .length >
                        0 ? (
                        paymentStatus.statuses.map(
                          (
                            item,
                            index,
                          ) => (
                            <tr
                              key={`${item?.status}-${index}`}
                              className="border-b border-border/70 last:border-0"
                            >
                              <td className="px-5 py-3 font-bold text-text">
                                {enumLabel(
                                  item?.status ??
                                    item?.label,
                                  PAYMENT_STATUS_LABELS,
                                  item?.label ||
                                    "Chưa xác định",
                                )}
                              </td>

                              <td className="px-5 py-3 text-right font-black text-text">
                                {formatNumber(
                                  item?.count,
                                )}
                              </td>

                              <td className="px-5 py-3 text-right font-black text-text">
                                {formatMoney(
                                  item?.amount,
                                )}
                              </td>

                              <td className="px-5 py-3 text-right font-bold text-textLight">
                                {formatPercent(
                                  item?.percentageOfCreated,
                                )}
                              </td>
                            </tr>
                          ),
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-10 text-center text-textLight"
                          >
                            Chưa có dữ liệu.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            SỨC KHỎE TÀI CHÍNH
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Khoản tiền cần theo dõi
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Cảnh báo được phân cấp theo mức độ; không phải mọi khoản đang giữ đều là lỗi.
          </p>
        </div>

        {mainState.errors
          .health ? (
          <SectionError
            message="Không thể tải trạng thái sức khỏe tài chính."
            onRetry={
              refreshAll
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <HealthCard
              label="Payment chờ đã quá hạn"
              metric={
                health
                  ?.stalePendingPayments
              }
              severity="warning"
              description="Payment vẫn Pending nhưng đã qua thời điểm hết hạn."
            />

            <HealthCard
              label="Payment chờ thiếu thời hạn"
              metric={
                health
                  ?.pendingPaymentsWithoutExpiry
              }
              severity="warning"
              description="Payment Pending nhưng không có thời điểm hết hạn."
            />

            <HealthCard
              label="Yêu cầu rút tiền đang chờ"
              metric={
                health
                  ?.pendingWithdrawals
              }
              severity="info"
              description="Yêu cầu rút tiền đang chờ được xử lý."
            />

            <HealthCard
              label="Rút tiền đang xử lý"
              metric={
                health
                  ?.processingWithdrawals
              }
              severity="info"
              description="Đã vào quá trình xử lý nhưng chưa có kết quả cuối."
            />

            <HealthCard
              label="Đơn quá hạn giải ngân"
              metric={
                health
                  ?.overdueReleaseOrders
              }
              severity="warning"
              description="Đã hoàn tất, hết cửa sổ tranh chấp, không có tranh chấp hoạt động nhưng tiền vẫn còn bị giữ."
            />

            <HealthCard
              label="Đơn thiếu hạn giải ngân"
              metric={
                health
                  ?.completedOrdersMissingReleaseDeadline
              }
              severity="warning"
              description="Đơn hoàn tất còn Hold nhưng thiếu thời điểm kết thúc cửa sổ tranh chấp."
            />

            <HealthCard
              label="Tiền giữ do tranh chấp"
              metric={
                health
                  ?.activeDisputeHeldFunds
              }
              severity="info"
              description="Tiền đang được giữ vì đơn có tranh chấp hoạt động; đây là trạng thái theo dõi, không mặc nhiên là lỗi."
            />

            <HealthCard
              label="Ví có số dư âm"
              metric={
                health
                  ?.negativeWalletCount
              }
              severity="critical"
              description="Ví có Available hoặc Hold nhỏ hơn 0."
              countOnly
            />

            <HealthCard
              label="Giao dịch chưa phân loại"
              metric={
                health
                  ?.unclassifiedTransactionsInPeriod
              }
              severity="warning"
              description="Financial transaction trong kỳ chưa được xếp vào tiền vào, tiền ra hoặc nội bộ."
            />
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            SỔ GIAO DỊCH
          </p>

          <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-black text-text">
                Giao dịch tài chính gần đây
              </h3>

              <p className="mt-1 text-xs leading-5 text-textLight">
                Mỗi dòng là một financial event, không phải từng dòng biến động ledger.
              </p>
            </div>

            <div className="text-xs font-bold text-textLight">
              {formatNumber(
                transactionState
                  .data?.totalCount,
              )}{" "}
              giao dịch
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border bg-background/40 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <select
            value={
              transactionType
            }
            onChange={(event) =>
              updateTransactionFilter(
                "transactionType",
                event.target.value,
              )
            }
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            {TRANSACTION_TYPE_OPTIONS.map(
              ([value, label]) => (
                <option
                  key={
                    value ||
                    "all"
                  }
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>

          <select
            value={flowScope}
            onChange={(event) =>
              updateTransactionFilter(
                "flowScope",
                event.target.value,
              )
            }
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            {FLOW_OPTIONS.map(
              ([value, label]) => (
                <option
                  key={
                    value ||
                    "all"
                  }
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>

          <select
            value={status}
            onChange={(event) =>
              updateTransactionFilter(
                "status",
                event.target.value,
              )
            }
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            {TRANSACTION_STATUS_OPTIONS.map(
              ([value, label]) => (
                <option
                  key={
                    value ||
                    "all"
                  }
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>

          <select
            value={referenceType}
            onChange={(event) =>
              updateTransactionFilter(
                "referenceType",
                event.target.value,
              )
            }
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            {REFERENCE_OPTIONS.map(
              ([value, label]) => (
                <option
                  key={
                    value ||
                    "all"
                  }
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>

          <select
            value={pageSize}
            onChange={(event) =>
              setTransactionFilters(
                (current) => ({
                  ...current,
                  pageNumber: 1,
                  pageSize:
                    Number(
                      event.target
                        .value,
                    ),
                }),
              )
            }
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            <option value={20}>
              20 / trang
            </option>
            <option value={50}>
              50 / trang
            </option>
            <option value={100}>
              100 / trang
            </option>
          </select>
        </div>

        {transactionState.error &&
        !transactionsLoading ? (
          <div className="p-5">
            <SectionError
              message={
                transactionState.error
              }
              onRetry={
                refreshAll
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background/60 text-xs uppercase tracking-[0.07em] text-textLight">
                  <th className="px-4 py-3">
                    Thời gian
                  </th>
                  <th className="px-4 py-3">
                    Giao dịch
                  </th>
                  <th className="px-4 py-3">
                    Tham chiếu
                  </th>
                  <th className="px-4 py-3">
                    Người dùng
                  </th>
                  <th className="px-4 py-3">
                    Phương thức
                  </th>
                  <th className="px-4 py-3 text-right">
                    Giá trị
                  </th>
                  <th className="px-4 py-3">
                    Dòng tiền
                  </th>
                  <th className="px-4 py-3">
                    Trạng thái
                  </th>
                </tr>
              </thead>

              <tbody>
                {transactionsLoading ? (
                  Array.from(
                    { length: 6 },
                    (_, index) => (
                      <tr
                        key={index}
                        className="border-b border-border/70"
                      >
                        <td
                          colSpan={8}
                          className="px-4 py-4"
                        >
                          <div className="h-5 animate-pulse rounded bg-background" />
                        </td>
                      </tr>
                    ),
                  )
                ) : transactions.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-textLight"
                    >
                      Không có giao dịch phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  transactions.map(
                    (
                      item,
                      index,
                    ) => (
                      <tr
                        key={
                          item
                            ?.walletTransactionId ||
                          index
                        }
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-textLight">
                          {formatDateTime(
                            item
                              ?.createdAt,
                          )}
                        </td>

                        <td className="px-4 py-3 font-black text-text">
                          {enumLabel(
                            item
                              ?.transactionType,
                            TRANSACTION_TYPE_LABELS,
                            item
                              ?.transactionLabel ||
                              "Giao dịch",
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-text">
                            {item
                              ?.referenceCode ||
                              "—"}
                          </p>

                          {item
                            ?.referenceType !==
                            null &&
                            item
                              ?.referenceType !==
                              undefined && (
                              <p className="mt-1 text-xs text-textLight">
                                {enumLabel(
                                  item
                                    ?.referenceType,
                                  REFERENCE_LABELS,
                                )}
                              </p>
                            )}
                        </td>

                        <td className="px-4 py-3 font-semibold text-text">
                          {item
                            ?.username ||
                            "—"}
                        </td>

                        <td className="px-4 py-3 text-text">
                          {enumLabel(
                            item
                              ?.paymentMethod,
                            PAYMENT_METHOD_LABELS,
                            "—",
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-black text-text">
                          {formatMoney(
                            item
                              ?.amount,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
                              flowBadgeClass(
                                item
                                  ?.flowScope,
                              ),
                            ].join(" ")}
                          >
                            {enumLabel(
                              item
                                ?.flowScope,
                              FLOW_LABELS,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
                              transactionStatusClass(
                                item
                                  ?.status,
                              ),
                            ].join(" ")}
                          >
                            {enumLabel(
                              item
                                ?.status,
                              TRANSACTION_STATUS_LABELS,
                            )}
                          </span>
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-textLight">
            Trang{" "}
            {formatNumber(
              transactionState
                .data
                ?.pageNumber ||
                pageNumber,
            )}
            {" / "}
            {formatNumber(
              transactionState
                .data
                ?.totalPages ||
                1,
            )}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                transactionsLoading ||
                !transactionState
                  .data
                  ?.hasPreviousPage
              }
              onClick={() =>
                setTransactionFilters(
                  (current) => ({
                    ...current,
                    pageNumber:
                      Math.max(
                        1,
                        current.pageNumber -
                          1,
                      ),
                  }),
                )
              }
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-black text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang trước
            </button>

            <button
              type="button"
              disabled={
                transactionsLoading ||
                !transactionState
                  .data
                  ?.hasNextPage
              }
              onClick={() =>
                setTransactionFilters(
                  (current) => ({
                    ...current,
                    pageNumber:
                      current.pageNumber +
                      1,
                  }),
                )
              }
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-black text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
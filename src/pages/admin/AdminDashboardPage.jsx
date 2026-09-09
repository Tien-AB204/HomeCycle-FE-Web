import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
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

const METRIC_META = [
  {
    key: "payments",
    label: "Giao dịch",
    description: "Bản ghi thanh toán",
    icon: "payments",
  },
  {
    key: "orders",
    label: "Đơn hàng",
    description: "Đơn hàng toàn hệ thống",
    icon: "inventory_2",
  },
  {
    key: "appointments",
    label: "Lịch hẹn",
    description: "Lịch kiểm định và thu gom",
    icon: "event",
  },
  {
    key: "disputes",
    label: "Tranh chấp",
    description: "Tranh chấp toàn hệ thống",
    icon: "gavel",
  },
];

const DISPUTE_STATUS_META = {
  pending: {
    label: "Chờ xử lý",
    className: "bg-warning",
  },
  resolved: {
    label: "Đã giải quyết",
    className: "bg-success",
  },
  rejected: {
    label: "Đã từ chối",
    className: "bg-error",
  },
  closed: {
    label: "Đã đóng",
    className: "bg-textLight",
  },
  underreview: {
    label: "Đang xem xét",
    className: "bg-primary",
  },
  awaitingreturn: {
    label: "Đang chờ hoàn trả",
    className: "bg-primary/60",
  },
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

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
  const date =
    new Date(value);

  if (
    !value ||
    Number.isNaN(date.getTime())
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

  const fromDate =
    new Date(
      `${from}T00:00:00Z`,
    );

  const toDate =
    new Date(
      `${to}T00:00:00Z`,
    );

  if (
    Number.isNaN(
      fromDate.getTime(),
    ) ||
    Number.isNaN(
      toDate.getTime(),
    )
  ) {
    return "Khoảng thời gian không hợp lệ.";
  }

  const days =
    Math.round(
      (
        toDate.getTime() -
        fromDate.getTime()
      ) /
        86400000,
    );

  if (
    days < 1 ||
    days > 366
  ) {
    return "Khoảng thời gian phải từ 1 đến 366 ngày.";
  }

  return "";
};

const getTrendPresentation = (
  trend,
  metricKey,
) => {
  const direction =
    normalize(
      trend?.direction,
    );

  const growth =
    trend?.growthPercent;

  const hasGrowth =
    growth !== null &&
    growth !== undefined;

  const growthText =
    hasGrowth
      ? `${formatDecimal(
          Math.abs(
            Number(growth),
          ),
        )}%`
      : "chưa có tỷ lệ";

  if (
    direction ===
    "increasing"
  ) {
    return {
      icon: "trending_up",
      label:
        hasGrowth
          ? `Tăng ${growthText}`
          : "Đang tăng",
      className:
        metricKey ===
        "disputes"
          ? "text-error"
          : "text-primary",
    };
  }

  if (
    direction ===
    "decreasing"
  ) {
    return {
      icon:
        "trending_down",
      label:
        hasGrowth
          ? `Giảm ${growthText}`
          : "Đang giảm",
      className:
        metricKey ===
        "disputes"
          ? "text-success"
          : "text-warning",
    };
  }

  return {
    icon: "trending_flat",
    label: "Ổn định",
    className:
      "text-textLight",
  };
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

export default function AdminDashboardPage() {
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

  const requestKey =
    [
      filters.from,
      filters.to,
      filters.groupBy,
      requestVersion,
    ].join(":");

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    adminDashboardApi
      .getOperationOverview({
        from:
          filters.from ||
          undefined,
        to:
          filters.to ||
          undefined,
        groupBy:
          filters.groupBy,
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
            "Không thể tải dữ liệu tổng quan vận hành lúc này.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    filters.from,
    filters.groupBy,
    filters.to,
    requestKey,
  ]);

  const loading =
    state.requestKey !==
    requestKey;

  const data =
    state.data;

  const metrics =
    useMemo(
      () =>
        METRIC_META.map(
          (meta) => ({
            ...meta,
            metric:
              data?.[
                meta.key
              ] || null,
          }),
        ),
      [data],
    );

  const disputeRows =
    useMemo(() => {
      const rows =
        Array.isArray(
          data?.disputeCurrentStatusCounts,
        )
          ? data.disputeCurrentStatusCounts
          : [];

      return rows.map(
        (item) => {
          const meta =
            DISPUTE_STATUS_META[
              normalize(
                item.key ||
                  item.label,
              )
            ] || {
              label:
                "Trạng thái khác",
              className:
                "bg-textLight",
            };

          return {
            ...item,
            displayLabel:
              meta.label,
            className:
              meta.className,
            count:
              Number(
                item.count,
              ) || 0,
            percentage:
              Number(
                item.percentage,
              ) || 0,
          };
        },
      );
    }, [data]);

  const submitFilters = (
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

    setRequestVersion(
      (current) =>
        current + 1,
    );
  };

  const resetFilters = () => {
    const next = {
      from: "",
      to: "",
      groupBy: "Day",
    };

    setDraft(next);
    setFilters(next);
    setFilterError("");

    setRequestVersion(
      (current) =>
        current + 1,
    );
  };

  const period =
    data?.period;

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              Trung tâm điều hành
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Tổng quan vận hành
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              Theo dõi giao dịch, đơn hàng, lịch hẹn
              và tranh chấp bằng số liệu tổng hợp
              hiện tại của hệ thống.
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
              to="/admin/dashboard/users"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
            >
              <span className="material-symbols-outlined text-[20px]">
                group
              </span>
              Tổng quan người dùng
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
        onSubmit={submitFilters}
        className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.04)]"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label>
            <span className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
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
            <span className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
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

            <span className="mt-1 block text-[11px] text-textLight">
              Ngày kết thúc không được tính vào kỳ.
            </span>
          </label>

          <label>
            <span className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
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

          <div className="flex gap-2">
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
        </div>

        {filterError && (
          <p className="mt-3 text-sm font-semibold text-error">
            {filterError}
          </p>
        )}
      </form>

      {!loading &&
        period && (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-xs leading-5 text-textLight sm:flex-row sm:items-center sm:justify-between">
            <span>
              Kỳ hiện tại:{" "}
              <strong className="text-text">
                {formatDate(
                  period.from,
                )}
              </strong>
              {" → trước "}
              <strong className="text-text">
                {formatDate(
                  period.toExclusive,
                )}
              </strong>
            </span>

            <span>
              Kỳ trước bắt đầu{" "}
              <strong className="text-text">
                {formatDate(
                  period.previousFrom,
                )}
              </strong>
              {" · UTC+7"}
            </span>
          </div>
        )}

      {!loading &&
        period?.isPartialPeriod && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-text">
            <span className="material-symbols-outlined text-warning">
              info
            </span>

            <span>
              Dữ liệu kỳ hiện tại chưa hoàn tất.
            </span>
          </div>
        )}

      {state.error &&
        !loading && (
          <div
            role="alert"
            className="flex flex-col justify-between gap-3 rounded-2xl border border-error/20 bg-error/10 px-5 py-4 text-sm text-error sm:flex-row sm:items-center"
          >
            <span>
              {state.error}
            </span>

            <button
              type="button"
              onClick={() =>
                setRequestVersion(
                  (current) =>
                    current + 1,
                )
              }
              className="rounded-xl border border-error/30 bg-white px-4 py-2 font-black text-error"
            >
              Thử lại
            </button>
          </div>
        )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          ({
            key,
            label,
            description,
            icon,
            metric,
          }) => {
            const trend =
              getTrendPresentation(
                metric?.trend,
                key,
              );

            return (
              <article
                key={key}
                className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.055)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
                      {label}
                    </p>

                    <p className="mt-1 text-xs text-textLight">
                      {description}
                    </p>
                  </div>

                  <span className="material-symbols-outlined rounded-xl bg-background p-2 text-primary">
                    {icon}
                  </span>
                </div>

                <p className="mt-5 text-3xl font-black text-text">
                  {loading ? (
                    <LoadingBlock className="h-9 w-20" />
                  ) : (
                    formatNumber(
                      metric?.totalCount,
                    )
                  )}
                </p>

                <div className="mt-4 border-t border-border pt-4">
                  {loading ? (
                    <LoadingBlock className="h-5 w-32" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "material-symbols-outlined text-[19px]",
                          trend.className,
                        ].join(" ")}
                      >
                        {trend.icon}
                      </span>

                      <span
                        className={[
                          "text-sm font-black",
                          trend.className,
                        ].join(" ")}
                      >
                        {trend.label}
                      </span>
                    </div>
                  )}

                  {!loading && (
                    <p className="mt-2 text-xs leading-5 text-textLight">
                      Kỳ này{" "}
                      <strong className="text-text">
                        {formatNumber(
                          metric?.trend
                            ?.currentPeriodCount,
                        )}
                      </strong>
                      {" · kỳ trước "}
                      <strong className="text-text">
                        {formatNumber(
                          metric?.trend
                            ?.previousPeriodCount,
                        )}
                      </strong>
                    </p>
                  )}
                </div>
              </article>
            );
          },
        )}
      </div>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
        <div className="border-b border-border pb-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Tranh chấp
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            Trạng thái tranh chấp hiện tại
          </h3>

          <p className="mt-1 text-xs leading-5 text-textLight">
            Phân bố trạng thái hiện tại trên toàn hệ thống,
            không phải số tranh chấp mới trong kỳ.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <>
              <LoadingBlock className="h-12 w-full" />
              <LoadingBlock className="h-12 w-full" />
              <LoadingBlock className="h-12 w-full" />
            </>
          ) : disputeRows.length ===
            0 ? (
            <div className="rounded-xl bg-background px-4 py-8 text-center text-sm font-semibold text-textLight">
              Chưa có dữ liệu trạng thái tranh chấp.
            </div>
          ) : (
            disputeRows.map(
              (item) => {
                const width =
                  item.percentage > 0
                    ? Math.max(
                        2,
                        Math.min(
                          100,
                          item.percentage,
                        ),
                      )
                    : 0;

                return (
                  <div
                    key={
                      item.key ||
                      item.displayLabel
                    }
                  >
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span className="font-bold text-text">
                        {
                          item.displayLabel
                        }
                      </span>

                      <span className="font-black text-text">
                        {formatNumber(
                          item.count,
                        )}
                        {" · "}
                        {formatDecimal(
                          item.percentage,
                        )}
                        %
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-background">
                      <div
                        className={[
                          "h-full rounded-full transition-all duration-300",
                          item.className,
                        ].join(" ")}
                        style={{
                          width:
                            `${width}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )
          )}
        </div>
      </section>

      <div className="rounded-xl border border-border bg-white px-4 py-3 text-xs leading-5 text-textLight">
        <strong className="text-text">
          Quy ước:
        </strong>{" "}
        “Giao dịch” là số bản ghi thanh toán.
        Xu hướng tăng hoặc giảm được hiển thị theo ngữ cảnh;
        tăng số đơn hoặc lịch hẹn không mặc định được coi là
        tốt, và tăng tranh chấp không được tô như tín hiệu tích cực.
      </div>
    </section>
  );
}
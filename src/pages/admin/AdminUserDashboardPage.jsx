import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const ROLE_OPTIONS = [
  {
    value: "",
    label: "Tất cả vai trò",
  },
  {
    value: "Personal",
    label: "Cá nhân",
  },
  {
    value: "Business",
    label: "Doanh nghiệp",
  },
  {
    value: "Moderator",
    label: "Kiểm duyệt viên",
  },
  {
    value: "Admin",
    label: "Quản trị viên",
  },
];

const ROLE_META = [
  {
    value: "Personal",
    label: "Cá nhân",
    className: "text-[#2f6f70]",
  },
  {
    value: "Business",
    label: "Doanh nghiệp",
    className: "text-[#72a6a1]",
  },
  {
    value: "Moderator",
    label: "Kiểm duyệt viên",
    className: "text-[#d1a34b]",
  },
  {
    value: "Admin",
    label: "Quản trị viên",
    className: "text-[#7e8790]",
  },
];

const STATUS_META = [
  {
    value: "Pending",
    label: "Chờ kích hoạt",
    className: "bg-[#d1a34b]",
  },
  {
    value: "Active",
    label: "Đang hoạt động",
    className: "bg-[#4f8b78]",
  },
  {
    value: "Suspended",
    label: "Đã khóa",
    className: "bg-[#b95c5c]",
  },
  {
    value: "Deleted",
    label: "Đã xóa",
    className: "bg-[#8b929a]",
  },
];

const PERIOD_OPTIONS = [
  7,
  14,
  30,
  60,
  90,
];

const FORECAST_OPTIONS = [
  7,
  14,
  30,
];

const QUICK_ACTIONS = [
  {
    title: "Quản lý người dùng",
    description:
      "Kiểm soát trạng thái và quyền truy cập tài khoản.",
    path: "/admin/users",
    icon: "manage_accounts",
  },
  {
    title: "Quản lý bài đăng",
    description:
      "Theo dõi nội dung đang có trên thị trường.",
    path: "/admin/posts",
    icon: "inventory_2",
  },
  {
    title: "Chính sách hệ thống",
    description:
      "Quản lý các quy tắc vận hành nền tảng.",
    path: "/admin/policies",
    icon: "policy",
  },
];

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatNumber = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
  ).format(Number(value) || 0);

const formatDecimal = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
    {
      maximumFractionDigits: 2,
    },
  ).format(Number(value) || 0);

const formatDateShort = (value) => {
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
      day: "2-digit",
      month: "2-digit",
    },
  ).format(date);
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
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
};

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  "Không thể tải dữ liệu tổng quan quản trị.";

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

const StatusBarChart = ({
  rows,
  loading,
}) => {
  const maxValue =
    Math.max(
      1,
      ...rows.map(
        (item) => item.count,
      ),
    );

  if (loading) {
    return (
      <div className="flex h-72 items-end justify-around gap-4 px-4 pb-2">
        {STATUS_META.map(
          (item) => (
            <LoadingBlock
              key={item.value}
              className="h-44 w-16 sm:w-20"
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex h-72 min-w-[500px] items-end justify-around gap-5 border-b border-border px-4 pt-8">
        {rows.map((item) => {
          const height =
            item.count > 0
              ? Math.max(
                  8,
                  (item.count /
                    maxValue) *
                    100,
                )
              : 2;

          return (
            <div
              key={item.value}
              className="flex h-full min-w-24 flex-1 flex-col items-center justify-end"
            >
              <span className="mb-2 text-lg font-black text-text">
                {formatNumber(
                  item.count,
                )}
              </span>

              <div
                className={[
                  "w-full max-w-20 rounded-t-xl transition-all duration-300",
                  item.className,
                ].join(" ")}
                style={{
                  height:
                    `${height}%`,
                }}
              />

              <span className="mt-3 min-h-10 text-center text-xs font-bold leading-5 text-textLight">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RoleDonutChart = ({
  rows,
  total,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-[220px_1fr] sm:items-center">
        <LoadingBlock className="mx-auto h-48 w-48 rounded-full" />

        <div className="space-y-4">
          {ROLE_META.map(
            (item) => (
              <LoadingBlock
                key={item.value}
                className="h-8 w-full"
              />
            ),
          )}
        </div>
      </div>
    );
  }

  const segments =
    rows.map(
      (item, index) => {
        const percent =
          total > 0
            ? (item.count /
                total) *
              100
            : 0;

        const offset =
          rows
            .slice(0, index)
            .reduce(
              (
                sum,
                previousItem,
              ) =>
                sum +
                (
                  total > 0
                    ? (
                        previousItem.count /
                        total
                      ) * 100
                    : 0
                ),
              0,
            );

        return {
          ...item,
          percent,
          offset,
        };
      },
    );

  return (
    <div className="grid gap-7 sm:grid-cols-[220px_1fr] sm:items-center">
      <div className="relative mx-auto h-52 w-52">
        <svg
          viewBox="0 0 120 120"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label="Biểu đồ cơ cấu vai trò người dùng"
        >
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            className="text-background"
          />

          {segments.map(
            (item) =>
              item.percent > 0 && (
                <circle
                  key={item.value}
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  pathLength="100"
                  stroke="currentColor"
                  strokeWidth="16"
                  strokeDasharray={`${item.percent} ${100 - item.percent}`}
                  strokeDashoffset={
                    -item.offset
                  }
                  className={
                    item.className
                  }
                >
                  <title>
                    {`${item.label}: ${formatNumber(
                      item.count,
                    )} (${formatDecimal(
                      item.percent,
                    )}%)`}
                  </title>
                </circle>
              ),
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-text">
            {formatNumber(total)}
          </span>

          <span className="mt-1 text-xs font-bold text-textLight">
            tài khoản
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((item) => {
          const percent =
            total > 0
              ? (item.count /
                  total) *
                100
              : 0;

          return (
            <div
              key={item.value}
              className="flex items-center justify-between gap-4 rounded-xl bg-background px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={[
                    "h-3 w-3 shrink-0 rounded-full bg-current",
                    item.className,
                  ].join(" ")}
                />

                <span className="truncate text-sm font-bold text-text">
                  {item.label}
                </span>
              </div>

              <div className="text-right">
                <p className="text-sm font-black text-text">
                  {formatNumber(
                    item.count,
                  )}
                </p>

                <p className="text-xs text-textLight">
                  {formatDecimal(
                    percent,
                  )}
                  %
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RegistrationLineChart = ({
  rows,
  loading,
}) => {
  const chart =
    useMemo(() => {
      const width = 1000;
      const height = 260;
      const left = 58;
      const right = 24;
      const top = 20;
      const bottom = 42;

      const usableWidth =
        width - left - right;

      const usableHeight =
        height - top - bottom;

      const maxValue =
        Math.max(
          1,
          ...rows.map(
            (item) =>
              Number(
                item.count,
              ) || 0,
          ),
        );

      const points =
        rows.map(
          (item, index) => {
            const count =
              Number(
                item.count,
              ) || 0;

            const x =
              rows.length <= 1
                ? left +
                  usableWidth / 2
                : left +
                  (index /
                    (rows.length -
                      1)) *
                    usableWidth;

            const y =
              top +
              usableHeight -
              (count /
                maxValue) *
                usableHeight;

            return {
              ...item,
              count,
              x,
              y,
            };
          },
        );

      const tickIndexes =
        rows.length === 0
          ? []
          : Array.from(
              new Set([
                0,
                Math.round(
                  (rows.length -
                    1) *
                    0.25,
                ),
                Math.round(
                  (rows.length -
                    1) *
                    0.5,
                ),
                Math.round(
                  (rows.length -
                    1) *
                    0.75,
                ),
                rows.length - 1,
              ]),
            );

      return {
        width,
        height,
        left,
        right,
        top,
        bottom,
        usableHeight,
        maxValue,
        points,
        tickIndexes,
      };
    }, [rows]);

  if (loading) {
    return (
      <div className="h-[300px] rounded-xl bg-background p-6">
        <LoadingBlock className="h-full w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl bg-background text-sm font-semibold text-textLight">
        Chưa có dữ liệu đăng ký trong kỳ này.
      </div>
    );
  }

  const polyline =
    chart.points
      .map(
        (point) =>
          `${point.x},${point.y}`,
      )
      .join(" ");

  const currentPeriodStartIndex =
    Math.floor(
      rows.length / 2,
    );

  const currentPeriodStart =
    chart.points[
      currentPeriodStartIndex
    ];

  const previousPeriodEnd =
    chart.points[
      Math.max(
        0,
        currentPeriodStartIndex - 1,
      )
    ];

  const periodBoundaryX =
    currentPeriodStart &&
    previousPeriodEnd
      ? (
          currentPeriodStart.x +
          previousPeriodEnd.x
        ) / 2
      : null;

  const gridValues = [
    chart.maxValue,
    chart.maxValue / 2,
    0,
  ];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className="h-[300px] min-w-[720px] w-full"
        role="img"
        aria-label="Biểu đồ đường số lượng đăng ký mới theo ngày"
      >
        {gridValues.map(
          (value, index) => {
            const y =
              chart.top +
              (index /
                (gridValues.length -
                  1)) *
                chart.usableHeight;

            return (
              <g
                key={`${value}-${index}`}
              >
                <line
                  x1={chart.left}
                  x2={
                    chart.width -
                    chart.right
                  }
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="4 6"
                />

                <text
                  x={chart.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-[11px] text-textLight"
                >
                  {formatNumber(
                    value,
                  )}
                </text>
              </g>
            );
          },
        )}

        {periodBoundaryX !== null && (
          <>
            <line
              x1={periodBoundaryX}
              x2={periodBoundaryX}
              y1={chart.top}
              y2={
                chart.height -
                chart.bottom
              }
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="7 7"
              className="text-warning"
            />

            <text
              x={
                (
                  chart.left +
                  periodBoundaryX
                ) / 2
              }
              y={chart.top + 13}
              textAnchor="middle"
              fill="currentColor"
              className="text-[12px] font-bold text-textLight"
            >
              Kỳ trước
            </text>

            <text
              x={
                (
                  periodBoundaryX +
                  chart.width -
                  chart.right
                ) / 2
              }
              y={chart.top + 13}
              textAnchor="middle"
              fill="currentColor"
              className="text-[12px] font-bold text-primary"
            >
              Kỳ hiện tại
            </text>
          </>
        )}

        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />

        {chart.points.map(
          (point) => (
            <circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              r="4.5"
              fill="white"
              stroke="currentColor"
              strokeWidth="3"
              className="text-primary"
            >
              <title>
                {`${formatDateShort(
                  point.date,
                )}: ${formatNumber(
                  point.count,
                )} đăng ký`}
              </title>
            </circle>
          ),
        )}

        {chart.tickIndexes.map(
          (index) => {
            const point =
              chart.points[index];

            if (!point) {
              return null;
            }

            return (
              <text
                key={`${point.date}-${index}`}
                x={point.x}
                y={
                  chart.height -
                  10
                }
                textAnchor="middle"
                fill="currentColor"
                className="text-[11px] text-textLight"
              >
                {formatDateShort(
                  point.date,
                )}
              </text>
            );
          },
        )}
      </svg>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [role, setRole] =
    useState("");

  const [days, setDays] =
    useState(30);

  const [
    forecastDays,
    setForecastDays,
  ] = useState(7);

  const [
    requestVersion,
    setRequestVersion,
  ] = useState(0);

  const [state, setState] =
    useState({
      requestKey: "",
      overview: null,
      trend: null,
      error: "",
    });

  const requestKey =
    `${role}:${days}:${forecastDays}:${requestVersion}`;

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    Promise.all([
      adminDashboardApi
        .getUserOverview({
          role:
            role || undefined,
          signal:
            controller.signal,
        }),

      adminDashboardApi
        .getRegistrationTrend({
          role:
            role || undefined,
          days,
          forecastDays,
          signal:
            controller.signal,
        }),
    ])
      .then(
        ([
          overview,
          trend,
        ]) => {
          if (!active) {
            return;
          }

          setState({
            requestKey,
            overview,
            trend,
            error: "",
          });
        },
      )
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
          overview: null,
          trend: null,
          error:
            getErrorMessage(
              error,
            ),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    days,
    forecastDays,
    requestKey,
    role,
  ]);

  const loading =
    state.requestKey !==
    requestKey;

  const overview =
    state.overview;

  const trend =
    state.trend;

  const statusRows =
    useMemo(() => {
      const source =
        Object.fromEntries(
          (
            overview?.byStatus ||
            []
          ).map(
            (item) => [
              normalize(
                item.status,
              ),
              Number(
                item.count,
              ) || 0,
            ],
          ),
        );

      return STATUS_META.map(
        (item) => ({
          ...item,
          count:
            source[
              normalize(
                item.value,
              )
            ] || 0,
        }),
      );
    }, [overview]);

  const roleRows =
    useMemo(() => {
      const source =
        Object.fromEntries(
          (
            overview?.byRole ||
            []
          ).map(
            (item) => [
              normalize(
                item.role,
              ),
              Number(
                item.count,
              ) || 0,
            ],
          ),
        );

      return ROLE_META.map(
        (item) => ({
          ...item,
          count:
            source[
              normalize(
                item.value,
              )
            ] || 0,
        }),
      );
    }, [overview]);

  const totalRoleAccounts =
    roleRows.reduce(
      (sum, item) =>
        sum + item.count,
      0,
    );

  const dailyRegistrations =
    useMemo(
      () =>
        Array.isArray(
          trend?.dailyRegistrations,
        )
          ? trend.dailyRegistrations
          : [],
      [trend],
    );

  const direction =
    normalize(
      trend?.direction,
    );

  const directionMeta =
    direction === "increasing"
      ? {
          label: "Đang tăng",
          icon: "trending_up",
          className:
            "text-success",
        }
      : direction === "decreasing"
        ? {
            label: "Đang giảm",
            icon: "trending_down",
            className:
              "text-error",
          }
        : {
            label: "Ổn định",
            icon: "trending_flat",
            className:
              "text-primary",
          };

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
              Tổng quan người dùng
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Theo dõi cơ cấu tài khoản,
              trạng thái và xu hướng đăng ký
              bằng số liệu tổng hợp trực tiếp từ máy chủ.
            </p>

            {!loading &&
              overview?.generatedAtUtc && (
                <p className="mt-3 text-xs font-semibold text-white/60">
                  Cập nhật lúc{" "}
                  {formatDateTime(
                    overview.generatedAtUtc,
                  )}
                </p>
              )}
          </div>

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

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.04)] sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
            Vai trò
          </span>

          <select
            value={role}
            onChange={(event) =>
              setRole(
                event.target.value,
              )
            }
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            {ROLE_OPTIONS.map(
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

        <label className="flex-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
            Kỳ thống kê
          </span>

          <select
            value={days}
            onChange={(event) =>
              setDays(
                Number(
                  event.target.value,
                ),
              )
            }
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            {PERIOD_OPTIONS.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value} ngày
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
            Ước tính tiếp theo
          </span>

          <select
            value={
              forecastDays
            }
            onChange={(event) =>
              setForecastDays(
                Number(
                  event.target.value,
                ),
              )
            }
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-text outline-none focus:border-primary"
          >
            {FORECAST_OPTIONS.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value} ngày
                </option>
              ),
            )}
          </select>
        </label>
      </div>

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
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.055)]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
            Tổng tài khoản
          </p>

          <p className="mt-3 text-3xl font-black text-text">
            {loading ? (
              <LoadingBlock className="h-9 w-20" />
            ) : (
              formatNumber(
                overview?.totalAccounts,
              )
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.055)]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
            Đã xác thực email
          </p>

          <p className="mt-3 text-3xl font-black text-success">
            {loading ? (
              <LoadingBlock className="h-9 w-20" />
            ) : (
              formatNumber(
                overview?.emailVerifiedAccounts,
              )
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.055)]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
            Đăng ký kỳ hiện tại
          </p>

          <p className="mt-3 text-3xl font-black text-primary">
            {loading ? (
              <LoadingBlock className="h-9 w-20" />
            ) : (
              formatNumber(
                trend?.currentPeriodRegistrations,
              )
            )}
          </p>
        </article>

        <article className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 shadow-[0_10px_28px_rgba(24,63,65,0.04)]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
            Ước tính đăng ký
          </p>

          <p className="mt-3 text-3xl font-black text-text">
            {loading ? (
              <LoadingBlock className="h-9 w-20" />
            ) : (
              formatDecimal(
                trend?.forecast
                  ?.estimatedRegistrations,
              )
            )}
          </p>

          <p className="mt-2 text-xs leading-5 text-textLight">
            Trong{" "}
            {trend?.forecast
              ?.days ||
              forecastDays}{" "}
            ngày tiếp theo.
          </p>
        </article>
      </div>

      <div className="rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-xs leading-5 text-textLight">
        <strong className="text-text">
          Lưu ý:
        </strong>{" "}
        “Đang hoạt động” là trạng thái của tài khoản,
        không có nghĩa người dùng đang trực tuyến.
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
          <div className="border-b border-border pb-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Biểu đồ trạng thái
            </p>

            <h3 className="mt-1 text-xl font-black text-text">
              Tài khoản theo trạng thái
            </h3>

            <p className="mt-1 text-xs leading-5 text-textLight">
              So sánh số lượng tài khoản ở từng trạng thái hệ thống.
            </p>
          </div>

          <div className="mt-5">
            <StatusBarChart
              rows={statusRows}
              loading={loading}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
          <div className="border-b border-border pb-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Biểu đồ cơ cấu
            </p>

            <h3 className="mt-1 text-xl font-black text-text">
              Tài khoản theo vai trò
            </h3>

            <p className="mt-1 text-xs leading-5 text-textLight">
              Tỷ trọng Cá nhân, Doanh nghiệp,
              Kiểm duyệt viên và Quản trị viên.
            </p>
          </div>

          <div className="mt-6">
            <RoleDonutChart
              rows={roleRows}
              total={
                totalRoleAccounts
              }
              loading={loading}
            />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Biểu đồ xu hướng
            </p>

            <h3 className="mt-1 text-xl font-black text-text">
              Đăng ký mới theo ngày
            </h3>

            <p className="mt-1 text-xs leading-5 text-textLight">
              Hiển thị hai kỳ liên tiếp cùng độ dài để so sánh:
              kỳ trước và kỳ hiện tại.
            </p>
          </div>

          {!loading &&
            trend && (
              <div
                className={[
                  "inline-flex items-center gap-1 text-sm font-black",
                  directionMeta.className,
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {directionMeta.icon}
                </span>

                {directionMeta.label}
              </div>
            )}
        </div>

        <div className="mt-5">
          <RegistrationLineChart
            rows={
              dailyRegistrations
            }
            loading={loading}
          />
        </div>

        {!loading &&
          trend && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-background p-3">
                <p className="text-xs font-bold text-textLight">
                  Kỳ trước
                </p>

                <p className="mt-1 text-xl font-black text-text">
                  {formatNumber(
                    trend.previousPeriodRegistrations,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-background p-3">
                <p className="text-xs font-bold text-textLight">
                  Kỳ hiện tại
                </p>

                <p className="mt-1 text-xl font-black text-text">
                  {formatNumber(
                    trend.currentPeriodRegistrations,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-background p-3">
                <p className="text-xs font-bold text-textLight">
                  Thay đổi
                </p>

                <p className="mt-1 text-xl font-black text-text">
                  {Number(
                    trend.registrationChange,
                  ) > 0
                    ? "+"
                    : ""}
                  {formatNumber(
                    trend.registrationChange,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-background p-3">
                <p className="text-xs font-bold text-textLight">
                  Trung bình/ngày
                </p>

                <p className="mt-1 text-xl font-black text-text">
                  {formatDecimal(
                    trend.averageDailyRegistrations,
                  )}
                </p>
              </div>
            </div>
          )}

        <div className="mt-4 rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-xs leading-5 text-textLight">
          Số đăng ký tương lai chỉ là{" "}
          <strong className="text-text">
            ước tính
          </strong>{" "}
          từ trung bình đăng ký của kỳ gần nhất,
          không phải mức tăng trưởng được cam kết.
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
          Truy cập nhanh
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {QUICK_ACTIONS.map(
            (item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group rounded-xl border border-border p-4 transition hover:border-primary/30 hover:bg-background"
              >
                <span className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary">
                  {item.icon}
                </span>

                <p className="mt-3 font-black text-text">
                  {item.title}
                </p>

                <p className="mt-1 text-xs leading-5 text-textLight">
                  {item.description}
                </p>
              </Link>
            ),
          )}
        </div>
      </section>
    </section>
  );
}
import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const GROUP_OPTIONS = [
  { value: "Day", label: "Theo ngày" },
  { value: "Week", label: "Theo tuần" },
  { value: "Month", label: "Theo tháng" },
];

const formatNumber = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
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

  return "";
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

function OverviewCard({
  title,
  icon,
  to,
  items,
  loading,
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.055)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
            {title}
          </p>
        </div>

        <span className="material-symbols-outlined rounded-xl bg-background p-2 text-primary">
          {icon}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {items.map(
          (item, index) => (
            <div
              key={item.label}
              className={
                index === 0
                  ? ""
                  : "border-t border-border pt-4"
              }
            >
              <p className="text-xs font-bold text-textLight">
                {item.label}
              </p>

              <p
                className={[
                  "mt-1 text-2xl font-black",
                  item.className ||
                    "text-text",
                ].join(" ")}
              >
                {loading ? (
                  <LoadingBlock className="h-8 w-16" />
                ) : (
                  formatNumber(
                    item.value,
                  )
                )}
              </p>
            </div>
          ),
        )}
      </div>

      <Link
        to={to}
        className="mt-5 inline-flex items-center gap-1 text-xs font-black text-primary"
      >
        Xem chi tiết
        <span className="material-symbols-outlined text-[17px]">
          arrow_forward
        </span>
      </Link>
    </article>
  );
}

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

  const requestKey = [
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
              Theo dõi trạng thái hiện tại và các sự kiện
              vận hành thực tế của hệ thống.
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
              value={draft.groupBy}
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
                    key={option.value}
                    value={option.value}
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
          <div className="rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-xs leading-5 text-textLight">
            Kỳ sự kiện:{" "}
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
            {" · UTC+7"}
          </div>
        )}

      {!loading &&
        period?.isPartialPeriod && (
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          title="Đơn hàng"
          icon="inventory_2"
          to="/admin/dashboard/orders"
          loading={loading}
          items={[
            {
              label: "Tổng đơn",
              value:
                data?.orders
                  ?.totalCount,
            },
            {
              label: "Đang hoạt động",
              value:
                data?.orders
                  ?.activeCount,
              className:
                "text-primary",
            },
          ]}
        />

        <OverviewCard
          title="Lịch hẹn"
          icon="event"
          to="/admin/dashboard/appointments"
          loading={loading}
          items={[
            {
              label: "Sắp tới",
              value:
                data?.appointments
                  ?.upcomingCount,
            },
            {
              label: "Hôm nay",
              value:
                data?.appointments
                  ?.todayCount,
              className:
                "text-primary",
            },
          ]}
        />

        <OverviewCard
          title="Thanh toán"
          icon="payments"
          to="/admin/dashboard/payments"
          loading={loading}
          items={[
            {
              label:
                "Tổng thanh toán",
              value:
                data?.payments
                  ?.totalCount,
            },
            {
              label:
                "Chờ thanh toán",
              value:
                data?.payments
                  ?.pendingCount,
              className:
                "text-warning",
            },
          ]}
        />

        <OverviewCard
          title="Tranh chấp"
          icon="gavel"
          to="/admin/dashboard/disputes"
          loading={loading}
          items={[
            {
              label:
                "Chưa xử lý xong",
              value:
                data?.disputes
                  ?.unresolvedCount,
              className:
                "text-error",
            },
            {
              label:
                "Đã giải quyết trong kỳ",
              value:
                data?.disputes
                  ?.resolvedInPeriodCount,
              className:
                "text-success",
            },
            {
              label:
                "Tổng tranh chấp",
              value:
                data?.disputes
                  ?.totalCount,
            },
          ]}
        />
      </div>

      <div className="rounded-xl border border-border bg-white px-4 py-3 text-xs leading-5 text-textLight">
        Các chỉ số như đơn đang hoạt động, thanh toán chờ xử lý
        và tranh chấp chưa xử lý là trạng thái hiện tại.
        Bộ lọc thời gian chỉ áp dụng cho các chỉ số theo sự kiện.
      </div>
    </section>
  );
}
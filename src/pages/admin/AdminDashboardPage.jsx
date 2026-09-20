import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  DashboardDonutChart,
  DashboardLineChart,
} from "../../components/admin/AdminDashboardCharts";
import { getOrderStatusMeta } from "../../constants/orders";
import adminDashboardApi from "../../services/apis/adminDashboardApi";

const CHART_SOURCES = [
  { key: "orders", method: "getOrders" },
  { key: "payments", method: "getPayments" },
  { key: "disputes", method: "getDisputes" },
];

const CHART_ERROR_MESSAGE =
  "Không thể tải biểu đồ này lúc này.";

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

const ChartUnavailable = ({ title, message, onRetry }) => (
  <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
    <h3 className="text-lg font-black text-text">{title}</h3>
    <div className="mt-5 flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl bg-background text-sm font-semibold text-textLight">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-black text-primary transition hover:bg-primary/10"
        >
          Thử lại
        </button>
      )}
    </div>
  </section>
);

const formatNumber = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
  ).format(Number(value) || 0);

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

function OverviewCard({
  title,
  icon,
  to,
  items,
  loading,
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_28px_rgba(24,63,65,0.055)]">
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

      <div className="mt-4 space-y-3">
        {items.map(
          (item, index) => (
            <div
              key={item.label}
              className={
                index === 0
                  ? ""
                  : "border-t border-border pt-3"
              }
            >
              <p className="text-xs font-bold text-textLight">
                {item.label}
              </p>

              <p
                className={[
                  "mt-0.5 text-xl font-black",
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
        className="mt-4 inline-flex items-center gap-1 text-xs font-black text-primary"
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
    String(requestVersion);

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    adminDashboardApi
      .getOperationOverview({
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
  }, [requestKey]);

  const [chartState, setChartState] =
    useState({
      requestKey: "",
      data: {},
      errors: {},
    });

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    Promise.all(
      CHART_SOURCES.map((source) =>
        adminDashboardApi[source.method]({
          signal: controller.signal,
        })
          .then((result) => [source.key, result, ""])
          .catch((error) => [
            source.key,
            null,
            isCanceledRequest(error)
              ? "canceled"
              : CHART_ERROR_MESSAGE,
          ]),
      ),
    ).then((results) => {
      if (
        !active ||
        results.some(([, , error]) => error === "canceled")
      ) {
        return;
      }

      setChartState({
        requestKey,
        data: Object.fromEntries(
          results.map(([key, result]) => [key, result]),
        ),
        errors: Object.fromEntries(
          results
            .filter(([, , error]) => error)
            .map(([key, , error]) => [key, error]),
        ),
      });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey]);

  const loading =
    state.requestKey !==
    requestKey;

  const data =
    state.data;

  const chartsLoading =
    chartState.requestKey !== requestKey;

  const charts = chartState.data;
  const chartErrors = chartState.errors;

  const refresh = () =>
    setRequestVersion(
      (current) => current + 1,
    );

  const renderLineChart = (key, props) => {
    if (chartsLoading) {
      return (
        <LoadingBlock className="h-80 w-full rounded-2xl" />
      );
    }

    if (chartErrors[key]) {
      return (
        <ChartUnavailable
          title={props.title}
          message={chartErrors[key]}
          onRetry={refresh}
        />
      );
    }

    return <DashboardLineChart {...props} />;
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
              Tổng quan vận hành
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              Số liệu hiện tại của hệ thống và xu hướng vận hành
              trong 30 ngày gần nhất.
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
              onClick={refresh}
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
                "Đã giải quyết trong 30 ngày gần nhất",
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
        Các số tổng, số đang hoạt động, chờ thanh toán, chưa xử lý xong,
        lịch sắp tới và hôm nay là trạng thái hiện tại trên toàn bộ dữ liệu.
        Riêng số tranh chấp đã giải quyết sử dụng kỳ mặc định 30 ngày gần nhất của máy chủ.
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            XU HƯỚNG VẬN HÀNH
          </p>

          <h3 className="mt-1 text-xl font-black text-text">
            30 ngày gần nhất
          </h3>

          <p className="mt-1 text-sm text-textLight">
            Các biểu đồ theo ngày dùng kỳ mặc định 30 ngày gần nhất của máy chủ (tính theo giờ Việt Nam). Xem chi tiết và lọc theo kỳ khác tại từng dashboard.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {renderLineChart("orders", {
            title: "Kết quả đơn hàng theo ngày",
            description:
              "Số đơn hoàn tất, hủy và hoàn trả theo thời điểm nghiệp vụ thực tế trong 30 ngày gần nhất.",
            rows: charts.orders?.outcomeSeries,
            series: [
              { key: "completedCount", label: "Hoàn tất", className: "text-success" },
              { key: "cancelledCount", label: "Hủy", className: "text-error" },
              { key: "returnedCount", label: "Hoàn trả", className: "text-warning" },
            ],
          })}

          {renderLineChart("disputes", {
            title: "Tranh chấp mở mới và đã giải quyết",
            description:
              "So sánh số tranh chấp phát sinh và số tranh chấp được giải quyết theo ngày trong 30 ngày gần nhất.",
            rows: charts.disputes?.openedVsResolvedSeries,
            series: [
              { key: "openedCount", label: "Mở mới", className: "text-error" },
              { key: "resolvedCount", label: "Đã giải quyết", className: "text-success" },
            ],
          })}

          {renderLineChart("payments", {
            title: "Thanh toán thành công theo ngày",
            description:
              "Số thanh toán đã thanh toán thành công theo thời điểm thanh toán thực tế trong 30 ngày gần nhất.",
            rows: charts.payments?.paidSeries,
            series: [
              { key: "count", label: "Đã thanh toán", className: "text-success" },
            ],
          })}

          {chartsLoading ? (
            <LoadingBlock className="h-80 w-full rounded-2xl" />
          ) : chartErrors.orders ? (
            <ChartUnavailable
              title="Cơ cấu trạng thái đơn hàng hiện tại"
              message={chartErrors.orders}
              onRetry={refresh}
            />
          ) : (
            <DashboardDonutChart
              title="Cơ cấu trạng thái đơn hàng hiện tại"
              description="Trạng thái hiện tại của toàn bộ đơn hàng; không giới hạn theo kỳ."
              rows={charts.orders?.currentStatusDistribution}
              getLabel={(item) =>
                getOrderStatusMeta(item.label || item.key).label
              }
            />
          )}
        </div>
      </section>
    </section>
  );
}
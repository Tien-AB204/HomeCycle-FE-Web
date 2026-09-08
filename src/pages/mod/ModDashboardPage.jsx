import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import modDashboardApi from "../../services/apis/modDashboardApi";

const DASHBOARD_ITEMS = [
  {
    key: "businessPending",
    label: "Doanh nghiệp chờ duyệt",
    description:
      "Hồ sơ doanh nghiệp đang chờ kiểm tra.",
    icon: "domain_verification",
    path: "/mod/verification",
    actionLabel: "Duyệt hồ sơ",
  },
  {
    key: "personalPending",
    label: "Cá nhân chờ duyệt",
    description:
      "Hồ sơ định danh cá nhân đang chờ kiểm tra.",
    icon: "person_check",
    path: "/mod/verification",
    actionLabel: "Duyệt hồ sơ",
  },
  {
    key: "totalPosts",
    label: "Tổng bài đăng",
    description:
      "Tổng số bài đăng hiện có trên hệ thống.",
    icon: "article",
    path: "/mod/posts",
    actionLabel: "Kiểm duyệt bài",
  },
  {
    key: "pendingDisputes",
    label: "Tranh chấp chờ xử lý",
    description:
      "Tranh chấp đang ở trạng thái chờ tiếp nhận.",
    icon: "gavel",
    path: "/mod/disputes",
    actionLabel: "Xử lý tranh chấp",
  },
];

const INITIAL_METRICS = {
  businessPending: null,
  personalPending: null,
  totalPosts: null,
  pendingDisputes: null,
};

const INITIAL_ERRORS = {
  businessPending: false,
  personalPending: false,
  totalPosts: false,
  pendingDisputes: false,
};

const formatNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString(
    "vi-VN",
  );
};

const formatUpdatedAt = (value) => {
  if (!value) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
};

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

const ModDashboardPage = () => {
  const navigate = useNavigate();

  const [metrics, setMetrics] =
    useState(INITIAL_METRICS);

  const [errors, setErrors] =
    useState(INITIAL_ERRORS);

  const [loading, setLoading] =
    useState(true);

  const [updatedAt, setUpdatedAt] =
    useState(null);

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const loadDashboard = useCallback(
    async (signal) => {
      setLoading(true);

      const requests = [
        {
          key: "businessPending",
          request:
            modDashboardApi.getPendingBusinessCount(
              { signal },
            ),
        },
        {
          key: "personalPending",
          request:
            modDashboardApi.getPendingPersonalCount(
              { signal },
            ),
        },
        {
          key: "totalPosts",
          request:
            modDashboardApi.getTotalPostCount(
              { signal },
            ),
        },
        {
          key: "pendingDisputes",
          request:
            modDashboardApi.getPendingDisputeCount(
              { signal },
            ),
        },
      ];

      const results =
        await Promise.allSettled(
          requests.map(
            (item) => item.request,
          ),
        );

      if (signal.aborted) {
        return;
      }

      const nextMetrics = {
        ...INITIAL_METRICS,
      };

      const nextErrors = {
        ...INITIAL_ERRORS,
      };

      results.forEach((result, index) => {
        const key = requests[index].key;

        if (
          result.status === "fulfilled"
        ) {
          nextMetrics[key] =
            result.value;
          return;
        }

        if (
          isCanceledRequest(result.reason)
        ) {
          return;
        }

        nextErrors[key] = true;
      });

      setMetrics(nextMetrics);
      setErrors(nextErrors);
      setUpdatedAt(new Date());
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(() => {
        void loadDashboard(
          controller.signal,
        );
      }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    loadDashboard,
    refreshVersion,
  ]);

  const failedCount = useMemo(
    () =>
      Object.values(errors).filter(Boolean)
        .length,
    [errors],
  );

  const handleRefresh = () => {
    setLoading(true);
    setRefreshVersion(
      (current) => current + 1,
    );
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              Khu vực kiểm duyệt
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Tổng quan vận hành
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              Theo dõi các hàng đợi cần xử lý từ
              dữ liệu hệ thống hiện tại.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleRefresh}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className={[
                "material-symbols-outlined text-[19px]",
                loading
                  ? "animate-spin"
                  : "",
              ].join(" ")}
              aria-hidden="true"
            >
              {loading
                ? "progress_activity"
                : "refresh"}
            </span>

            {loading
              ? "Đang tải..."
              : "Làm mới"}
          </button>
        </div>
      </header>

      {failedCount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/10 px-5 py-4"
        >
          <span
            className="material-symbols-outlined mt-0.5 text-[21px] text-warning"
            aria-hidden="true"
          >
            warning
          </span>

          <div>
            <p className="text-sm font-black text-text">
              Một phần dữ liệu chưa tải được
            </p>

            <p className="mt-1 text-sm leading-6 text-textLight">
              {failedCount} mục đang tạm thời
              không khả dụng. Các mục tải thành
              công vẫn được hiển thị bình thường.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DASHBOARD_ITEMS.map((item) => {
          const hasError =
            errors[item.key];

          return (
            <article
              key={item.key}
              className="group rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(24,63,65,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className="material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-[24px] text-primary"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span
                  className={[
                    "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]",
                    hasError
                      ? "bg-error/10 text-error"
                      : "bg-success/10 text-success",
                  ].join(" ")}
                >
                  {hasError
                    ? "Chưa tải được"
                    : "Dữ liệu thật"}
                </span>
              </div>

              <p className="mt-5 text-3xl font-black tracking-tight text-text">
                {loading
                  ? "..."
                  : formatNumber(
                      metrics[item.key],
                    )}
              </p>

              <h2 className="mt-2 text-sm font-black text-text">
                {item.label}
              </h2>

              <p className="mt-2 min-h-10 text-xs leading-5 text-textLight">
                {hasError
                  ? "Không thể tải mục này. Hãy thử làm mới."
                  : item.description}
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(item.path)
                }
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-primary transition group-hover:gap-2"
              >
                {item.actionLabel}

                <span
                  className="material-symbols-outlined text-[17px]"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </button>
            </article>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)] sm:p-6">
          <div className="border-b border-border pb-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Hàng đợi công việc
            </p>

            <h2 className="mt-1 text-xl font-black text-text">
              Khu vực cần chú ý
            </h2>
          </div>

          <div className="mt-4 divide-y divide-border">
            {[
              {
                label: "Duyệt hồ sơ",
                value:
                  (Number(
                    metrics.businessPending,
                  ) || 0) +
                  (Number(
                    metrics.personalPending,
                  ) || 0),
                unavailable:
                  errors.businessPending &&
                  errors.personalPending,
                path: "/mod/verification",
                icon: "verified_user",
              },
              {
                label:
                  "Kiểm duyệt bài đăng",
                value: metrics.totalPosts,
                unavailable:
                  errors.totalPosts,
                path: "/mod/posts",
                icon: "fact_check",
              },
              {
                label:
                  "Tranh chấp chờ xử lý",
                value:
                  metrics.pendingDisputes,
                unavailable:
                  errors.pendingDisputes,
                path: "/mod/disputes",
                icon: "balance",
              },
            ].map((queue) => (
              <button
                key={queue.label}
                type="button"
                onClick={() =>
                  navigate(queue.path)
                }
                className="flex w-full items-center justify-between gap-4 py-4 text-left transition first:pt-0 last:pb-0 hover:text-primary"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-[21px] text-primary"
                    aria-hidden="true"
                  >
                    {queue.icon}
                  </span>

                  <span className="font-black text-text">
                    {queue.label}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  <strong className="text-lg font-black text-text">
                    {loading
                      ? "..."
                      : queue.unavailable
                        ? "—"
                        : formatNumber(
                            queue.value,
                          )}
                  </strong>

                  <span
                    className="material-symbols-outlined text-[19px] text-textLight"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-background p-5 shadow-[0_10px_28px_rgba(24,63,65,0.04)]">
          <span
            className="material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[24px] text-primary shadow-sm"
            aria-hidden="true"
          >
            monitoring
          </span>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-textLight">
            Trạng thái dữ liệu
          </p>

          <h2 className="mt-2 text-lg font-black text-text">
            Đồng bộ từ máy chủ
          </h2>

          <p className="mt-2 text-sm leading-6 text-textLight">
            Trang này chỉ đọc dữ liệu. Không có
            thao tác phê duyệt, đình chỉ hoặc xử
            lý tranh chấp trực tiếp từ màn hình
            tổng quan.
          </p>

          <div className="mt-5 rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-textLight">
              Cập nhật gần nhất
            </p>

            <p className="mt-1 text-sm font-black text-text">
              {formatUpdatedAt(updatedAt)}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ModDashboardPage;
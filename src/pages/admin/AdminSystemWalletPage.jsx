import {
  useEffect,
  useState,
} from "react";
import adminWalletApi from "../../services/apis/adminWalletApi";

const PURPOSE_LABELS = {
  shippingescrow: "Ký quỹ vận chuyển",
  platformrevenue: "Doanh thu nền tảng",
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const purposeLabel = (value) =>
  PURPOSE_LABELS[normalize(value)] ||
  "Ví hệ thống";

const formatMoney = (value) =>
  new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    },
  ).format(Number(value) || 0);

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

function SummaryCard({
  label,
  value,
  description,
  loading,
  valueClassName = "text-text",
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
        {label}
      </p>

      {loading ? (
        <div className="mt-3 h-9 w-40 animate-pulse rounded-lg bg-background" />
      ) : (
        <p
          className={[
            "mt-3 break-words text-2xl font-black sm:text-3xl",
            valueClassName,
          ].join(" ")}
        >
          {formatMoney(value)}
        </p>
      )}

      <p className="mt-2 text-xs leading-5 text-textLight">
        {description}
      </p>
    </article>
  );
}

export default function AdminSystemWalletPage() {
  const [requestVersion, setRequestVersion] =
    useState(0);

  const [state, setState] =
    useState({
      requestKey: -1,
      data: null,
      error: "",
    });

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    adminWalletApi
      .getSystemSummary({
        signal: controller.signal,
      })
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          requestKey:
            requestVersion,
          data,
          error: "",
        });
      })
      .catch((error) => {
        if (
          !active ||
          isCanceledRequest(error)
        ) {
          return;
        }

        setState({
          requestKey:
            requestVersion,
          data: null,
          error:
            "Không thể tải thông tin ví hệ thống lúc này.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestVersion]);

  const loading =
    state.requestKey !==
    requestVersion;

  const data =
    state.data;

  const wallets =
    Array.isArray(data?.wallets)
      ? data.wallets
      : [];

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-7 text-white shadow-[0_18px_45px_rgba(24,63,65,0.16)] sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full border-[38px] border-white/5" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
              VẬN HÀNH HỆ THỐNG
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Ví hệ thống
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              Theo dõi số tiền đang nằm trong các ví hệ thống
              phục vụ ký quỹ và doanh thu nền tảng.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setRequestVersion(
                (current) =>
                  current + 1,
              )
            }
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
          >
            <span className="material-symbols-outlined text-[20px]">
              refresh
            </span>
            Làm mới
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm leading-6 text-text">
        Tổng tiền hệ thống đang giữ hộ gồm cả số dư khả dụng
        và số dư đang tạm giữ trong toàn bộ ví hệ thống.
        Chỉ số này không đồng nghĩa với doanh thu thuần.
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

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Tổng đang giữ hộ"
          value={
            data?.totalHeldBalance
          }
          description="Tổng số dư khả dụng và tạm giữ của các ví hệ thống."
          loading={loading}
          valueClassName="text-primary"
        />

        <SummaryCard
          label="Số dư khả dụng"
          value={
            data?.totalAvailableBalance
          }
          description="Phần số dư hiện đang ở trạng thái khả dụng."
          loading={loading}
        />

        <SummaryCard
          label="Đang tạm giữ"
          value={
            data?.totalHoldBalance
          }
          description="Phần số dư hiện đang được hệ thống tạm giữ."
          loading={loading}
          valueClassName="text-warning"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_28px_rgba(24,63,65,0.05)]">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">
            CHI TIẾT
          </p>

          <h3 className="mt-1 text-lg font-black text-text">
            Các ví hệ thống
          </h3>

          <p className="mt-1 text-xs leading-5 text-textLight">
            Phân tách theo mục đích sử dụng do máy chủ quản lý.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-2xl bg-background" />
              <div className="h-24 animate-pulse rounded-2xl bg-background" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/50 px-5 py-10 text-center">
              <span
                className="material-symbols-outlined text-[34px] text-textLight"
                aria-hidden="true"
              >
                account_balance_wallet
              </span>

              <p className="mt-3 font-black text-text">
                Chưa có ví hệ thống
              </p>

              <p className="mt-1 text-sm text-textLight">
                Máy chủ hiện chưa trả về ví hệ thống nào.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {wallets.map(
                (wallet, index) => {
                  const available =
                    Number(
                      wallet
                        ?.availableBalance,
                    ) || 0;

                  const hold =
                    Number(
                      wallet
                        ?.holdBalance,
                    ) || 0;

                  return (
                    <article
                      key={
                        wallet
                          ?.walletId ||
                        `${wallet?.purpose}-${index}`
                      }
                      className="rounded-2xl border border-border bg-background/50 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-textLight">
                            Mục đích ví
                          </p>

                          <h4 className="mt-1 text-lg font-black text-text">
                            {purposeLabel(
                              wallet
                                ?.purpose,
                            )}
                          </h4>
                        </div>

                        <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
                          Ví hệ thống
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-white px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-textLight">
                            Khả dụng
                          </p>

                          <p className="mt-1 font-black text-text">
                            {formatMoney(
                              available,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-textLight">
                            Tạm giữ
                          </p>

                          <p className="mt-1 font-black text-warning">
                            {formatMoney(
                              hold,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-textLight">
                            Tổng
                          </p>

                          <p className="mt-1 font-black text-primary">
                            {formatMoney(
                              available +
                                hold,
                            )}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
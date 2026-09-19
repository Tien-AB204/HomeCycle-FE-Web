import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import subscriptionApi from "../../services/apis/subscriptionApi";
import { normalizeRole } from "../../utils/authUtils";

const PENDING_SUBSCRIPTION_KEY = "homecycle:pending-subscription-id";

const notifySubscriptionChanged = () => {
  window.dispatchEvent(
    new CustomEvent("homecycle:subscription-changed"),
  );
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.message ||
  fallback;

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "—";
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

const normalizeTier = (value) =>
  String(value || "FREE").trim().toUpperCase();

const isActiveSubscription = (subscription) =>
  String(subscription?.status || "").toLowerCase() === "active" &&
  Boolean(subscription?.expiresAt) &&
  Date.parse(subscription.expiresAt) > Date.now();

const Feature = ({ children, enabled = true }) => (
  <li className={enabled ? "text-text" : "text-textLight"}>
    <span className={enabled ? "text-success" : "text-border"}>
      {enabled ? "✓" : "—"}
    </span>{" "}
    {children}
  </li>
);

export default function SubscriptionPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = normalizeRole(user?.role);
  const targetRole =
    role === ROLES.BUSINESS
      ? "Business"
      : role === ROLES.PERSONAL
        ? "Personal"
        : "";

  const [state, setState] = useState({
    loading: true,
    error: "",
    freePlan: null,
    packages: [],
    subscription: null,
    benefits: null,
  });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(null);

  const load = useCallback(async (signal) => {
    if (!targetRole) return;

    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const [freePlan, packages, subscription, benefits] = await Promise.all([
        subscriptionApi.getFreePlan(targetRole, { signal }),
        subscriptionApi.getPackages({ signal }),
        subscriptionApi.getMySubscription({ signal }),
        subscriptionApi.getMyBenefits({ signal }),
      ]);

      setState({
        loading: false,
        error: "",
        freePlan,
        packages: packages.filter(
          (item) =>
            String(item?.targetRole || "").toLowerCase() ===
            targetRole.toLowerCase(),
        ),
        subscription,
        benefits,
      });
    } catch (error) {
      if (
        error?.name === "CanceledError" ||
        error?.code === "ERR_CANCELED"
      ) {
        return;
      }

      setState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(
          error,
          "Không thể tải thông tin gói đăng ký.",
        ),
      }));
    }
  }, [targetRole]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const isReturn =
      location.pathname.endsWith("/payment-return") ||
      location.pathname.endsWith("/payment-cancel");

    if (!isReturn) return undefined;

    const subscriptionId = sessionStorage.getItem(PENDING_SUBSCRIPTION_KEY);
    if (!subscriptionId) return undefined;

    let stopped = false;
    let timerId = null;
    let attempts = 0;

    const check = async () => {
      attempts += 1;

      try {
        const status = await subscriptionApi.getPaymentStatus(subscriptionId);
        if (stopped) return;

        setPaymentStatus(status);

        const payment = String(status?.paymentStatus || "").toLowerCase();
        const subscription = String(
          status?.subscriptionStatus || "",
        ).toLowerCase();

        const terminal =
          ["completed", "expired", "cancelled", "failed"].includes(payment) ||
          ["active", "expired", "cancelled"].includes(subscription);

        if (payment === "completed" && subscription === "active") {
          sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
          setNotice("Thanh toán thành công. Quyền lợi VIP đã được kích hoạt.");
          notifySubscriptionChanged();
          await load();
          return;
        }

        if (terminal || attempts >= 24) {
          if (terminal) {
            sessionStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
          }
          return;
        }

        timerId = window.setTimeout(check, 4000);
      } catch (error) {
        if (!stopped) {
          setActionError(
            getErrorMessage(
              error,
              "Không thể kiểm tra trạng thái thanh toán gói.",
            ),
          );
        }
      }
    };

    void check();

    return () => {
      stopped = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [load, location.pathname]);

  const isVip = isActiveSubscription(state.subscription);
  const currentTier = normalizeTier(state.benefits?.tier);
  const currentPackageId = state.subscription?.packageId;

  const benefitLines = useMemo(() => {
    const benefits = state.benefits;
    if (!benefits) return [];

    if (role === ROLES.BUSINESS) {
      const matching = benefits.supplierMatching || {};
      return [
        `AI nhà cung cấp: ${benefits.ai?.remainingToday ?? "—"}/${benefits.ai?.dailyLimit ?? "—"} lượt còn lại hôm nay`,
        `Tối đa ${matching.resultLimit ?? "—"} kết quả mỗi lần`,
        `Bộ lọc nâng cao: ${matching.advancedFiltersEnabled ? "Có" : "Không"}`,
        `Giải thích chi tiết: ${matching.detailedReasonsEnabled ? "Có" : "Không"}`,
        `Theo dõi nguồn cung mới: ${matching.newSupplierNotificationsEnabled ? "Có" : "Không"}`,
      ];
    }

    return [
      `AI gợi ý giá: ${benefits.ai?.remainingToday ?? "—"}/${benefits.ai?.dailyLimit ?? "—"} lượt còn lại hôm nay`,
    ];
  }, [role, state.benefits]);

  const handleWalletCheckout = async (pkg) => {
    if (busy) return;

    setBusy(`wallet:${pkg.packageId}`);
    setActionError("");
    setNotice("");

    try {
      const latestPackage = await subscriptionApi.getPackageById(pkg.packageId);
      await subscriptionApi.checkoutWithWallet(latestPackage?.packageId || pkg.packageId);
      setNotice("Thanh toán bằng ví thành công. Gói VIP đã được kích hoạt.");
      notifySubscriptionChanged();
      await load();
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Không thể thanh toán gói bằng ví."),
      );
    } finally {
      setBusy("");
    }
  };

  const handlePayOsCheckout = async (pkg) => {
    if (busy) return;

    setBusy(`payos:${pkg.packageId}`);
    setActionError("");
    setNotice("");

    try {
      const latestPackage = await subscriptionApi.getPackageById(pkg.packageId);
      const origin = window.location.origin;
      const result = await subscriptionApi.createPayOsCheckout(
        latestPackage?.packageId || pkg.packageId,
        {
        returnUrl: `${origin}/goi-dang-ky/payment-return`,
          cancelUrl: `${origin}/goi-dang-ky/payment-cancel`,
        },
      );

      sessionStorage.setItem(
        PENDING_SUBSCRIPTION_KEY,
        result.subscriptionId,
      );

      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Không thể tạo phiên thanh toán PayOS."),
      );
      setBusy("");
    }
  };

  const handleCancel = async () => {
    const subscriptionId = state.subscription?.subscriptionId;
    if (!subscriptionId || busy) return;

    const confirmed = window.confirm(
      "Bạn sẽ mất quyền lợi VIP ngay sau khi hủy. Khoản thanh toán hiện tại không được tự động hoàn lại. Tiếp tục?",
    );

    if (!confirmed) return;

    setBusy("cancel");
    setActionError("");
    setNotice("");

    try {
      await subscriptionApi.cancel(subscriptionId);
      setNotice("Đã hủy gói VIP. Quyền lợi đã quay về Free.");
      notifySubscriptionChanged();
      await load();
    } catch (error) {
      setActionError(getErrorMessage(error, "Không thể hủy gói đăng ký."));
    } finally {
      setBusy("");
    }
  };

  if (!targetRole) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <h1 className="text-xl font-black text-text">Gói đăng ký</h1>
          <p className="mt-2 text-textLight">
            Gói Free/VIP hiện chỉ dành cho tài khoản Personal và Business.
          </p>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="h-64 animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="rounded-3xl bg-primary p-6 text-white shadow-[0_18px_50px_rgba(23,40,48,0.18)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
          HomeCycle Membership
        </p>
        <h1 className="mt-2 text-3xl font-black">Free & VIP</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
          VIP là subscription và tập quyền lợi, không thay đổi vai trò tài khoản.
          Quyền lợi thực tế luôn lấy từ Backend.
        </p>
      </header>

      {state.error && (
        <div className="mt-5 rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">
          {state.error}
        </div>
      )}

      {notice && (
        <div className="mt-5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success">
          {notice}
        </div>
      )}

      {actionError && (
        <div className="mt-5 rounded-xl border border-error/30 bg-error/10 p-4 text-sm font-semibold text-error">
          {actionError}
        </div>
      )}

      {paymentStatus && (
        <div className="mt-5 rounded-xl border border-border bg-white p-4 text-sm">
          <strong>Trạng thái thanh toán:</strong>{" "}
          {paymentStatus.paymentStatus || "—"} ·{" "}
          {paymentStatus.subscriptionStatus || "—"}
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Gói hiện tại
            </p>
            <h2 className="mt-1 text-xl font-black text-text">
              {state.benefits?.planName ||
                (currentTier === "VIP" ? "VIP" : "Gói Miễn phí")}
            </h2>
            <p className="mt-1 text-sm text-textLight">
              {state.benefits?.description || "Quyền lợi hiện tại của tài khoản."}
            </p>
          </div>

          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
            {currentTier}
          </span>
        </div>

        <ul className="mt-4 grid gap-2 text-sm">
          {benefitLines.map((line) => (
            <li key={line}>✓ {line}</li>
          ))}
        </ul>

        {isVip && (
          <div className="mt-4 rounded-xl bg-background p-4 text-sm text-textLight">
            Có hiệu lực đến <strong>{formatDateTime(state.subscription.expiresAt)}</strong>.
          </div>
        )}

        {isVip && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={Boolean(busy)}
            className="mt-4 rounded-xl border border-error/30 px-4 py-2.5 text-sm font-black text-error hover:bg-error/10 disabled:opacity-50"
          >
            {busy === "cancel" ? "Đang hủy..." : "Hủy gói VIP"}
          </button>
        )}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            FREE
          </p>
          <h2 className="mt-2 text-2xl font-black text-text">
            {state.freePlan?.planName || "Gói Miễn phí"}
          </h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-textLight">
            {state.freePlan?.description || "Quyền lợi mặc định của tài khoản."}
          </p>

          {role === ROLES.BUSINESS ? (
            <ul className="mt-5 space-y-2 text-sm">
              <Feature>
                AI nhà cung cấp: {state.freePlan?.aiDailyLimit ?? "—"} lượt/ngày
              </Feature>
              <Feature>
                {state.freePlan?.supplierMatching?.resultLimit ?? "—"} kết quả
              </Feature>
              <Feature enabled={Boolean(state.freePlan?.supplierMatching?.aiRerankingEnabled)}>
                AI reranking
              </Feature>
              <Feature enabled={Boolean(state.freePlan?.supplierMatching?.advancedFiltersEnabled)}>
                Bộ lọc nâng cao
              </Feature>
              <Feature enabled={Boolean(state.freePlan?.supplierMatching?.newSupplierNotificationsEnabled)}>
                Theo dõi nguồn cung mới
              </Feature>
            </ul>
          ) : (
            <ul className="mt-5 space-y-2 text-sm">
              <Feature>
                AI gợi ý giá: {state.freePlan?.aiDailyLimit ?? "—"} lượt/ngày
              </Feature>
            </ul>
          )}

          <div className="mt-6 rounded-xl bg-background px-4 py-3 text-sm font-black text-text">
            Miễn phí
          </div>
        </article>

        {state.packages.map((pkg) => {
          const isCurrent =
            isVip && String(currentPackageId) === String(pkg.packageId);
          const isPending =
            String(state.subscription?.status || "").toLowerCase() ===
              "pending" &&
            String(state.subscription?.packageId || "") ===
              String(pkg.packageId);

          return (
            <article
              key={pkg.packageId}
              className="rounded-2xl border border-primary/30 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                    VIP
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-text">
                    {pkg.name || "VIP"}
                  </h2>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-black text-success">
                    Gói hiện tại
                  </span>
                )}
              </div>

              <p className="mt-2 min-h-12 text-sm leading-6 text-textLight">
                {pkg.description || "Quyền lợi VIP HomeCycle."}
              </p>

              <div className="mt-5">
                <span className="text-3xl font-black text-primary">
                  {formatCurrency(pkg.price)}
                </span>
                <span className="ml-2 text-sm text-textLight">
                  / {pkg.duration || 30} ngày
                </span>
              </div>

              <ul className="mt-5 space-y-2 text-sm">
                {(pkg.entitlements || []).map((item) => (
                  <Feature key={item.packageEntitlementId || item.key}>
                    {item.key}:{" "}
                    {item.isUnlimited
                      ? "Không giới hạn"
                      : item.numericValue ??
                        item.booleanValue?.toString() ??
                        "Theo gói"}
                  </Feature>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    Boolean(busy) ||
                    isCurrent ||
                    isPending ||
                    isVip
                  }
                  onClick={() => handleWalletCheckout(pkg)}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCurrent
                    ? "Gói hiện tại"
                    : isPending
                      ? "Đang chờ thanh toán"
                      : busy === `wallet:${pkg.packageId}`
                        ? "Đang thanh toán..."
                        : "Thanh toán bằng ví"}
                </button>

                <button
                  type="button"
                  disabled={
                    Boolean(busy) ||
                    isCurrent ||
                    isPending ||
                    isVip
                  }
                  onClick={() => handlePayOsCheckout(pkg)}
                  className="rounded-xl border border-primary px-4 py-2.5 text-sm font-black text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === `payos:${pkg.packageId}`
                    ? "Đang tạo PayOS..."
                    : "Thanh toán PayOS"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

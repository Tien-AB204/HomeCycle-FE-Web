import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PostThumbnail from "../../components/shared/PostThumbnail";
import supplierMatchingApi from "../../services/apis/supplierMatchingApi";
import subscriptionApi from "../../services/apis/subscriptionApi";

const REASON_LABELS = {
  EXACT_MODEL: "Đúng model",
  MODEL_VARIANT: "Model cùng biến thể",
  RELATED_MODEL: "Model liên quan",
  WITHIN_BUDGET: "Trong ngân sách",
  FULL_QUANTITY_AVAILABLE: "Đủ số lượng",
  PARTIAL_QUANTITY_AVAILABLE: "Chỉ đáp ứng một phần số lượng",
  REPUTABLE_SUPPLIER: "Người bán uy tín",
};

const AI_STATUS_COPY = {
  AVAILABLE: "Đã được AI sắp xếp",
  NOT_REQUIRED: "Kết quả phù hợp từ hệ thống",
  DAILY_LIMIT_REACHED:
    "Đã hết lượt AI hôm nay, vẫn hiển thị kết quả cơ bản",
  FALLBACK:
    "AI tạm thời không khả dụng, đang dùng kết quả cơ bản",
  NOT_ELIGIBLE: "Kết quả cơ bản",
};

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "Thương lượng";
};

const getScoreLabel = (score) => {
  const value = Number(score);
  if (value >= 8) return "Phù hợp cao";
  if (value >= 6) return "Phù hợp trung bình";
  return "Phù hợp cơ bản";
};

export default function DraftSupplierSuggestionPanel({
  payload,
  ready,
}) {
  const [benefits, setBenefits] = useState(null);
  const [benefitError, setBenefitError] = useState("");
  const [filters, setFilters] = useState({
    requireFullQuantity: false,
    strictBudget: false,
    strictBrand: false,
    sameCityOnly: false,
    minimumSellerRating: "",
  });
  const [state, setState] = useState({
    loading: false,
    error: "",
    data: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    subscriptionApi
      .getMyBenefits({ signal: controller.signal })
      .then(setBenefits)
      .catch((error) => {
        if (
          error?.name === "CanceledError" ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }
        setBenefitError(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải quyền lợi gói hiện tại.",
        );
      });

    return () => controller.abort();
  }, []);

  const advancedEnabled = Boolean(
    benefits?.supplierMatching?.advancedFiltersEnabled,
  );

  const normalizedAdvancedFilters = useMemo(() => {
    if (!advancedEnabled) return undefined;

    return {
      requireFullQuantity: Boolean(filters.requireFullQuantity),
      strictBudget: Boolean(filters.strictBudget),
      strictBrand: Boolean(filters.strictBrand),
      sameCityOnly: Boolean(filters.sameCityOnly),
      ...(filters.minimumSellerRating !== ""
        ? { minimumSellerRating: Number(filters.minimumSellerRating) }
        : {}),
    };
  }, [advancedEnabled, filters]);

  const handleSuggest = async () => {
    if (!ready || state.loading) return;

    setState({
      loading: true,
      error: "",
      data: state.data,
    });

    try {
      const result = await supplierMatchingApi.suggestDraft(
        {
          ...payload,
          ...(normalizedAdvancedFilters
            ? { advancedFilters: normalizedAdvancedFilters }
            : {}),
        },
      );

      setState({
        loading: false,
        error: "",
        data: result,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          error?.message ||
          "Không thể tìm nhà cung cấp phù hợp.",
      }));
    }
  };

  const data = state.data;
  const matches = Array.isArray(data?.matches) ? data.matches : [];

  return (
    <section className="rounded-2xl border border-primary/20 bg-white p-5 shadow-[0_10px_30px_rgba(23,40,48,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Gợi ý nhà cung cấp phù hợp
          </p>
          <h2 className="mt-1 text-lg font-black text-text">
            So sánh nguồn cung trước khi đăng tin
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-textLight">
            Matching cơ bản luôn do HomeCycle tính. AI dùng nhiều tín hiệu để sắp xếp lại và giải thích vì sao từng nguồn cung phù hợp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {benefits?.tier && (
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
              {String(benefits.tier).toUpperCase()}
            </span>
          )}
          {benefits?.ai?.remainingToday !== undefined && (
            <span className="rounded-full bg-background px-3 py-1.5 text-xs font-bold text-textLight">
              Còn {benefits.ai.remainingToday}/{benefits.ai.dailyLimit} lượt AI
            </span>
          )}
        </div>
      </div>

      {benefitError && (
        <p className="mt-3 text-xs font-semibold text-warning">
          {benefitError}
        </p>
      )}

      {advancedEnabled && (
        <div className="mt-4 rounded-xl border border-border bg-background/60 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-textLight">
            Bộ lọc nâng cao VIP
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["requireFullQuantity", "Yêu cầu đủ toàn bộ số lượng"],
              ["strictBudget", "Bắt buộc đúng ngân sách"],
              ["strictBrand", "Bắt buộc đúng thương hiệu"],
              ["sameCityOnly", "Chỉ cùng thành phố"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={filters[key]}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}

            <label className="text-sm text-text">
              Đánh giá người bán tối thiểu
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={filters.minimumSellerRating}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    minimumSellerRating: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2"
              />
            </label>
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSuggest}
          disabled={!ready || state.loading}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.loading ? "Đang tìm nguồn cung..." : "Gợi ý nhà cung cấp"}
        </button>

        {!ready && (
          <p className="mt-2 text-xs text-textLight">
            Điền loại sản phẩm, số lượng, khoảng giá và đủ thuộc tính bắt buộc để bật gợi ý.
          </p>
        )}
      </div>

      {state.error && (
        <div className="mt-4 rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error">
          {state.error}
        </div>
      )}

      {data && (
        <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm">
          <p className="font-bold text-text">
            {AI_STATUS_COPY[data.aiStatus] || "Kết quả phù hợp"}
          </p>
          <p className="mt-1 text-xs text-textLight">
            {data.candidateCount} ứng viên · tối đa {data.resultLimit} kết quả
            {data.remainingAiRefreshes !== null
              ? ` · còn ${data.remainingAiRefreshes} lượt AI`
              : ""}
          </p>
        </div>
      )}

      {data && matches.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-black text-text">
            Chưa tìm thấy bài bán phù hợp với nhu cầu này.
          </p>
          <p className="mt-1 text-sm text-textLight">
            Bạn có thể mở rộng khoảng giá, bỏ yêu cầu model hoặc thử lại khi có nguồn cung mới.
          </p>
        </div>
      )}

      {matches.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map((item) => {
            const sellPost = item.sellPost || {};
            const image = sellPost.medias?.[0]?.url || "";
            const reasons = Array.isArray(item.reasonCodes)
              ? item.reasonCodes
                  .map((code) => REASON_LABELS[code])
                  .filter(Boolean)
                  .slice(0, 3)
              : [];

            return (
              <article
                key={sellPost.postId}
                className="overflow-hidden rounded-2xl border border-border bg-white"
              >
                <PostThumbnail
                  src={image}
                  alt={sellPost.productName || "Sản phẩm"}
                  className="h-36 w-full"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 font-black text-text">
                      {sellPost.productName || "Sản phẩm"}
                    </h3>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                      {Number(item.matchingScore || 0).toFixed(1)}/10
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-textLight">
                    {getScoreLabel(item.matchingScore)}
                  </p>
                  <p className="mt-2 text-lg font-black text-error">
                    {formatCurrency(sellPost.basePrice)}
                  </p>
                  <p className="mt-1 text-xs text-textLight">
                    Còn {sellPost.remainingQuantity ?? "—"} sản phẩm · Người bán: {sellPost.ownerName || "—"}
                  </p>

                  {reasons.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reasons.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success"
                        >
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.shortExplanation && (
                    <p className="mt-3 text-sm leading-6 text-textLight">
                      “{item.shortExplanation}”
                    </p>
                  )}

                  <Link
                    to={`/posts/${encodeURIComponent(sellPost.postId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-primary px-3 py-2.5 text-sm font-black text-primary hover:bg-primary/10"
                  >
                    Xem bài bán
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

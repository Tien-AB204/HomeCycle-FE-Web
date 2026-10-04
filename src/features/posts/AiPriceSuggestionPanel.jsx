import { useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import priceSuggestionApi from "../../services/apis/priceSuggestionApi";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDateTime } from "../../utils/formatter";
import {
  AI_CONFIDENCE_LABELS,
  countAiPriceSamples,
  getSampleGroups,
  hasUsablePrice,
  hasUsageFlags,
  normalizeStatus,
} from "./aiPriceSuggestion";

const SOURCE_TYPE_LABELS = {
  EXTERNAL_USED_LISTING: "Tin rao đồ cũ",
  EXTERNAL_EQUIVALENT_LISTING: "Model tương đương",
  NEW_MARKET_REFERENCE: "Giá bán mới",
};

const isOpenableUrl = (url) => /^https?:\/\//i.test(String(url || "").trim());

const formatPercent = (value) =>
  `${Math.abs(value).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

const formatAdjustment = ({ percent, amount }) => {
  const percentValue = Number(percent);
  const amountValue = Number(amount);

  if (Number.isFinite(percentValue) && percentValue !== 0) {
    return `${percentValue > 0 ? "+" : "−"}${formatPercent(percentValue)}`;
  }

  if (Number.isFinite(amountValue) && amountValue !== 0) {
    return `${amountValue > 0 ? "+" : "−"}${formatCurrency(
      Math.round(Math.abs(amountValue)),
    )}`;
  }

  return "0%";
};

const SourceItem = ({ source }) => {
  const typeLabel =
    source.trustLevel ||
    SOURCE_TYPE_LABELS[normalizeStatus(source.sourceType)];
  const label = `${source.sourceName || "Nguồn tham khảo"}${
    typeLabel ? ` · ${typeLabel}` : ""
  }`;

  return (
    <li className="truncate text-sm text-text">
      {isOpenableUrl(source.sourceUrl) ? (
        <a
          href={String(source.sourceUrl).trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:underline"
        >
          {label}
        </a>
      ) : (
        label
      )}
    </li>
  );
};

/*
 * Cách tính, giải thích và nguồn nằm trong modal; trên form chỉ có nút
 * "Xem cách tính".
 */
const AiPriceDetails = ({ result }) => {
  const [open, setOpen] = useState(false);
  const { breakdown, evidence, sources } = result;
  const explanation = String(result.explanation || "").trim();
  const basePrice = Number(breakdown?.basePrice);
  const hasBreakdown = Number.isFinite(basePrice) && basePrice > 0;
  const finalPrice = Number(breakdown?.finalPrice);
  const newPriceReference = Number(breakdown?.newPriceReference);
  const adjustments = (breakdown?.adjustments || []).filter((item) => item?.label);
  const sampleGroups = getSampleGroups(evidence, sources);
  const withUsageFlags = hasUsageFlags(sources);
  const visibleSources = (sources || []).filter(
    (source) => source?.sourceName || isOpenableUrl(source?.sourceUrl),
  );
  const usedSources = withUsageFlags
    ? visibleSources.filter((source) => source.usedInCalculation === true)
    : [];
  const otherSources = (
    withUsageFlags
      ? visibleSources.filter((source) => source.usedInCalculation !== true)
      : visibleSources
  ).slice(0, 5);

  if (
    !hasBreakdown &&
    !explanation &&
    !sampleGroups.length &&
    !visibleSources.length
  ) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-bold text-primary hover:underline"
      >
        Xem cách tính →
      </button>

      <Modal
        open={open}
        title="Cách tính giá gợi ý"
        onCancel={() => setOpen(false)}
        footer={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90"
          >
            Đóng
          </button>
        }
      >
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {hasBreakdown && (
            <div className="space-y-1.5 rounded-xl border border-border bg-background p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-text">
                  {breakdown.baseLabel ||
                    (breakdown.method === "NEW_PRICE_DEPRECIATION"
                      ? "Giá bán mới"
                      : "Giá máy cũ cùng model")}
                </span>
                <span className="font-bold text-text">
                  {formatCurrency(Math.round(basePrice))}
                </span>
              </div>
              {adjustments.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex justify-between gap-3"
                >
                  <span className="text-text">{item.label}</span>
                  <span className="font-bold text-textLight">
                    {formatAdjustment(item)}
                  </span>
                </div>
              ))}
              {Number.isFinite(finalPrice) && finalPrice > 0 && (
                <div className="flex justify-between gap-3 border-t border-border pt-2">
                  <span className="font-bold text-text">Giá gợi ý</span>
                  <span className="font-black text-primary">
                    {formatCurrency(Math.round(finalPrice))}
                  </span>
                </div>
              )}
              {Number.isFinite(newPriceReference) &&
                newPriceReference > 0 &&
                breakdown.method !== "NEW_PRICE_DEPRECIATION" && (
                  <p className="text-xs text-textLight">
                    Giá bán mới tham khảo:{" "}
                    {formatCurrency(Math.round(newPriceReference))}
                  </p>
                )}
            </div>
          )}

          {explanation && (
            <p className="text-sm leading-6 text-text">{explanation}</p>
          )}

          {sampleGroups.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-textLight">
                Dữ liệu tham khảo
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-text">
                {sampleGroups.map((group) => (
                  <li key={group.label}>
                    {group.label}: {group.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {usedSources.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-textLight">
                Nguồn dùng để tính
              </p>
              <ul className="space-y-1">
                {usedSources.map((source, index) => (
                  <SourceItem key={`${source.sourceUrl}-${index}`} source={source} />
                ))}
              </ul>
            </div>
          )}

          {otherSources.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-textLight">
                {withUsageFlags
                  ? "Nguồn tham khảo, không dùng để tính"
                  : "Nguồn"}
              </p>
              <ul className="space-y-1">
                {otherSources.map((source, index) => (
                  <SourceItem key={`${source.sourceUrl}-${index}`} source={source} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

const getErrorFeedback = (error) => {
  const status = Number(error?.response?.status || 0);

  if (status === 429) {
    return {
      type: "info",
      text: getApiErrorMessage(error, "Bạn đã dùng hết lượt gợi ý giá hôm nay."),
    };
  }

  if (status === 400) {
    return {
      type: "error",
      text: getApiErrorMessage(
        error,
        "Thông tin sản phẩm chưa đủ hoặc chưa hợp lệ để gợi ý giá.",
      ),
    };
  }

  if (status === 403) {
    return {
      type: "error",
      text: getApiErrorMessage(
        error,
        "Tính năng gợi ý giá hiện chỉ áp dụng cho tài khoản cá nhân.",
      ),
    };
  }

  return {
    type: "error",
    text: getApiErrorMessage(
      error,
      "Không thể gợi ý giá lúc này. Vui lòng thử lại sau.",
    ),
  };
};

/*
 * context: kết quả buildAiPricingContext từ form hiện tại.
 * onApply: điền giá gợi ý vào ô "Giá đăng bán".
 */
export default function AiPriceSuggestionPanel({ context, onApply, disabled }) {
  const [quota, setQuota] = useState(null);
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestLockRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    priceSuggestionApi
      .getQuota({ signal: controller.signal })
      .then(setQuota)
      .catch(() => {
        // Hạn mức chỉ để hiển thị; POST vẫn là nơi Backend kiểm tra.
      });

    return () => controller.abort();
  }, []);

  const remainingToday = Number(quota?.remainingToday);
  const hasQuota = Number.isFinite(remainingToday);
  const isOutOfQuota = hasQuota && remainingToday <= 0;
  const isStale = Boolean(result && result.contextKey !== context.key);
  const status = normalizeStatus(result?.status);
  // Phản hồi chỉ áp dụng cho đúng bản nháp đã gửi.
  const visibleFeedback =
    feedback && feedback.contextKey === context.key ? feedback : null;

  const updateQuota = (changes) =>
    setQuota((current) => ({ ...(current || {}), ...changes }));

  const handleRequest = async () => {
    if (requestLockRef.current || context.issue || isOutOfQuota) {
      return;
    }

    const contextKey = context.key;
    requestLockRef.current = true;
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await priceSuggestionApi.suggestDraftPrice(
        context.product,
      );
      const nextStatus = normalizeStatus(response?.status);
      const nextRemaining = Number(response?.remainingToday);
      const resetsAt = response?.resetsAt
        ? String(response.resetsAt)
        : quota?.resetsAt;

      if (nextStatus === "DAILY_LIMIT_REACHED") {
        updateQuota({ remainingToday: 0, resetsAt });
      } else if (Number.isFinite(nextRemaining)) {
        updateQuota({ remainingToday: nextRemaining, resetsAt });
      }

      setResult({ ...response, status: nextStatus, contextKey });
    } catch (error) {
      if (Number(error?.response?.status) === 429) {
        updateQuota({
          remainingToday: 0,
          resetsAt: error?.response?.data?.resetsAt || quota?.resetsAt,
        });
      }

      setFeedback({ ...getErrorFeedback(error), contextKey });
    } finally {
      requestLockRef.current = false;
      setIsLoading(false);
    }
  };

  const sampleCount = result
    ? countAiPriceSamples(result.evidence, result.sources)
    : 0;
  const minPrice = Number(result?.minPrice);
  const maxPrice = Number(result?.maxPrice);

  return (
    <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-black text-text">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              auto_awesome
            </span>
            Gợi ý giá với AI
          </p>
          {hasQuota && (
            <p className="mt-1 text-xs text-textLight">
              {remainingToday > 0
                ? `Còn ${remainingToday}${
                    Number(quota.dailyLimit) > 0 ? `/${quota.dailyLimit}` : ""
                  } lượt gợi ý hôm nay`
                : `Đã hết lượt gợi ý hôm nay${
                    quota.resetsAt
                      ? ` · Làm mới ${formatDateTime(quota.resetsAt)}`
                      : ""
                  }`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleRequest()}
          disabled={
            disabled || isLoading || Boolean(context.issue) || isOutOfQuota
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Đang phân tích dữ liệu giá..." : "Gợi ý giá"}
        </button>
      </div>

      {context.issue && !isLoading && (
        <p className="mt-2 text-xs text-textLight">{context.issue}</p>
      )}

      {visibleFeedback && (
        <p
          role={visibleFeedback.type === "error" ? "alert" : undefined}
          className={`mt-2 text-sm font-semibold ${
            visibleFeedback.type === "error" ? "text-error" : "text-warning"
          }`}
        >
          {visibleFeedback.text}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-xl border border-border bg-white p-4">
          {isStale ? (
            <p className="text-sm text-textLight">
              Thông tin sản phẩm đã thay đổi. Hãy yêu cầu gợi ý mới.
            </p>
          ) : status === "DAILY_LIMIT_REACHED" ? (
            <p className="text-sm font-semibold text-error">
              Bạn đã dùng hết lượt gợi ý giá hôm nay.
            </p>
          ) : hasUsablePrice(result) ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-textLight">
                Giá tham khảo
              </p>
              <p className="mt-0.5 text-2xl font-black text-primary">
                {formatCurrency(result.suggestedPrice)}
              </p>
              {minPrice > 0 && maxPrice > 0 && minPrice !== maxPrice && (
                <p className="text-sm text-textLight">
                  Khoảng {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}
                </p>
              )}
              {status === "FALLBACK_EQUIVALENT_MODEL" && (
                <p className="text-xs text-textLight">
                  Tham khảo từ model tương đương
                </p>
              )}
              <p className="mt-1 text-xs font-semibold text-textLight">
                {[
                  sampleCount > 0 ? `Dựa trên ${sampleCount} mẫu giá` : "",
                  AI_CONFIDENCE_LABELS[normalizeStatus(result.confidence)] ||
                    AI_CONFIDENCE_LABELS.NONE,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    onApply(String(Math.round(Number(result.suggestedPrice))))
                  }
                  disabled={disabled}
                  className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-white disabled:opacity-50"
                >
                  Áp dụng giá này
                </button>
                <AiPriceDetails result={result} />
              </div>
            </>
          ) : (
            <p className="text-sm leading-6 text-text">
              {result.explanation ||
                (status === "NO_RELIABLE_DATA"
                  ? "Chưa có đủ dữ liệu tham khảo đáng tin cậy. Bạn vẫn có thể nhập giá thủ công."
                  : "Chưa thể tạo giá tham khảo. Bạn vẫn có thể nhập giá thủ công.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

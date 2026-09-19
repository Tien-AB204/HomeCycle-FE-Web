import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PostThumbnail from "../../components/shared/PostThumbnail";
import supplierMatchingApi from "../../services/apis/supplierMatchingApi";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Thương lượng";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Thương lượng";

  return amount.toLocaleString("vi-VN") + " đ";
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

const REASON_LABELS = {
  EXACT_MODEL: "Đúng model",
  MODEL_VARIANT: "Model cùng biến thể",
  RELATED_MODEL: "Model liên quan",
  WITHIN_BUDGET: "Trong ngân sách",
  FULL_QUANTITY_AVAILABLE: "Đủ số lượng",
  PARTIAL_QUANTITY_AVAILABLE: "Chỉ đáp ứng một phần số lượng",
  REPUTABLE_SUPPLIER: "Người bán uy tín",
};

const getScoreLabel = (score) => {
  const value = Number(score);
  if (value >= 8) return "Phù hợp cao";
  if (value >= 6) return "Phù hợp trung bình";
  return "Phù hợp cơ bản";
};

const formatResetTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

export default function BuyPostMatchesPanel({ buyPostId }) {
  const [requestVersion, setRequestVersion] = useState(0);
  const requestKey = `${buyPostId}:${requestVersion}`;

  const [state, setState] = useState({
    requestKey: "",
    error: "",
    data: null,
  });

  const loading =
    Boolean(buyPostId) && state.requestKey !== requestKey;

  const load = useCallback(
    (signal) =>
      supplierMatchingApi.suggestForBuyPost(
        buyPostId,
        {},
        { signal },
      ),
    [buyPostId],
  );

  useEffect(() => {
    if (!buyPostId) return undefined;

    const controller = new AbortController();
    let active = true;

    load(controller.signal)
      .then((data) => {
        if (!active) return;
        setState({
          requestKey,
          error: "",
          data,
        });
      })
      .catch((error) => {
        if (
          error?.name === "CanceledError" ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }

        if (!active) return;

        setState({
          requestKey,
          error:
            error?.response?.data?.message ||
            error?.response?.data?.error?.message ||
            error?.message ||
            "Không thể tải gợi ý nhà cung cấp.",
          data: null,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [buyPostId, load, requestKey]);

  const data = state.data;
  const items = Array.isArray(data?.matches) ? data.matches : [];
  const statusCopy = data
    ? AI_STATUS_COPY[data.aiStatus] || "Kết quả phù hợp"
    : "";

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_34px_rgba(23,40,48,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Gợi ý nhà cung cấp
          </p>

          <h2 className="mt-1 text-xl font-black text-text">
            Sản phẩm phù hợp
          </h2>

          <p className="mt-1 text-sm text-textLight">
            Backend tính matching cơ bản; AI chỉ sắp xếp lại khi đủ điều kiện.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data?.tier && (
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
              {data.tier}
            </span>
          )}

          {data &&
            data.remainingAiRefreshes !== null && (
              <span className="rounded-full bg-background px-3 py-1.5 text-xs font-bold text-textLight">
                Còn {data.remainingAiRefreshes} lượt AI hôm nay
              </span>
            )}

          <button
            type="button"
            onClick={() => {
              setState((current) => ({
                ...current,
                error: "",
              }));
              setRequestVersion((value) => value + 1);
            }}
            disabled={loading}
            className="rounded-xl border border-primary px-3 py-2 text-xs font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang cập nhật..." : "Làm mới gợi ý"}
          </button>
        </div>
      </div>

      {data && (
        <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm">
          <p className="font-bold text-text">{statusCopy}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-textLight">
            <span>{data.candidateCount} ứng viên hợp lệ</span>
            <span>Tối đa {data.resultLimit} kết quả</span>
            {data.fromCache && <span>Kết quả được cập nhật gần đây</span>}
            {data.resetsAt && data.aiStatus === "DAILY_LIMIT_REACHED" && (
              <span>
                Làm mới quota lúc {formatResetTime(data.resetsAt)}
              </span>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div
          role="status"
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-xl bg-background"
            />
          ))}
        </div>
      )}

      {!loading && state.error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error"
        >
          {state.error}
        </div>
      )}

      {!loading &&
        !state.error &&
        items.length === 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background/50 p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-textLight">
              inventory_2
            </span>

            <p className="mt-2 font-black text-text">
              Chưa tìm thấy bài bán phù hợp với nhu cầu này.
            </p>

            <p className="mt-1 text-sm text-textLight">
              Bạn có thể mở rộng khoảng giá, bỏ yêu cầu model hoặc thử lại khi có nguồn cung mới.
            </p>
          </div>
        )}

      {!loading &&
        !state.error &&
        items.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
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
                  className="overflow-hidden rounded-2xl border border-border bg-white transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  <PostThumbnail
                    src={image}
                    alt={sellPost.productName || "Sản phẩm"}
                    className="h-36 w-full"
                  />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 font-black text-text">
                        {sellPost.productName || "Sản phẩm"}
                      </p>
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
                      Còn {sellPost.remainingQuantity ?? "—"} sản phẩm
                    </p>

                    <p className="mt-1 text-xs text-textLight">
                      Người bán: {sellPost.ownerName || "—"}
                      {Number.isFinite(Number(sellPost.averageRating))
                        ? ` · ${Number(sellPost.averageRating).toFixed(1)} ★`
                        : ""}
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
                      to={
                        "/posts/" +
                        encodeURIComponent(sellPost.postId) +
                        "?buyPostId=" +
                        encodeURIComponent(buyPostId)
                      }
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-primary px-3 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10"
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

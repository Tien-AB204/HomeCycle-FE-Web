import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import postApi from "../../services/apis/postApi";

const formatCurrency = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Thương lượng";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Thương lượng";
  }

  return (
    amount.toLocaleString("vi-VN") +
    " đ"
  );
};

export default function BuyPostMatchesPanel({
  buyPostId,
}) {
  const [state, setState] =
    useState({
      loading: true,
      error: "",
      items: [],
      totalCount: 0,
    });

  useEffect(() => {
    if (!buyPostId) {
      return undefined;
    }

    const controller =
      new AbortController();

    let active = true;

    postApi
      .getBuyMatches(
        buyPostId,
        {
          pageNumber: 1,
          pageSize: 12,
          signal: controller.signal,
        },
      )
      .then((result) => {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: "",
          items:
            result.items || [],
          totalCount:
            result.totalCount || 0,
        });
      })
      .catch((error) => {
        if (
          error?.name ===
            "CanceledError" ||
          error?.code ===
            "ERR_CANCELED"
        ) {
          return;
        }

        if (active) {
          setState({
            loading: false,
            error:
              "Không thể tải sản phẩm phù hợp.",
            items: [],
            totalCount: 0,
          });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [buyPostId]);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_34px_rgba(23,40,48,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Gợi ý thu mua
          </p>

          <h2 className="mt-1 text-xl font-black text-text">
            Sản phẩm phù hợp
          </h2>

          <p className="mt-1 text-sm text-textLight">
            Hệ thống đối chiếu các tin đăng bán đang hoạt động với tiêu chí thu mua.
          </p>
        </div>

        {!state.loading &&
          !state.error && (
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
              {state.totalCount} kết quả
            </span>
          )}
      </div>

      {state.loading && (
        <div
          role="status"
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-xl bg-background"
              />
            ),
          )}
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error"
        >
          {state.error}
        </div>
      )}

      {!state.loading &&
        !state.error &&
        state.items.length === 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background/50 p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-textLight">
              inventory_2
            </span>

            <p className="mt-2 font-black text-text">
              Chưa có sản phẩm phù hợp
            </p>

            <p className="mt-1 text-sm text-textLight">
              Kết quả sẽ xuất hiện khi có tin đăng bán đáp ứng tiêu chí.
            </p>
          </div>
        )}

      {!state.loading &&
        !state.error &&
        state.items.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.items.map(
              ({
                sellPost,
                matchSummary,
              }) => {
                const matched =
                  Number(
                    matchSummary
                      ?.matchedCriteriaCount,
                  ) || 0;

                const evaluated =
                  Number(
                    matchSummary
                      ?.evaluatedCriteriaCount,
                  ) || 0;

                const image =
                  sellPost.medias?.[0]
                    ?.url || "";

                return (
                  <article
                    key={sellPost.postId}
                    className="overflow-hidden rounded-2xl border border-border bg-white transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                  >
                    <div className="flex h-36 items-center justify-center bg-background">
                      {image ? (
                        <img
                          src={image}
                          alt={
                            sellPost.productName ||
                            "Sản phẩm"
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-border">
                          image
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="line-clamp-2 font-black text-text">
                        {sellPost.productName ||
                          "Sản phẩm"}
                      </p>

                      <p className="mt-2 text-lg font-black text-error">
                        {formatCurrency(
                          sellPost.basePrice,
                        )}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {evaluated > 0 ? (
                          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-black text-success">
                            {matched}/
                            {evaluated} tiêu chí phù hợp
                          </span>
                        ) : (
                          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-textLight">
                            Doanh nghiệp chưa đặt tiêu chí cụ thể.
                          </span>
                        )}

                        <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-bold text-textLight">
                          Còn{" "}
                          {sellPost.remainingQuantity ??
                            "—"}
                        </span>
                      </div>

                      <Link
                        to={
                          "/posts/" +
                          encodeURIComponent(
                            sellPost.postId,
                          ) +
                          "?buyPostId=" +
                          encodeURIComponent(
                            buyPostId,
                          )
                        }
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-primary px-3 py-2.5 text-sm font-black text-primary transition hover:bg-primary/10"
                      >
                        Xem sản phẩm
                      </Link>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}

      {state.totalCount >
        state.items.length && (
        <p className="mt-4 text-xs text-textLight">
          Đang hiển thị{" "}
          {state.items.length} trong{" "}
          {state.totalCount} sản phẩm phù hợp đầu tiên.
        </p>
      )}
    </section>
  );
}
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import cartApi from "../../services/apis/cartApi";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";

const formatCurrency = (value) => {
  if (typeof value !== "number" && typeof value !== "string") {
    return "—";
  }

  const raw = typeof value === "string" ? value.trim() : value;

  if (raw === "") {
    return "—";
  }

  const amount = Number(raw);

  return Number.isFinite(amount)
    ? `${amount.toLocaleString("vi-VN")} đ`
    : "—";
};

const isCanceledRequest = (error) =>
  error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

const CartPage = () => {
  const [state, setState] = useState({
    items: [],
    totalQuantity: 0,
    totalPrice: 0,
    loading: true,
    error: "",
  });

  const [removingId, setRemovingId] = useState("");
  const [removeError, setRemoveError] = useState("");

  const listRequestRef = useRef(0);
  const listControllerRef = useRef(null);

  /*
   * Loader duy nhất cho cả lần tải đầu tiên lẫn sau khi xóa sản phẩm:
   * huỷ request trước, cấp request id mới, chỉ request id hiện hành
   * mới được ghi state - tránh response cũ về muộn đè lên kết quả mới.
   */
  const loadCart = useCallback(async () => {
    listControllerRef.current?.abort();

    const controller = new AbortController();
    listControllerRef.current = controller;

    const requestId = listRequestRef.current + 1;
    listRequestRef.current = requestId;

    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const result = await cartApi.getCart({ signal: controller.signal });

      if (listRequestRef.current !== requestId) {
        return;
      }

      setState({
        items: result.items,
        totalQuantity: result.totalQuantity,
        totalPrice: result.totalPrice,
        loading: false,
        error: "",
      });
    } catch (error) {
      if (listRequestRef.current !== requestId) {
        return;
      }

      if (isCanceledRequest(error)) {
        return;
      }

      setState({
        items: [],
        totalQuantity: 0,
        totalPrice: 0,
        loading: false,
        error: "Không thể tải giỏ hàng. Vui lòng thử lại.",
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCart();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      listRequestRef.current += 1;
      listControllerRef.current?.abort();
    };
  }, [loadCart]);

  const handleRemove = async (cartItemId) => {
    if (!cartItemId || removingId) {
      return;
    }

    setRemovingId(cartItemId);
    setRemoveError("");

    try {
      await cartApi.removeFromCart(cartItemId);
      await loadCart();
    } catch (error) {
      setRemoveError(
        error?.message ||
          "Không thể xóa sản phẩm khỏi giỏ hàng. Vui lòng thử lại.",
      );
    } finally {
      setRemovingId("");
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
          Giỏ hàng
        </p>
        <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
          Sản phẩm đã lưu để thương lượng
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-textLight">
          Danh sách tin đăng bán bạn đã thêm để xem lại và thương lượng sau.
        </p>
      </div>

      {state.error && (
        <div className="mb-5 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
          {state.error}
        </div>
      )}

      {removeError && (
        <div className="mb-5 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm font-medium text-error">
          {removeError}
        </div>
      )}

      {state.loading ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm font-semibold text-textLight">
          Đang tải giỏ hàng...
        </div>
      ) : state.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="text-sm font-semibold text-textLight">
            Giỏ hàng của bạn đang trống.
          </p>
          <Link
            to="/tin-dang-ban"
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-primary bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
          >
            Khám phá tin đăng bán
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {state.items.map((item) => {
              const post = item.post || {};
              const image = post.medias?.[0]?.url;
              const name = post.productName || "Sản phẩm chưa có tên";
              const isRemoving = removingId === item.cartItemId;

              return (
                <div
                  key={item.cartItemId}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-[0_6px_18px_rgba(23,40,48,0.05)]"
                >
                  <Link
                    to={`/posts/${encodeURIComponent(item.postId)}`}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-background"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <img
                          src={homeCycleMark}
                          alt=""
                          className="h-8 w-8 rounded-lg"
                        />
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/posts/${encodeURIComponent(item.postId)}`}
                      className="line-clamp-2 text-sm font-bold text-text hover:text-primary"
                    >
                      {name}
                    </Link>
                    <p className="mt-1 text-xs text-textLight">
                      Số lượng: {item.quantity}
                    </p>
                    <p className="mt-1 text-sm font-black text-error">
                      {formatCurrency(post.basePrice)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.cartItemId)}
                    disabled={Boolean(removingId)}
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-bold text-textLight transition hover:border-error hover:text-error disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRemoving ? "Đang xóa..." : "Xóa"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-white p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-textLight">
                Tổng số lượng
              </p>
              <p className="text-lg font-black text-text">
                {state.totalQuantity}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-textLight">
                Tổng giá trị
              </p>
              <p className="text-lg font-black text-error">
                {formatCurrency(state.totalPrice)}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default CartPage;

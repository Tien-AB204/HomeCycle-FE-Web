import axiosClient from "./axiosClient";

const createApiError = (response, fallbackMessage) => {
  const message =
    response?.error?.message || response?.message || fallbackMessage;

  return new Error(message);
};

const unwrapResponse = (response, fallbackMessage) => {
  if (response?.isSuccess === false) {
    throw createApiError(response, fallbackMessage);
  }

  return response?.data ?? response;
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCartItem = (item) => ({
  cartItemId: item?.cartItemId || "",
  postId: item?.postId || "",
  quantity: Number(item?.quantity) || 0,
  addedAt: item?.addedAt ?? null,
  post: item?.post || null,
});

const normalizeCart = (data) => ({
  items: Array.isArray(data?.items) ? data.items.map(normalizeCartItem) : [],
  totalQuantity: Number(data?.totalQuantity) || 0,
  totalPrice: Number(data?.totalPrice) || 0,
});

const CART_ERROR_MESSAGES = {
  CART_ITEM_NOT_FOUND: "Không tìm thấy sản phẩm trong giỏ hàng.",
  CART_ITEM_EXISTS: "Sản phẩm này đã có trong giỏ hàng của bạn.",
  CART_POST_NOT_FOUND: "Không tìm thấy bài đăng này.",
  CART_POST_NOT_ACTIVE: "Bài đăng hiện không còn hoạt động.",
  CART_CANNOT_ADD_OWN_POST: "Bạn không thể thêm bài đăng của chính mình vào giỏ hàng.",
  CART_INVALID_QUANTITY: "Số lượng phải lớn hơn 0.",
  CART_QUANTITY_EXCEEDS_REMAINING: "Số lượng vượt quá số lượng còn lại của bài đăng.",
  CART_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
};

const getSafeCartErrorMessage = (error, fallback) => {
  const code = error?.response?.data?.error?.code;

  if (code && CART_ERROR_MESSAGES[code]) {
    return CART_ERROR_MESSAGES[code];
  }

  return fallback;
};

export const cartApi = {
  getCart: async ({ signal } = {}) => {
    const response = await axiosClient.get("/cart", { signal });
    const data = unwrapResponse(response, "Không thể tải giỏ hàng.");

    return normalizeCart(data);
  },

  addToCart: async (postId, { quantity } = {}) => {
    const normalizedPostId = normalizeText(postId);

    if (!normalizedPostId) {
      throw new Error("Không tìm thấy mã bài đăng.");
    }

    const payload = {};

    if (Number.isInteger(quantity) && quantity > 0) {
      payload.quantity = quantity;
    }

    try {
      const response = await axiosClient.post(
        `/cart/${encodeURIComponent(normalizedPostId)}`,
        payload,
      );

      const data = unwrapResponse(
        response,
        "Không thể thêm vào giỏ hàng.",
      );

      return normalizeCartItem(data);
    } catch (error) {
      throw new Error(
        getSafeCartErrorMessage(
          error,
          "Không thể thêm vào giỏ hàng. Vui lòng thử lại.",
        ),
        { cause: error },
      );
    }
  },

  removeFromCart: async (cartItemId) => {
    const normalizedCartItemId = normalizeText(cartItemId);

    if (!normalizedCartItemId) {
      throw new Error("Không tìm thấy sản phẩm trong giỏ hàng.");
    }

    try {
      await axiosClient.delete(
        `/cart/${encodeURIComponent(normalizedCartItemId)}`,
      );

      return true;
    } catch (error) {
      throw new Error(
        getSafeCartErrorMessage(
          error,
          "Không thể xóa sản phẩm khỏi giỏ hàng. Vui lòng thử lại.",
        ),
        { cause: error },
      );
    }
  },
};

export default cartApi;

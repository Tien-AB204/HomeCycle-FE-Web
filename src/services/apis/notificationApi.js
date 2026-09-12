import axiosClient from "./axiosClient";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const createApiError = (
  response,
  fallbackMessage,
) => {
  return new Error(
    response?.error?.message ||
      response?.message ||
      fallbackMessage,
  );
};

const unwrapResponse = (
  response,
  fallbackMessage,
) => {
  if (response?.isSuccess === false) {
    throw createApiError(
      response,
      fallbackMessage,
    );
  }

  return response?.data ?? response;
};

const normalizePositiveInteger = (
  value,
  fallback,
) => {
  const normalized =
    Number(value);

  return Number.isInteger(normalized) &&
    normalized > 0
    ? normalized
    : fallback;
};

const normalizeUnreadCount = (
  value,
) => {
  const normalized =
    Number(value);

  if (
    !Number.isFinite(normalized) ||
    normalized <= 0
  ) {
    return 0;
  }

  return Math.floor(normalized);
};

export const normalizeNotificationTargetType = (
  value,
) => {
  const normalized =
    String(value ?? "")
      .trim()
      .replace(/[\s_-]/g, "")
      .toLowerCase();

  switch (normalized) {
    case "1":
    case "offer":
      return "offer";

    case "2":
    case "negotiation":
      return "negotiation";

    case "3":
    case "agreement":
      return "agreement";

    case "4":
    case "order":
      return "order";

    case "5":
    case "dispute":
      return "dispute";

    case "6":
    case "post":
      return "post";

    case "7":
    case "appointment":
      return "appointment";

    case "8":
    case "withdrawal":
      return "withdrawal";

    default:
      return "";
  }
};

export const normalizeNotification = (
  value,
) => {
  const source =
    value?.data ?? value;

  if (
    !source ||
    typeof source !== "object"
  ) {
    return null;
  }

  const notificationId =
    String(
      source.notificationId ??
        source.NotificationId ??
        "",
    ).trim();

  if (!notificationId) {
    return null;
  }

  const targetIdValue =
    source.targetId ??
    source.TargetId;

  const targetType =
    normalizeNotificationTargetType(
      source.targetType ??
        source.TargetType,
    );

  return {
    notificationId,

    title:
      String(
        source.title ??
          source.Title ??
          "Thông báo",
      ).trim() ||
      "Thông báo",

    message:
      String(
        source.message ??
          source.Message ??
          "",
      ).trim(),

    targetType:
      targetType || null,

    targetId:
      targetIdValue === null ||
      targetIdValue === undefined
        ? null
        : String(
            targetIdValue,
          ).trim() || null,

    isRead:
      Boolean(
        source.isRead ??
          source.IsRead ??
          false,
      ),

    createdAt:
      String(
        source.createdAt ??
          source.CreatedAt ??
          "",
      ).trim(),
  };
};

const normalizeReadResponse = (
  value,
) => {
  const source =
    value?.data ?? value ?? {};

  return {
    notificationId:
      String(
        source.notificationId ??
          source.NotificationId ??
          "",
      ).trim(),

    isRead:
      Boolean(
        source.isRead ??
          source.IsRead ??
          true,
      ),

    unreadCount:
      normalizeUnreadCount(
        source.unreadCount ??
          source.UnreadCount,
      ),
  };
};

const normalizeReadAllResponse = (
  value,
) => {
  const source =
    value?.data ?? value ?? {};

  const updatedCount =
    Number(
      source.updatedCount ??
        source.UpdatedCount ??
        0,
    );

  return {
    updatedCount:
      Number.isFinite(updatedCount) &&
      updatedCount > 0
        ? Math.floor(updatedCount)
        : 0,

    unreadCount:
      normalizeUnreadCount(
        source.unreadCount ??
          source.UnreadCount,
      ),
  };
};

export const notificationApi = {
  getMine: async ({
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) => {
    const normalizedPageNumber =
      normalizePositiveInteger(
        pageNumber,
        DEFAULT_PAGE_NUMBER,
      );

    const normalizedPageSize =
      Math.min(
        normalizePositiveInteger(
          pageSize,
          DEFAULT_PAGE_SIZE,
        ),
        MAX_PAGE_SIZE,
      );

    const response =
      await axiosClient.get(
        "/notifications",
        {
          params: {
            PageNumber:
              normalizedPageNumber,

            PageSize:
              normalizedPageSize,
          },

          signal,
        },
      );

    const data =
      unwrapResponse(
        response,
        "Không thể tải danh sách thông báo.",
      );

    return {
      items:
        Array.isArray(data?.items)
          ? data.items
              .map(
                normalizeNotification,
              )
              .filter(Boolean)
          : [],

      pageNumber:
        Number(
          data?.pageNumber,
        ) ||
        normalizedPageNumber,

      pageSize:
        Number(
          data?.pageSize,
        ) ||
        normalizedPageSize,

      totalCount:
        Math.max(
          0,
          Number(
            data?.totalCount,
          ) || 0,
        ),

      totalPages:
        Math.max(
          0,
          Number(
            data?.totalPages,
          ) || 0,
        ),

      hasPreviousPage:
        Boolean(
          data?.hasPreviousPage,
        ),

      hasNextPage:
        Boolean(
          data?.hasNextPage,
        ),
    };
  },

  getUnreadCount:
    async () => {
      const response =
        await axiosClient.get(
          "/notifications/unread-count",
        );

      const data =
        unwrapResponse(
          response,
          "Không thể tải số thông báo chưa đọc.",
        );

      return normalizeUnreadCount(
        data?.unreadCount ??
          data?.UnreadCount,
      );
    },

  markAsRead:
    async (notificationId) => {
      const id =
        String(
          notificationId || "",
        ).trim();

      if (!id) {
        throw new Error(
          "Không tìm thấy mã thông báo.",
        );
      }

      const response =
        await axiosClient.patch(
          "/notifications/" +
            encodeURIComponent(id) +
            "/read",
        );

      return normalizeReadResponse(
        unwrapResponse(
          response,
          "Không thể đánh dấu thông báo đã đọc.",
        ),
      );
    },

  markAllAsRead:
    async () => {
      const response =
        await axiosClient.patch(
          "/notifications/read-all",
        );

      return normalizeReadAllResponse(
        unwrapResponse(
          response,
          "Không thể đánh dấu tất cả thông báo đã đọc.",
        ),
      );
    },
};

export default notificationApi;

import axiosClient from "./axiosClient";

const unwrapResult = (result, fallbackMessage) => {
  if (result?.success === false || result?.isSuccess === false) {
    throw new Error(
      result?.error?.message ||
        result?.message ||
        fallbackMessage,
    );
  }

  return result?.data ?? result;
};

const normalizePagedAuditLogs = (result) => {
  const source =
    unwrapResult(
      result,
      "Không thể tải danh sách nhật ký hệ thống.",
    ) || {};

  return {
    items: Array.isArray(source.items)
      ? source.items
      : [],

    pageNumber: Number(source.pageNumber) || 1,
    pageSize: Number(source.pageSize) || 10,
    totalCount: Number(source.totalCount) || 0,
    totalPages: Number(source.totalPages) || 0,

    hasPreviousPage: Boolean(
      source.hasPreviousPage,
    ),

    hasNextPage: Boolean(
      source.hasNextPage,
    ),
  };
};

const appendIfPresent = (params, key, value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  params[key] = value;
};

const adminAuditLogApi = {
  getAuditLogs: async ({
    pageNumber = 1,
    pageSize = 10,
    fromUtc,
    toUtc,
    category,
    action,
    outcome,
    actorType,
    userId,
    userRole,
    targetType,
    targetId,
    source,
    correlationId,
    signal,
  } = {}) => {
    const params = {
      PageNumber: pageNumber,
      PageSize: pageSize,
    };

    appendIfPresent(params, "FromUtc", fromUtc);
    appendIfPresent(params, "ToUtc", toUtc);
    appendIfPresent(params, "Category", category);
    appendIfPresent(params, "Action", action);
    appendIfPresent(params, "Outcome", outcome);
    appendIfPresent(params, "ActorType", actorType);
    appendIfPresent(params, "UserId", userId);
    appendIfPresent(params, "UserRole", userRole);
    appendIfPresent(params, "TargetType", targetType);
    appendIfPresent(params, "TargetId", targetId);
    appendIfPresent(params, "Source", source);
    appendIfPresent(
      params,
      "CorrelationId",
      correlationId,
    );

    const result = await axiosClient.get(
      "/admin/audit-logs",
      {
        params,
        signal,
        skipGlobalErrorPage: true,
      },
    );

    return normalizePagedAuditLogs(result);
  },

  getAuditLogById: async (
    auditId,
    { signal } = {},
  ) => {
    const id = String(auditId || "").trim();

    if (!id) {
      throw new Error(
        "Không tìm thấy mã nhật ký hệ thống.",
      );
    }

    const result = await axiosClient.get(
      `/admin/audit-logs/${encodeURIComponent(id)}`,
      {
        signal,
        skipGlobalErrorPage: true,
      },
    );

    return unwrapResult(
      result,
      "Không thể tải chi tiết nhật ký hệ thống.",
    );
  },
};

export default adminAuditLogApi;

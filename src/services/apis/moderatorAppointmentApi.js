import axiosClient from "./axiosClient";

const normalizePositiveInteger = (value, fallback) => {
  const normalized = Number(value);

  return Number.isInteger(normalized) && normalized > 0
    ? normalized
    : fallback;
};

const normalizePagedResponse = (
  response,
  fallbackPageNumber,
  fallbackPageSize,
) => {
  const source = response?.data ?? response ?? {};

  const pageNumber = normalizePositiveInteger(
    source.pageNumber ?? source.PageNumber,
    fallbackPageNumber,
  );

  const pageSize = normalizePositiveInteger(
    source.pageSize ?? source.PageSize,
    fallbackPageSize,
  );

  const totalCount = Math.max(
    0,
    Number(source.totalCount ?? source.TotalCount) || 0,
  );

  const totalPages = Math.max(
    0,
    Number(source.totalPages ?? source.TotalPages) ||
      Math.ceil(totalCount / pageSize),
  );

  return {
    items: Array.isArray(source.items ?? source.Items)
      ? source.items ?? source.Items
      : [],
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: Boolean(
      source.hasPreviousPage ?? source.HasPreviousPage ?? pageNumber > 1,
    ),
    hasNextPage: Boolean(
      source.hasNextPage ?? source.HasNextPage ?? pageNumber < totalPages,
    ),
  };
};

const moderatorAppointmentApi = {
  getAppointments: async ({
    keyword,
    type,
    status,
    orderId,
    buyerId,
    sellerId,
    isOverdue,
    hasInspectionForm,
    scheduledFrom,
    scheduledTo,
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) => {
    const normalizedPage = normalizePositiveInteger(pageNumber, 1);

    const normalizedPageSize = Math.min(
      100,
      normalizePositiveInteger(pageSize, 10),
    );

    const params = {
      PageNumber: normalizedPage,
      PageSize: normalizedPageSize,
    };

    if (String(keyword || "").trim()) {
      params.Keyword = String(keyword).trim();
    }

    if (type !== undefined && type !== null && type !== "") {
      params.Type = type;
    }

    if (status !== undefined && status !== null && status !== "") {
      params.Status = status;
    }

    if (String(orderId || "").trim()) {
      params.OrderId = String(orderId).trim();
    }

    if (String(buyerId || "").trim()) {
      params.BuyerId = String(buyerId).trim();
    }

    if (String(sellerId || "").trim()) {
      params.SellerId = String(sellerId).trim();
    }

    if (typeof isOverdue === "boolean") {
      params.IsOverdue = isOverdue;
    }

    if (typeof hasInspectionForm === "boolean") {
      params.HasInspectionForm = hasInspectionForm;
    }

    if (scheduledFrom) {
      params.ScheduledFrom = scheduledFrom;
    }

    if (scheduledTo) {
      params.ScheduledTo = scheduledTo;
    }

    const response = await axiosClient.get("/moderator/appointments", {
      params,
      signal,
    });

    return normalizePagedResponse(
      response,
      normalizedPage,
      normalizedPageSize,
    );
  },

  getAppointmentById: async (appointmentId, { signal } = {}) => {
    const id = String(appointmentId || "").trim();

    if (!id) {
      throw new Error("Không tìm thấy mã lịch hẹn.");
    }

    const response = await axiosClient.get(
      `/moderator/appointments/${encodeURIComponent(id)}`,
      { signal },
    );

    const source = response?.data ?? response ?? {};

    const responseAppointmentId = String(
      source.appointmentId ?? source.AppointmentId ?? "",
    ).trim();

    if (!responseAppointmentId) {
      throw new Error("Response chi tiết lịch hẹn không hợp lệ.");
    }

    return source;
  },

  getInspectionForm: async (appointmentId, { signal } = {}) => {
    const id = String(appointmentId || "").trim();

    if (!id) {
      throw new Error("Không tìm thấy mã lịch hẹn.");
    }

    const response = await axiosClient.get(
      `/moderator/appointments/${encodeURIComponent(id)}/inspection-form`,
      { signal },
    );

    const source = response?.data ?? response ?? {};

    const responseFormId = String(
      source.inspectionFormId ?? source.InspectionFormId ?? "",
    ).trim();

    if (!responseFormId) {
      throw new Error("Response biên bản kiểm định không hợp lệ.");
    }

    return source;
  },
};

export default moderatorAppointmentApi;

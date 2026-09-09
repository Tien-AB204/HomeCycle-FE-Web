import axiosClient from "./axiosClient";

const normalizeIdentifier = (value, message) => {
  const id = String(value || "").trim();

  if (!id) {
    throw new Error(message);
  }

  return id;
};

const normalizeRevision = (value) => {
  const revision = Number(value);

  if (!Number.isInteger(revision) || revision <= 0) {
    throw new Error("Phiên bản biên bản kiểm định không hợp lệ.");
  }

  return revision;
};

const inspectionFormApi = {
  getByAppointment: async (
    appointmentId,
    { signal } = {},
  ) => {
    const id = normalizeIdentifier(
      appointmentId,
      "Không tìm thấy mã lịch kiểm định.",
    );

    return axiosClient.get(
      `/inspection-forms/appointment/${encodeURIComponent(id)}`,
      {
        signal,
        skipGlobalErrorPage: true,
      },
    );
  },

  collectNow: async (
    inspectionFormId,
    expectedRevision,
  ) => {
    const id = normalizeIdentifier(
      inspectionFormId,
      "Không tìm thấy biên bản kiểm định.",
    );

    return axiosClient.post(
      `/inspection-forms/${encodeURIComponent(id)}/collect-now`,
      {
        expectedRevision:
          normalizeRevision(expectedRevision),
      },
      {
        skipGlobalErrorPage: true,
      },
    );
  },

  scheduleCollection: async (
    inspectionFormId,
    payload,
  ) => {
    const id = normalizeIdentifier(
      inspectionFormId,
      "Không tìm thấy biên bản kiểm định.",
    );

    if (!payload || typeof payload !== "object") {
      throw new Error(
        "Thông tin lịch thu gom không hợp lệ.",
      );
    }

    return axiosClient.post(
      `/inspection-forms/${encodeURIComponent(id)}/collection-appointments`,
      {
        ...payload,
        expectedRevision:
          normalizeRevision(
            payload.expectedRevision,
          ),
      },
      {
        skipGlobalErrorPage: true,
      },
    );
  },
};

export default inspectionFormApi;
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

/*
 * OperatingStatus/AppearanceStatus/PartsStatus/MatchStatus/Conclusion là
 * enum thật ở Backend nên [FromForm] model binding chấp nhận tên chuỗi
 * canonical (vd "WorkingWell"). SuggestedPrice chỉ có ý nghĩa khi
 * Conclusion = PriceAdjustment - Backend tự set null ở các trường hợp
 * khác nên FE không cần gửi khi không áp dụng.
 */
const appendInspectionFields = (formData, payload) => {
  if (payload.operatingStatus) {
    formData.append("OperatingStatus", payload.operatingStatus);
  }

  if (payload.appearanceStatus) {
    formData.append("AppearanceStatus", payload.appearanceStatus);
  }

  if (payload.partsStatus) {
    formData.append("PartsStatus", payload.partsStatus);
  }

  if (payload.matchStatus) {
    formData.append("MatchStatus", payload.matchStatus);
  }

  if (String(payload.inspectorNotes || "").trim()) {
    formData.append("InspectorNotes", String(payload.inspectorNotes).trim());
  }

  if (payload.conclusion) {
    formData.append("Conclusion", payload.conclusion);
  }

  if (
    payload.conclusion === "PriceAdjustment" &&
    Number.isFinite(Number(payload.suggestedPrice)) &&
    Number(payload.suggestedPrice) > 0
  ) {
    formData.append("SuggestedPrice", String(Number(payload.suggestedPrice)));
  }

  if (Array.isArray(payload.images)) {
    payload.images.forEach((file) => {
      if (file instanceof File) {
        formData.append("Images", file, file.name);
      }
    });
  }
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

  createDraft: async (
    appointmentId,
    payload = {},
    { signal } = {},
  ) => {
    const id = normalizeIdentifier(
      appointmentId,
      "Không tìm thấy mã lịch kiểm định.",
    );

    const formData = new FormData();
    appendInspectionFields(formData, payload);

    return axiosClient.post(
      `/inspection-forms/appointment/${encodeURIComponent(id)}`,
      formData,
      { signal, skipGlobalErrorPage: true },
    );
  },

  /*
   * replaceImages=true + images rỗng => xóa toàn bộ ảnh hiện có.
   * replaceImages=true + images có phần tử => thay thế bằng ảnh mới.
   * replaceImages=false => Backend không đụng đến ảnh hiện có,
   * dù payload.images có giá trị hay không.
   */
  updateDraft: async (
    inspectionFormId,
    expectedRevision,
    payload = {},
    { replaceImages = false, signal } = {},
  ) => {
    const id = normalizeIdentifier(
      inspectionFormId,
      "Không tìm thấy biên bản kiểm định.",
    );

    const formData = new FormData();
    formData.append("ExpectedRevision", String(normalizeRevision(expectedRevision)));
    formData.append("ReplaceImages", replaceImages ? "true" : "false");
    appendInspectionFields(formData, payload);

    return axiosClient.put(
      `/inspection-forms/${encodeURIComponent(id)}`,
      formData,
      { signal, skipGlobalErrorPage: true },
    );
  },

  submit: async (inspectionFormId, expectedRevision) => {
    const id = normalizeIdentifier(
      inspectionFormId,
      "Không tìm thấy biên bản kiểm định.",
    );

    return axiosClient.post(
      `/inspection-forms/${encodeURIComponent(id)}/submit`,
      { expectedRevision: normalizeRevision(expectedRevision) },
      { skipGlobalErrorPage: true },
    );
  },

  sellerConfirm: async (inspectionFormId, expectedRevision) => {
    const id = normalizeIdentifier(
      inspectionFormId,
      "Không tìm thấy biên bản kiểm định.",
    );

    return axiosClient.post(
      `/inspection-forms/${encodeURIComponent(id)}/confirm`,
      { expectedRevision: normalizeRevision(expectedRevision) },
      { skipGlobalErrorPage: true },
    );
  },

  sellerReject: async (inspectionFormId, expectedRevision, reason) => {
    const id = normalizeIdentifier(
      inspectionFormId,
      "Không tìm thấy biên bản kiểm định.",
    );

    const normalizedReason = String(reason || "").trim();

    if (!normalizedReason) {
      throw new Error("Vui lòng nhập lý do từ chối.");
    }

    return axiosClient.post(
      `/inspection-forms/${encodeURIComponent(id)}/reject`,
      {
        expectedRevision: normalizeRevision(expectedRevision),
        reason: normalizedReason,
      },
      { skipGlobalErrorPage: true },
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
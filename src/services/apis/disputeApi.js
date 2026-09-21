import { DISPUTE_TARGET_TYPE } from "../../constants/disputes";
import axiosClient from "./axiosClient";

const normalizeIdentifier = (value, message) => {
  const id = String(value || "").trim();

  if (!id) {
    throw new Error(message);
  }

  return id;
};

const normalizeCategoryId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Vui lòng chọn lý do báo cáo hợp lệ.");
  }

  return id;
};

const normalizeEvidenceImages = (evidenceImages) => {
  const files = Array.from(evidenceImages || []);

  if (files.some((file) => !(file instanceof File))) {
    throw new Error("Danh sách ảnh bằng chứng không hợp lệ.");
  }

  return files;
};

const unwrap = (response) => response?.data ?? response;

const normalizeLimit = (value, label) => {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`Máy chủ chưa trả ${label} hợp lệ.`);
  }

  return limit;
};

const createFormData = ({
  targetType,
  targetId,
  disputeCategoryId,
  description,
  evidenceImages,
}) => {
  const formData = new FormData();

  formData.append("TargetType", String(targetType));
  formData.append("TargetId", targetId);
  formData.append(
    "DisputeCategoryId",
    String(disputeCategoryId),
  );
  formData.append("Description", description);

  evidenceImages.forEach((file) => {
    formData.append("EvidenceImages", file, file.name);
  });

  return formData;
};

const createDispute = async ({
  targetType,
  targetId,
  disputeCategoryId,
  description,
  evidenceImages,
}) => {
  const normalizedTargetId = normalizeIdentifier(
    targetId,
    "Không tìm thấy nội dung cần báo cáo.",
  );
  const normalizedDescription = String(
    description || "",
  ).trim();
  const formData = createFormData({
    targetType,
    targetId: normalizedTargetId,
    disputeCategoryId:
      normalizeCategoryId(disputeCategoryId),
    description: normalizedDescription,
    evidenceImages:
      normalizeEvidenceImages(evidenceImages),
  });

  const response = await axiosClient.post(
    "/disputes",
    formData,
    {
      timeout: 60000,
      skipGlobalErrorPage: true,
    },
  );
  const result = unwrap(response);

  if (!result?.disputeId) {
    throw new Error("Phản hồi tạo báo cáo không hợp lệ.");
  }

  return result;
};

/*
 * Chuẩn hóa một lý do tranh chấp từ Backend (DisputeCategoryOptionDto).
 * Dùng chung cho /dispute-categories và actions.allowedDisputeCategories.
 */
export const normalizeDisputeCategory = (item) => {
  const disputeCategoryId = Number(item?.disputeCategoryId);

  if (!Number.isInteger(disputeCategoryId) || disputeCategoryId <= 0) {
    return null;
  }

  return {
    disputeCategoryId,
    code: String(item.code || "").trim(),
    name:
      String(item.name || "").trim() ||
      String(item.code || "").trim() ||
      "Lý do chưa đặt tên",
    description: String(item.description || "").trim() || null,
  };
};

export const normalizeDisputeCategories = (items) =>
  (Array.isArray(items) ? items : [])
    .map(normalizeDisputeCategory)
    .filter(Boolean);

export const disputeApi = {
  getOptions: async ({ targetType, signal } = {}) => {
    const response = await axiosClient.get(
      "/disputes/options",
      {
        params:
          targetType === undefined || targetType === null
            ? undefined
            : { targetType },
        signal,
        skipGlobalErrorPage: true,
      },
    );
    const source = unwrap(response) || {};
    const limits = {
      minimumEvidenceImages: normalizeLimit(
        source.minimumEvidenceImages,
        "số ảnh bằng chứng tối thiểu",
      ),
      maximumEvidenceImages: normalizeLimit(
        source.maximumEvidenceImages,
        "số ảnh bằng chứng tối đa",
      ),
      minimumDescriptionLength: normalizeLimit(
        source.minimumDescriptionLength,
        "độ dài mô tả tối thiểu",
      ),
      maximumDescriptionLength: normalizeLimit(
        source.maximumDescriptionLength,
        "độ dài mô tả tối đa",
      ),
    };

    if (
      limits.minimumEvidenceImages >
        limits.maximumEvidenceImages ||
      limits.minimumDescriptionLength >
        limits.maximumDescriptionLength
    ) {
      throw new Error(
        "Máy chủ chưa trả giới hạn báo cáo hợp lệ.",
      );
    }

    return limits;
  },

  getCategories: async ({ targetType, signal } = {}) => {
    const response = await axiosClient.get(
      "/dispute-categories",
      {
        params:
          targetType === undefined || targetType === null
            ? undefined
            : { targetType },
        signal,
        skipGlobalErrorPage: true,
      },
    );
    const source = unwrap(response);
    const items = Array.isArray(source)
      ? source
      : Array.isArray(source?.items)
        ? source.items
        : [];

    return normalizeDisputeCategories(items);
  },

  createContentReport: async (payload) => {
    const targetType = Number(payload?.targetType);

    if (
      targetType !== DISPUTE_TARGET_TYPE.POST &&
      targetType !== DISPUTE_TARGET_TYPE.REVIEW
    ) {
      throw new Error(
        "Loại nội dung báo cáo không được hỗ trợ.",
      );
    }

    return createDispute({ ...payload, targetType });
  },

  createForOrder: ({
    orderId,
    disputeCategoryId,
    description,
    evidenceImages,
  }) =>
    createDispute({
      targetType: DISPUTE_TARGET_TYPE.ORDER,
      targetId: orderId,
      disputeCategoryId,
      description,
      evidenceImages,
    }),

  getMine: async ({
    pageNumber = 1,
    pageSize = 10,
    signal,
  } = {}) => {
    const response = await axiosClient.get("/disputes", {
      params: {
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
      signal,
      skipGlobalErrorPage: true,
    });

    const source = unwrap(response) || {};

    return {
      items: Array.isArray(source?.items) ? source.items : [],
      pageNumber: source?.pageNumber ?? pageNumber,
      pageSize: source?.pageSize ?? pageSize,
      totalCount: source?.totalCount ?? 0,
      totalPages: source?.totalPages ?? 0,
      hasPreviousPage: Boolean(source?.hasPreviousPage),
      hasNextPage: Boolean(source?.hasNextPage),
    };
  },

  close: async (disputeId) => {
    const id = normalizeIdentifier(
      disputeId,
      "Không tìm thấy mã tranh chấp.",
    );

    return axiosClient.post(
      `/disputes/${encodeURIComponent(id)}/close`,
      undefined,
      { skipGlobalErrorPage: true },
    );
  },

  getById: async (disputeId, { signal } = {}) => {
    const id = normalizeIdentifier(
      disputeId,
      "Không tìm thấy mã tranh chấp.",
    );

    const response = await axiosClient.get(
      `/disputes/${encodeURIComponent(id)}`,
      {
        signal,
        skipGlobalErrorPage: true,
      },
    );
    const result = unwrap(response);

    if (!result?.disputeId) {
      throw new Error(
        "Phản hồi chi tiết tranh chấp không hợp lệ.",
      );
    }

    return result;
  },
};

export default disputeApi;

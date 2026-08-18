import {
  DISPUTE_TARGET_TYPE,
  ORDER_DISPUTE_CATEGORY_OPTIONS,
} from "../../constants/disputes";
import axiosClient from "./axiosClient";

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 2000;

const MIN_EVIDENCE_IMAGES = 3;
const MAX_EVIDENCE_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = Object.freeze([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

const normalizeIdentifier = (value, message) => {
  const id = String(value || "").trim();

  if (!id) {
    throw new Error(message);
  }

  return id;
};

const normalizeDescription = (value) =>
  String(value || "").trim();

const getFileExtension = (fileName) => {
  const normalizedName = String(fileName || "")
    .trim()
    .toLowerCase();

  const lastDotIndex = normalizedName.lastIndexOf(".");

  return lastDotIndex >= 0
    ? normalizedName.slice(lastDotIndex)
    : "";
};

const validateOrderCategory = (category) => {
  const normalizedCategory = Number(category);

  const allowedCategories =
    ORDER_DISPUTE_CATEGORY_OPTIONS.map(
      (option) => option.value,
    );

  if (!allowedCategories.includes(normalizedCategory)) {
    throw new Error(
      "Loại tranh chấp không hợp lệ đối với đơn hàng.",
    );
  }

  return normalizedCategory;
};

const validateDescription = (description) => {
  const normalizedDescription =
    normalizeDescription(description);

  if (
    normalizedDescription.length <
    MIN_DESCRIPTION_LENGTH
  ) {
    throw new Error(
      `Mô tả tranh chấp phải có ít nhất ${MIN_DESCRIPTION_LENGTH} ký tự.`,
    );
  }

  if (
    normalizedDescription.length >
    MAX_DESCRIPTION_LENGTH
  ) {
    throw new Error(
      `Mô tả tranh chấp không được vượt quá ${MAX_DESCRIPTION_LENGTH} ký tự.`,
    );
  }

  return normalizedDescription;
};

const validateEvidenceImages = (evidenceImages) => {
  const files = Array.from(evidenceImages || []);

  if (
    files.length < MIN_EVIDENCE_IMAGES ||
    files.length > MAX_EVIDENCE_IMAGES
  ) {
    throw new Error(
      `Vui lòng cung cấp từ ${MIN_EVIDENCE_IMAGES} đến ${MAX_EVIDENCE_IMAGES} ảnh bằng chứng.`,
    );
  }

  files.forEach((file) => {
    if (!(file instanceof File)) {
      throw new Error(
        "Danh sách ảnh bằng chứng không hợp lệ.",
      );
    }

    if (file.size <= 0) {
      throw new Error(
        `Ảnh "${file.name}" không có dữ liệu.`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `Ảnh "${file.name}" vượt quá dung lượng tối đa 5MB.`,
      );
    }

    const extension = getFileExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new Error(
        `Ảnh "${file.name}" không đúng định dạng. Chỉ chấp nhận JPG, JPEG, PNG hoặc WEBP.`,
      );
    }
  });

  return files;
};

const createFormData = ({
  targetType,
  targetId,
  category,
  description,
  evidenceImages,
}) => {
  const formData = new FormData();

  formData.append("TargetType", String(targetType));
  formData.append("TargetId", targetId);
  formData.append("Category", String(category));
  formData.append("Description", description);

  evidenceImages.forEach((file) => {
    formData.append(
      "EvidenceImages",
      file,
      file.name,
    );
  });

  return formData;
};

export const disputeApi = {
  /**
   * Tạo tranh chấp trực tiếp trên một Order.
   */
  createForOrder: async ({
    orderId,
    category,
    description,
    evidenceImages,
  }) => {
    const targetId = normalizeIdentifier(
      orderId,
      "Không tìm thấy mã đơn hàng để tạo tranh chấp.",
    );

    const normalizedCategory =
      validateOrderCategory(category);

    const normalizedDescription =
      validateDescription(description);

    const normalizedEvidenceImages =
      validateEvidenceImages(evidenceImages);

    const formData = createFormData({
      targetType: DISPUTE_TARGET_TYPE.ORDER,
      targetId,
      category: normalizedCategory,
      description: normalizedDescription,
      evidenceImages: normalizedEvidenceImages,
    });

    const response = await axiosClient.post(
      "/disputes",
      formData,
    );

    if (!response?.disputeId) {
      throw new Error(
        "Response tạo tranh chấp không hợp lệ.",
      );
    }

    return response;
  },

  /**
   * Xem chi tiết một tranh chấp mà user hiện tại
   * là người gửi hoặc người bị khiếu nại.
   */
  getById: async (
    disputeId,
    { signal } = {},
  ) => {
    const id = normalizeIdentifier(
      disputeId,
      "Không tìm thấy mã tranh chấp.",
    );

    const response = await axiosClient.get(
      `/disputes/${encodeURIComponent(id)}`,
      {
        signal,
      },
    );

    if (!response?.disputeId) {
      throw new Error(
        "Response chi tiết tranh chấp không hợp lệ.",
      );
    }

    return response;
  },
};

export default disputeApi;
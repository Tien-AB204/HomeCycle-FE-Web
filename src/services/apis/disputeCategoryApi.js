import axiosClient from "./axiosClient";

/*
 * Backend trả DisputeCategoryResponseDto/mảng trực tiếp cho các endpoint
 * này (không bọc {isSuccess,data,error} như Brand/Category) - đã xác nhận
 * qua đọc trực tiếp DisputeCategoryController.cs (return Ok(result.Data)).
 * unwrapResult vẫn xử lý an toàn cả hai kiểu, giống platformPolicyApi.js.
 */
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

const normalizeCategoryId = (categoryId) => {
  const id = Number(categoryId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Không tìm thấy mã danh mục tranh chấp.");
  }

  return id;
};

const disputeCategoryApi = {
  /**
   * Danh sách danh mục tranh chấp. isActive bỏ trống để lấy tất cả
   * (bao gồm danh mục đã tắt, cần giữ để hiển thị lịch sử).
   */
  getAll: async ({
    isActive,
    signal,
  } = {}) => {
    const result = await axiosClient.get(
      "/admin/dispute-categories",
      {
        params:
          typeof isActive === "boolean"
            ? { isActive }
            : undefined,
        signal,
      },
    );

    const data = unwrapResult(
      result,
      "Không thể tải danh sách danh mục tranh chấp.",
    );

    return Array.isArray(data) ? data : [];
  },

  /**
   * code chỉ nhập khi tạo mới, không thể đổi sau khi tạo.
   */
  create: async ({
    code,
    name,
    description,
    targetTypes,
  }) => {
    const result = await axiosClient.post(
      "/admin/dispute-categories",
      {
        code: String(code || "").trim(),
        name: String(name || "").trim(),
        description:
          String(description || "").trim() ||
          null,
        targetTypes: Array.isArray(targetTypes)
          ? targetTypes
          : [],
      },
    );

    const createdCategory = unwrapResult(
      result,
      "Không thể tạo danh mục tranh chấp.",
    );

    if (!createdCategory?.disputeCategoryId) {
      throw new Error(
        "Response tạo danh mục tranh chấp không hợp lệ.",
      );
    }

    return createdCategory;
  },

  /**
   * Chỉ cập nhật name/description/targetTypes - code là bất biến.
   */
  update: async (
    categoryId,
    { name, description, targetTypes },
  ) => {
    const id = normalizeCategoryId(categoryId);

    const result = await axiosClient.patch(
      `/admin/dispute-categories/${id}`,
      {
        name: String(name || "").trim(),
        description:
          String(description || "").trim() ||
          null,
        targetTypes: Array.isArray(targetTypes)
          ? targetTypes
          : [],
      },
    );

    const updatedCategory = unwrapResult(
      result,
      "Không thể cập nhật danh mục tranh chấp.",
    );

    if (!updatedCategory?.disputeCategoryId) {
      throw new Error(
        "Response cập nhật danh mục tranh chấp không hợp lệ.",
      );
    }

    return updatedCategory;
  },

  /**
   * Bật/tắt danh mục - không có xóa cứng. Danh mục đã tắt vẫn hợp lệ
   * để hiển thị dữ liệu lịch sử, chỉ không còn dùng được cho tranh chấp mới.
   */
  updateStatus: async (
    categoryId,
    isActive,
  ) => {
    const id = normalizeCategoryId(categoryId);

    const result = await axiosClient.patch(
      `/admin/dispute-categories/${id}/status`,
      {
        isActive: Boolean(isActive),
      },
    );

    const updatedCategory = unwrapResult(
      result,
      "Không thể cập nhật trạng thái danh mục tranh chấp.",
    );

    if (!updatedCategory?.disputeCategoryId) {
      throw new Error(
        "Response cập nhật trạng thái danh mục tranh chấp không hợp lệ.",
      );
    }

    return updatedCategory;
  },
};

export default disputeCategoryApi;

// src/services/apis/categoryApi.js
import axiosClient from "./axiosClient";

export const categoryApi = {
  // Lấy danh sách danh mục (có hỗ trợ search/filter)
  getAll: (params) => axiosClient.get("/categories", { params }),

  // Lấy chi tiết 1 danh mục
  getById: (id) => axiosClient.get(`/categories/${id}`),

  // Tạo danh mục mới
  create: (data) => axiosClient.post("/categories", data),

  // Cập nhật danh mục
  update: (id, data) => axiosClient.put(`/categories/${id}`, data),

  // Xóa danh mục
  delete: (id) => axiosClient.delete(`/categories/${id}`),
};

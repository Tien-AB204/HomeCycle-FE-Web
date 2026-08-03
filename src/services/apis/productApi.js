// src/services/apis/productApi.js
import axiosClient from "./axiosClient";

export const productApi = {
  // Hàm tìm kiếm và lọc sản phẩm
  searchProducts: (params) => {
    const url = "/products/search";
    return axiosClient.get(url, { params });
  },

  // Lấy các loại sản phẩm theo categoryId backend
  getProductTypesByCategory: (categoryId) => {
    const url = `/product-types/category/${categoryId}`;
    return axiosClient.get(url);
  },
};

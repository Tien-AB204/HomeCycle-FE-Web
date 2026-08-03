// src/services/userService.js
import axiosClient from './apis/axiosClient';

export const userService = {
  /**
   * 1. Lấy thông tin hồ sơ của user đang đăng nhập
   * Lưu ý: Thay đổi '/users/me' thành endpoint chính xác của Backend nhóm bạn
   */
  getProfile: () => {
    return axiosClient.get('/personals/me'); 
  },

  /**
   * 2. Cập nhật thông tin cá nhân cơ bản
   */
  updateProfile: (data) => {
    return axiosClient.put('/personals/me', data);
  },

  /**
   * 3. Cập nhật thông tin tài khoản ngân hàng
   */
  updateBankInfo: (data) => {
    return axiosClient.put('/personals/me/bank', data);
  }
};
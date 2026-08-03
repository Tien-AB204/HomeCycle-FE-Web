// src/services/apis/axiosClient.js
import axios from 'axios';

// Khởi tạo instance của axios
const axiosClient = axios.create({
  baseURL: 'https://homecycle-backend.onrender.com/api', // Thay bằng URL Backend của nhóm bạn sau này
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor (Can thiệp vào request trước khi gửi đi)
axiosClient.interceptors.request.use(
  (config) => {
    // Nếu có token lưu ở localStorage thì tự động gắn vào Header
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor (Can thiệp vào response sau khi Backend trả về)
axiosClient.interceptors.response.use(
  (response) => {
    // Chỉ lấy phần data, bỏ qua các thông tin config lằng nhằng của Axios
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;
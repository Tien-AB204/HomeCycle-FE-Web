import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Homepage = () => {
  // Đọc thẳng giá trị từ localStorage ngay lúc khởi tạo (Đảm bảo độ trễ = 0)
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');

  // Hàm xử lý Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn'); // Xóa cờ đăng nhập
    setIsLoggedIn(false); // Cập nhật lại giao diện ngay lập tức
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <h1 className="text-4xl font-bold text-slate-800 mb-8">🏠 Đây là Trang chủ</h1>
      
      <div className="flex gap-4">
        {isLoggedIn ? (
          /* HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP */
          <button 
            onClick={handleLogout}
            className="px-6 py-3 bg-red-500 text-white rounded-md font-medium shadow-sm hover:bg-red-600 transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span> Đăng xuất
          </button>
        ) : (
          /* HIỂN THỊ KHI CHƯA ĐĂNG NHẬP */
          <>
            <Link to="/auth/login" className="px-6 py-3 bg-[#244f4d] text-white rounded-md font-medium shadow-sm hover:bg-[#1a3a38] transition">
              Đăng nhập
            </Link>
            <Link to="/auth/register" className="px-6 py-3 bg-white text-[#244f4d] border border-[#244f4d] rounded-md font-medium shadow-sm hover:bg-slate-50 transition">
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Homepage;
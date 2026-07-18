import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // Import hook xác thực

const ModLayout = () => {
  const { logout } = useAuth(); // Lấy hàm đăng xuất từ Context
  const navigate = useNavigate(); // Hook dùng để chuyển hướng trang

  // Hàm xử lý khi bấm nút Đăng xuất
  const handleLogout = () => {
    localStorage.setItem("isLoggedIn", "false");

    // Ép trang web tự động reload hoặc chuyển hướng về trang chủ để reset lại State
    window.location.href = "/"; 
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden">
      
      {/* SIDEBAR BÊN TRÁI */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        {/* Logo / Tên hệ thống */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-wider">HomeCycle <span className="text-teal-400 text-sm">MOD</span></h1>
        </div>

        {/* Menu Điều hướng */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavLink 
            to="/mod/dashboard"
            className={({ isActive }) => 
              `block px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-teal-600' : 'hover:bg-slate-800'}`
            }
          >
            Tổng quan
          </NavLink>
          
          <NavLink 
            to="/mod/posts"
            className={({ isActive }) => 
              `block px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-teal-600' : 'hover:bg-slate-800'}`
            }
          >
            Duyệt bài viết
          </NavLink>

          <NavLink 
            to="/mod/businesses"
            className={({ isActive }) => 
              `block px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-teal-600' : 'hover:bg-slate-800'}`
            }
          >
            Duyệt doanh nghiệp
          </NavLink>
        </nav>

        {/* Đăng xuất */}
        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={handleLogout} // Gắn hàm xử lý vào nút
            className="w-full py-2 px-4 bg-slate-800 hover:bg-red-600 transition-colors rounded text-sm font-medium"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* KHU VỰC NỘI DUNG CHÍNH (BÊN PHẢI) */}
      <main className="flex-1 overflow-y-auto">
        {/* Outlet là nơi các trang như PostModerationPage sẽ được render vào */}
        <Outlet />
      </main>
      
    </div>
  );
};

export default ModLayout;
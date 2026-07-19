import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // Import hook xác thực của đồng đội
import {
  DashboardOutlined,
  IdcardOutlined,
  ProfileOutlined,
  WalletOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  ExceptionOutlined,
  CarOutlined,
  FlagOutlined
} from '@ant-design/icons';

const ModLayout = () => {
  const location = useLocation();
  const { logout } = useAuth(); // Lấy hàm đăng xuất từ Context
  const navigate = useNavigate();

  // Hàm xử lý khi bấm nút Đăng xuất (Từ code của đồng đội)
  const handleLogout = () => {
    localStorage.setItem("isLoggedIn", "false");
    // Ép trang web tự động reload hoặc chuyển hướng về trang chủ để reset lại State
    window.location.href = "/"; 
  };

  // Danh sách nút chức năng ĐẦY ĐỦ của bạn
  const navigation = [
    { name: 'Tổng quan', path: '/mod/dashboard', icon: <DashboardOutlined /> },
    { name: 'Duyệt hồ sơ', path: '/mod/verification', icon: <IdcardOutlined /> },
    { name: 'Kiểm duyệt bài đăng', path: '/mod/posts', icon: <ProfileOutlined /> },
    { name: 'Yêu cầu rút tiền', path: '/mod/withdrawals', icon: <WalletOutlined /> },
    { name: 'Quản lý giao dịch', path: '/mod/transactions', icon: <ShoppingOutlined /> },
    { name: 'Quản lý lịch hẹn', path: '/mod/schedules', icon: <CalendarOutlined /> },
    { name: 'Xử lý tranh chấp', path: '/mod/disputes', icon: <ExceptionOutlined /> },
    { name: 'Sự cố vận chuyển', path: '/mod/shipping-issues', icon: <CarOutlined /> },
    { name: 'Đánh giá vi phạm', path: '/mod/reports', icon: <FlagOutlined /> },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans">
      
      {/* SIDEBAR: Lấy màu nền Dark Navy từ UI của đồng đội */}
      <aside className="w-[250px] bg-[#1a202c] text-white flex flex-col shrink-0 shadow-lg z-20">
        
        {/* Logo */}
        <div className="h-20 flex items-center px-8">
          <h1 className="text-2xl font-bold tracking-wide">
            HomeCycle <span className="text-[#0aa679]">MOD</span>
          </h1>
        </div>

        {/* Menu Điều Hướng */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    // Màu Teal (Xanh ngọc) giống hệt UI
                    ? 'bg-[#0aa679] text-white font-medium shadow-md' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <span className="text-lg flex items-center">{item.icon}</span>
                <span className="text-[15px]">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Nút Đăng xuất ở cuối Sidebar */}
        <div className="p-4 mt-auto border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="w-full py-3 bg-[#2d3748] hover:bg-red-600 text-gray-200 hover:text-white text-sm font-medium rounded-lg transition-colors border border-gray-600/50 hover:border-red-500"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* KHU VỰC LÀM VIỆC CHÍNH (Bên phải) */}
      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>
      
    </div>
  );
};

export default ModLayout;
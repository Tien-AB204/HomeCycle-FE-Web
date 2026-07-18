import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";

const MainLayout = () => {
  const navigate = useNavigate();
  
  // State lưu từ khóa tìm kiếm
  const [searchKeyword, setSearchKeyword] = useState("");

  // Giả lập trạng thái đăng nhập từ localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true",
  );

  const handleLogout = () => {
    // 1. Xóa trạng thái đăng nhập
    localStorage.setItem("isLoggedIn", "false");

    // 2. Ép trang web tự động reload hoặc chuyển hướng về trang chủ để reset lại State
    window.location.href = "/";
  };

  // Hàm xử lý chuyển hướng tìm kiếm sang trang /search
  const executeSearch = () => {
    if (searchKeyword.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchKeyword.trim())}`);
    } else {
      // Nếu ô tìm kiếm trống mà bấm phễu lọc, vẫn chuyển sang trang search để người dùng chọn danh mục
      navigate("/search");
    }
  };

  // Bắt sự kiện khi gõ phím trong ô input
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      executeSearch();
    }
  };

  return (
    <div className="min-h-screen bg-[#D9DADA] flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-[#172830] text-[#BAC2C1] py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="text-3xl font-semibold text-[#E1FEFF] tracking-wide"
          >
            HomeCycle
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 relative">
            <input
              type="text"
              placeholder="Tìm kiếm đồ cũ..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#2B5659] text-white placeholder-[#BAC2C1] rounded-md py-2 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#547B7D]"
            />
            {/* Nút Phễu lọc */}
            <button 
              onClick={executeSearch}
              className="absolute right-3 top-2 text-[#BAC2C1] hover:text-white transition-colors"
              title="Lọc tìm kiếm chi tiết"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>

          {/* KHU VỰC THAY ĐỔI: Check trạng thái Đăng nhập trên Header */}
          <div className="flex items-center gap-4 text-sm font-semibold">
            {!isLoggedIn ? (
              <>
                {/* TRẠNG THÁI CHƯA ĐĂNG NHẬP */}
                <Link
                  to="/auth/login"
                  className="text-white hover:text-[#BAC2C1] transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/auth/register"
                  className="bg-[#2B5659] text-white px-6 py-2 rounded-md hover:bg-[#547B7D] transition"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                {/* TRẠNG THÁI ĐÃ ĐĂNG NHẬP */}
                <Link
                  to="/user/dashboard"
                  className="text-white hover:underline transition flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-[#547B7D] flex items-center justify-center text-white font-bold">
                    U
                  </div>
                  Trang cá nhân
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-[#7A1012] text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                >
                  Đăng xuất
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-[#172830] text-[#BAC2C1] py-8 border-t border-[#2B5659]/50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">HomeCycle</h2>
            <p>© 2026 HomeCycle Marketplace. All rights reserved.</p>
          </div>
          <div className="flex gap-6 font-medium">
            <Link to="#" className="hover:text-white">
              About Us
            </Link>
            <Link to="#" className="hover:text-white">
              Safety Guide
            </Link>
            <Link to="#" className="hover:text-white">
              Terms of Service
            </Link>
            <Link to="#" className="hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;

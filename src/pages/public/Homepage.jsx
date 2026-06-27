import { useState } from "react";
import { Link } from "react-router-dom";

const Homepage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true",
  );

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {!isLoggedIn ? (
        /* CHƯA ĐĂNG NHẬP - Hiển thị 2 nút */
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-8">HomeCycle</h1>
          <div className="flex gap-4">
            <Link
              to="/auth/login"
              className="px-8 py-4 bg-[#244f4d] text-white rounded-lg font-bold hover:bg-[#1a3a38] transition"
            >
              Đăng nhập
            </Link>
            <Link
              to="/auth/register"
              className="px-8 py-4 border-2 border-[#244f4d] text-[#244f4d] rounded-lg font-bold hover:bg-[#244f4d] hover:text-white transition"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      ) : (
        /* ĐÃ ĐĂNG NHẬP - Hiển thị nút Đăng xuất */
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-8">
            Chào mừng bạn!
          </h1>
          <button
            onClick={handleLogout}
            className="px-8 py-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
};

export default Homepage;

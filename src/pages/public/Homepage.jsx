import { useState } from "react";
import { NavLink } from "react-router-dom"; // 👈 IMPORT THÊM NAVLINK
import ProductCard from "../../components/shared/ProductCard";
import { mockBusinessPosts, mockPersonalPosts } from "../../utils/mockData";

const Homepage = () => {
  // Giả định trạng thái đăng nhập
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true",
  );

  // 1. THÊM ĐƯỜNG DẪN (PATH) CHO TỪNG MỤC NAVIGATE
  const navigationItems = [
    { name: "Trang chủ", icon: "🏠", path: "/" },
    { name: "Tin đăng bán", icon: "📦", path: "/tin-dang-ban" }, // 👈 Trỏ về Route tin bán
    { name: "Tin thu mua", icon: "🤝", path: "/tin-thu-mua" }, // 👈 Trỏ về Route tin mua
    { name: "Thương lượng", icon: "💬", path: "/thuong-luong" },
    { name: "Lịch hẹn", icon: "📅", path: "/lich-hen" },
    { name: "Đơn hàng", icon: "📋", path: "/don-hang" },
    { name: "Thông báo", icon: "🔔", path: "/thong-bao" },
    { name: "Hồ sơ", icon: "👤", path: "/ho-so" },
  ];

  return (
    <div className="pb-16 bg-[#f4f5f5]">
      {/* 1. HERO BANNER */}
      {!isLoggedIn && (
        <section className="relative h-[400px] w-full bg-[#172830] overflow-hidden flex items-center">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000&auto=format&fit=crop"
            alt="Industrial Warehouse"
            className="absolute inset-0 w-full h-full object-cover opacity-40 object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#172830] via-[#172830]/75 to-transparent"></div>

          <div className="relative max-w-7xl mx-auto px-6 w-full z-10">
            <div className="max-w-4xl">
              <h1 className="text-4xl md:text-3xl font-bold text-[#C1EAEC] tracking-wide uppercase leading-[1.15] mb-6">
                KẾT NỐI NGƯỜI BÁN VỚI ĐƠN VỊ <br className="hidden md:inline" />
                THU MUA ĐỒ GIA DỤNG CŨ
              </h1>
              <p className="text-[#B7C9D4] text-base md:text-lg max-w-2xl font-normal leading-relaxed mb-10 opacity-90">
                Giải pháp tối ưu cho việc thanh lý và tái chế đồ gia dụng. Minh
                bạch giá cả, nhanh chóng kết nối, bảo vệ môi trường.
              </p>
              <div className="flex flex-wrap gap-5">
                <button className="bg-[#C1EAEC] hover:bg-white text-[#172830] font-bold text-sm tracking-wider px-8 py-3.5 rounded transition-all duration-300 flex items-center gap-2 shadow-sm">
                  BÁN NGAY ➔
                </button>
                <button className="border border-[#C1EAEC]/60 text-[#BAC2C1] hover:text-white hover:border-white font-bold text-sm tracking-wider px-8 py-3.5 rounded bg-transparent transition-all duration-300">
                  TÌM HIỂU THÊM
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KHUNG LAYOUT */}
      <div
        className={`w-full ${isLoggedIn ? "flex bg-[#f4f5f5]" : "max-w-7xl mx-auto px-6"}`}
      >
        {/* 🧭 SIDEBAR STYLE VIETNAM AIRLINES (Đã chuyển đổi sang NavLink) */}
        {isLoggedIn && (
          <aside className="w-64 shrink-0 bg-white border-r border-[#BAC2C1]/30 flex flex-col py-6 h-[calc(100vh-80px)] sticky top-20 z-20 px-3">
            <nav className="flex flex-col gap-1.5 w-full">
              {navigationItems.map((item, index) => (
                <NavLink
                  key={index}
                  to={item.path} // 👈 Điều hướng trang tự động
                  className={({ isActive }) =>
                    `flex items-center gap-4 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-left group
                    ${
                      isActive
                        ? "bg-[#2B5659] text-white shadow-sm" // Mục đang ACTIVE: Nền xanh chữ trắng
                        : "text-[#172830]/80 hover:bg-[#BAC2C1]/20 hover:text-[#2B5659]" // Mục thường
                    }`
                  }
                >
                  <span className="text-lg opacity-90 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </span>

                  <span className="tracking-wide">{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        {/* 📦 PHẦN NỘI DUNG SẢN PHẨM BÊN PHẢI */}
        <div className={`flex-1 ${isLoggedIn ? "px-8 py-6 pb-16" : ""}`}>
          {isLoggedIn && (
            <div className="bg-[#172830] rounded-lg p-5 text-white mb-8 shadow-sm">
              <h2 className="text-lg font-bold uppercase tracking-wide mb-1">
                Chào mừng bạn quay trở lại!
              </h2>
              <p className="text-[#B7C9D4] text-xs max-w-xl opacity-90">
                Hệ thống quản lý tin đăng bán và đối tác thu mua đồ gia dụng cũ
                HomeCycle.
              </p>
            </div>
          )}

          {/* 2. SECTION: TIN THU MUA (DOANH NGHIỆP) */}
          <section className={isLoggedIn ? "" : "mt-12"}>
            <div className="flex items-end justify-between border-l-4 border-[#2B5659] pl-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#2A3B43]">
                  TIN THU MUA (DOANH NGHIỆP)
                </h2>
                <p className="text-sm text-[#346767] mt-1">
                  Tin đăng thu mua số lượng lớn các loại hàng từ doanh nghiệp.
                </p>
              </div>
              <NavLink
                to="/tin-thu-mua"
                className="text-sm font-semibold text-[#172830] hover:text-[#547B7D]"
              >
                Xem tất cả ❯
              </NavLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockBusinessPosts.map((post) => (
                <ProductCard key={post.id} data={post} variant="business-buy" />
              ))}
            </div>
          </section>

          {/* 3. SECTION: TIN ĐĂNG BÁN (CÁ NHÂN) */}
          <section className="mt-16 bg-[#e8ecec] p-8 rounded-xl border border-[#BAC2C1]/50">
            <div className="flex items-end justify-between border-l-4 border-[#547B7D] pl-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#172830]">
                  TIN ĐĂNG BÁN THƯƠNG LƯỢNG (CÁ NHÂN)
                </h2>
                <p className="text-sm text-[#547B7D] mt-1">
                  Sản phẩm từ người dùng cá nhân, gửi yêu cầu định giá thương
                  lượng trực tiếp.
                </p>
              </div>
              <NavLink
                to="/tin-dang-ban"
                className="text-sm font-semibold text-[#172830] hover:text-[#547B7D]"
              >
                Xem tất cả ❯
              </NavLink>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mockPersonalPosts.map((post) => (
                <ProductCard
                  key={post.id}
                  data={post}
                  variant="personal-sell"
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Homepage;

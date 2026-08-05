import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ProductCard from "../../components/shared/ProductCard";
import { useAuth } from "../../hooks/useAuth";
import { mockBusinessPosts, mockPersonalPosts } from "../../utils/mockData";

const Homepage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [homepageSearch, setHomepageSearch] = useState("");

  const navigationItems = [
    { name: "Trang chủ", icon: "🏠", path: "/" },
    { name: "Tin đăng bán", icon: "📦", path: "/tin-dang-ban" },
    { name: "Tin thu mua", icon: "🤝", path: "/tin-thu-mua" },
    { name: "Thương lượng", icon: "💬", path: "/thuong-luong" },
    { name: "Lịch hẹn", icon: "📅", path: "/lich-hen" },
    { name: "Đơn hàng", icon: "📋", path: "/don-hang" },
    { name: "Thông báo", icon: "🔔", path: "/thong-bao" },
    { name: "Hồ sơ", icon: "👤", path: "/ho-so" },
  ];

  return (
    <div className="pb-16 bg-[#f4f5f5] w-full min-w-0 overflow-x-hidden">
      {!isAuthenticated && (
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

      <div
        className={
          isAuthenticated ? "w-full min-w-0 px-6" : "max-w-7xl mx-auto px-6"
        }
      >
        {isAuthenticated && (
          <div className="bg-[#172830] rounded-lg p-5 text-white mb-8 mt-6 shadow-sm w-full">
            <h2 className="text-lg font-bold uppercase tracking-wide mb-1">
              Chào mừng bạn quay trở lại!
            </h2>
            <p className="text-[#B7C9D4] text-xs max-w-xl opacity-90">
              Hệ thống quản lý tin đăng bán và đối tác thu mua đồ gia dụng cũ
              HomeCycle.
            </p>
          </div>
        )}

        <section className={isAuthenticated ? "" : "mt-12"}>
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
              className="text-sm font-semibold text-[#172830] hover:text-[#547B7D] shrink-0 ml-2"
            >
              Xem tất cả ❯
            </NavLink>
          </div>

          {/* Chỉnh lại responsive grid: gap-4 giúp tiết kiệm diện tích, xl:grid-cols-4 chỉ hiện 4 cột khi màn hình rất rộng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {mockBusinessPosts.map((post) => (
              <ProductCard key={post.id} data={post} variant="business-buy" />
            ))}
          </div>
        </section>

        <section className="mt-16 bg-[#e8ecec] p-6 md:p-8 pb-4 md:pb-6 rounded-xl border border-[#BAC2C1]/50 w-full min-w-0">
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
              className="text-sm font-semibold text-[#172830] hover:text-[#547B7D] shrink-0 ml-2"
            >
              Xem tất cả ❯
            </NavLink>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
            {mockPersonalPosts.map((post) => (
              <ProductCard key={post.id} data={post} variant="personal-sell" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Homepage;

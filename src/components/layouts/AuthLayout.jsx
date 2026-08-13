import { Link, Outlet } from "react-router-dom";
import homecycleLogo from "../../assets/brand/homecycle-logo.png";
import homecycleMark from "../../assets/brand/homecycle-mark.png";

const AuthLayout = () => {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#E4F2EF_0,_#F6F9F8_42%,_#E8F1F8_100%)] px-4 py-6 font-sans sm:px-6 lg:flex lg:items-center lg:py-8">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-[#D4E4E1] bg-white shadow-[0_24px_70px_rgba(24,63,65,0.13)] lg:grid-cols-[0.78fr_1.22fr]">
        <aside className="relative hidden min-h-[680px] overflow-hidden bg-gradient-to-br from-[#183F41] via-[#285E62] to-[#2F6F9F] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[46px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full border-[54px] border-white/5" />

          <Link to="/" className="relative inline-flex w-fit" aria-label="Về trang chủ HomeCycle">
            <img
              src={homecycleLogo}
              alt="HomeCycle"
              className="h-16 w-auto rounded-2xl shadow-lg"
            />
          </Link>

          <div className="relative max-w-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#BCE7E2]">
              HomeCycle Marketplace
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight">
              Trao giá trị cũ,
              <br /> tạo vòng đời mới.
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/75">
              Kết nối mua bán đồ gia dụng đã qua sử dụng trên một nền tảng minh bạch, thuận tiện và bền vững.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3 border-t border-white/15 pt-6 text-xs font-bold text-white/80">
            <span>Minh bạch</span>
            <span>Thương lượng</span>
            <span>Bền vững</span>
          </div>
        </aside>

        <section className="relative px-5 py-7 sm:px-9 sm:py-9 lg:px-12">
          <div className="mb-7 flex items-center justify-between border-b border-[#E2ECE9] pb-5 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3 font-black text-[#183F41]">
              <img src={homecycleMark} alt="" className="h-11 w-11 rounded-xl" />
              HomeCycle
            </Link>
            <Link to="/" className="text-sm font-bold text-[#2F6F9F] hover:underline">
              Trang chủ
            </Link>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;
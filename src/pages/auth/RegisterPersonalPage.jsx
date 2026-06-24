import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterPersonalPage = () => {
  const navigate = useNavigate();
  // 1: Thông tin (Hình 8), 2: OTP (Hình 2), 3: Profile (Hình 9), 4: Vị trí (Hình 10)
  const [step, setStep] = useState(1); 

  const handleNextStep = (e) => {
    e.preventDefault();
    setStep(step + 1);
  };

  const finishRegistration = () => {
    localStorage.setItem('isLoggedIn', 'true');
    // Gọi API lưu xuống DB ở đây
    navigate('/');
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col items-center mb-6">
        <h2 className="text-2xl font-bold text-[#244f4d] mb-1">HomeCycle</h2>
        {step === 1 && <p className="text-lg font-bold text-slate-800">Đăng ký tài khoản cá nhân</p>}
        {step === 2 && <p className="text-lg font-bold text-slate-800">Xác thực Email</p>}
        {step === 3 && <p className="text-lg font-bold text-slate-800 mt-2">Thiết lập hồ sơ cá nhân</p>}
        {step === 4 && <p className="text-lg font-bold text-slate-800 mt-2">Vị trí hoạt động</p>}
      </div>

      {/* BƯỚC 1: EMAIL & PASSWORD (HÌNH 8) */}
      {step === 1 && (
        <form onSubmit={handleNextStep} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Email</label>
            <input type="email" required placeholder="Nhập địa chỉ email của bạn..." className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Mật khẩu</label>
            <div className="relative">
              <input type="password" required placeholder="Tạo mật khẩu..." className="w-full border border-slate-300 rounded-md py-2.5 px-3 pr-10 focus:outline-none focus:border-[#244f4d] text-sm" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">visibility</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Xác nhận mật khẩu</label>
            <div className="relative">
              <input type="password" required placeholder="Nhập lại mật khẩu..." className="w-full border border-slate-300 rounded-md py-2.5 px-3 pr-10 focus:outline-none focus:border-[#244f4d] text-sm" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">visibility</span>
            </div>
          </div>
          <button type="submit" className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium mt-2">TIẾP TỤC</button>
          <div className="text-center text-sm text-slate-600 mt-4">
            Bạn đã có tài khoản? <Link to="/auth/login" className="font-bold text-[#244f4d] hover:underline">Đăng nhập ngay</Link>
          </div>
        </form>
      )}

      {/* BƯỚC 2: OTP (Sử dụng lại giao diện OTP của Login) */}
      {step === 2 && (
        <form onSubmit={handleNextStep} className="space-y-6">
          <p className="text-sm text-slate-500 text-center px-4">Hệ thống đã gửi mã OTP gồm 6 chữ số đến email của bạn. Vui lòng kiểm tra và gõ vào ô bên dưới.</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <input key={i} type="text" maxLength="1" className="w-10 h-12 border border-slate-300 rounded-md text-center text-lg font-semibold focus:border-[#244f4d] outline-none" />
            ))}
          </div>
          <button type="submit" className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium mt-2">XÁC NHẬN OTP</button>
        </form>
      )}

      {/* BƯỚC 3: PROFILE SETUP (HÌNH 9) */}
      {step === 3 && (
        <form onSubmit={handleNextStep} className="space-y-4">
          <p className="text-xs text-slate-500 text-center mb-4">Một vài thông tin cơ bản giúp bạn trải nghiệm mua bán tốt hơn.</p>
          
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-300 relative bg-slate-50 cursor-pointer">
               <span className="material-symbols-outlined text-3xl">person</span>
               <div className="absolute -bottom-2 -right-2 bg-[#244f4d] text-white p-1 rounded-md">
                 <span className="material-symbols-outlined text-[14px]">photo_camera</span>
               </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 uppercase">Họ và tên</label>
            <input type="text" placeholder="Nhập họ và tên của bạn..." className="w-full border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#244f4d] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 uppercase">Username</label>
            <input type="text" placeholder="username_cua_ban" className="w-full border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#244f4d] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 uppercase">Ngày sinh</label>
            <input type="date" className="w-full border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#244f4d] text-sm text-slate-600" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 uppercase">Số điện thoại</label>
            <input type="tel" placeholder="Nhập số điện thoại..." className="w-full border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#244f4d] text-sm mb-1" />
            <p className="text-[10px] text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">lock</span> Số điện thoại của bạn sẽ được bảo mật và không hiển thị công khai.</p>
          </div>

          <button type="submit" className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium flex items-center justify-center gap-2 mt-4">
            TIẾP TỤC <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <button type="button" onClick={finishRegistration} className="w-full text-sm font-medium text-slate-500 hover:text-slate-800 mt-2">Bỏ qua</button>
        </form>
      )}

      {/* BƯỚC 4: VỊ TRÍ (HÌNH 10) */}
      {step === 4 && (
        <form onSubmit={() => finishRegistration()} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Tỉnh / Thành phố</label>
            <select className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm text-slate-700 bg-white">
              <option value="">Chọn Tỉnh / Thành phố</option>
              <option value="sg">TP Hồ Chí Minh</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Quận / Huyện / Phường / Xã</label>
            <select className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] text-sm text-slate-700 bg-white">
              <option value="">Chọn Quận / Huyện / Phường / Xã</option>
              <option value="q1">Quận 1</option>
            </select>
          </div>

          <div className="bg-[#e6f2f1] text-[#244f4d] p-3 rounded-md text-xs mt-4 flex items-start gap-2 border border-[#c1e1df]">
            <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
            <p>HomeCycle chỉ sử dụng thông tin khu vực tổng quan để tối ưu bộ lọc tìm kiếm sản phẩm gần bạn. Tuyệt đối không yêu cầu số nhà hay tên đường tại đây nhằm bảo vệ quyền riêng tư cá nhân.</p>
          </div>

          <button type="submit" className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium mt-6">HOÀN THÀNH</button>
          <button type="button" onClick={finishRegistration} className="w-full text-sm font-medium text-slate-500 hover:text-slate-800 mt-2">Bỏ qua</button>
        </form>
      )}
    </div>
  );
};

export default RegisterPersonalPage;
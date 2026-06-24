import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Mock data/Hàm giả lập gọi API
  const handleSendOTP = (e) => {
    e.preventDefault();
    if(email) setStep(2); // Chuyển sang Hình 2
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setStep(3); // Chuyển sang Hình 3
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Chỗ này sau này gọi API thật, có token thì save context
    console.log("Đăng nhập với:", email, password);
    // Lưu trạng thái đăng nhập ảo vào trình duyệt
    localStorage.setItem('isLoggedIn', 'true');
    navigate('/'); // Về trang chủ
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-[#244f4d] rounded-md flex items-center justify-center mb-4 text-white">
          <span className="material-symbols-outlined">autorenew</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">HomeCycle</h2>
        
        {step === 1 && <p className="text-xl font-bold text-slate-800 mt-2">Đăng nhập vào tài khoản của bạn</p>}
        {step === 2 && <p className="text-xl font-bold text-slate-800 mt-2">Xác thực Email</p>}
        {step === 3 && <p className="text-xl font-bold text-slate-800 mt-2">Nhập mật khẩu</p>}
      </div>

      {/* --- BƯỚC 1: NHẬP EMAIL (HÌNH 1) --- */}
      {step === 1 && (
        <form onSubmit={handleSendOTP} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wide">ĐỊA CHỈ EMAIL</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">mail</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập địa chỉ email của bạn..." className="w-full border border-slate-300 rounded-md py-2.5 pl-10 pr-3 focus:outline-none focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d] text-sm" />
            </div>
          </div>
          <button type="submit" className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-[#1a3a38] transition">
            TIẾP THEO <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          
          <div className="relative flex items-center justify-center py-2">
            <hr className="w-full border-slate-200" />
            <span className="absolute bg-white px-3 text-xs text-slate-400 font-medium">HOẶC TIẾP TỤC VỚI</span>
          </div>
          
          <button type="button" className="w-full border border-slate-300 rounded-md py-2.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm font-medium text-slate-700">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" /> Google
          </button>
        </form>
      )}

      {/* --- BƯỚC 2: XÁC THỰC OTP (HÌNH 2) --- */}
      {step === 2 && (
        <form onSubmit={handleVerifyOTP} className="space-y-6">
          <p className="text-sm text-slate-500 text-center px-4">Hệ thống đã gửi mã OTP gồm 6 chữ số đến email của bạn. Vui lòng kiểm tra và gõ vào ô bên dưới.</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <input key={i} type="text" maxLength="1" className="w-10 h-12 border border-slate-300 rounded-md text-center text-lg font-semibold focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d] outline-none" />
            ))}
          </div>
          <div className="text-center text-sm">
             <span className="text-red-500 font-medium flex items-center justify-center gap-1 mb-2"><span className="material-symbols-outlined text-[16px]">timer</span> 01:59</span>
             <p className="text-slate-500">Chưa nhận được mã? <button type="button" className="font-semibold text-slate-700 hover:underline">Gửi lại mã</button></p>
          </div>
          <hr className="border-slate-200" />
          <button type="button" onClick={() => setStep(1)} className="w-full flex items-center justify-center gap-2 text-sm font-bold text-[#244f4d] hover:underline">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Quay lại đăng nhập
          </button>
          {/* Nút ẩn để submit form bằng Enter */}
          <button type="submit" className="hidden">Xác nhận</button> 
        </form>
      )}

      {/* --- BƯỚC 3: NHẬP MẬT KHẨU (HÌNH 3) --- */}
      {step === 3 && (
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500 font-medium">Tài khoản</p>
              <p className="text-sm font-bold text-slate-800">{email}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Mật khẩu</label>
            <div className="relative">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu của bạn..." className="w-full border border-slate-300 rounded-md py-2.5 px-3 focus:outline-none focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d] text-sm" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                 <span className="material-symbols-outlined text-[20px]">visibility</span>
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link to="/auth/forgot-password" className="text-xs font-bold text-[#244f4d] hover:underline">Quên mật khẩu?</Link>
            </div>
          </div>
          <button type="submit" className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium hover:bg-[#1a3a38] transition">
            ĐĂNG NHẬP
          </button>
        </form>
      )}

      {/* Footer chung của trang Login */}
      {step !== 2 && (
        <div className="mt-8 text-center text-sm text-slate-600">
          Bạn chưa có tài khoản? <Link to="/auth/register" className="font-bold text-[#244f4d] hover:underline">Đăng ký tài khoản</Link>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
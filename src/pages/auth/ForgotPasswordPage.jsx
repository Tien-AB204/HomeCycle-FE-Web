import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mock data/Hàm giả lập gọi API
  const handleSendOTP = (e) => {
    e.preventDefault();
    if (email) {
      setStep(2); // Chuyển sang Hình 2 (OTP)
    }
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setStep(3); // Chuyển sang Hình 3 (New Password)
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu không khớp!");
      return;
    }
    // Chỗ này sau này gọi API thật để reset password
    console.log("Reset mật khẩu cho:", email);
    alert("Đặt lại mật khẩu thành công!");
    navigate("/auth/login"); // Quay lại login
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-[#244f4d] rounded-md flex items-center justify-center mb-4 text-white">
          <span className="material-symbols-outlined">autorenew</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">HomeCycle</h2>

        {step === 1 && (
          <p className="text-xl font-bold text-slate-800 mt-2">
            Khôi phục mật khẩu
          </p>
        )}
        {step === 2 && (
          <p className="text-xl font-bold text-slate-800 mt-2">
            Xác thực Email
          </p>
        )}
        {step === 3 && (
          <p className="text-xl font-bold text-slate-800 mt-2">
            Đặt lại mật khẩu
          </p>
        )}
      </div>

      {/* --- BƯỚC 1: NHẬP EMAIL (HÌNH 1) --- */}
      {step === 1 && (
        <form onSubmit={handleSendOTP} className="space-y-5">
          <p className="text-sm text-slate-600 text-center px-4">
            Nhập email của bạn để nhận mã OTP xác thực khôi phục tài khoản.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wide">
              ĐỊA CHỈ EMAIL
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email của bạn..."
                className="w-full border border-slate-300 rounded-md py-2.5 pl-10 pr-3 focus:outline-none focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d] text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium hover:bg-[#1a3a38] transition"
          >
            GỬI MÃ KHÔI PHỤC
          </button>

          <div className="text-center">
            <Link
              to="/auth/login"
              className="flex items-center justify-center gap-2 text-sm font-bold text-[#244f4d] hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>{" "}
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      )}

      {/* --- BƯỚC 2: XÁC THỰC OTP (HÌNH 2) --- */}
      {step === 2 && (
        <form onSubmit={handleVerifyOTP} className="space-y-6">
          <p className="text-sm text-slate-500 text-center px-4">
            Hệ thống đã gửi mã OTP gồm 6 chữ số đến email của bạn. Vui lòng kiểm
            tra và gõ vào ô bên dưới.
          </p>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <input
                key={i}
                type="text"
                maxLength="1"
                className="w-10 h-12 border border-slate-300 rounded-md text-center text-lg font-semibold focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d] outline-none"
              />
            ))}
          </div>

          <div className="text-center text-sm">
            <span className="text-red-500 font-medium flex items-center justify-center gap-1 mb-2">
              <span className="material-symbols-outlined text-[16px]">
                timer
              </span>{" "}
              01:59
            </span>
            <p className="text-slate-500">
              Chưa nhận được mã?{" "}
              <button
                type="button"
                className="font-semibold text-slate-700 hover:underline"
              >
                Gửi lại mã
              </button>
            </p>
          </div>

          <hr className="border-slate-200" />

          <button
            type="submit"
            className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium hover:bg-[#1a3a38] transition"
          >
            XÁC NHẬN
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-[#244f4d] hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>{" "}
            Quay lại
          </button>
        </form>
      )}

      {/* --- BƯỚC 3: ĐẶT LẠI MẬT KHẨU (HÌNH 3) --- */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500 font-medium">Tài khoản</p>
              <p className="text-sm font-bold text-slate-800">{email}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full border border-slate-300 rounded-md py-2.5 px-3 pr-10 focus:outline-none focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d] text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu..."
                className="w-full border border-slate-300 rounded-md py-2.5 px-3 pr-10 focus:outline-none focus:border-[#244f4d] focus:ring-1 focus:ring-[#244f4d] text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirmPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium hover:bg-[#1a3a38] transition"
          >
            ĐẶT LẠI MẬT KHẨU
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-[#244f4d] hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>{" "}
            Quay lại
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;

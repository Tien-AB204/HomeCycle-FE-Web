import { useState } from "react";
import { Link } from "react-router-dom";

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Mock data/Hàm giả lập gọi API
  const handleSendOTP = (e) => {
    e.preventDefault();
    if (email) {
      setFeedback(null);
      setStep(2); // Chuyển sang Hình 2 (OTP)
    }
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setFeedback(null);
    setStep(3); // Chuyển sang Hình 3 (New Password)
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ tone: "error", message: "Mật khẩu xác nhận không khớp." });
      return;
    }
    // Chỗ này sau này gọi API thật để reset password
    setFeedback({
      tone: "success",
      message: "Đặt lại mật khẩu thành công. Bạn có thể quay lại đăng nhập.",
    });
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6F9F]">
          Bảo mật tài khoản
        </p>
        <h2 className="mt-2 text-3xl font-black text-[#183F41]">
          {step === 1 && "Khôi phục mật khẩu"}
          {step === 2 && "Xác thực email"}
          {step === 3 && "Đặt lại mật khẩu"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#68807F]">
          {step === 1 && "Nhập email để bắt đầu quy trình khôi phục tài khoản."}
          {step === 2 && "Nhập mã xác thực đã được gửi đến email của bạn."}
          {step === 3 && "Tạo mật khẩu mới an toàn cho tài khoản HomeCycle."}
        </p>
      </div>

      {feedback && (
        <div
          role={feedback.tone === "error" ? "alert" : "status"}
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              {feedback.tone === "error" ? "error" : "check_circle"}
            </span>
            <div>
              <p>{feedback.message}</p>
              {feedback.tone === "success" && (
                <Link
                  to="/auth/login"
                  className="mt-2 inline-flex font-black text-[#285E62] underline underline-offset-2"
                >
                  Quay lại đăng nhập
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- BƯỚC 1: NHẬP EMAIL (HÌNH 1) --- */}
      {step === 1 && (
        <form onSubmit={handleSendOTP} className="space-y-5">
          <p className="rounded-xl border border-[#DCE8E5] bg-[#F5F9F8] px-4 py-3 text-sm leading-6 text-[#526E6D]">
            Nhập email của bạn để nhận mã OTP xác thực khôi phục tài khoản.
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-black tracking-wide text-[#526E6D]">
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
                className="w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] py-3 pl-10 pr-3 text-sm text-[#183436] outline-none transition focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#4F8588] py-3 font-black text-white shadow-sm transition hover:bg-[#356A70]"
          >
            GỬI MÃ KHÔI PHỤC
          </button>

          <div className="text-center">
            <Link
              to="/auth/login"
              className="flex items-center justify-center gap-2 text-sm font-bold text-[#2F6F9F] hover:underline"
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
          <p className="rounded-xl border border-[#DCE8E5] bg-[#F5F9F8] px-4 py-3 text-sm leading-6 text-[#526E6D]">
            Hệ thống đã gửi mã OTP gồm 6 chữ số đến email của bạn. Vui lòng kiểm
            tra và gõ vào ô bên dưới.
          </p>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <input
                key={i}
                type="text"
                maxLength="1"
                className="h-12 w-10 rounded-xl border border-[#CDDED9] bg-[#FBFDFC] text-center text-lg font-bold text-[#183F41] outline-none transition focus:border-[#4F8588] focus:ring-4 focus:ring-[#5F9291]/10 sm:w-12"
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
            className="w-full rounded-xl bg-[#4F8588] py-3 font-black text-white shadow-sm transition hover:bg-[#356A70]"
          >
            XÁC NHẬN
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setStep(1);
            }}
            className="flex w-full items-center justify-center gap-2 text-sm font-bold text-[#2F6F9F] hover:underline"
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
          <div className="flex items-center justify-between rounded-xl border border-[#DCE8E5] bg-[#F5F9F8] p-4">
            <div>
              <p className="text-xs font-bold text-[#68807F]">Tài khoản</p>
              <p className="text-sm font-black text-[#183F41]">{email}</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-[#526E6D]">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-3 py-3 pr-10 text-sm text-[#183436] outline-none transition focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10"
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
            <label className="mb-1.5 block text-xs font-black text-[#526E6D]">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu..."
                className="w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-3 py-3 pr-10 text-sm text-[#183436] outline-none transition focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10"
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
            disabled={feedback?.tone === "success"}
            className="w-full rounded-xl bg-[#4F8588] py-3 font-black text-white shadow-sm transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-60"
          >
            ĐẶT LẠI MẬT KHẨU
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setStep(2);
            }}
            className="flex w-full items-center justify-center gap-2 text-sm font-bold text-[#2F6F9F] hover:underline"
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
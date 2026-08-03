import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser?.role === ROLES.ADMIN) {
        navigate("/admin");
      } else if (loggedInUser?.role === ROLES.MODERATOR) {
        navigate("/mod/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert(
        error?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-[#244f4d] rounded-md flex items-center justify-center mb-4 text-white">
          <span className="material-symbols-outlined">autorenew</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">HomeCycle</h2>
        <p className="text-xl font-bold text-slate-800 mt-2">
          Đăng nhập vào tài khoản của bạn
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
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

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wide">
            MẬT KHẨU
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu của bạn..."
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
          <div className="flex justify-end mt-2">
            <Link
              to="/auth/forgot-password"
              className="text-xs font-bold text-[#244f4d] hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#244f4d] text-white py-3 rounded-md font-medium hover:bg-[#1a3a38] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
        </button>

        <div className="relative flex items-center justify-center py-2">
          <hr className="w-full border-slate-200" />
          <span className="absolute bg-white px-3 text-xs text-slate-400 font-medium">
            HOẶC TIẾP TỤC VỚI
          </span>
        </div>

        <button
          type="button"
          className="w-full border border-slate-300 rounded-md py-2.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm font-medium text-slate-700"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-4 h-4"
          />
          Google
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-600">
        Bạn chưa có tài khoản?{" "}
        <Link
          to="/auth/register"
          className="font-bold text-[#244f4d] hover:underline"
        >
          Đăng ký tài khoản
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;

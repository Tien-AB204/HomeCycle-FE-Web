import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getHomePathByRole } from "../../utils/authUtils";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);
  const [loading, setLoading] =
    useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const loggedInUser =
        await login(email, password);

      navigate(
        getHomePathByRole(
          loggedInUser?.role,
        ),
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "Lỗi đăng nhập:",
        error,
      );

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error
          ?.message ||
        error?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.";

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-[#244f4d] text-white">
          <span className="material-symbols-outlined">
            autorenew
          </span>
        </div>

        <h2 className="text-2xl font-bold text-slate-800">
          HomeCycle
        </h2>

        <p className="mt-2 text-xl font-bold text-slate-800">
          Đăng nhập vào tài khoản của bạn
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="login-email"
            className="mb-1 block text-xs font-bold tracking-wide text-slate-500"
          >
            ĐỊA CHỈ EMAIL
          </label>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
              mail
            </span>

            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="Nhập địa chỉ email của bạn..."
              className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-[#244f4d] focus:outline-none focus:ring-1 focus:ring-[#244f4d]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1 block text-xs font-bold tracking-wide text-slate-500"
          >
            MẬT KHẨU
          </label>

          <div className="relative">
            <input
              id="login-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Nhập mật khẩu của bạn..."
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 pr-10 text-sm focus:border-[#244f4d] focus:outline-none focus:ring-1 focus:ring-[#244f4d]"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (currentValue) =>
                    !currentValue,
                )
              }
              aria-label={
                showPassword
                  ? "Ẩn mật khẩu"
                  : "Hiện mật khẩu"
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword
                  ? "visibility"
                  : "visibility_off"}
              </span>
            </button>
          </div>

          <div className="mt-2 flex justify-end">
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
          className="w-full rounded-md bg-[#244f4d] py-3 font-medium text-white transition hover:bg-[#1a3a38] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "ĐANG ĐĂNG NHẬP..."
            : "ĐĂNG NHẬP"}
        </button>

        <div className="relative flex items-center justify-center py-2">
          <hr className="w-full border-slate-200" />

          <span className="absolute bg-white px-3 text-xs font-medium text-slate-400">
            HOẶC TIẾP TỤC VỚI
          </span>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt=""
            className="h-4 w-4"
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
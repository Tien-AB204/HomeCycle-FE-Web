import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getHomePathByRole } from "../../utils/authUtils";

const getSafeReturnPath = (from) => {
  let returnPath = "";

  if (typeof from === "string") {
    returnPath = from;
  } else if (from && typeof from === "object") {
    returnPath = `${from.pathname || ""}${from.search || ""}${from.hash || ""}`;
  }

  if (
    !returnPath.startsWith("/") ||
    returnPath.startsWith("//") ||
    returnPath.startsWith("/auth/")
  ) {
    return "";
  }

  return returnPath;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const returnPath = getSafeReturnPath(location.state?.from);

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
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const loggedInUser =
        await login(email, password);

      navigate(
        returnPath ||
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

      const status = error?.response?.status;
      const nextErrorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error
          ?.message ||
        error?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.";

      if (error?.response && Number(status) < 500) {
        setErrorMessage(nextErrorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6F9F]">
          Chào mừng trở lại
        </p>
        <h2 className="mt-2 text-3xl font-black text-[#183F41]">
          Đăng nhập vào tài khoản của bạn
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#68807F]">
          Tiếp tục quản lý tin đăng, thương lượng và các giao dịch của bạn.
        </p>

        {returnPath && (
          <p className="mt-4 rounded-xl border border-[#B9D3CF] bg-[#EEF6F4] px-4 py-3 text-sm font-medium text-[#315F63]">
            Vui lòng đăng nhập để tiếp tục thao tác bạn vừa chọn.
          </p>
        )}
      </div>

      <form
        onSubmit={handleLogin}
        className="space-y-5"
      >
        {errorMessage && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
            <p className="leading-5">{errorMessage}</p>
          </div>
        )}
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-xs font-black tracking-wide text-[#526E6D]"
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
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage("");
              }}
              placeholder="Nhập địa chỉ email của bạn..."
              className="w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] py-3 pl-10 pr-3 text-sm text-[#183436] outline-none transition focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-xs font-black tracking-wide text-[#526E6D]"
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
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage("");
              }}
              placeholder="Nhập mật khẩu của bạn..."
              className="w-full rounded-xl border border-[#CDDED9] bg-[#FBFDFC] px-3 py-3 pr-10 text-sm text-[#183436] outline-none transition focus:border-[#4F8588] focus:bg-white focus:ring-4 focus:ring-[#5F9291]/10"
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
              className="text-xs font-bold text-[#2F6F9F] hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#4F8588] py-3 font-black text-white shadow-sm transition hover:bg-[#356A70] disabled:cursor-not-allowed disabled:opacity-60"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#9FBFBA] bg-white py-3 text-sm font-bold text-[#285E62] transition hover:bg-[#F1F7F5]"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt=""
            className="h-4 w-4"
          />
          Google
        </button>
      </form>

      <div className="mt-7 border-t border-[#E2ECE9] pt-5 text-center text-sm text-[#68807F]">
        Bạn chưa có tài khoản?{" "}
        <Link
          to="/auth/register"
          className="font-bold text-[#2F6F9F] hover:underline"
        >
          Đăng ký tài khoản
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;

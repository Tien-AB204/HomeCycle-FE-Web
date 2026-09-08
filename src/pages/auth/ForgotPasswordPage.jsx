import { Link } from "react-router-dom";

const ForgotPasswordPage = () => {
  return (
    <div className="w-full animate-fade-in">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
          Bảo mật tài khoản
        </p>

        <h2 className="mt-2 text-3xl font-black text-text">
          Khôi phục mật khẩu
        </h2>

        <p className="mt-2 text-sm leading-6 text-textLight">
          Tính năng khôi phục mật khẩu hiện chưa khả dụng trên hệ thống Web.
        </p>
      </div>

      <div
        role="status"
        className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-sm text-text"
      >
        <div className="flex items-start gap-3">
          <span
            className="material-symbols-outlined mt-0.5 text-warning"
            aria-hidden="true"
          >
            info
          </span>

          <div>
            <p className="font-bold">
              Chưa thể đặt lại mật khẩu tại đây.
            </p>

            <p className="mt-1 leading-6 text-textLight">
              Vui lòng quay lại trang đăng nhập. Chức năng này sẽ được bật khi
              luồng khôi phục tài khoản được kết nối đầy đủ.
            </p>
          </div>
        </div>
      </div>

      <Link
        to="/auth/login"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-black text-white shadow-sm transition hover:bg-primary/90"
      >
        <span
          className="material-symbols-outlined text-[18px]"
          aria-hidden="true"
        >
          arrow_back
        </span>
        QUAY LẠI ĐĂNG NHẬP
      </Link>
    </div>
  );
};

export default ForgotPasswordPage;
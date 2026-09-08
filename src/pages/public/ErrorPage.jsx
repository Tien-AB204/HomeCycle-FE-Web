import { Link, useLocation, useNavigate } from "react-router-dom";
import homeCycleMark from "../../assets/brand/homecycle-mark.png";

const ERROR_CONTENT = {
  0: {
    eyebrow: "MẤT KẾT NỐI",
    title: "Chưa thể kết nối đến máy chủ",
    description: "Vui lòng kiểm tra kết nối mạng hoặc thử lại sau ít phút.",
    icon: "cloud_off",
  },
  404: {
    eyebrow: "KHÔNG TÌM THẤY",
    title: "Trang bạn tìm không tồn tại",
    description: "Đường dẫn có thể đã thay đổi hoặc nội dung không còn khả dụng.",
    icon: "search_off",
  },
  500: {
    eyebrow: "LỖI HỆ THỐNG",
    title: "HomeCycle đang gặp một chút sự cố",
    description: "Yêu cầu chưa thể hoàn tất. Dữ liệu của bạn vẫn được giữ an toàn, vui lòng thử lại sau.",
    icon: "error",
  },
};

export default function ErrorPage({ notFound = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const status = notFound ? 404 : Number(location.state?.status) || 500;
  const content = ERROR_CONTENT[status] || ERROR_CONTENT[500];
  const referenceCode = location.state?.code;
  const detailMessage = location.state?.message || content.description;
  const returnTo = location.state?.returnTo;
  const handleRetry = () => {
    if (typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      window.location.assign(returnTo);
      return;
    }

    window.location.reload();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <section className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-white shadow-[0_24px_70px_rgba(23,40,48,0.12)]">
        <div className="h-2 bg-primary" />
        <div className="px-6 py-9 text-center sm:px-12 sm:py-12">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src={homeCycleMark} alt="" className="h-10 w-10 rounded-xl" />
            <span className="text-xl font-black text-text">HomeCycle</span>
          </Link>

          <span className="material-symbols-outlined mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-[42px] text-primary">
            {content.icon}
          </span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-textLight">{content.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black text-text sm:text-3xl">{content.title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-textLight">{detailMessage}</p>

          {referenceCode && (
            <p className="mt-4 text-xs text-textLight">Mã tham chiếu: <strong>{referenceCode}</strong></p>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-black text-primary transition hover:bg-primary/10"
            >
              <span className="material-symbols-outlined text-[19px]">arrow_back</span>
              Quay lại
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[19px]">refresh</span>
              Thử lại
            </button>
            <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary/90">
              Về trang chủ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

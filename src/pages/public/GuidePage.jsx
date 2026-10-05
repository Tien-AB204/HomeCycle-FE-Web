import { useState } from "react";
import { Link } from "react-router-dom";
import OnboardingGuideModal from "../../components/shared/OnboardingGuideModal";
import { GUIDE_FAQ } from "../../constants/onboardingGuide";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";

const GuidePage = () => {
  const { user } = useAuth();
  const role = user?.role === ROLES.BUSINESS ? "business" : "personal";
  const [isIntroOpen, setIsIntroOpen] = useState(false);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-14 pt-7 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Trợ giúp</p>
        <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">Hướng dẫn sử dụng</h1>
      </header>

      <button
        type="button"
        onClick={() => setIsIntroOpen(true)}
        className="mt-5 flex w-full items-center gap-4 rounded-xl bg-primary px-5 py-4 text-left text-white shadow-[0_8px_24px_rgba(23,40,48,0.10)] transition hover:bg-primary/90"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }} aria-hidden="true">play_arrow</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-black">Xem lại giới thiệu</span>
          <span className="mt-0.5 block text-sm text-white/80">
            {role === "business"
              ? "4 bước thu mua đồ cũ trên HomeCycle"
              : "4 bước mua bán đồ cũ trên HomeCycle"}
          </span>
        </span>
        <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </button>

      <h2 className="mt-8 text-lg font-black text-text">Câu hỏi thường gặp</h2>

      <div className="mt-3 space-y-4">
        {GUIDE_FAQ.map((section) => (
          <article key={section.key} className="rounded-xl border border-border bg-white">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }} aria-hidden="true">
                {section.icon}
              </span>
              <h3 className="font-black text-text">{section.title}</h3>
            </div>
            {section.items.map((item) => (
              <details key={item.question} className="group border-b border-border/60 px-5 py-3 last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-text">
                  {item.question}
                  <span
                    className="material-symbols-outlined text-textLight transition group-open:rotate-180"
                    style={{ fontSize: 20 }}
                    aria-hidden="true"
                  >
                    expand_more
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-textLight">{item.answer}</p>
              </details>
            ))}
          </article>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-textLight">
        Xem đầy đủ quy định tại trang{" "}
        <Link to="/chinh-sach" className="font-bold text-primary hover:underline">
          Quy định & Chính sách
        </Link>
        .
      </p>

      <OnboardingGuideModal open={isIntroOpen} role={role} onClose={() => setIsIntroOpen(false)} />
    </section>
  );
};

export default GuidePage;

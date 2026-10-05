import { Link } from "react-router-dom";
import {
  POLICY_INTRO,
  POLICY_SECTIONS,
  POLICY_UPDATED_AT,
} from "../../constants/platformPolicy";

const PolicyList = ({ items }) => (
  <ul className="mt-3 space-y-2.5">
    {items.map((item) => (
      <li key={item.text} className="flex gap-2.5 text-sm leading-6 text-text">
        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <p>
          {item.label && <strong className="font-bold">{item.label}: </strong>}
          {item.text}
        </p>
      </li>
    ))}
  </ul>
);

const PolicyPage = () => (
  <section className="mx-auto w-full max-w-4xl px-4 pb-14 pt-7 sm:px-6">
    <header className="border-b border-border pb-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Quy định & Chính sách</p>
      <h1 className="mt-1 text-2xl font-black text-text sm:text-3xl">
        Quy định & Chính sách Nền tảng HomeCycle
      </h1>
      <p className="mt-3 text-sm leading-6 text-textLight">{POLICY_INTRO}</p>
    </header>

    <nav aria-label="Mục lục" className="mt-5 flex flex-wrap gap-2">
      {POLICY_SECTIONS.map((section) => (
        <a
          key={section.key}
          href={`#${section.key}`}
          className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10"
        >
          {section.title.replace(/^\d+\.\s*/, "")}
        </a>
      ))}
    </nav>

    <div className="mt-5 space-y-4">
      {POLICY_SECTIONS.map((section) => (
        <article
          key={section.key}
          id={section.key}
          className="scroll-mt-24 rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(23,40,48,0.04)]"
        >
          <h2 className="text-base font-black text-text">{section.title}</h2>
          {section.intro && <p className="mt-2 text-sm leading-6 text-text">{section.intro}</p>}
          <PolicyList items={section.items} />
          {section.subheading && (
            <p className="mt-4 text-sm font-bold text-text">{section.subheading}</p>
          )}
          {section.subItems && <PolicyList items={section.subItems} />}
        </article>
      ))}
    </div>

    <p className="mt-6 text-center text-xs text-textLight">
      Cập nhật lần cuối: {POLICY_UPDATED_AT} ·{" "}
      <Link to="/huong-dan" className="font-bold text-primary hover:underline">
        Xem hướng dẫn sử dụng
      </Link>
    </p>
  </section>
);

export default PolicyPage;

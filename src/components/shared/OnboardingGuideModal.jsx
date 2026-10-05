import { Modal } from "antd";
import { useState } from "react";
import { GUIDE_SLIDES } from "../../constants/onboardingGuide";

/*
 * Giới thiệu từng bước theo vai trò. Mỗi lần mở lại bắt đầu từ bước đầu
 * (component được mount lại khi mở).
 */
const OnboardingGuideSteps = ({ role, onClose }) => {
  const slides = GUIDE_SLIDES[role] || GUIDE_SLIDES.personal;
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className="px-1 pt-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold text-textLight transition hover:text-primary"
        >
          Bỏ qua
        </button>
      </div>

      <div className="mt-2 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 40 }} aria-hidden="true">
            {slide.icon}
          </span>
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-primary">
          Bước {index + 1}/{slides.length}
        </p>
        <h2 className="mt-1 text-xl font-black text-text">{slide.title}</h2>
        <p className="mt-2 text-sm leading-6 text-textLight">{slide.description}</p>
      </div>

      <ul className="mt-4 space-y-2 rounded-xl bg-background p-4">
        {slide.points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-sm leading-6 text-text">
            <span className="material-symbols-outlined mt-0.5 text-success" style={{ fontSize: 18 }} aria-hidden="true">
              check_circle
            </span>
            {point}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
        {slides.map((item, dotIndex) => (
          <span
            key={item.key}
            className={`h-2 rounded-full transition-all ${dotIndex === index ? "w-6 bg-primary" : "w-2 bg-border"}`}
          />
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10"
          >
            Quay lại
          </button>
        )}
        <button
          type="button"
          onClick={() => (isLast ? onClose() : setIndex(index + 1))}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary/90"
        >
          {isLast ? "Bắt đầu" : "Tiếp tục"}
        </button>
      </div>
    </div>
  );
};

export default function OnboardingGuideModal({ open, role, onClose }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={440}
      destroyOnHidden
      mask={{ closable: false }}
    >
      {open && <OnboardingGuideSteps role={role} onClose={onClose} />}
    </Modal>
  );
}

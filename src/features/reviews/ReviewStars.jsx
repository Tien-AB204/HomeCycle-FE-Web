const STAR_VALUES = [1, 2, 3, 4, 5];

const ReviewStars = ({
  value = 0,
  onChange,
  size = "text-2xl",
  label = "Số sao đánh giá",
}) => {
  const interactive = typeof onChange === "function";

  return (
    <div
      className="flex items-center gap-0.5"
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? label : `${Number(value || 0)}/5 sao`}
    >
      {STAR_VALUES.map((star) => {
        const active = star <= Number(value || 0);

        if (!interactive) {
          return (
            <span
              key={star}
              className={`material-symbols-outlined ${size} ${
                active ? "text-amber-400" : "text-[#C8D7D3]"
              }`}
              aria-hidden="true"
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              star
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={Number(value) === star}
            aria-label={`${star} sao`}
            onClick={() => onChange(star)}
            className={`material-symbols-outlined ${size} rounded transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F9F] ${
              active ? "text-amber-400" : "text-[#C8D7D3] hover:text-amber-300"
            }`}
            style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </button>
        );
      })}
    </div>
  );
};

export default ReviewStars;
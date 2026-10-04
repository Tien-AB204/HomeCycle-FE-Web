import { useLayoutEffect, useRef } from "react";

/*
 * Khung cuộn ngang cho biểu đồ theo thời gian: mốc mới nhất nằm bên phải nên
 * tự kéo về cuối mỗi khi dữ liệu (scrollKey) thay đổi.
 */
export default function ChartScrollArea({ scrollKey, className = "", children }) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (container) {
      container.scrollLeft = container.scrollWidth;
    }
  }, [scrollKey]);

  return (
    <div ref={containerRef} className={`overflow-x-auto ${className}`.trim()}>
      {children}
    </div>
  );
}

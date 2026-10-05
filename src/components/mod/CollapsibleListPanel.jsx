import { useEffect, useRef, useState } from "react";

/*
 * Cột danh sách bên trái của các trang kiểm duyệt (danh sách + chi tiết):
 * kéo mép phải để đổi độ rộng, hoặc thu gọn thành dải hẹp chỉ còn biểu tượng
 * và số mục để phần chi tiết rộng hơn.
 *
 * children là hàm nhận { collapseButton } để trang tự đặt nút thu gọn vào
 * phần đầu danh sách của mình.
 */
export default function CollapsibleListPanel({
  collapsed,
  onCollapsedChange,
  title,
  icon,
  count,
  defaultWidth = 380,
  minWidth = 300,
  maxWidth = 600,
  className = "bg-white",
  children,
}) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeSessionRef = useRef(null);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (event) => {
      const session = resizeSessionRef.current;
      if (!session) return;
      const next = session.startWidth + event.clientX - session.startX;
      setWidth(Math.min(maxWidth, Math.max(minWidth, next)));
    };

    const handleMouseUp = () => {
      resizeSessionRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, maxWidth, minWidth]);

  const hasCount = count !== null && count !== undefined;

  if (collapsed) {
    return (
      <aside className="flex w-[52px] shrink-0 flex-col items-center gap-3 border-r border-border bg-background/60 pb-4 pt-14">
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          aria-label={`Mở danh sách ${title.toLocaleLowerCase("vi-VN")}`}
          title="Mở danh sách"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-textLight transition hover:border-primary/40 hover:text-primary"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            chevron_right
          </span>
        </button>
        {/* Không dùng chữ dọc: biểu tượng + số, tên đầy đủ hiện khi rê chuột. */}
        <div
          className="flex flex-col items-center gap-1 text-textLight"
          title={title}
          aria-label={hasCount ? `${count} mục · ${title}` : title}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {icon}
          </span>
          {hasCount && (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
              {count}
            </span>
          )}
        </div>
      </aside>
    );
  }

  const collapseButton = (
    <button
      type="button"
      onClick={() => onCollapsedChange(true)}
      aria-label={`Thu gọn danh sách ${title.toLocaleLowerCase("vi-VN")}`}
      title="Thu gọn danh sách"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-textLight transition hover:bg-background hover:text-primary"
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        chevron_left
      </span>
    </button>
  );

  return (
    <section
      style={{ width: `${width}px` }}
      className={`relative flex min-h-0 shrink-0 select-none flex-col border-r border-border ${className}`}
    >
      {children({ collapseButton })}
      <div
        onMouseDown={(event) => {
          event.preventDefault();
          resizeSessionRef.current = { startX: event.clientX, startWidth: width };
          setIsResizing(true);
        }}
        role="separator"
        aria-orientation="vertical"
        aria-label={`Thay đổi độ rộng danh sách ${title.toLocaleLowerCase("vi-VN")}`}
        title="Kéo để thay đổi độ rộng danh sách"
        className={`absolute right-0 top-0 z-20 h-full w-1.5 cursor-col-resize transition-colors ${
          isResizing ? "bg-success" : "bg-transparent hover:bg-success"
        }`}
      />
    </section>
  );
}

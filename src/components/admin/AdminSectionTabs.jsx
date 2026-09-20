import { NavLink, useLocation } from "react-router-dom";
import { isPathMatch } from "../../utils/pathMatch";

export default function AdminSectionTabs({ items, ariaLabel }) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-1.5 shadow-[0_10px_28px_rgba(24,63,65,0.04)]"
    >
      {items.map((item) => {
        const active = isPathMatch(pathname, item.path, item.exact);

        return (
          <NavLink
            key={item.path}
            to={item.path}
            aria-current={active ? "page" : undefined}
            className={[
              "rounded-xl px-4 py-2 text-sm font-black transition",
              active
                ? "bg-primary text-white shadow-sm"
                : "text-textLight hover:bg-background hover:text-text",
            ].join(" ")}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

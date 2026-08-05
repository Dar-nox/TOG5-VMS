import { NavLink, useLocation } from "react-router";
import { cn } from "../../lib/cn";
import { isActivePath, navigationItems } from "../../types/navigation";
import { ChevronRightIcon } from "../ui/icons";
import { AccountBlock } from "./AccountBlock";

/**
 * The desktop navigation.
 *
 * Collapses to an icon rail, but only because somebody asked it to. The old
 * layout collapsed on its own at 1120px of *viewport*, which on a 1366px
 * laptop at Windows' common 125% scaling meant the default experience was
 * already the rail — with 58px of room for a label, no wrapping rule, and
 * "Settings" spilling over the page beside it.
 *
 * It also scrolls and sticks. The old sidebar was `min-height: 100vh` with no
 * overflow and nothing sticky, so at high zoom the navigation scrolled away
 * with the page and could not be reached without scrolling back.
 */
export function SideNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <div
      className={cn(
        "sticky top-0 flex h-dvh flex-col gap-4 overflow-y-auto",
        "border-r border-navy-800 bg-navy-900 p-3 text-inverse",
        collapsed ? "w-[5.25rem]" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-3 px-1 py-2", collapsed && "justify-center")}>
        <img alt="" className="size-9 shrink-0 rounded-md" src="/icon-192.png" />
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="text-2xs font-semibold tracking-widest text-gold-400 uppercase">TOG 5</p>
            <p className="truncate text-sm font-semibold">Vehicle Care</p>
          </div>
        )}
      </div>

      <nav aria-label="Sections" className="flex flex-1 flex-col gap-1">
        {navigationItems.map((item) => {
          const active = isActivePath(item, pathname);
          const Icon = item.icon;

          return (
            <NavLink
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold",
                "transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-navy-700 text-gold-400"
                  : "text-ink-200 hover:bg-navy-800 hover:text-inverse",
              )}
              key={item.path}
              title={collapsed ? item.label : undefined}
              to={item.path}
            >
              <Icon className="shrink-0" />
              {/* Kept in the accessibility tree when collapsed rather than
                  removed, so the rail is still navigable by screen reader. */}
              <span className={cn(collapsed && "sr-only")}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <AccountBlock collapsed={collapsed} />

      <button
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold",
          "text-ink-300 hover:bg-navy-800 hover:text-inverse",
          collapsed && "justify-center px-2",
        )}
        onClick={onToggle}
        type="button"
      >
        <ChevronRightIcon className={cn("transition-transform", !collapsed && "rotate-180")} />
        {collapsed ? null : <span>Collapse</span>}
      </button>
    </div>
  );
}

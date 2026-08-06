import { NavLink, useLocation } from "react-router";
import { cn } from "../../lib/cn";
import { isActivePath, navigationItems } from "../../types/navigation";

/**
 * The phone's navigation.
 *
 * Five fixed destinations across the bottom, in reach of a thumb. What it
 * replaces was the whole of the mobile design: a horizontally scrolling strip
 * roughly 1,138px wide holding eleven items, pinned above every page, with no
 * fade, arrows or snapping — so eight of the eleven were off-screen with
 * nothing to suggest they existed.
 */
export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "sticky bottom-0 z-(--z-sticky) grid grid-cols-5 border-t border-border bg-surface",
        // Clears the home indicator on phones that have one.
        "pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden",
      )}
    >
      {navigationItems.map((item) => {
        const active = isActivePath(item, pathname);
        const Icon = item.icon;

        return (
          <NavLink
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2",
              "text-2xs font-semibold",
              active ? "text-heading" : "text-muted",
            )}
            key={item.path}
            to={item.path}
          >
            <Icon className={cn("size-6", active && "text-gold-600")} />
            {/* Always labelled. An icon alone is a guess for anyone who has
                not used the app before, which is most of the people it is
                being built for. */}
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * One card recipe.
 *
 * The border/radius/background/shadow combination was written out nine times
 * across roughly fifty selectors in the old stylesheet, and then the shadow
 * was cancelled again in nineteen places — a fair sign the grouping had stopped
 * meaning anything.
 *
 * Every card is a container, so what is inside can lay itself out according to
 * the space the card actually has rather than the width of the window.
 */
export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "@container min-w-0 rounded-md border border-border bg-surface shadow-card",
        padded && "p-4 @md:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * A card's heading and its actions.
 *
 * Deliberately has no place for a paragraph of explanation. Every panel in the
 * old interface carried one under its title — and the page carried another
 * above it, so each screen explained itself twice before showing anything.
 */
export function CardHeader({
  title,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-col gap-3 @sm:flex-row @sm:items-start", className)}>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-heading">{title}</h2>
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * A labelled value.
 *
 * Measured values are set in the mono face, where both Plex faces share a
 * 600-unit digit — so figures line up down a column and a long amount wraps
 * inside its own cell instead of painting over the next one. That last part is
 * the fix for the reported overlapping: the old summary cards put a currency
 * string in a ~60px box with no way to break it.
 */
export function Stat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "muted";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      <span
        className={cn(
          "tabular text-lg leading-tight font-semibold break-words",
          tone === "muted" ? "text-muted" : "text-heading",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * A row of stats that reflows on the width of its container.
 *
 * `auto-fit` with a floor rather than a fixed column count: the old Reports
 * summary was `repeat(6, 1fr)` and did not collapse until the viewport hit
 * 760px, so on a tablet it produced six ~89px cards each holding a full peso
 * amount.
 */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

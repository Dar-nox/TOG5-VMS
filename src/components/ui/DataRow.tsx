import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * One record in a list.
 *
 * Replaces fifteen hand-written variants of the same thing — `.fuel-log-card`,
 * `.expense-card`, `.trip-card`, `.service-history-card` and the rest — whose
 * grid definitions had drifted to four different minimum widths and four
 * different fractions with no reason behind any of them.
 *
 * The meta values are the part that used to break. A row packed seven or eight
 * labelled figures into a fixed sidebar column, and a currency string cannot
 * be broken across lines, so it painted over its neighbour. Here they are a
 * wrapping list with a floor, and every figure is free to wrap inside its own
 * cell.
 */
export function DataRow({
  media,
  title,
  subtitle,
  meta,
  actions,
  onClick,
  openLabel,
  className,
}: {
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Makes the whole row activate. Renders real buttons, never a clickable div. */
  onClick?: () => void;
  /**
   * What activating the row does, for anyone not seeing it. Name the record —
   * a list of twenty rows all called "Open" tells a screen-reader user
   * nothing.
   */
  openLabel?: string;
  className?: string;
}) {
  const body = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {media ? <div className="shrink-0">{media}</div> : null}

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold break-words text-heading">{title}</div>
        {subtitle ? <div className="mt-0.5 text-xs text-muted">{subtitle}</div> : null}
        {meta ? <MetaList>{meta}</MetaList> : null}
      </div>
    </div>
  );

  // Actions sit beside the content only once the row is wide enough to hold
  // both. Below that they go underneath, full width. Keeping them alongside was
  // the phone bug: three `shrink-0` buttons claimed most of a 360px row, the
  // title was left a couple of words per line, and anything that could not be
  // broken — a long item name, a currency amount — painted under the buttons.
  const shell = cn(
    "@container flex w-full min-w-0 flex-col gap-3 rounded-md border border-border",
    "bg-surface p-3 text-left @md:flex-row @md:items-start @md:p-4",
    className,
  );

  const actionRow = cn("flex flex-wrap gap-2", "@md:shrink-0");

  if (onClick) {
    return (
      <div className={cn(shell, "relative")}>
        {body}
        {actions ? <div className={cn(actionRow, "relative z-1")}>{actions}</div> : null}
        {/* Covers the row so the whole thing is one target, while the action
            buttons stay above it and separately clickable. */}
        <button className="absolute inset-0 rounded-md" onClick={onClick} type="button">
          <span className="sr-only">{openLabel ?? "Open"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={shell}>
      {body}
      {actions ? <div className={actionRow}>{actions}</div> : null}
    </div>
  );
}

/** The wrapping strip of labelled figures under a row's title. */
export function MetaList({ children }: { children: ReactNode }) {
  return (
    <dl className="mt-2 grid gap-x-4 gap-y-2 [grid-template-columns:repeat(auto-fit,minmax(7rem,1fr))]">
      {children}
    </dl>
  );
}

/**
 * One labelled figure. `numeric` sets it in the mono face, which is what makes
 * a column of amounts line up.
 */
export function MetaItem({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className={cn("text-sm break-words text-ink", numeric && "tabular")}>{value}</dd>
    </div>
  );
}

/** A vertical list of rows, at a consistent rhythm. */
export function DataList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3", className)}>{children}</div>;
}

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Replaces seven parallel pill implementations — `.status-pill`,
 * `.priority-pill`, `.schedule-status-pill`, `.maintenance-category` and three
 * more — which had drifted far enough that `.priority-pill` was being used to
 * display a money amount and `.maintenance-category` to display a date.
 *
 * The meanings are fixed by specs/05 and the colour never carries them alone:
 * a badge always has words in it.
 */
export type BadgeTone = "ok" | "due" | "overdue" | "info" | "archived" | "neutral";

const TONES: Record<BadgeTone, string> = {
  ok: "bg-ok-surface text-ok border-ok-line",
  due: "bg-due-surface text-due border-due-line",
  overdue: "bg-overdue-surface text-overdue border-overdue-line",
  info: "bg-info-surface text-info border-info-line",
  archived: "bg-archived-surface text-archived border-archived-line",
  neutral: "bg-surface-sunken text-muted border-border",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-xs font-semibold",
        // A long status must wrap inside its own pill rather than push the row
        // it sits in sideways.
        "max-w-full break-words",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

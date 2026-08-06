import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { AlertIcon } from "./icons";

/**
 * Nothing here yet.
 *
 * There were nine different treatments of this, one of them a class called
 * `.maintenance-empty-note` used by eight modules including several with
 * nothing to do with maintenance. Several were paragraphs explaining the
 * feature rather than offering the action.
 *
 * An empty screen gets one short line and, where there is something to do, a
 * button that does it. Not an essay about what would appear here.
 */
export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-md border border-dashed border-border",
        "bg-surface-sunken/50 px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted">{title}</p>
      {action}
    </div>
  );
}

/**
 * Something went wrong.
 *
 * Replaces five variants: a full-width block, the same block with a `compact`
 * modifier that was never defined for it, a version holding one span per
 * issue, a `role="alert"` summary used only on Vehicles, and a whole-page card
 * with a retry button used only on the Dashboard.
 */
export function ErrorBlock({
  message,
  action,
  className,
}: {
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-overdue-line bg-overdue-surface p-4",
        "@sm:flex-row @sm:items-center",
        className,
      )}
      role="alert"
    >
      <AlertIcon className="text-overdue" />
      <p className="min-w-0 flex-1 text-sm font-semibold text-overdue">{message}</p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Several problems with one form.
 *
 * A summary, never the only place a problem is named — each field shows its
 * own error too. This exists so a long form does not require hunting.
 */
export function ErrorSummary({ issues, className }: { issues: string[]; className?: string }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("rounded-md border border-overdue-line bg-overdue-surface p-4", className)}
      role="alert"
    >
      <p className="text-sm font-semibold text-overdue">
        {issues.length === 1
          ? "Check this before saving"
          : `Check these ${issues.length} things before saving`}
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-overdue">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}

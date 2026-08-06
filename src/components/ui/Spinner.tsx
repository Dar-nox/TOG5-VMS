import { cn } from "../../lib/cn";

/**
 * The app previously had no spinner at all. Every loading state was a
 * sentence in a box — six different sentences, in five different classes —
 * and every button turned its label into a gerund, which changes the button's
 * width and makes the layout jump at the exact moment somebody is waiting.
 */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        aria-hidden="true"
        className="size-[1.15em] animate-spin"
        // Kept moving under prefers-reduced-motion: a frozen spinner reads as
        // "finished", which is the opposite of what it is there to say.
        data-motion="essential"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}

/**
 * A placeholder shaped like the thing that is coming, for lists and cards.
 * Better than a sentence because the page does not reflow when the data
 * lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse rounded-sm bg-surface-sunken", className)}
      data-motion="essential"
    />
  );
}

/** A whole panel's worth, while its contents load. */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-md border border-border bg-surface p-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="mt-3 h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}

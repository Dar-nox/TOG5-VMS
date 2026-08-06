import { useId, useState } from "react";
import { cn } from "../../lib/cn";
import { HelpIcon } from "./icons";
import { explanationFor } from "./helpTerms";

/**
 * A word with an explanation available on request.
 *
 * Deliberately expands in place rather than floating above the page. A
 * floating panel needs a top layer, and anything positioned inside a card can
 * be clipped by the card's own overflow — which is precisely the family of bug
 * this overhaul exists to remove. Pushing the content down a little is
 * predictable everywhere, needs no stacking rules, and works in any browser
 * the client's phones might be running.
 *
 * If the term has no entry it renders as plain text, so a typo produces a word
 * rather than a broken control.
 */
export function HelpTerm({
  term,
  children,
  className,
}: {
  term: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const explanation = explanationFor(term);
  const label = children ?? term;

  if (!explanation) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <button
        aria-controls={id}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm text-left",
          "underline decoration-dotted underline-offset-4",
          "hover:text-heading",
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{label}</span>
        <HelpIcon className="text-muted" />
        <span className="sr-only">{open ? "Hide explanation" : "What this means"}</span>
      </button>

      {open ? (
        <span
          className="block rounded-md border border-info-line bg-info-surface p-3 text-xs text-info"
          id={id}
        >
          {explanation}
        </span>
      ) : null}
    </span>
  );
}

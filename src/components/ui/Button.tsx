import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";

/**
 * Replaces three button classes spread across ten action-row classes, all of
 * which were `display: flex; justify-content: flex-end; gap: 10px`.
 *
 * `variant` says what the button means, not what it looks like. Gold is the
 * accent and marks the one action a screen is for; a second gold button on a
 * screen means one of them is not really primary.
 */
export type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** React 19 passes `ref` as an ordinary prop, so no forwardRef is needed. */
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  /** Shows a spinner and blocks input without changing the label or width. */
  loading?: boolean;
  /** Fills the row. Used on phones, where a half-width button is a small target. */
  block?: boolean;
  icon?: ReactNode;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-gold-500 text-heading hover:bg-gold-400 active:bg-gold-600 border-transparent",
  secondary: "bg-surface text-ink border-border-strong hover:bg-surface-sunken",
  danger: "bg-danger text-inverse hover:bg-danger-hover border-transparent",
  quiet: "bg-transparent text-muted border-transparent hover:bg-surface-sunken hover:text-ink",
};

export function Button({
  variant = "secondary",
  loading = false,
  block = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      // Deliberately still focusable while loading, so focus is not thrown to
      // the top of the document mid-action.
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-md border",
        "px-4 py-2.5 text-sm font-semibold whitespace-nowrap",
        "transition-colors duration-150",
        // 0.62 opacity was the old disabled treatment and dropped secondary
        // buttons to 3.2:1. This keeps the text legible and says "unavailable"
        // with the cursor and the missing hover instead.
        "disabled:cursor-not-allowed disabled:opacity-70",
        VARIANTS[variant],
        block && "w-full",
        className,
      )}
      disabled={disabled || loading}
    >
      {loading ? <Spinner className="absolute" /> : null}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
        {icon}
        {children}
      </span>
    </button>
  );
}

/**
 * The row a form's buttons sit in.
 *
 * Reverses on a phone so the primary action is nearest the thumb, and stacks
 * rather than letting two buttons overflow the card — the old `.form-actions`
 * only reversed below 760px, so a tablet kept them side by side and they ran
 * off the edge.
 */
export function ButtonRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "@container flex flex-col-reverse gap-3",
        "@sm:flex-row @sm:justify-end @sm:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

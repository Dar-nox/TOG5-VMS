/**
 * Form controls.
 *
 * Replaces roughly sixty hand-written `<label className="form-field">` blocks
 * and four incompatible ways of showing that something was wrong: per-field
 * errors on Vehicles only, a list at the bottom of the form on four modules, a
 * single server-supplied string on Trips, and the browser's own tooltip
 * wherever a bare `required` attribute was used.
 *
 * Here the error always appears against the field it belongs to, is announced,
 * and marks the control invalid. A form may still summarise, but the summary
 * is never the only place the problem is named.
 *
 * Every numeric control carries `inputMode`, which the old inputs did not — on
 * Android that is the difference between a numeric keypad and the full
 * alphabetic keyboard for entering an odometer reading.
 */

import { useId, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ChevronDownIcon } from "./icons";

const CONTROL = cn(
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2.5",
  "text-base text-ink placeholder:text-muted/70",
  "aria-invalid:border-overdue aria-invalid:bg-overdue-surface/40",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted",
);

type FieldShellProps = {
  label: string;
  /**
   * Marked rather than marking every required field, because in these forms
   * most fields are required and an asterisk on nine of ten is noise.
   */
  optional?: boolean;
  hint?: string;
  error?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
};

function FieldShell({ label, optional, hint, error, children, className }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = cn(hint && hintId, error && errorId).trim() || undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label className="flex items-baseline gap-2 text-sm font-semibold text-ink" htmlFor={id}>
        <span>{label}</span>
        {optional ? <span className="text-xs font-normal text-muted">Optional</span> : null}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {/* Below the control, not above it.
       *
       * With the hint above, a field carrying one pushed its control about 25px
       * down — two lines, 44px — while the field beside it in the same
       * `FieldGrid` row stayed put. "Category" next to "Every · Leave blank if
       * only distance matters." was the reported case; there were five more.
       *
       * Under the control the height a hint adds falls below both fields, so
       * neither moves, and it lands in the same place as the error message
       * that may replace it. */}
      {hint ? (
        <p className="text-xs text-muted" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className="text-xs font-semibold text-overdue" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type BaseProps = {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
};

type TextFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  // `search` gets the phone keyboard a Search key and, on desktop, the browser's
  // own clear button. `time` gets the native clock picker, which is far better
  // on a phone than anything worth building.
  type?: "text" | "email" | "password" | "tel" | "search" | "time";
};

export function TextField({
  value,
  onChange,
  placeholder,
  autoComplete,
  type = "text",
  ...shell
}: TextFieldProps) {
  return (
    <FieldShell {...shell}>
      {({ id, describedBy, invalid }) => (
        <input
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          autoComplete={autoComplete}
          className={CONTROL}
          disabled={shell.disabled}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={shell.required}
          type={type}
          value={value}
        />
      )}
    </FieldShell>
  );
}

type NumberFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  /** Rendered inside the field, so the number and its unit cannot separate. */
  unit?: string;
  min?: number;
  step?: number;
  placeholder?: string;
};

export function NumberField({
  value,
  onChange,
  unit,
  min = 0,
  step,
  placeholder,
  ...shell
}: NumberFieldProps) {
  return (
    <FieldShell {...shell}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(CONTROL, "tabular", unit && "pr-14")}
            disabled={shell.disabled}
            id={id}
            // Brings up the numeric keypad on a phone. None of the old numeric
            // inputs did this.
            inputMode="decimal"
            min={min}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            required={shell.required}
            step={step}
            type="number"
            value={value}
          />
          {unit ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
              {unit}
            </span>
          ) : null}
        </div>
      )}
    </FieldShell>
  );
}

type CurrencyFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  /** The symbol comes from display settings rather than being hard-coded. */
  symbol?: string;
};

export function CurrencyField({ value, onChange, symbol = "₱", ...shell }: CurrencyFieldProps) {
  return (
    <FieldShell {...shell}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
            {symbol}
          </span>
          <input
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(CONTROL, "tabular pl-8")}
            disabled={shell.disabled}
            id={id}
            inputMode="decimal"
            min={0}
            onChange={(event) => onChange(event.target.value)}
            required={shell.required}
            step={0.01}
            type="number"
            value={value}
          />
        </div>
      )}
    </FieldShell>
  );
}

type DateFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  max?: string;
};

export function DateField({ value, onChange, max, ...shell }: DateFieldProps) {
  return (
    <FieldShell {...shell}>
      {({ id, describedBy, invalid }) => (
        <input
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={CONTROL}
          disabled={shell.disabled}
          id={id}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          required={shell.required}
          type="date"
          value={value}
        />
      )}
    </FieldShell>
  );
}

type DateTimeFieldProps = BaseProps & {
  /** An ISO-like `YYYY-MM-DDTHH:mm`, the shape the API already expects. */
  value: string;
  onChange: (value: string) => void;
};

/**
 * A date and a time as two controls rather than one `datetime-local`.
 *
 * `datetime-local` is poor on mobile browsers, which is where most of these
 * are now entered, and it is the one control people most often get halfway
 * through. Two plain pickers are larger targets and each is obvious.
 */
export function DateTimeField({ value, onChange, ...shell }: DateTimeFieldProps) {
  const [datePart = "", timePart = ""] = value.split("T");

  return (
    <FieldShell {...shell}>
      {({ id, describedBy, invalid }) => (
        <div className="flex gap-2">
          <input
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            aria-label={`${shell.label} — date`}
            className={cn(CONTROL, "flex-1")}
            disabled={shell.disabled}
            id={id}
            onChange={(event) => onChange(`${event.target.value}T${timePart || "00:00"}`)}
            required={shell.required}
            type="date"
            value={datePart}
          />
          <input
            aria-label={`${shell.label} — time`}
            className={cn(CONTROL, "w-32")}
            disabled={shell.disabled}
            onChange={(event) => onChange(`${datePart}T${event.target.value}`)}
            required={shell.required}
            type="time"
            value={timePart}
          />
        </div>
      )}
    </FieldShell>
  );
}

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
};

export function SelectField({ value, onChange, options, placeholder, ...shell }: SelectFieldProps) {
  return (
    <FieldShell {...shell}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(CONTROL, "appearance-none pr-10")}
            disabled={shell.disabled}
            id={id}
            onChange={(event) => onChange(event.target.value)}
            required={shell.required}
            value={value}
          >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
              <option key={option.value} disabled={option.disabled} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {/* Every select gets the same indicator. Previously only one of the
              four input recipes drew it, so the Fuel and Maintenance vehicle
              pickers showed the operating system's arrow and the rest showed
              this one. */}
          <ChevronDownIcon className="pointer-events-none absolute inset-y-0 right-3 my-auto text-muted" />
        </div>
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
};

export function TextAreaField({
  value,
  onChange,
  rows = 3,
  placeholder,
  ...shell
}: TextAreaFieldProps) {
  return (
    <FieldShell {...shell}>
      {({ id, describedBy, invalid }) => (
        <textarea
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL, "resize-y")}
          disabled={shell.disabled}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={shell.required}
          rows={rows}
          value={value}
        />
      )}
    </FieldShell>
  );
}

type CheckboxFieldProps = {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function CheckboxField({
  label,
  hint,
  checked,
  onChange,
  disabled,
  className,
}: CheckboxFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        aria-describedby={hint ? hintId : undefined}
        checked={checked}
        className={cn(
          // Sized in em so it grows with the text. The old checkboxes were a
          // hard 18px with a 2px nudge, so at any other text size the box and
          // its label drifted apart.
          "mt-0.5 size-[1.15em] shrink-0 rounded-sm border border-border-strong",
          "accent-gold-500 disabled:cursor-not-allowed",
        )}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <div className="min-w-0">
        <label className="text-sm font-semibold text-ink" htmlFor={id}>
          {label}
        </label>
        {hint ? (
          <p className="text-xs text-muted" id={hintId}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The grid a form's fields sit in.
 *
 * Container-driven, so it responds to the width of the panel it is in rather
 * than the width of the window. That distinction is the single largest cause
 * of the overlapping in the old interface: the breakpoints measured the
 * viewport while the grids lived inside a column some 500px narrower.
 */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("@container grid grid-cols-1 gap-4 @md:grid-cols-2", className)}>
      {children}
    </div>
  );
}

/** Spans both columns of a `FieldGrid`. */
export function FieldGridFull({ children }: { children: ReactNode }) {
  return <div className="@md:col-span-2">{children}</div>;
}

import { useId } from "react";
import { Button } from "../../ui/Button";
import { CloseIcon } from "../../ui/icons";

/**
 * A list of names or places that grows as you fill it in.
 *
 * The old version started with one empty row and made you press Add for each
 * further one, with a Remove button on every row including the only row. This
 * keeps one spare box at the end, so filling in three drivers is three taps
 * rather than six, and there is nothing to remove until there is something in
 * it.
 */
export function PeopleField({
  label,
  values,
  onChange,
  placeholder,
  optional = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  optional?: boolean;
}) {
  const id = useId();

  // Always exactly one empty box at the end to type into.
  const filled = values.filter((value) => value.trim() !== "");
  const rows = [...filled, ""];

  function setAt(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    onChange(next.filter((entry, position) => entry.trim() !== "" || position === next.length - 1));
  }

  return (
    // `gap-1.5` under the legend, matching `FieldShell`, so this sits level with
    // a real field beside it in the same grid row. The rows keep their own
    // wider gap below.
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="flex items-baseline gap-2 text-sm font-semibold text-ink" id={id}>
        <span>{label}</span>
        {optional ? <span className="text-xs font-normal text-muted">Optional</span> : null}
      </legend>

      <div className="flex flex-col gap-2">
        {rows.map((value, index) => (
          <div className="flex items-center gap-2" key={index}>
            <input
              aria-label={`${label} ${index + 1}`}
              className="w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2.5 text-base text-ink"
              onChange={(event) => setAt(index, event.target.value)}
              placeholder={placeholder}
              type="text"
              value={value}
            />
            {value.trim() !== "" ? (
              <Button
                aria-label={`Remove ${value}`}
                icon={<CloseIcon />}
                onClick={() => onChange(rows.filter((_, position) => position !== index))}
                variant="quiet"
              />
            ) : null}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

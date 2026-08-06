import { useRef, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Tabs that behave like tabs.
 *
 * The only tabs in the old interface were on Reports, where the container had
 * `role="tablist"` but the buttons had no `role="tab"`, no `aria-selected` and
 * no panel association — so to a screen reader it announced a list of buttons
 * that did nothing in particular. Arrow-key movement between tabs, which is
 * what the role promises, was not implemented either.
 */

export type TabItem<Id extends string> = {
  id: Id;
  label: string;
  /** Shown after the label, for counts. */
  badge?: ReactNode;
};

export function Tabs<Id extends string>({
  items,
  active,
  onChange,
  label,
  className,
}: {
  items: TabItem<Id>[];
  active: Id;
  onChange: (id: Id) => void;
  /** Names the set for anyone not seeing it, e.g. "Vehicle sections". */
  label: string;
  className?: string;
}) {
  const refs = useRef(new Map<Id, HTMLButtonElement>());

  function move(direction: 1 | -1) {
    const index = items.findIndex((item) => item.id === active);
    const next = items[(index + direction + items.length) % items.length];
    onChange(next.id);
    refs.current.get(next.id)?.focus();
  }

  return (
    <div
      aria-label={label}
      className={cn(
        // Scrolls when there are more tabs than room, but each tab snaps so it
        // never comes to rest half cut off.
        "flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "snap-x snap-mandatory",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
      }}
      role="tablist"
    >
      {items.map((item) => {
        const selected = item.id === active;

        return (
          <button
            aria-controls={`panel-${item.id}`}
            aria-selected={selected}
            className={cn(
              "flex shrink-0 snap-start items-center gap-2 border-b-2 px-3 py-2.5",
              "text-sm font-semibold whitespace-nowrap transition-colors",
              selected
                ? "border-gold-500 text-heading"
                : "border-transparent text-muted hover:text-ink",
            )}
            id={`tab-${item.id}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            ref={(node) => {
              if (node) {
                refs.current.set(item.id, node);
              } else {
                refs.current.delete(item.id);
              }
            }}
            role="tab"
            // Only the selected tab is in the tab order; arrows move between
            // them. That is what the role promises and what a screen reader
            // user will expect.
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel<Id extends string>({
  id,
  active,
  children,
}: {
  id: Id;
  active: Id;
  children: ReactNode;
}) {
  if (id !== active) {
    return null;
  }

  return (
    <div aria-labelledby={`tab-${id}`} id={`panel-${id}`} role="tabpanel" tabIndex={0}>
      {children}
    </div>
  );
}

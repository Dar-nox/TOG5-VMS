import { useEffect, useRef } from "react";
import { Button } from "./Button";

/**
 * Asking before something destructive happens.
 *
 * What the current guidance actually says, and what this follows:
 *
 *  - A centred alert dialog, not a bottom sheet. Sheets are for exploratory
 *    choices; this is a question that must be answered.
 *  - Name the object and the consequence. "Are you sure?" protects nobody
 *    because it carries no information.
 *  - Say whether it can be undone, accurately. Archiving is a soft delete, and
 *    Settings now has a screen the owner can put a record back from, so the
 *    wording says so — and says who can do it, since the person archiving is
 *    often not that person.
 *  - Focus starts on Cancel, so a stray Enter does not confirm.
 *  - The destructive button is visually distinct and set apart from Cancel.
 *  - Their power depends on rarity, so this is for destructive actions only.
 *    Nothing routine should open one.
 *
 * Built on the native `<dialog>`, which brings a focus trap, Escape, inertness
 * of the page behind, and top-layer stacking. The old stylesheet had no
 * `z-index`, `position: fixed` or `sticky` anywhere at all, so there was no
 * overlay layer to build on — this avoids inventing one.
 */

export type ConfirmRequest = {
  title: string;
  /** What will happen. One or two plain sentences. */
  body?: string;
  /** The verb, matching the button that opened it. */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

type ConfirmDialogProps = {
  request: ConfirmRequest | null;
  onResolve: (confirmed: boolean) => void;
};

export function ConfirmDialog({ request, onResolve }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (request) {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        // Very old WebViews. Non-modal, but visible and answerable, which
        // beats a destructive action happening with no question asked.
        dialog.setAttribute("open", "");
      }

      cancelRef.current?.focus();
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [request]);

  if (!request) {
    return null;
  }

  return (
    <dialog
      aria-labelledby="confirm-title"
      aria-describedby={request.body ? "confirm-body" : undefined}
      className={
        // `m-auto` centres it in the top layer; the default UA placement is
        // the top of the viewport.
        "m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 " +
        "text-ink shadow-card backdrop:bg-navy-950/50"
      }
      onCancel={(event) => {
        // Escape and backdrop dismissal both mean "no".
        event.preventDefault();
        onResolve(false);
      }}
      onClose={() => onResolve(false)}
      ref={dialogRef}
    >
      <div className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-heading" id="confirm-title">
          {request.title}
        </h2>

        {request.body ? (
          <p className="text-sm text-muted" id="confirm-body">
            {request.body}
          </p>
        ) : null}

        {/* Cancel first in the source so it takes focus, and separated from
            the destructive action rather than sitting flush against it. */}
        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={() => onResolve(false)} ref={cancelRef} variant="secondary">
            {request.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            className="sm:ml-2"
            onClick={() => onResolve(true)}
            variant={request.tone === "primary" ? "primary" : "danger"}
          >
            {request.confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

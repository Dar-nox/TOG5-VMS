import { useId, useRef } from "react";
import { Button } from "../../ui/Button";
import { CameraIcon } from "../../ui/icons";

/**
 * Attaching a receipt or a photo.
 *
 * Two buttons rather than one file input. On a phone the camera is the point —
 * the receipt is in the driver's hand at the pump — and `capture="environment"`
 * opens it directly instead of making them go through a picker to find it.
 * The second button is for a file already on the device, which is what a
 * desktop needs.
 */
export function ReceiptField({
  label,
  file,
  onChange,
  accept = "image/*,application/pdf",
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink" id={id}>
        {label}
        <span className="ml-2 text-xs font-normal text-muted">Optional</span>
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <Button icon={<CameraIcon />} onClick={() => cameraRef.current?.click()}>
          Take photo
        </Button>
        <Button onClick={() => fileRef.current?.click()} variant="quiet">
          Choose file
        </Button>

        {file ? (
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <span className="max-w-[14rem] truncate">{file.name}</span>
            <button
              className="font-semibold text-overdue underline"
              onClick={() => onChange(null)}
              type="button"
            >
              Remove
            </button>
          </span>
        ) : null}
      </div>

      <input
        accept="image/*"
        aria-labelledby={id}
        capture="environment"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        ref={cameraRef}
        type="file"
      />
      <input
        accept={accept}
        aria-labelledby={id}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        ref={fileRef}
        type="file"
      />
    </div>
  );
}

import { cn } from "../../lib/cn";
import { useManagedFileUrl } from "../../services/files/useManagedFileUrl";
import { VehiclesIcon } from "../ui/icons";

/**
 * A vehicle's picture, at whatever size the caller needs.
 *
 * The old frames were fixed pixel boxes with `overflow: hidden` and a text
 * fallback inside them — a 58px square holding an error message at 0.62rem,
 * clipped. Here the fallback is a mark rather than a sentence, so there is
 * nothing to clip, and the box is sized in the layout rather than in pixels.
 */
export function VehiclePhoto({
  storagePath,
  alt,
  className,
}: {
  storagePath?: string | null;
  alt: string;
  className?: string;
}) {
  const url = useManagedFileUrl(storagePath);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md",
        "border border-border bg-surface-sunken text-muted",
        className,
      )}
    >
      {url ? (
        <img alt={alt} className="size-full object-cover" src={url} />
      ) : (
        <VehiclesIcon className="size-1/2" />
      )}
    </span>
  );
}

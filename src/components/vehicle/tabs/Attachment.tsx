import { useManagedFileUrl } from "../../../services/files/useManagedFileUrl";

/**
 * A link to a receipt or photo, shown only when there is one.
 *
 * The old service history card rendered "No receipt", "No before photo" and
 * "No after photo" on every row of every record — three lines of nothing,
 * permanently, to tell you that nothing was there.
 */
export function Attachment({ label, path }: { label: string; path?: string | null }) {
  const url = useManagedFileUrl(path);

  if (!path) {
    return null;
  }

  return (
    <a
      className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-info hover:bg-surface-sunken"
      href={url ?? undefined}
      rel="noreferrer"
      target="_blank"
    >
      {url ? label : `${label}…`}
    </a>
  );
}

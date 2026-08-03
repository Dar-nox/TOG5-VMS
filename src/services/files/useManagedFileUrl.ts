import { useEffect, useState } from "react";
import { managedFileUrl } from "../api/client";

/**
 * Turns a stored file path into a link the browser can show.
 *
 * The desktop build could do this synchronously — the file was on the same
 * disk. The buckets here are private, so a link has to be signed, and signing
 * is a request. This hook keeps that out of the components: they ask for a
 * path and get back a URL when it is ready, or `undefined`.
 *
 * Signed links expire after an hour, which is far longer than anybody keeps a
 * single screen open, so they are not refreshed.
 */
export function useManagedFileUrl(storagePath?: string | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!storagePath) {
      setUrl(undefined);
      return;
    }

    let stillWanted = true;

    void managedFileUrl(storagePath).then((resolved) => {
      // The path may have changed while the link was being signed — showing
      // the previous vehicle's photo would be worse than showing none.
      if (stillWanted) {
        setUrl(resolved);
      }
    });

    return () => {
      stillWanted = false;
    };
  }, [storagePath]);

  return url;
}

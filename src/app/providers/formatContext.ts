import { createContext, useContext } from "react";
import { createFormatters, type Formatters } from "../../lib/format";

/**
 * Formatters bound to the fleet's display settings.
 *
 * Falls back to the defaults rather than throwing when there is no provider,
 * because the sign-in and error screens render outside it and still show
 * dates. A screen that formats a value should never be the reason nothing
 * renders at all.
 */
export const FormatContext = createContext<Formatters>(createFormatters());

export function useFormat(): Formatters {
  return useContext(FormatContext);
}

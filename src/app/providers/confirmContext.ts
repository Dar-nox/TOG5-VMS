import { createContext, useContext } from "react";
import type { ConfirmRequest } from "../../components/ui/ConfirmDialog";

/**
 * `const confirm = useConfirm()` then `if (await confirm({...}))`.
 *
 * A promise rather than a rendered component, because the old approach gave
 * every screen its own confirmation state — three separate `useState` flags
 * across three modules, each with its own markup — and three other screens
 * skipped it entirely and destroyed records on a single tap.
 */
export type ConfirmFn = (request: ConfirmRequest) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    throw new Error("useConfirm must be used inside a ConfirmProvider.");
  }

  return confirm;
}

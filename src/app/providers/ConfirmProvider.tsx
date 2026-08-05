import { useCallback, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog, type ConfirmRequest } from "../../components/ui/ConfirmDialog";
import { ConfirmContext } from "./confirmContext";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  // Held in a ref and cleared on use, so the dialog's own `close` event —
  // which fires after a confirmation as the dialog is dismissed — cannot
  // resolve the same promise a second time with the opposite answer.
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest(next);
    });
  }, []);

  const handleResolve = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolver?.(confirmed);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog onResolve={handleResolve} request={request} />
    </ConfirmContext.Provider>
  );
}

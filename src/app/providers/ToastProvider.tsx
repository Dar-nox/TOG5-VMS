import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { AlertIcon, CheckIcon, CloseIcon } from "../../components/ui/icons";
import { ToastContext, type ToastTone } from "./toastContext";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

/** Long enough to read a sentence, short enough not to sit in the way. */
const SUCCESS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message }]);

      // Failures stay until dismissed. A message explaining what went wrong is
      // no use if it removes itself before the person looks up.
      if (tone === "success") {
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          dismiss(id);
        }, SUCCESS_MS);
        timers.current.add(timer);
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) {
        clearTimeout(timer);
      }
      pending.clear();
    };
  }, []);

  const toaster = useMemo(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toaster}>
      {children}

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-(--z-toast) flex flex-col items-center gap-2",
          // Clear of the phone's bottom tab bar and of the home indicator.
          "p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
          "sm:inset-x-auto sm:right-0 sm:items-end",
        )}
      >
        {toasts.map((toast) => (
          <div
            aria-live={toast.tone === "error" ? "assertive" : "polite"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border p-3 shadow-card",
              toast.tone === "success"
                ? "border-ok-line bg-ok-surface text-ok"
                : "border-overdue-line bg-overdue-surface text-overdue",
            )}
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            {toast.tone === "success" ? <CheckIcon /> : <AlertIcon />}
            <p className="min-w-0 flex-1 text-sm font-semibold">{toast.message}</p>
            <button
              aria-label="Dismiss"
              className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
              onClick={() => dismiss(toast.id)}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

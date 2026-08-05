import { createContext, useContext } from "react";

export type ToastTone = "success" | "error";

export type Toaster = {
  success: (message: string) => void;
  error: (message: string) => void;
};

export const ToastContext = createContext<Toaster | null>(null);

/**
 * Confirming that something happened.
 *
 * Five of the eleven screens gave no feedback at all after a save, and the six
 * that did used four different classes in three different positions — page
 * top, mid-form, and under the action bar.
 */
export function useToast(): Toaster {
  const toaster = useContext(ToastContext);

  if (!toaster) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }

  return toaster;
}

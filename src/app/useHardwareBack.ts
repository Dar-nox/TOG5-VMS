import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

/**
 * Makes Android's back button go back.
 *
 * Until now the app kept its current page in a `useState` and had no history
 * at all, so there was nothing for the system back gesture to return to and it
 * closed the app instead — from anywhere, mid-form included. On the phone this
 * is the most-used control there is.
 *
 * At the first page, back still leaves the app, which is what Android expects.
 */
export function useHardwareBack(): void {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handle = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void CapacitorApp.exitApp();
      }
    });

    return () => {
      void handle.then((listener) => listener.remove());
    };
  }, []);
}

import type { ReactNode } from "react";

/**
 * The frame for every screen shown before the app itself.
 *
 * These four used to be styled by a corner of the stylesheet nothing else
 * touched — the only 14px radius and the only 28px padding in the app — so the
 * first thing anybody saw belonged to a different design from the thing behind
 * it. They share the app's own surfaces now.
 *
 * `dvh` rather than `vh`: on a phone `100vh` is the viewport with the address
 * bar hidden, so a centred card was being centred against a box taller than
 * the screen and the sign-in button could sit underneath the browser chrome.
 */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-navy-900 p-4">
      <main className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          <img alt="" className="size-11 rounded-md" src="/icon-192.png" />
          <div className="min-w-0">
            <p className="text-2xs font-semibold tracking-widest text-gold-600 uppercase">TOG 5</p>
            <p className="text-sm font-semibold text-heading">Vehicle Care</p>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-heading">{title}</h1>

        <div className="mt-4 flex flex-col gap-4">{children}</div>
      </main>
    </div>
  );
}

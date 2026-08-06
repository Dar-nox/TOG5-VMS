import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { cn } from "../../lib/cn";
import { AccountBlock } from "./AccountBlock";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

const COLLAPSE_KEY = "tog5.nav.collapsed";

/**
 * The frame every screen sits in.
 *
 * What it no longer does is introduce the page. The old header printed an
 * eyebrow reading "Vehicle maintenance system" above the page title and a
 * one-line description below it, on every screen, and then each module printed
 * its own title and description underneath — so a screen said what it was four
 * times before showing a single record. Pages now carry one heading, their
 * own.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      // Private browsing, or storage turned off. Not worth failing over.
      return false;
    }
  });

  function toggle() {
    setCollapsed((current) => {
      const next = !current;

      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        // As above.
      }

      return next;
    });
  }

  return (
    <div className="flex min-h-dvh bg-page">
      <a
        className={cn(
          "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast)",
          "focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow-card",
        )}
        href="#main"
      >
        Skip to content
      </a>

      <div className="hidden lg:block">
        <SideNav collapsed={collapsed} onToggle={toggle} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar />

        <Main />

        <BottomNav />
      </div>
    </div>
  );
}

/** The phone's top strip: identity, who is signed in, and the way out. */
function MobileBar() {
  return (
    <header
      className={cn(
        "sticky top-0 z-(--z-sticky) flex items-center gap-3 border-b border-border",
        "bg-navy-900 px-4 py-2.5 text-inverse lg:hidden",
        "pt-[calc(0.625rem+env(safe-area-inset-top))]",
      )}
    >
      <img alt="" className="size-8 shrink-0 rounded-md" src="/icon-192.png" />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">TOG 5 Vehicle Care</p>
      <AccountBlock variant="bar" />
    </header>
  );
}

function Main() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Moving between pages swapped the heading and left focus on the sidebar
    // button that was clicked, so a screen reader announced nothing and a
    // keyboard user had to tab through the whole navigation again. Skipped on
    // first render so arriving at the app does not steal focus.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    mainRef.current?.focus();
  }, [pathname]);

  return (
    <main
      className="min-w-0 flex-1 px-4 py-5 focus:outline-none @container lg:px-8 lg:py-7"
      id="main"
      ref={mainRef}
      tabIndex={-1}
    >
      <Outlet />
    </main>
  );
}

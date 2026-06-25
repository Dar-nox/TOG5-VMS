import type { ReactNode } from "react";
import type { NavigationItem, PageId } from "../../types/navigation";
import { SidebarNav } from "./SidebarNav";

type AppLayoutProps = {
  activeItem: NavigationItem;
  activePage: PageId;
  children: ReactNode;
  navigationItems: NavigationItem[];
  onNavigate: (page: PageId) => void;
};

export function AppLayout({
  activeItem,
  activePage,
  children,
  navigationItems,
  onNavigate,
}: AppLayoutProps) {
  return (
    <div className="desktop-shell">
      <SidebarNav activePage={activePage} items={navigationItems} onNavigate={onNavigate} />

      <div className="workspace">
        <header className="top-header">
          <div>
            <p className="eyebrow">Local desktop vehicle maintenance system</p>
            <h1>{activeItem.label}</h1>
            <p>{activeItem.description}</p>
          </div>

          <div className="header-status" aria-label="Application status">
            <span className="status-dot" aria-hidden="true" />
            Offline-first draft
          </div>
        </header>

        <main className="content-area" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

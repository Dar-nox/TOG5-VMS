import type { NavigationItem, PageId } from "../../types/navigation";

type SidebarNavProps = {
  activePage: PageId;
  items: NavigationItem[];
  onNavigate: (page: PageId) => void;
};

export function SidebarNav({ activePage, items, onNavigate }: SidebarNavProps) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          VMS
        </div>
        <div>
          <p>TOG 5</p>
          <strong>Vehicle Care</strong>
        </div>
      </div>

      <nav className="nav-list">
        {items.map((item) => (
          <button
            key={item.id}
            className={item.id === activePage ? "nav-item active" : "nav-item"}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <span className="nav-label">{item.label}</span>
            <span className="nav-short">{item.shortLabel}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-note">
        <span>Local MVP</span>
        Vehicle records are stored locally on this device.
      </div>
    </aside>
  );
}

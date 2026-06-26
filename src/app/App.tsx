import { useMemo, useState } from "react";
import { AppLayout } from "../components/common/AppLayout";
import type { PageId } from "../types/navigation";
import { navigationItems } from "../types/navigation";
import {
  AlertsPage,
  BackupPage,
  DashboardPage,
  ExpensesPage,
  FuelLogsPage,
  MaintenancePage,
  ReportsPage,
  ServiceHistoryPage,
  SettingsPage,
  VehiclesPage,
} from "./routes/PlaceholderPages";

export function App() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");

  const activeNavigationItem = useMemo(
    () => navigationItems.find((item) => item.id === activePage) ?? navigationItems[0],
    [activePage],
  );

  return (
    <AppLayout
      activeItem={activeNavigationItem}
      activePage={activePage}
      navigationItems={navigationItems}
      onNavigate={setActivePage}
    >
      {renderPage(activePage, setActivePage)}
    </AppLayout>
  );
}

function renderPage(activePage: PageId, onNavigate: (page: PageId) => void) {
  switch (activePage) {
    case "dashboard":
      return <DashboardPage onNavigate={onNavigate} />;
    case "vehicles":
      return <VehiclesPage />;
    case "fuel":
      return <FuelLogsPage />;
    case "maintenance":
      return <MaintenancePage />;
    case "service-history":
      return <ServiceHistoryPage />;
    case "expenses":
      return <ExpensesPage />;
    case "reports":
      return <ReportsPage />;
    case "alerts":
      return <AlertsPage />;
    case "backup":
      return <BackupPage />;
    case "settings":
      return <SettingsPage />;
  }
}

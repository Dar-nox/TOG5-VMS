import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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

const pageContent: Record<PageId, ReactNode> = {
  dashboard: <DashboardPage />,
  vehicles: <VehiclesPage />,
  fuel: <FuelLogsPage />,
  maintenance: <MaintenancePage />,
  "service-history": <ServiceHistoryPage />,
  expenses: <ExpensesPage />,
  reports: <ReportsPage />,
  alerts: <AlertsPage />,
  backup: <BackupPage />,
  settings: <SettingsPage />,
};

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
      {pageContent[activePage]}
    </AppLayout>
  );
}

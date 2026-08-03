import { useMemo, useState } from "react";
import { ConnectionProblemScreen } from "../components/auth/ConnectionProblemScreen";
import { SignInScreen } from "../components/auth/SignInScreen";
import { AppLayout } from "../components/common/AppLayout";
import type { PageId } from "../types/navigation";
import { navigationItems } from "../types/navigation";
import { AuthProvider } from "./providers/AuthProvider";
import { useAuth } from "./providers/authContext";
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
  TripsPage,
  VehiclesPage,
} from "./routes/Pages";

export function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

/** Nothing renders until we know who is using the app. */
function AppGate() {
  const { phase } = useAuth();

  switch (phase) {
    case "checking":
      return <div className="app-loading">Loading TOG 5 VMS...</div>;
    case "unreachable":
      return <ConnectionProblemScreen />;
    case "signed-out":
      return <SignInScreen />;
    case "signed-in":
      return <Workspace />;
  }
}

function Workspace() {
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
    case "trips":
      return <TripsPage />;
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

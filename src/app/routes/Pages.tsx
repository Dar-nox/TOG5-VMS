import { AlertsModule } from "../../components/alerts/AlertsModule";
import { BackupRestoreModule } from "../../components/backup/BackupRestoreModule";
import { DashboardModule } from "../../components/dashboard/DashboardModule";
import { ExpensesModule } from "../../components/expenses/ExpensesModule";
import { FuelLogsModule } from "../../components/fuel/FuelLogsModule";
import { MaintenanceTemplateModule } from "../../components/maintenance/MaintenanceTemplateModule";
import { ReportsModule } from "../../components/reports/ReportsModule";
import { ServiceHistoryModule } from "../../components/serviceHistory/ServiceHistoryModule";
import { SettingsModule } from "../../components/settings/SettingsModule";
import { TripsModule } from "../../components/trips/TripsModule";
import { VehicleModule } from "../../components/vehicles/VehicleModule";
import type { PageId } from "../../types/navigation";

export function DashboardPage({ onNavigate }: { onNavigate?: (page: PageId) => void }) {
  return <DashboardModule onNavigate={onNavigate} />;
}

export function VehiclesPage() {
  return <VehicleModule />;
}

export function FuelLogsPage() {
  return <FuelLogsModule />;
}

export function TripsPage() {
  return <TripsModule />;
}

export function MaintenancePage() {
  return <MaintenanceTemplateModule />;
}

export function ServiceHistoryPage() {
  return <ServiceHistoryModule />;
}

export function ExpensesPage() {
  return <ExpensesModule />;
}

export function ReportsPage() {
  return <ReportsModule />;
}

export function AlertsPage() {
  return <AlertsModule />;
}

export function BackupPage() {
  return <BackupRestoreModule />;
}

export function SettingsPage() {
  return <SettingsModule />;
}

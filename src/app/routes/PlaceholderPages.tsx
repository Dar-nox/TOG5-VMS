import { AlertsModule } from "../../components/alerts/AlertsModule";
import { BackupRestoreModule } from "../../components/backup/BackupRestoreModule";
import { PlaceholderSection } from "../../components/common/PlaceholderSection";
import { SummaryCard } from "../../components/common/SummaryCard";
import { ExpensesModule } from "../../components/expenses/ExpensesModule";
import { FuelLogsModule } from "../../components/fuel/FuelLogsModule";
import { MaintenanceTemplateModule } from "../../components/maintenance/MaintenanceTemplateModule";
import { ReportsModule } from "../../components/reports/ReportsModule";
import { ServiceHistoryModule } from "../../components/serviceHistory/ServiceHistoryModule";
import { SettingsModule } from "../../components/settings/SettingsModule";
import { VehicleModule } from "../../components/vehicles/VehicleModule";

const dashboardCards = [
  {
    label: "Total vehicles",
    value: "0",
    detail: "Vehicle records will appear here after Phase 4.",
    tone: "info" as const,
  },
  {
    label: "Maintenance due soon",
    value: "0",
    detail: "Uses date, odometer, or whichever comes first later.",
    tone: "warning" as const,
  },
  {
    label: "Overdue maintenance",
    value: "0",
    detail: "Overdue work will stay visible until resolved.",
    tone: "danger" as const,
  },
  {
    label: "Average fuel efficiency",
    value: "-- km/L",
    detail: "Official values require full-tank fuel logs.",
    tone: "neutral" as const,
  },
  {
    label: "Monthly cost",
    value: "PHP 0",
    detail: "Fuel and service totals will be summarized here.",
    tone: "neutral" as const,
  },
  {
    label: "Backup status",
    value: "Not set",
    detail: "Local backup reminders arrive in a later phase.",
    tone: "good" as const,
  },
];

export function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="summary-grid" aria-label="Dashboard summary">
        {dashboardCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <PlaceholderSection
        title="What this dashboard will answer"
        description="This starter view is static. Later phases will connect it to vehicle, fuel, maintenance, expense, alert, and backup data."
        items={[
          "Which vehicles need attention soon.",
          "Which maintenance tasks are overdue.",
          "Whether fuel efficiency or monthly costs are changing.",
          "Whether the local backup needs attention.",
        ]}
      />
    </div>
  );
}

export function VehiclesPage() {
  return <VehicleModule />;
}

export function FuelLogsPage() {
  return <FuelLogsModule />;
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

import { AlertsModule } from "../../components/alerts/AlertsModule";
import { PlaceholderSection } from "../../components/common/PlaceholderSection";
import { SummaryCard } from "../../components/common/SummaryCard";
import { FuelLogsModule } from "../../components/fuel/FuelLogsModule";
import { MaintenanceTemplateModule } from "../../components/maintenance/MaintenanceTemplateModule";
import { ServiceHistoryModule } from "../../components/serviceHistory/ServiceHistoryModule";
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
  return (
    <PlaceholderSection
      title="Expenses will connect vehicle costs in one place"
      description="This placeholder prepares for fuel, preventive maintenance, repairs, registration, insurance, and other local expense records."
      items={[
        "Fuel and maintenance records will create linked expenses later.",
        "Costs will be filterable by vehicle and date range in a future phase.",
        "Amounts must be clear, friendly, and safe to review before saving.",
      ]}
    />
  );
}

export function ReportsPage() {
  return (
    <PlaceholderSection
      title="Reports will be local and export-friendly"
      description="Reports are not implemented yet. Future screens will summarize vehicle cost, fuel efficiency, upcoming work, overdue work, and service history."
      items={[
        "CSV and printable report flows are planned for a later phase.",
        "Reports should match the records saved in the local database.",
        "No online reporting or remote upload will be added.",
      ]}
    />
  );
}

export function AlertsPage() {
  return <AlertsModule />;
}

export function BackupPage() {
  return (
    <PlaceholderSection
      title="Backup and restore will protect local data"
      description="Future backup tools will include the SQLite database and uploaded local files such as photos, receipts, and documents."
      items={[
        "Manual backup will be available later.",
        "Restore will warn before replacing current local data.",
        "Backup reminders will appear both on the dashboard and alert list.",
      ]}
    />
  );
}

export function SettingsPage() {
  return (
    <PlaceholderSection
      title="Settings will keep local preferences understandable"
      description="This page will eventually hold due-soon thresholds, startup-on-boot, backup reminders, and local user access settings."
      items={[
        "Default due-soon thresholds are planned as 14 days or 500 km.",
        "Startup-on-boot should be controlled by a clear app setting.",
        "Admin, staff, and viewer access are planned for a later phase.",
      ]}
    />
  );
}

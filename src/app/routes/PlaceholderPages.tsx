import { AlertCard } from "../../components/common/AlertCard";
import { PlaceholderSection } from "../../components/common/PlaceholderSection";
import { SummaryCard } from "../../components/common/SummaryCard";

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

const alertCards = [
  {
    status: "Due soon" as const,
    title: "Oil change due soon",
    message: "Sample reminder for a task nearing its date or odometer target.",
  },
  {
    status: "Overdue" as const,
    title: "Brake inspection overdue",
    message: "Sample critical alert for maintenance that has passed its limit.",
  },
  {
    status: "Warning" as const,
    title: "Fuel efficiency drop",
    message: "Sample warning for a noticeable km/L decrease after full-tank logs.",
  },
  {
    status: "Info" as const,
    title: "Missing receipt",
    message: "Sample note for a fuel or service entry that needs a receipt later.",
  },
  {
    status: "Reminder" as const,
    title: "Backup reminder",
    message: "Sample reminder to protect the local database and uploaded files.",
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
  return (
    <PlaceholderSection
      title="Vehicle setup will be guided"
      description="The future add-vehicle flow will use friendly steps instead of a long technical form."
      items={[
        "Vehicle name is required.",
        "Uploaded vehicle picture is required.",
        "Plate number is optional.",
        "Vehicle type, fuel type, transmission, drivetrain, and selected features will drive maintenance templates later.",
      ]}
    />
  );
}

export function FuelLogsPage() {
  return (
    <PlaceholderSection
      title="Fuel logs will focus on accurate, useful entries"
      description="Fuel tracking is not connected yet. This page marks the future workflow and safety rules."
      items={[
        "Receipt and odometer readings are fuel log data points.",
        "Official fuel efficiency should only be calculated between full-tank logs.",
        "Fuel type mismatch should warn the user later.",
        "DEF/AdBlue should not be counted as diesel fuel consumption.",
      ]}
    />
  );
}

export function MaintenancePage() {
  return (
    <PlaceholderSection
      title="Smart maintenance templates come later"
      description="Maintenance rules will adapt to the vehicle profile instead of applying one universal schedule."
      items={[
        "Templates adapt by vehicle type, fuel type, transmission, drivetrain, and features.",
        "Diesel vehicles should not automatically receive spark plug maintenance.",
        "Gasoline vehicles should not automatically receive diesel-only DEF/AdBlue maintenance.",
        "Full EVs should not automatically receive engine oil, spark plug, fuel filter, or exhaust maintenance.",
        "Due maintenance is based on date, odometer, or whichever comes first.",
      ]}
    />
  );
}

export function ServiceHistoryPage() {
  return (
    <PlaceholderSection
      title="Service history will keep completed work easy to review"
      description="Later phases will show maintenance completion logs, parts replaced, shop notes, receipts, costs, and next recommended service."
      items={[
        "Completed maintenance will become part of the vehicle record.",
        "Receipts and service notes will stay local to this desktop app.",
        "Future entries will help calculate next due dates and odometer targets.",
      ]}
    />
  );
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
  return (
    <div className="page-stack">
      <section className="alert-grid" aria-label="Sample alert cards">
        {alertCards.map((alert) => (
          <AlertCard key={alert.title} {...alert} />
        ))}
      </section>

      <PlaceholderSection
        title="Alert actions are not active yet"
        description="These are static examples only. Later phases will add snooze, dismiss, complete maintenance, and related vehicle navigation."
      />
    </div>
  );
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

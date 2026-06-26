import { useCallback, useEffect, useMemo, useState } from "react";
import { SummaryCard } from "../common/SummaryCard";
import {
  dashboardPhotoUrl,
  getDashboardOverview,
  type DashboardActivityItem,
  type DashboardMaintenanceItem,
  type DashboardOverview,
  type DashboardSetupHint,
} from "../../services/api/dashboard";
import type { PageId } from "../../types/navigation";

type DashboardModuleProps = {
  onNavigate?: (page: PageId) => void;
};

const quickActions: Array<{ label: string; detail: string; targetPage: PageId }> = [
  {
    label: "Add or view vehicle",
    detail: "Manage vehicle records, photos, and setup details.",
    targetPage: "vehicles",
  },
  {
    label: "Open Maintenance",
    detail: "Review schedules and complete service tasks.",
    targetPage: "maintenance",
  },
  {
    label: "Add Fuel Log",
    detail: "Record fuel, receipts, and full-tank efficiency.",
    targetPage: "fuel",
  },
  {
    label: "Open Expenses",
    detail: "Track manual costs and review local spending.",
    targetPage: "expenses",
  },
  {
    label: "Create Backup",
    detail: "Save a local .tog5backup package.",
    targetPage: "backup",
  },
  {
    label: "Open Settings",
    detail: "Adjust local preferences and data safety notes.",
    targetPage: "settings",
  },
];

export function DashboardModule({ onNavigate }: DashboardModuleProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setOverview(await getDashboardOverview());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const summaryCards = useMemo(() => {
    if (!overview) {
      return [];
    }

    const maintenanceAttention =
      overview.maintenanceSummary.overdueCount +
      overview.maintenanceSummary.dueTodayCount +
      overview.maintenanceSummary.dueSoonCount;
    const latestEfficiency = formatKmPerLiter(overview.fuelSummary.latestOfficialKmPerLiter);
    const latestBackupLabel = overview.backupSummary.reminderDue
      ? "Due"
      : overview.backupSummary.latestCompletedAt
        ? "Current"
        : "No backup";

    return [
      {
        label: "Vehicles",
        value: String(overview.vehicleSummary.activeCount),
        detail: `${overview.vehicleSummary.archivedCount} archived, ${overview.vehicleSummary.underMaintenanceCount} in maintenance`,
        tone: "info" as const,
      },
      {
        label: "Maintenance due",
        value: String(maintenanceAttention),
        detail: `${overview.maintenanceSummary.overdueCount} overdue, ${overview.maintenanceSummary.dueTodayCount} due today`,
        tone:
          overview.maintenanceSummary.overdueCount > 0 ? ("danger" as const) : ("warning" as const),
      },
      {
        label: "Active alerts",
        value: String(overview.alertsSummary.activeCount),
        detail: `${overview.alertsSummary.highPriorityCount} high or critical`,
        tone:
          overview.alertsSummary.highPriorityCount > 0 ? ("danger" as const) : ("neutral" as const),
      },
      {
        label: "Fuel efficiency",
        value: latestEfficiency,
        detail: overview.fuelSummary.message,
        tone: overview.fuelSummary.efficiencyDropActive ? ("warning" as const) : ("good" as const),
      },
      {
        label: "Monthly costs",
        value: formatMoney(overview.costSummary.totalTrackedCost, overview.preferredCurrency),
        detail: `${formatMonth(overview.costSummary.currentMonth)} tracked locally`,
        tone: "neutral" as const,
      },
      {
        label: "Backup status",
        value: latestBackupLabel,
        detail: overview.backupSummary.message,
        tone: overview.backupSummary.reminderDue ? ("warning" as const) : ("good" as const),
      },
    ];
  }, [overview]);

  const latestVehiclePhoto = dashboardPhotoUrl(overview?.vehicleSummary.latestVehiclePhotoPath);

  function navigate(targetPage?: string | null) {
    if (onNavigate && isPageId(targetPage)) {
      onNavigate(targetPage);
    }
  }

  if (loading && !overview) {
    return <div className="maintenance-empty-note">Loading dashboard overview...</div>;
  }

  if (error && !overview) {
    return (
      <section className="dashboard-panel">
        <h2>Dashboard could not load</h2>
        <p>{error}</p>
        <button className="secondary-button" type="button" onClick={() => void loadDashboard()}>
          Try again
        </button>
      </section>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <div className="dashboard-module">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Local overview</p>
          <h2>Good day, {overview.ownerDisplayName || "Local Owner"}</h2>
          <p>
            This dashboard uses only local data on this device. Counts, costs, alerts, and backup
            reminders update from the records already saved in TOG 5 VMS.
          </p>
          <div className="dashboard-hero-meta">
            <span>Updated {formatDateTime(overview.generatedAt)}</span>
            <span>{overview.backupSummary.packageNote}</span>
          </div>
        </div>

        <div className="dashboard-latest-vehicle">
          {latestVehiclePhoto ? (
            <img alt="" src={latestVehiclePhoto} />
          ) : (
            <div className="dashboard-vehicle-fallback" aria-hidden="true">
              TOG
            </div>
          )}
          <div>
            <span>Latest vehicle</span>
            <strong>{overview.vehicleSummary.latestVehicleName ?? "No vehicle yet"}</strong>
          </div>
        </div>
      </section>

      <section className="summary-grid dashboard-summary-grid" aria-label="Dashboard summary">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>Needs attention</h2>
            <p>
              Overdue work, due-soon items, alerts, and local setup reminders stay visible here.
            </p>
          </div>
          {error ? <span className="status-pill archived">Refresh failed</span> : null}
        </div>

        <div className="dashboard-attention-list">
          {overview.maintenanceSummary.upcoming.map((item) => (
            <MaintenanceAttentionRow key={item.id} item={item} onNavigate={navigate} />
          ))}

          {overview.alertsSummary.topAlerts.map((alert) => (
            <button
              className="dashboard-attention-row"
              key={alert.id}
              type="button"
              onClick={() => navigate("alerts")}
            >
              <div>
                <span className={`status-pill ${statusClass(alert.priority)}`}>
                  {labelFromKey(alert.priority)}
                </span>
                <h3>{alert.title}</h3>
                <p>
                  {alert.vehicleName ? `${alert.vehicleName}: ` : ""}
                  {alert.message}
                </p>
              </div>
              <span>{formatDate(alert.dueDate ?? alert.createdAt)}</span>
            </button>
          ))}

          {overview.setupHints.map((hint) => (
            <SetupHintRow key={hint.code} hint={hint} onNavigate={navigate} />
          ))}

          {overview.maintenanceSummary.upcoming.length === 0 &&
          overview.alertsSummary.topAlerts.length === 0 &&
          overview.setupHints.length === 0 ? (
            <div className="maintenance-empty-note">
              Nothing needs attention right now. New schedules, alerts, and backup reminders will
              appear here when they need action.
            </div>
          ) : null}
        </div>
      </section>

      <section className="dashboard-split-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Recent activity</h2>
              <p>Latest local fuel, service, expense, alert, and backup records.</p>
            </div>
          </div>
          <div className="dashboard-activity-list">
            {overview.recentActivity.length > 0 ? (
              overview.recentActivity.map((activity) => (
                <ActivityRow
                  activity={activity}
                  currency={overview.preferredCurrency}
                  key={`${activity.activityType}-${activity.id}`}
                  onNavigate={navigate}
                />
              ))
            ) : (
              <div className="maintenance-empty-note">
                Activity will appear after you add fuel logs, service history, expenses, alerts, or
                backups.
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Monthly cost mix</h2>
              <p>Current month totals avoid linked expense duplicates.</p>
            </div>
          </div>
          <div className="dashboard-cost-list">
            <CostBreakdownRow
              label="Fuel"
              value={overview.costSummary.fuelTotal}
              total={overview.costSummary.totalTrackedCost}
              currency={overview.preferredCurrency}
            />
            <CostBreakdownRow
              label="Service"
              value={overview.costSummary.maintenanceTotal}
              total={overview.costSummary.totalTrackedCost}
              currency={overview.preferredCurrency}
            />
            <CostBreakdownRow
              label="Repairs"
              value={overview.costSummary.repairTotal}
              total={overview.costSummary.totalTrackedCost}
              currency={overview.preferredCurrency}
            />
            <CostBreakdownRow
              label="Manual"
              value={overview.costSummary.manualExpenseTotal}
              total={overview.costSummary.totalTrackedCost}
              currency={overview.preferredCurrency}
            />
          </div>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h2>Quick actions</h2>
            <p>Jump into the existing local workflows.</p>
          </div>
        </div>
        <div className="dashboard-action-grid">
          {quickActions.map((action) => (
            <button
              className="dashboard-action-card"
              key={action.targetPage}
              type="button"
              onClick={() => navigate(action.targetPage)}
            >
              <strong>{action.label}</strong>
              <span>{action.detail}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function MaintenanceAttentionRow({
  item,
  onNavigate,
}: {
  item: DashboardMaintenanceItem;
  onNavigate: (targetPage?: string | null) => void;
}) {
  return (
    <button
      className="dashboard-attention-row"
      type="button"
      onClick={() => onNavigate("maintenance")}
    >
      <div>
        <span className={`status-pill ${statusClass(item.dueStatus)}`}>
          {labelFromKey(item.dueStatus)}
        </span>
        <h3>{item.templateName}</h3>
        <p>
          {item.vehicleName}: {item.dueReason}
        </p>
      </div>
      <span>
        {item.nextDueDate ? formatDate(item.nextDueDate) : formatOdometer(item.nextDueOdometer)}
      </span>
    </button>
  );
}

function SetupHintRow({
  hint,
  onNavigate,
}: {
  hint: DashboardSetupHint;
  onNavigate: (targetPage?: string | null) => void;
}) {
  return (
    <button
      className="dashboard-attention-row setup"
      disabled={!isPageId(hint.targetPage)}
      type="button"
      onClick={() => onNavigate(hint.targetPage)}
    >
      <div>
        <span className="status-pill info">Setup</span>
        <h3>{hint.title}</h3>
        <p>{hint.message}</p>
      </div>
      <span>{hint.actionLabel ?? "Review"}</span>
    </button>
  );
}

function ActivityRow({
  activity,
  currency,
  onNavigate,
}: {
  activity: DashboardActivityItem;
  currency: string;
  onNavigate: (targetPage?: string | null) => void;
}) {
  return (
    <button
      className="dashboard-activity-row"
      disabled={!isPageId(activity.targetPage)}
      type="button"
      onClick={() => onNavigate(activity.targetPage)}
    >
      <div>
        <span>{labelFromKey(activity.activityType)}</span>
        <strong>{activity.title}</strong>
        <p>
          {activity.vehicleName ? `${activity.vehicleName}: ` : ""}
          {activity.detail}
        </p>
      </div>
      <div className="dashboard-activity-meta">
        <span>{formatDate(activity.happenedAt)}</span>
        {activity.amount != null ? <strong>{formatMoney(activity.amount, currency)}</strong> : null}
      </div>
    </button>
  );
}

function CostBreakdownRow({
  label,
  value,
  total,
  currency,
}: {
  label: string;
  value: number;
  total: number;
  currency: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="dashboard-cost-row">
      <div>
        <strong>{label}</strong>
        <span>{formatMoney(value, currency)}</span>
      </div>
      <div className="dashboard-cost-bar" aria-label={`${label} is ${percent}% of monthly cost`}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function isPageId(value?: string | null): value is PageId {
  return (
    value === "dashboard" ||
    value === "vehicles" ||
    value === "fuel" ||
    value === "maintenance" ||
    value === "service-history" ||
    value === "expenses" ||
    value === "reports" ||
    value === "alerts" ||
    value === "backup" ||
    value === "settings"
  );
}

function statusClass(value: string) {
  if (value === "overdue" || value === "critical" || value === "high") {
    return "archived";
  }

  if (value === "due_today" || value === "due_soon" || value === "medium") {
    return "under_maintenance";
  }

  if (value === "needs_setup") {
    return "inactive";
  }

  return "active";
}

function formatKmPerLiter(value?: number | null) {
  return value == null ? "-- km/L" : `${value.toFixed(1)} km/L`;
}

function formatOdometer(value?: number | null) {
  return value == null ? "Needs setup" : `${Math.round(value).toLocaleString()} km`;
}

function formatMoney(value: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatMonth(month: string) {
  if (!month) {
    return "This month";
  }

  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${month}/${day}/${year}`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "just now";
  }

  return value.replace("T", " ").slice(0, 16);
}

function labelFromKey(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

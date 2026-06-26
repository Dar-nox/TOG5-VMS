import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getApplicableMaintenanceTemplatesForVehicle,
  listMaintenanceSchedulesForVehicle,
  listMaintenanceTemplates,
  refreshMaintenanceAlertsForVehicle,
  syncMaintenanceSchedulesForVehicle,
  type ApplicableMaintenanceTemplate,
  type MaintenanceScheduleRecord,
  type MaintenanceTemplateRecord,
} from "../../services/api/maintenance";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

type MaintenanceTab = "schedules" | "applicability" | "library";

type ApplicabilitySummary = Record<ApplicableMaintenanceTemplate["applicabilityStatus"], number>;

const maintenanceTabs: Array<{ id: MaintenanceTab; label: string }> = [
  { id: "schedules", label: "Schedules" },
  { id: "applicability", label: "Applicability" },
  { id: "library", label: "Template Library" },
];

export function MaintenanceTemplateModule() {
  const [templates, setTemplates] = useState<MaintenanceTemplateRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<MaintenanceTab>("schedules");
  const [applicability, setApplicability] = useState<ApplicableMaintenanceTemplate[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicabilityLoading, setApplicabilityLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleActionLoading, setScheduleActionLoading] = useState(false);
  const [scheduleActionMessage, setScheduleActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const applicabilitySummary = useMemo<ApplicabilitySummary>(
    () =>
      applicability.reduce<ApplicabilitySummary>(
        (summary, result) => ({
          ...summary,
          [result.applicabilityStatus]: summary[result.applicabilityStatus] + 1,
        }),
        { applicable: 0, excluded: 0, requires_feature: 0, not_applicable: 0 },
      ),
    [applicability],
  );

  const templatesByCategory = useMemo(() => {
    const groups = new Map<string, MaintenanceTemplateRecord[]>();

    for (const template of templates) {
      const categoryTemplates = groups.get(template.category) ?? [];
      categoryTemplates.push(template);
      groups.set(template.category, categoryTemplates);
    }

    return Array.from(groups, ([category, categoryTemplates]) => ({
      category,
      templates: categoryTemplates,
    }));
  }, [templates]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [templateRecords, vehicleRecords] = await Promise.all([
        listMaintenanceTemplates(),
        listVehicles(),
      ]);

      setTemplates(templateRecords);
      setVehicles(vehicleRecords);
      setSelectedVehicleId((currentId) => {
        if (currentId && vehicleRecords.some((vehicle) => vehicle.id === currentId)) {
          return currentId;
        }

        return vehicleRecords[0]?.id ?? "";
      });
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    if (!selectedVehicleId) {
      setApplicability([]);
      setSchedules([]);
      return;
    }

    let cancelled = false;
    setApplicabilityLoading(true);
    setScheduleLoading(true);
    setScheduleActionMessage(null);
    setErrorMessage(null);

    void Promise.all([
      getApplicableMaintenanceTemplatesForVehicle(selectedVehicleId),
      listMaintenanceSchedulesForVehicle(selectedVehicleId),
    ])
      .then(([results, scheduleRecords]) => {
        if (!cancelled) {
          setApplicability(results);
          setSchedules(scheduleRecords);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(messageFromError(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setApplicabilityLoading(false);
          setScheduleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId]);

  const handleSyncSchedules = useCallback(async () => {
    if (!selectedVehicleId) {
      return;
    }

    setScheduleActionLoading(true);
    setScheduleActionMessage(null);
    setErrorMessage(null);

    try {
      const syncResult = await syncMaintenanceSchedulesForVehicle(selectedVehicleId);
      const alertResult = await refreshMaintenanceAlertsForVehicle(selectedVehicleId);
      setSchedules(syncResult.schedules);
      setScheduleActionMessage(
        `${syncResult.createdCount} schedules created, ${syncResult.updatedCount} statuses refreshed, and ${alertResult.createdCount} alerts created.`,
      );
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setScheduleActionLoading(false);
    }
  }, [selectedVehicleId]);

  const handleRefreshAlerts = useCallback(async () => {
    if (!selectedVehicleId) {
      return;
    }

    setScheduleActionLoading(true);
    setScheduleActionMessage(null);
    setErrorMessage(null);

    try {
      const alertResult = await refreshMaintenanceAlertsForVehicle(selectedVehicleId);
      const scheduleRecords = await listMaintenanceSchedulesForVehicle(selectedVehicleId);
      setSchedules(scheduleRecords);
      setScheduleActionMessage(
        `${alertResult.createdCount} alerts created, ${alertResult.updatedCount} alerts updated, and ${alertResult.resolvedCount} old alerts resolved.`,
      );
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setScheduleActionLoading(false);
    }
  }, [selectedVehicleId]);

  return (
    <div className="maintenance-module">
      <section className="maintenance-workspace">
        <div className="maintenance-workspace-header">
          <div>
            <h2>Maintenance</h2>
            <p>
              Work from vehicle schedules first, then review applicability and the default template
              library when you need reference details.
            </p>
          </div>

          {vehicles.length > 0 ? (
            <label className="maintenance-vehicle-select">
              <span>Vehicle</span>
              <select
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="maintenance-empty-note">
              Add a vehicle first to create schedules and preview template applicability.
            </div>
          )}
        </div>

        {selectedVehicle ? (
          <div className="vehicle-rule-summary" aria-label="Selected vehicle maintenance inputs">
            <span>{labelValue("Vehicle type", selectedVehicle.vehicleType)}</span>
            <span>{labelValue("Fuel", selectedVehicle.fuelType)}</span>
            <span>{labelValue("Transmission", selectedVehicle.transmissionType)}</span>
            <span>{labelValue("Drivetrain", selectedVehicle.drivetrain)}</span>
          </div>
        ) : null}

        <div className="maintenance-command-bar">
          <div>
            <strong>{selectedVehicle ? selectedVehicle.vehicleName : "No vehicle selected"}</strong>
            <span>
              Schedules are created only from templates that auto-apply to the selected vehicle.
            </span>
          </div>

          <div className="maintenance-action-row">
            <button
              className="primary-button"
              disabled={!selectedVehicleId || scheduleActionLoading}
              type="button"
              onClick={handleSyncSchedules}
            >
              {scheduleActionLoading ? "Working..." : "Create / sync schedules"}
            </button>
            <button
              className="secondary-button"
              disabled={!selectedVehicleId || scheduleActionLoading}
              type="button"
              onClick={handleRefreshAlerts}
            >
              Refresh alerts
            </button>
          </div>
        </div>

        {scheduleActionMessage ? (
          <div className="maintenance-action-note">{scheduleActionMessage}</div>
        ) : null}

        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

        <div className="maintenance-tabs" role="tablist" aria-label="Maintenance sections">
          {maintenanceTabs.map((tab) => (
            <button
              key={tab.id}
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="maintenance-tab-panel" role="tabpanel">
          {activeTab === "schedules" ? (
            <SchedulesPanel
              scheduleLoading={scheduleLoading}
              schedules={schedules}
              selectedVehicleId={selectedVehicleId}
            />
          ) : null}

          {activeTab === "applicability" ? (
            <ApplicabilityPanel
              applicability={applicability}
              applicabilityLoading={applicabilityLoading}
              selectedVehicleId={selectedVehicleId}
              summary={applicabilitySummary}
            />
          ) : null}

          {activeTab === "library" ? (
            <TemplateLibraryPanel
              loading={loading}
              templateGroups={templatesByCategory}
              templates={templates}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SchedulesPanel(props: {
  scheduleLoading: boolean;
  schedules: MaintenanceScheduleRecord[];
  selectedVehicleId: string;
}) {
  if (props.scheduleLoading) {
    return <div className="maintenance-empty-note">Loading vehicle schedules...</div>;
  }

  if (!props.selectedVehicleId) {
    return (
      <div className="maintenance-empty-note">
        Add or select a vehicle before creating schedules.
      </div>
    );
  }

  if (props.schedules.length === 0) {
    return (
      <div className="maintenance-empty-note">
        No schedules yet. Use Create / sync schedules to generate them from applicable templates.
      </div>
    );
  }

  return (
    <div className="maintenance-schedule-list" aria-label="Vehicle maintenance schedules">
      {props.schedules.map((schedule) => (
        <MaintenanceScheduleCard key={schedule.id} schedule={schedule} />
      ))}
    </div>
  );
}

function ApplicabilityPanel(props: {
  applicability: ApplicableMaintenanceTemplate[];
  applicabilityLoading: boolean;
  selectedVehicleId: string;
  summary: ApplicabilitySummary;
}) {
  if (props.applicabilityLoading) {
    return <div className="maintenance-empty-note">Checking template applicability...</div>;
  }

  if (!props.selectedVehicleId) {
    return (
      <div className="maintenance-empty-note">
        Add or select a vehicle to preview template applicability.
      </div>
    );
  }

  return (
    <div className="maintenance-panel-stack">
      <div className="applicability-summary" aria-label="Applicability summary">
        <span>Auto-applies: {props.summary.applicable}</span>
        <span>Excluded: {props.summary.excluded}</span>
        <span>Needs feature: {props.summary.requires_feature}</span>
        <span>Not applicable: {props.summary.not_applicable}</span>
      </div>

      <div className="maintenance-template-list" aria-label="Applicable maintenance templates">
        {props.applicability.map((result) => (
          <MaintenanceTemplateCard
            key={result.template.id}
            compact
            result={result}
            showApplicability
          />
        ))}
      </div>
    </div>
  );
}

function TemplateLibraryPanel(props: {
  loading: boolean;
  templateGroups: Array<{ category: string; templates: MaintenanceTemplateRecord[] }>;
  templates: MaintenanceTemplateRecord[];
}) {
  if (props.loading) {
    return <div className="maintenance-empty-note">Loading templates...</div>;
  }

  if (props.templates.length === 0) {
    return (
      <div className="maintenance-empty-note">No maintenance templates are available yet.</div>
    );
  }

  return (
    <div className="template-library-groups" aria-label="Default maintenance template library">
      {props.templateGroups.map((group) => (
        <section key={group.category} className="template-library-group">
          <h3>{labelValue("", group.category)}</h3>
          <div className="template-library-list">
            {group.templates.map((template) => (
              <MaintenanceTemplateCard key={template.id} template={template} compact />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MaintenanceTemplateCard(props: {
  result?: ApplicableMaintenanceTemplate;
  showApplicability?: boolean;
  compact?: boolean;
  template?: MaintenanceTemplateRecord;
}) {
  const template = props.result?.template ?? props.template;

  if (!template) {
    return null;
  }

  return (
    <article
      className={`maintenance-template-card ${props.compact ? "compact" : ""} ${
        props.showApplicability ? "with-applicability" : ""
      }`}
    >
      <div className="maintenance-template-main">
        <div className="maintenance-card-heading">
          <span className="maintenance-category">{labelValue("", template.category)}</span>
          <span className={`priority-pill ${template.priority}`}>
            {labelValue("", template.priority)}
          </span>
        </div>

        <h3>{template.name}</h3>
        {template.description ? <p>{template.description}</p> : null}

        <div className="maintenance-intervals">
          <span>{intervalDays(template.defaultTimeIntervalDays)}</span>
          <span>{intervalKm(template.defaultOdometerIntervalKm)}</span>
        </div>
      </div>

      {props.showApplicability && props.result ? (
        <div className={`applicability-note ${props.result.applicabilityStatus}`}>
          <strong>{statusLabel(props.result.applicabilityStatus)}</strong>
          <span>{props.result.reason}</span>
          {props.result.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function MaintenanceScheduleCard({ schedule }: { schedule: MaintenanceScheduleRecord }) {
  return (
    <article className="maintenance-schedule-card">
      <div className="maintenance-schedule-main">
        <div className="maintenance-card-heading">
          <span className="maintenance-category">{labelValue("", schedule.category)}</span>
          <span className={`schedule-status-pill ${schedule.dueStatus}`}>
            {scheduleStatusLabel(schedule.dueStatus)}
          </span>
        </div>

        <h3>{schedule.templateName}</h3>
        <p>{schedule.dueReason}</p>
      </div>

      <div className="maintenance-schedule-meta">
        <span>
          {schedule.nextDueDate ? `Date: ${formatDate(schedule.nextDueDate)}` : "No due date"}
        </span>
        <span>
          {schedule.nextDueOdometer
            ? `Odometer: ${formatOdometer(schedule.nextDueOdometer)} km`
            : "No odometer target"}
        </span>
        <span>
          Due soon: {schedule.dueSoonDays} days / {schedule.dueSoonKm.toLocaleString()} km
        </span>
      </div>

      {schedule.notes ? <div className="maintenance-action-note">{schedule.notes}</div> : null}
    </article>
  );
}

function intervalDays(days?: number | null) {
  if (!days) {
    return "No time interval";
  }

  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} ${months === 1 ? "month" : "months"}`;
  }

  return `${days} days`;
}

function intervalKm(kilometers?: number | null) {
  return kilometers ? `${kilometers.toLocaleString()} km` : "No odometer interval";
}

function statusLabel(status: ApplicableMaintenanceTemplate["applicabilityStatus"]) {
  switch (status) {
    case "applicable":
      return "Auto-applies";
    case "excluded":
      return "Excluded";
    case "requires_feature":
      return "Needs feature";
    case "not_applicable":
      return "Not applicable";
    default:
      return status;
  }
}

function scheduleStatusLabel(status: MaintenanceScheduleRecord["dueStatus"]) {
  switch (status) {
    case "not_due":
      return "Not due";
    case "due_soon":
      return "Due soon";
    case "due_today":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "needs_setup":
      return "Needs setup";
    case "disabled":
      return "Disabled";
    default:
      return labelValue("", status);
  }
}

function formatDate(date: string) {
  return date.slice(0, 10);
}

function formatOdometer(value: number) {
  return Math.round(value).toLocaleString();
}

function labelValue(label: string, value: string) {
  const formatted = value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return label ? `${label}: ${formatted}` : formatted;
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

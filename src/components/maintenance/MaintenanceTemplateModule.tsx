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

export function MaintenanceTemplateModule() {
  const [templates, setTemplates] = useState<MaintenanceTemplateRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
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
      <section className="maintenance-toolbar">
        <div>
          <h2>Maintenance</h2>
          <p>
            Review template applicability, create vehicle-specific schedules, and refresh local
            in-app maintenance alerts. Completion logs come later.
          </p>
        </div>
      </section>

      {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

      <section className="maintenance-preview-panel">
        <div className="maintenance-selector">
          <div>
            <h3>Vehicle applicability preview</h3>
            <p>
              Pick a saved vehicle to see which templates auto-apply, which are excluded, and which
              need a feature flag such as DEF/AdBlue or DPF.
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
              Add a vehicle first to preview template applicability.
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

        <div className="maintenance-template-grid" aria-label="Applicable maintenance templates">
          {applicabilityLoading ? (
            <div className="maintenance-empty-note">Checking template applicability...</div>
          ) : null}

          {!applicabilityLoading && selectedVehicleId
            ? applicability.map((result) => (
                <MaintenanceTemplateCard
                  key={result.template.id}
                  result={result}
                  showApplicability
                />
              ))
            : null}
        </div>
      </section>

      <section className="maintenance-schedule-panel">
        <div className="section-heading maintenance-section-actions">
          <div>
            <h2>Vehicle schedules</h2>
            <p>
              Create schedules from auto-applicable templates only. Excluded, not-applicable, and
              feature-required templates are left out until the vehicle details support them.
            </p>
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

        <div className="maintenance-schedule-grid" aria-label="Vehicle maintenance schedules">
          {scheduleLoading ? (
            <div className="maintenance-empty-note">Loading vehicle schedules...</div>
          ) : null}

          {!scheduleLoading && !selectedVehicleId ? (
            <div className="maintenance-empty-note">
              Add or select a vehicle before creating schedules.
            </div>
          ) : null}

          {!scheduleLoading && selectedVehicleId && schedules.length === 0 ? (
            <div className="maintenance-empty-note">
              No schedules yet. Use Create / sync schedules to generate them from applicable
              templates.
            </div>
          ) : null}

          {!scheduleLoading
            ? schedules.map((schedule) => (
                <MaintenanceScheduleCard key={schedule.id} schedule={schedule} />
              ))
            : null}
        </div>
      </section>

      <section className="maintenance-library-panel">
        <div className="section-heading">
          <h2>Default template library</h2>
          <p>
            These defaults are seeded locally and are safe to run more than once. They do not create
            schedules yet.
          </p>
        </div>

        <div
          className="maintenance-template-grid"
          aria-label="Default maintenance template library"
        >
          {loading ? <div className="maintenance-empty-note">Loading templates...</div> : null}
          {!loading && templates.length === 0 ? (
            <div className="maintenance-empty-note">
              No maintenance templates are available yet.
            </div>
          ) : null}
          {!loading
            ? templates.map((template) => (
                <MaintenanceTemplateCard key={template.id} template={template} />
              ))
            : null}
        </div>
      </section>
    </div>
  );
}

function MaintenanceTemplateCard(props: {
  result?: ApplicableMaintenanceTemplate;
  showApplicability?: boolean;
  template?: MaintenanceTemplateRecord;
}) {
  const template = props.result?.template ?? props.template;

  if (!template) {
    return null;
  }

  return (
    <article className="maintenance-template-card">
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
      <div className="maintenance-card-heading">
        <span className="maintenance-category">{labelValue("", schedule.category)}</span>
        <span className={`schedule-status-pill ${schedule.dueStatus}`}>
          {scheduleStatusLabel(schedule.dueStatus)}
        </span>
      </div>

      <h3>{schedule.templateName}</h3>
      <p>{schedule.dueReason}</p>

      <div className="maintenance-intervals">
        <span>
          {schedule.nextDueDate ? `Due date: ${formatDate(schedule.nextDueDate)}` : "No due date"}
        </span>
        <span>
          {schedule.nextDueOdometer
            ? `Due odometer: ${formatOdometer(schedule.nextDueOdometer)} km`
            : "No odometer target"}
        </span>
      </div>

      <div className="schedule-thresholds">
        <span>Due soon: {schedule.dueSoonDays} days</span>
        <span>Due soon: {schedule.dueSoonKm.toLocaleString()} km</span>
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

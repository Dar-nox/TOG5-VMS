import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getApplicableMaintenanceTemplatesForVehicle,
  listMaintenanceTemplates,
  type ApplicableMaintenanceTemplate,
  type MaintenanceTemplateRecord,
} from "../../services/api/maintenance";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

export function MaintenanceTemplateModule() {
  const [templates, setTemplates] = useState<MaintenanceTemplateRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [applicability, setApplicability] = useState<ApplicableMaintenanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicabilityLoading, setApplicabilityLoading] = useState(false);
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
      return;
    }

    let cancelled = false;
    setApplicabilityLoading(true);
    setErrorMessage(null);

    void getApplicableMaintenanceTemplatesForVehicle(selectedVehicleId)
      .then((results) => {
        if (!cancelled) {
          setApplicability(results);
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
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId]);

  return (
    <div className="maintenance-module">
      <section className="maintenance-toolbar">
        <div>
          <h2>Maintenance Templates</h2>
          <p>
            Review the default local template library and preview which tasks match a vehicle.
            Scheduling, alerts, and completion logs come later.
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

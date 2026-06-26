import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listServiceHistoryForVehicle,
  maintenanceFileUrl,
  type MaintenanceLogRecord,
} from "../../services/api/maintenance";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

export function ServiceHistoryModule() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [logs, setLogs] = useState<MaintenanceLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const loadHistory = useCallback(async (vehicleId: string) => {
    setHistoryLoading(true);
    setErrorMessage(null);

    try {
      setLogs(await listServiceHistoryForVehicle(vehicleId));
    } catch (error) {
      setErrorMessage(messageFromError(error));
      setLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const vehicleRecords = await listVehicles();
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
    if (selectedVehicleId) {
      void loadHistory(selectedVehicleId);
    } else {
      setLogs([]);
    }
  }, [loadHistory, selectedVehicleId]);

  return (
    <div className="service-history-module">
      <section className="service-history-workspace">
        <div className="service-history-header">
          <div>
            <h2>Service History</h2>
            <p>
              Completed maintenance records saved locally for each vehicle. Reports and expenses
              come later.
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
          ) : null}
        </div>

        {selectedVehicle ? (
          <div className="vehicle-rule-summary" aria-label="Selected service history vehicle">
            <span>{selectedVehicle.vehicleName}</span>
            <span>Odometer: {formatOdometer(selectedVehicle.currentOdometer)} km</span>
            <span>{labelValue("Fuel", selectedVehicle.fuelType)}</span>
          </div>
        ) : null}

        {loading ? <div className="maintenance-empty-note">Loading vehicles...</div> : null}

        {!loading && vehicles.length === 0 ? (
          <div className="maintenance-empty-note">
            Add a vehicle and complete maintenance schedules before service history appears here.
          </div>
        ) : null}

        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

        {historyLoading ? (
          <div className="maintenance-empty-note">Loading service history...</div>
        ) : null}

        {!historyLoading && selectedVehicleId && logs.length === 0 ? (
          <div className="maintenance-empty-note">
            No completed maintenance yet. Use the Maintenance page to complete a schedule.
          </div>
        ) : null}

        {!historyLoading && logs.length > 0 ? (
          <div className="service-history-list" aria-label="Completed service history">
            {logs.map((log) => (
              <ServiceHistoryCard key={log.id} log={log} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ServiceHistoryCard({ log }: { log: MaintenanceLogRecord }) {
  const receiptHref = maintenanceFileUrl(log.receiptFilePath);
  const beforeHref = maintenanceFileUrl(log.beforePhotoPath);
  const afterHref = maintenanceFileUrl(log.afterPhotoPath);

  return (
    <article className="service-history-card">
      <div className="service-history-main">
        <div className="maintenance-card-heading">
          <span className="maintenance-category">{formatDate(log.completedDate)}</span>
          <span className="priority-pill">{formatMoney(log.totalCost)}</span>
        </div>

        <h3>{log.templateName ?? "Maintenance service"}</h3>
        <p>{log.workPerformed}</p>

        {log.partsReplaced ? (
          <div className="maintenance-action-note">Parts: {log.partsReplaced}</div>
        ) : null}
      </div>

      <div className="service-history-meta">
        <span>Odometer: {formatOdometer(log.odometer)} km</span>
        <span>Provider: {log.mechanicShop ?? "Not recorded"}</span>
        <span>Labor: {formatMoney(log.laborCost)}</span>
        <span>Parts: {formatMoney(log.partsCost)}</span>
        <span>
          Warranty: {log.warrantyExpiration ? formatDate(log.warrantyExpiration) : "Not recorded"}
        </span>
        <span>
          Next date: {log.nextRecommendedDate ? formatDate(log.nextRecommendedDate) : "None"}
        </span>
        <span>
          Next odometer:{" "}
          {log.nextRecommendedOdometer
            ? `${formatOdometer(log.nextRecommendedOdometer)} km`
            : "None"}
        </span>
      </div>

      <div className="service-history-attachments">
        {receiptHref ? (
          <a href={receiptHref} rel="noreferrer" target="_blank">
            Receipt: {log.receiptOriginalFilename ?? "Stored receipt"}
          </a>
        ) : (
          <span>No receipt</span>
        )}
        {beforeHref ? (
          <a href={beforeHref} rel="noreferrer" target="_blank">
            Before photo
          </a>
        ) : (
          <span>No before photo</span>
        )}
        {afterHref ? (
          <a href={afterHref} rel="noreferrer" target="_blank">
            After photo
          </a>
        ) : (
          <span>No after photo</span>
        )}
      </div>

      {log.notes ? <div className="maintenance-action-note">{log.notes}</div> : null}
    </article>
  );
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function formatOdometer(value: number) {
  return Math.round(value).toLocaleString();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    currency: "PHP",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
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

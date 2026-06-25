import { useCallback, useEffect, useState } from "react";
import { dismissAlert, listAlerts } from "../../services/api/alerts";
import type { AlertRecord } from "../../services/api/maintenance";

export function AlertsModule() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionAlertId, setActionAlertId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      setAlerts(await listAlerts());
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const handleDismiss = useCallback(async (alertId: string) => {
    setActionAlertId(alertId);
    setErrorMessage(null);

    try {
      await dismissAlert(alertId);
      setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== alertId));
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setActionAlertId(null);
    }
  }, []);

  return (
    <div className="alerts-module">
      <section className="alerts-toolbar">
        <div>
          <h2>Alerts</h2>
          <p>
            Active local reminders for maintenance that is due soon, due today, or overdue. No
            desktop notifications are sent yet.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={loadAlerts}>
          Refresh
        </button>
      </section>

      {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

      <section className="alerts-list" aria-label="Active maintenance alerts">
        {loading ? <div className="maintenance-empty-note">Loading alerts...</div> : null}

        {!loading && alerts.length === 0 ? (
          <div className="maintenance-empty-note">
            No active maintenance alerts yet. Create schedules from the Maintenance page, then
            refresh alerts for a selected vehicle.
          </div>
        ) : null}

        {!loading
          ? alerts.map((alert) => (
              <article key={alert.id} className={`real-alert-card ${alert.priority}`}>
                <div className="maintenance-card-heading">
                  <span className={`schedule-status-pill ${alertStatusClass(alert.alertType)}`}>
                    {alertTypeLabel(alert.alertType)}
                  </span>
                  <span className={`priority-pill ${alert.priority}`}>
                    {labelValue(alert.priority)}
                  </span>
                </div>

                <h3>{alert.title}</h3>
                <p>{alert.message}</p>

                <div className="alert-meta">
                  <span>{alert.vehicleName ?? "Vehicle not available"}</span>
                  <span>{alert.maintenanceTemplateName ?? "Maintenance item"}</span>
                  <span>Status: {labelValue(alert.status)}</span>
                </div>

                <button
                  className="secondary-button"
                  disabled={actionAlertId === alert.id}
                  type="button"
                  onClick={() => void handleDismiss(alert.id)}
                >
                  {actionAlertId === alert.id ? "Dismissing..." : "Dismiss"}
                </button>
              </article>
            ))
          : null}
      </section>
    </div>
  );
}

function alertTypeLabel(alertType: string) {
  switch (alertType) {
    case "overdue_by_date":
      return "Overdue by date";
    case "overdue_by_odometer":
      return "Overdue by odometer";
    case "due_soon_by_date":
      return "Due soon by date";
    case "due_soon_by_odometer":
      return "Due soon by odometer";
    default:
      return labelValue(alertType);
  }
}

function alertStatusClass(alertType: string) {
  return alertType.startsWith("overdue") ? "overdue" : "due_soon";
}

function labelValue(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

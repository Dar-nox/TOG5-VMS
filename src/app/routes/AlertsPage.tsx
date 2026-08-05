import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useConfirm } from "../providers/confirmContext";
import { useFormat } from "../providers/formatContext";
import { useToast } from "../providers/toastContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataList, DataRow, MetaItem } from "../../components/ui/DataRow";
import { SkeletonRows } from "../../components/ui/Spinner";
import { EmptyState, ErrorBlock } from "../../components/ui/States";
import { toneForPriority } from "../../components/ui/tones";
import { messageFromError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { labelFromKey } from "../../lib/text";
import { dismissAlert, refreshActiveAlerts } from "../../services/api/alerts";
import type { AlertRecord } from "../../services/api/maintenance";

/**
 * What needs attention across the whole fleet.
 *
 * Alerts were laid out as a three-column grid of cards — a masonry of boxes
 * where the only thing that matters is which one is worst. They are a list
 * now, ordered by how bad it is, because that ordering is the entire value of
 * the screen.
 */
export default function AlertsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const fmt = useFormat();

  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await refreshActiveAlerts();
      setAlerts([...result.alerts].sort(bySeverity));
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDismiss(alert: AlertRecord) {
    // This had no confirmation at all, and dismissing is permanent: a
    // dismissed alert suppresses that alert type for that schedule for good.
    // Of everything in the app it is the action most worth stopping to think
    // about, and it was one tap.
    const confirmed = await confirm({
      title: "Dismiss this alert?",
      body: `"${alert.title}" will not come back for this reminder, even if it stays overdue. The work itself is still recorded as due.`,
      confirmLabel: "Dismiss alert",
    });

    if (!confirmed) {
      return;
    }

    setBusyId(alert.id);

    try {
      await dismissAlert(alert.id);
      setAlerts((current) => current.filter((item) => item.id !== alert.id));
      toast.success("Alert dismissed.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-heading @md:text-2xl">Alerts</h1>
        <Button loading={loading} onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {error ? <ErrorBlock action={<Button onClick={() => void load()}>Try again</Button>} message={error} /> : null}

      {loading ? (
        <SkeletonRows rows={3} />
      ) : alerts.length === 0 ? (
        <EmptyState title="Nothing needs attention." />
      ) : (
        <DataList>
          {alerts.map((alert) => (
            <DataRow
              actions={
                <Button
                  loading={busyId === alert.id}
                  onClick={() => void handleDismiss(alert)}
                  variant="quiet"
                >
                  Dismiss
                </Button>
              }
              key={alert.id}
              meta={
                <>
                  <MetaItem label="Vehicle" value={alert.vehicleName ?? "—"} />
                  <MetaItem label="Item" value={alert.maintenanceTemplateName ?? relatedLabel(alert)} />
                  <MetaItem label="Due" numeric value={fmt.date(alert.dueDate)} />
                </>
              }
              onClick={alert.vehicleId ? () => void navigate(routes.vehicle(alert.vehicleId!, "maintenance")) : undefined}
              openLabel={alert.vehicleName ? `Open ${alert.vehicleName}` : undefined}
              subtitle={alert.message}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {alert.title}
                  <Badge tone={toneForPriority(alert.priority)}>
                    {labelFromKey(alert.priority)}
                  </Badge>
                </span>
              }
            />
          ))}
        </DataList>
      )}
    </div>
  );
}

/** Worst first. The screen exists to answer "what should I deal with?" */
function bySeverity(a: AlertRecord, b: AlertRecord): number {
  return priorityRank(a.priority) - priorityRank(b.priority);
}

function priorityRank(priority: string): number {
  switch (priority) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    default:
      return 3;
  }
}

function relatedLabel(alert: AlertRecord): string {
  return alert.relatedRecordType === "fuel_log" ? "Fuel log" : "Maintenance item";
}

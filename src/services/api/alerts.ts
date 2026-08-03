import { rpc, supabase, unwrap } from "./client";
import type { AlertRecord } from "./maintenance";

export async function listAlerts(): Promise<AlertRecord[]> {
  return unwrap(
    await supabase
      .from("alerts_detailed")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  );
}

export type RefreshActiveAlertsResult = {
  vehicleCount: number;
  createdCount: number;
  updatedCount: number;
  resolvedCount: number;
  alerts: AlertRecord[];
};

/**
 * Re-checks every vehicle's reminders.
 *
 * The desktop version listed the vehicles and then made one request each —
 * fine over local IPC, one request per vehicle plus two over a network. The
 * fan-out lives in the database now, so this is a single call.
 */
export async function refreshActiveAlerts(): Promise<RefreshActiveAlertsResult> {
  const result = await rpc<{
    createdCount: number;
    updatedCount: number;
    resolvedCount: number;
  }>("refresh_maintenance_alerts_for_all_vehicles");

  const [alerts, vehicleCount] = await Promise.all([listAlerts(), countVehicles()]);

  return {
    vehicleCount,
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
    resolvedCount: result.resolvedCount,
    alerts,
  };
}

export async function dismissAlert(alertId: string): Promise<void> {
  await rpc<void>("dismiss_alert", { alert_id: alertId });
}

async function countVehicles(): Promise<number> {
  const { count } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  return count ?? 0;
}

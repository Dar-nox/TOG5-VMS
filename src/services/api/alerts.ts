import { invoke } from "@tauri-apps/api/core";
import {
  refreshMaintenanceAlertsForVehicle,
  type AlertRecord,
  type RefreshMaintenanceAlertsResult,
} from "./maintenance";
import { listVehicles } from "./vehicles";

const alertCommands = {
  list: "list_alerts",
  dismiss: "dismiss_alert",
} as const;

export async function listAlerts(): Promise<AlertRecord[]> {
  return invoke<AlertRecord[]>(alertCommands.list);
}

export type RefreshActiveAlertsResult = {
  vehicleCount: number;
  createdCount: number;
  updatedCount: number;
  resolvedCount: number;
  alerts: AlertRecord[];
};

export async function refreshActiveAlerts(): Promise<RefreshActiveAlertsResult> {
  const vehicles = await listVehicles();
  const results = await Promise.all(
    vehicles.map((vehicle) => refreshMaintenanceAlertsForVehicle(vehicle.id)),
  );
  const alerts = await listAlerts();

  return {
    vehicleCount: vehicles.length,
    createdCount: sumRefreshCounts(results, "createdCount"),
    updatedCount: sumRefreshCounts(results, "updatedCount"),
    resolvedCount: sumRefreshCounts(results, "resolvedCount"),
    alerts,
  };
}

export async function dismissAlert(alertId: string): Promise<void> {
  return invoke<void>(alertCommands.dismiss, { alertId });
}

function sumRefreshCounts(
  results: RefreshMaintenanceAlertsResult[],
  field: "createdCount" | "updatedCount" | "resolvedCount",
) {
  return results.reduce((total, result) => total + result[field], 0);
}

import { invoke } from "@tauri-apps/api/core";
import type { AlertRecord } from "./maintenance";

const alertCommands = {
  list: "list_alerts",
  dismiss: "dismiss_alert",
} as const;

export async function listAlerts(): Promise<AlertRecord[]> {
  return invoke<AlertRecord[]>(alertCommands.list);
}

export async function dismissAlert(alertId: string): Promise<void> {
  return invoke<void>(alertCommands.dismiss, { alertId });
}

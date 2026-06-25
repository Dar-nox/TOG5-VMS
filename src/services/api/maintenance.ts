import { invoke } from "@tauri-apps/api/core";
import type {
  AlertPriority,
  AlertStatus,
  AlertType,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceScheduleStatus,
} from "../../domain";
import type { Drivetrain, TransmissionType, VehicleFuelType, VehicleType } from "../../domain";

const maintenanceCommands = {
  listTemplates: "list_maintenance_templates",
  applicableForVehicle: "get_applicable_maintenance_templates_for_vehicle",
  seedTemplates: "seed_maintenance_templates",
  listSchedulesForVehicle: "list_maintenance_schedules_for_vehicle",
  syncSchedulesForVehicle: "sync_maintenance_schedules_for_vehicle",
  refreshAlertsForVehicle: "refresh_maintenance_alerts_for_vehicle",
} as const;

export type MaintenanceTemplateRuleRecord = {
  id: string;
  templateId: string;
  appliesToVehicleType?: VehicleType | null;
  appliesToFuelType?: VehicleFuelType | null;
  appliesToTransmissionType?: TransmissionType | null;
  appliesToDrivetrain?: Drivetrain | null;
  requiresFeature?: string | null;
  excludesFeature?: string | null;
  ruleType: "include" | "exclude";
  notes?: string | null;
};

export type MaintenanceTemplateRecord = {
  id: string;
  templateKey?: string | null;
  name: string;
  category: MaintenanceCategory | string;
  description?: string | null;
  defaultTimeIntervalDays?: number | null;
  defaultOdometerIntervalKm?: number | null;
  defaultDueSoonDays: number;
  defaultDueSoonKm: number;
  priority: MaintenancePriority;
  isActive: boolean;
  rules: MaintenanceTemplateRuleRecord[];
};

export type ApplicableMaintenanceTemplate = {
  template: MaintenanceTemplateRecord;
  applicabilityStatus: "applicable" | "excluded" | "requires_feature" | "not_applicable";
  isAutoApplicable: boolean;
  reason: string;
  warnings: string[];
  matchedRuleIds: string[];
};

export type SeedMaintenanceTemplatesResult = {
  templateCount: number;
  ruleCount: number;
};

export type MaintenanceScheduleRecord = {
  id: string;
  vehicleId: string;
  templateId: string;
  templateKey?: string | null;
  templateName: string;
  category: MaintenanceCategory | string;
  lastCompletedDate?: string | null;
  lastCompletedOdometer?: number | null;
  nextDueDate?: string | null;
  nextDueOdometer?: number | null;
  dueSoonDays: number;
  dueSoonKm: number;
  status: MaintenanceScheduleStatus;
  dueStatus: MaintenanceScheduleStatus;
  dueReason: string;
  priority: MaintenancePriority;
  notes?: string | null;
  updatedAt: string;
};

export type SyncMaintenanceSchedulesResult = {
  vehicleId: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  schedules: MaintenanceScheduleRecord[];
};

export type AlertRecord = {
  id: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  maintenanceScheduleId?: string | null;
  maintenanceTemplateName?: string | null;
  alertType: AlertType | string;
  priority: AlertPriority;
  title: string;
  message: string;
  relatedRecordType?: string | null;
  relatedRecordId?: string | null;
  status: AlertStatus;
  dueDate?: string | null;
  snoozedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
};

export type RefreshMaintenanceAlertsResult = {
  vehicleId: string;
  createdCount: number;
  updatedCount: number;
  resolvedCount: number;
  activeAlerts: AlertRecord[];
};

export async function listMaintenanceTemplates(): Promise<MaintenanceTemplateRecord[]> {
  return invoke<MaintenanceTemplateRecord[]>(maintenanceCommands.listTemplates);
}

export async function getApplicableMaintenanceTemplatesForVehicle(
  vehicleId: string,
): Promise<ApplicableMaintenanceTemplate[]> {
  return invoke<ApplicableMaintenanceTemplate[]>(maintenanceCommands.applicableForVehicle, {
    vehicleId,
  });
}

export async function seedMaintenanceTemplates(): Promise<SeedMaintenanceTemplatesResult> {
  return invoke<SeedMaintenanceTemplatesResult>(maintenanceCommands.seedTemplates);
}

export async function listMaintenanceSchedulesForVehicle(
  vehicleId: string,
): Promise<MaintenanceScheduleRecord[]> {
  return invoke<MaintenanceScheduleRecord[]>(maintenanceCommands.listSchedulesForVehicle, {
    vehicleId,
  });
}

export async function syncMaintenanceSchedulesForVehicle(
  vehicleId: string,
): Promise<SyncMaintenanceSchedulesResult> {
  return invoke<SyncMaintenanceSchedulesResult>(maintenanceCommands.syncSchedulesForVehicle, {
    vehicleId,
  });
}

export async function refreshMaintenanceAlertsForVehicle(
  vehicleId: string,
): Promise<RefreshMaintenanceAlertsResult> {
  return invoke<RefreshMaintenanceAlertsResult>(maintenanceCommands.refreshAlertsForVehicle, {
    vehicleId,
  });
}

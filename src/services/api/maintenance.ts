import { convertFileSrc, invoke } from "@tauri-apps/api/core";
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
  listVehicleMaintenanceSettings: "list_vehicle_maintenance_settings",
  upsertVehicleMaintenanceSetting: "upsert_vehicle_maintenance_setting",
  archiveVehicleMaintenanceSetting: "archive_vehicle_maintenance_setting",
  refreshAlertsForVehicle: "refresh_maintenance_alerts_for_vehicle",
  completeSchedule: "complete_maintenance_schedule",
  logMaintenance: "log_maintenance",
  listServiceHistoryForVehicle: "list_service_history_for_vehicle",
  getMaintenanceLog: "get_maintenance_log",
  storeReceipt: "store_maintenance_receipt",
  storePhoto: "store_maintenance_photo",
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

export type VehicleMaintenanceSettingRecord = {
  id: string;
  vehicleId: string;
  templateId: string;
  templateKey?: string | null;
  templateName: string;
  category: MaintenanceCategory | string;
  status: "active" | "manually_added" | "disabled" | "not_applicable" | string;
  customTimeIntervalDays?: number | null;
  customOdometerIntervalKm?: number | null;
  customDueSoonDays?: number | null;
  customDueSoonKm?: number | null;
  effectiveDueSoonDays: number;
  effectiveDueSoonKm: number;
  priority: MaintenancePriority;
  notes?: string | null;
  updatedAt: string;
};

export type UpsertVehicleMaintenanceSettingRequest = {
  vehicleId: string;
  templateId: string;
  status?: string;
  customTimeIntervalDays?: number;
  customOdometerIntervalKm?: number;
  customDueSoonDays?: number;
  customDueSoonKm?: number;
  notes?: string;
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

export type CompleteMaintenanceScheduleRequest = {
  scheduleId: string;
  completedDate: string;
  odometer?: number;
  workPerformed: string;
  partsReplaced?: string;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  mechanicShop?: string;
  receiptDocumentId?: string;
  beforePhotoId?: string;
  afterPhotoId?: string;
  warrantyExpiration?: string;
  notes?: string;
};

export type LogMaintenanceRequest = {
  vehicleId: string;
  templateId: string;
  completedDate: string;
  odometer?: number;
  workPerformed: string;
  partsReplaced?: string;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  mechanicShop?: string;
  receiptDocumentId?: string;
  beforePhotoId?: string;
  afterPhotoId?: string;
  warrantyExpiration?: string;
  notes?: string;
};

export type MaintenanceLogRecord = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  templateId?: string | null;
  templateKey?: string | null;
  templateName?: string | null;
  scheduleId?: string | null;
  completedDate: string;
  odometer: number;
  workPerformed: string;
  partsReplaced?: string | null;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  mechanicShop?: string | null;
  receiptDocumentId?: string | null;
  receiptFilePath?: string | null;
  receiptOriginalFilename?: string | null;
  beforePhotoId?: string | null;
  beforePhotoPath?: string | null;
  afterPhotoId?: string | null;
  afterPhotoPath?: string | null;
  warrantyExpiration?: string | null;
  nextRecommendedDate?: string | null;
  nextRecommendedOdometer?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompleteMaintenanceScheduleResult = {
  log: MaintenanceLogRecord;
  schedule: MaintenanceScheduleRecord;
  resolvedAlertCount: number;
};

export type LogMaintenanceResult = {
  log: MaintenanceLogRecord;
  schedule?: MaintenanceScheduleRecord | null;
  resolvedAlertCount: number;
  reminderUsed: boolean;
};

export type MaintenanceAttachmentRecord = {
  id: string;
  vehicleId: string;
  filePath: string;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSizeBytes: number;
  createdAt?: string | null;
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

export async function listVehicleMaintenanceSettings(
  vehicleId: string,
): Promise<VehicleMaintenanceSettingRecord[]> {
  return invoke<VehicleMaintenanceSettingRecord[]>(
    maintenanceCommands.listVehicleMaintenanceSettings,
    { vehicleId },
  );
}

export async function upsertVehicleMaintenanceSetting(
  request: UpsertVehicleMaintenanceSettingRequest,
): Promise<VehicleMaintenanceSettingRecord> {
  return invoke<VehicleMaintenanceSettingRecord>(
    maintenanceCommands.upsertVehicleMaintenanceSetting,
    { request },
  );
}

export async function archiveVehicleMaintenanceSetting(settingId: string): Promise<void> {
  return invoke<void>(maintenanceCommands.archiveVehicleMaintenanceSetting, { settingId });
}

export async function refreshMaintenanceAlertsForVehicle(
  vehicleId: string,
): Promise<RefreshMaintenanceAlertsResult> {
  return invoke<RefreshMaintenanceAlertsResult>(maintenanceCommands.refreshAlertsForVehicle, {
    vehicleId,
  });
}

export async function completeMaintenanceSchedule(
  request: CompleteMaintenanceScheduleRequest,
): Promise<CompleteMaintenanceScheduleResult> {
  return invoke<CompleteMaintenanceScheduleResult>(maintenanceCommands.completeSchedule, {
    request,
  });
}

export async function logMaintenance(
  request: LogMaintenanceRequest,
): Promise<LogMaintenanceResult> {
  return invoke<LogMaintenanceResult>(maintenanceCommands.logMaintenance, { request });
}

export async function listServiceHistoryForVehicle(
  vehicleId: string,
): Promise<MaintenanceLogRecord[]> {
  return invoke<MaintenanceLogRecord[]>(maintenanceCommands.listServiceHistoryForVehicle, {
    vehicleId,
  });
}

export async function getMaintenanceLog(id: string): Promise<MaintenanceLogRecord> {
  return invoke<MaintenanceLogRecord>(maintenanceCommands.getMaintenanceLog, { id });
}

export async function storeMaintenanceReceipt(
  vehicleId: string,
  file: File,
): Promise<MaintenanceAttachmentRecord> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));

  return invoke<MaintenanceAttachmentRecord>(maintenanceCommands.storeReceipt, {
    request: {
      vehicleId,
      originalFilename: file.name,
      mimeType: file.type || undefined,
      bytes,
    },
  });
}

export async function storeMaintenancePhoto(
  vehicleId: string,
  file: File,
): Promise<MaintenanceAttachmentRecord> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));

  return invoke<MaintenanceAttachmentRecord>(maintenanceCommands.storePhoto, {
    request: {
      vehicleId,
      originalFilename: file.name,
      mimeType: file.type || undefined,
      bytes,
    },
  });
}

export function maintenanceFileUrl(filePath?: string | null): string | undefined {
  return filePath ? convertFileSrc(filePath.replace(/\\/g, "/")) : undefined;
}

/**
 * Maintenance items, reminders, schedules and service history.
 *
 * Almost every write here goes through a database function rather than a table
 * update. Completing a service touches four tables and either all of it lands
 * or none of it does — done from the browser it would be four requests that can
 * fail halfway, leaving a van with a service record and a reminder still
 * showing overdue.
 *
 * Seeding is gone: the 35 items and their rules are part of the schema now, so
 * there is nothing for the app to trigger.
 */

import { managedFileUrl, rpc, supabase, unwrap } from "./client";
import { insertVehicleDocument, uploadManagedFile } from "./storage";
import type {
  AlertPriority,
  AlertStatus,
  AlertType,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceScheduleStatus,
} from "../../domain";
import type { Drivetrain, TransmissionType, VehicleFuelType, VehicleType } from "../../domain";

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

export type CreateMaintenanceTemplateRequest = {
  name: string;
  category: string;
  description?: string;
  defaultTimeIntervalDays?: number;
  defaultOdometerIntervalKm?: number;
  defaultDueSoonDays?: number;
  defaultDueSoonKm?: number;
  priority?: MaintenancePriority;
};

export type UpdateMaintenanceTemplateRequest = CreateMaintenanceTemplateRequest & {
  id: string;
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
  syncedCount: number;
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
  /** Who entered it. Null on records imported from the desktop app. */
  createdBy?: string | null;
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

/** What a completion RPC hands back: ids, not rows. */
type MaintenanceCompletion = {
  logId: string;
  scheduleId: string | null;
  resolvedAlertCount: number;
  reminderUsed: boolean;
};

export async function listMaintenanceTemplates(): Promise<MaintenanceTemplateRecord[]> {
  // Seeded items stay out of the list until something references them, so a
  // new install shows the handful somebody actually set up rather than 35.
  return rpc<MaintenanceTemplateRecord[]>("list_user_maintenance_templates");
}

export async function getApplicableMaintenanceTemplatesForVehicle(
  vehicleId: string,
): Promise<ApplicableMaintenanceTemplate[]> {
  return rpc<ApplicableMaintenanceTemplate[]>("applicable_templates_for_vehicle", {
    vehicle_id: vehicleId,
  });
}

export async function createMaintenanceTemplate(
  request: CreateMaintenanceTemplateRequest,
): Promise<MaintenanceTemplateRecord> {
  const id = await rpc<string>("create_maintenance_template", templateArgs(request));

  return getMaintenanceTemplate(id);
}

export async function updateMaintenanceTemplate(
  request: UpdateMaintenanceTemplateRequest,
): Promise<MaintenanceTemplateRecord> {
  const id = await rpc<string>("update_maintenance_template", {
    template_id: request.id,
    ...templateArgs(request),
  });

  return getMaintenanceTemplate(id);
}

export async function archiveMaintenanceTemplate(templateId: string): Promise<void> {
  // Takes the item out of circulation along with the reminders and schedules
  // that depend on it, rather than deleting history that points at it.
  await rpc<void>("archive_maintenance_template", { template_id: templateId });
}

export async function listMaintenanceSchedulesForVehicle(
  vehicleId: string,
): Promise<MaintenanceScheduleRecord[]> {
  return unwrap(
    await supabase
      .from("maintenance_schedules_detailed")
      .select("*")
      // Archiving a reminder sets `archived_at` on its schedule but never
      // `deleted_at`, and the view only filters `deleted_at` — so without this
      // the removed ones came back with the live ones. They then showed up on
      // the vehicle overview under "Needs attention", badged `Disabled`, with
      // no row on the Maintenance tab to act on. `dashboard_overview` has
      // always guarded this way; the per-vehicle path never did.
      //
      // It also keeps `MaintenanceTab`'s templateId -> schedule Map honest: a
      // Map keeps the last value for a key, so a re-added item would otherwise
      // risk binding its live setting to the stale archived schedule.
      .is("archived_at", null)
      .eq("vehicle_id", vehicleId)
      .order("category", { ascending: true })
      .order("template_name", { ascending: true }),
  );
}

export async function syncMaintenanceSchedulesForVehicle(
  vehicleId: string,
): Promise<SyncMaintenanceSchedulesResult> {
  const syncedCount = await rpc<number>("sync_maintenance_schedules_for_vehicle", {
    vehicle_id: vehicleId,
  });

  return {
    vehicleId,
    syncedCount,
    schedules: await listMaintenanceSchedulesForVehicle(vehicleId),
  };
}

export async function listVehicleMaintenanceSettings(
  vehicleId: string,
): Promise<VehicleMaintenanceSettingRecord[]> {
  return unwrap(
    await supabase
      .from("vehicle_maintenance_settings_detailed")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("category", { ascending: true })
      .order("template_name", { ascending: true }),
  );
}

export async function upsertVehicleMaintenanceSetting(
  request: UpsertVehicleMaintenanceSettingRequest,
): Promise<VehicleMaintenanceSettingRecord> {
  // Saving a reminder also recalculates the schedule behind it, which is why
  // this is one call and not an upsert followed by a second request.
  const id = await rpc<string>("upsert_vehicle_maintenance_setting", {
    vehicle_id: request.vehicleId,
    template_id: request.templateId,
    ...defined({
      status: request.status,
      custom_time_interval_days: request.customTimeIntervalDays,
      custom_odometer_interval_km: request.customOdometerIntervalKm,
      custom_due_soon_days: request.customDueSoonDays,
      custom_due_soon_km: request.customDueSoonKm,
      notes: request.notes,
    }),
  });

  return unwrap(
    await supabase.from("vehicle_maintenance_settings_detailed").select("*").eq("id", id).single(),
  );
}

export async function archiveVehicleMaintenanceSetting(settingId: string): Promise<void> {
  await rpc<void>("archive_vehicle_maintenance_setting", { setting_id: settingId });
}

export async function refreshMaintenanceAlertsForVehicle(
  vehicleId: string,
): Promise<RefreshMaintenanceAlertsResult> {
  const counts = await rpc<{
    createdCount: number;
    updatedCount: number;
    resolvedCount: number;
  }>("refresh_maintenance_alerts_for_vehicle", { vehicle_id: vehicleId });

  return {
    vehicleId,
    createdCount: counts.createdCount,
    updatedCount: counts.updatedCount,
    resolvedCount: counts.resolvedCount,
    activeAlerts: await listActiveAlertsForVehicle(vehicleId),
  };
}

export async function completeMaintenanceSchedule(
  request: CompleteMaintenanceScheduleRequest,
): Promise<CompleteMaintenanceScheduleResult> {
  const completion = await rpc<MaintenanceCompletion>("complete_maintenance_schedule", {
    schedule_id: request.scheduleId,
    ...completionArgs(request),
  });

  const [log, schedule] = await Promise.all([
    getMaintenanceLog(completion.logId),
    getMaintenanceSchedule(completion.scheduleId),
  ]);

  if (!schedule) {
    throw new Error("The service was recorded but its reminder could not be read.");
  }

  return { log, schedule, resolvedAlertCount: completion.resolvedAlertCount };
}

export async function logMaintenance(
  request: LogMaintenanceRequest,
): Promise<LogMaintenanceResult> {
  const completion = await rpc<MaintenanceCompletion>("log_maintenance", {
    vehicle_id: request.vehicleId,
    template_id: request.templateId,
    ...completionArgs(request),
  });

  const [log, schedule] = await Promise.all([
    getMaintenanceLog(completion.logId),
    getMaintenanceSchedule(completion.scheduleId),
  ]);

  return {
    log,
    schedule,
    resolvedAlertCount: completion.resolvedAlertCount,
    // False when the vehicle has no reminder for this item — the work is
    // recorded, but there is nothing to move forward.
    reminderUsed: completion.reminderUsed,
  };
}

export async function listServiceHistoryForVehicle(
  vehicleId: string,
): Promise<MaintenanceLogRecord[]> {
  return unwrap(
    await supabase
      .from("maintenance_logs_detailed")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("completed_date", { ascending: false })
      .order("created_at", { ascending: false }),
  );
}

export async function getMaintenanceLog(id: string): Promise<MaintenanceLogRecord> {
  return unwrap(await supabase.from("maintenance_logs_detailed").select("*").eq("id", id).single());
}

export async function storeMaintenanceReceipt(
  vehicleId: string,
  file: File,
): Promise<MaintenanceAttachmentRecord> {
  const storagePath = await uploadManagedFile("maintenance-receipts", file);
  const document = await insertVehicleDocument(
    vehicleId,
    "maintenance_receipt",
    storagePath,
    file.name,
  );

  return {
    id: document.id,
    vehicleId,
    filePath: document.storagePath,
    originalFilename: file.name,
    mimeType: file.type || null,
    fileSizeBytes: file.size,
    createdAt: new Date().toISOString(),
  };
}

export async function storeMaintenancePhoto(
  vehicleId: string,
  file: File,
): Promise<MaintenanceAttachmentRecord> {
  const storagePath = await uploadManagedFile("maintenance-photos", file);

  // Attached to the vehicle straight away, and never primary: the database
  // refuses an attachment that belongs to a different vehicle, and the profile
  // picture is chosen on the vehicle screen, not here.
  const photo = unwrap<{ id: string; storagePath: string }>(
    await supabase
      .from("vehicle_photos")
      .insert({
        vehicle_id: vehicleId,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        is_primary: false,
      })
      .select("id, storage_path")
      .single(),
  );

  return {
    id: photo.id,
    vehicleId,
    filePath: photo.storagePath,
    originalFilename: file.name,
    mimeType: file.type || null,
    fileSizeBytes: file.size,
    createdAt: new Date().toISOString(),
  };
}

export function maintenanceFileUrl(storagePath?: string | null): Promise<string | undefined> {
  return managedFileUrl(storagePath);
}

async function getMaintenanceTemplate(id: string): Promise<MaintenanceTemplateRecord> {
  return unwrap(
    await supabase.from("maintenance_templates_with_rules").select("*").eq("id", id).single(),
  );
}

async function getMaintenanceSchedule(
  id: string | null,
): Promise<MaintenanceScheduleRecord | null> {
  if (!id) {
    return null;
  }

  return unwrap(
    await supabase.from("maintenance_schedules_detailed").select("*").eq("id", id).single(),
  );
}

async function listActiveAlertsForVehicle(vehicleId: string): Promise<AlertRecord[]> {
  return unwrap(
    await supabase
      .from("alerts_detailed")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  );
}

function templateArgs(request: CreateMaintenanceTemplateRequest) {
  return {
    name: request.name,
    category: request.category,
    ...defined({
      description: request.description,
      default_time_interval_days: request.defaultTimeIntervalDays,
      default_odometer_interval_km: request.defaultOdometerIntervalKm,
      default_due_soon_days: request.defaultDueSoonDays,
      default_due_soon_km: request.defaultDueSoonKm,
      priority: request.priority,
    }),
  };
}

function completionArgs(request: CompleteMaintenanceScheduleRequest | LogMaintenanceRequest) {
  return {
    completed_date: request.completedDate,
    work_performed: request.workPerformed,
    ...defined({
      odometer: request.odometer,
      parts_replaced: request.partsReplaced,
      labor_cost: request.laborCost,
      parts_cost: request.partsCost,
      total_cost: request.totalCost,
      mechanic_shop: request.mechanicShop,
      receipt_document_id: request.receiptDocumentId,
      before_photo_id: request.beforePhotoId,
      after_photo_id: request.afterPhotoId,
      warranty_expiration: request.warrantyExpiration,
      notes: request.notes,
    }),
  };
}

/**
 * Drops the arguments nobody filled in, so the database function uses its own
 * default. Sending `null` instead would mean "no labour cost" where the
 * function means zero, and the totals would come out wrong.
 */
function defined(args: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined));
}

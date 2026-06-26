import { invoke } from "@tauri-apps/api/core";

const settingsCommands = {
  get: "get_app_settings",
  update: "update_app_settings",
  reset: "reset_app_settings",
  listUsers: "list_local_users",
  updateUser: "update_local_user",
  accessSummary: "get_access_summary",
} as const;

export type AppSettings = {
  preferredCurrency: string;
  distanceUnit: "km" | "mi" | string;
  fuelEfficiencyUnit: "km_per_liter" | "liters_per_100km" | string;
  dateDisplayPreference: "yyyy_mm_dd" | "dd_mm_yyyy" | "mm_dd_yyyy" | string;
  defaultDueSoonDays: number;
  defaultDueSoonKm: number;
  includeSetupNeededSchedules: boolean;
  backupReminderEnabled: boolean;
  backupReminderIntervalDays: number;
  maintenanceAlertsEnabled: boolean;
  fuelEfficiencyAlertsEnabled: boolean;
  startupOnBootEnabled: boolean;
};

export type UpdateAppSettingsRequest = AppSettings;

export type BackupReminderStatus = {
  enabled: boolean;
  intervalDays: number;
  latestBackupPath?: string | null;
  latestBackupCompletedAt?: string | null;
  daysSinceLatestBackup?: number | null;
  reminderDue: boolean;
  message: string;
};

export type LocalDataSafetyInfo = {
  databasePath: string;
  appDataDir: string;
  encryptionStatus: string;
  backupPackageFormat: string;
  startupRegistrationStatus: string;
};

export type LocalUserRecord = {
  id: string;
  displayName: string;
  username?: string | null;
  role: "owner" | "manager" | "viewer" | string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateLocalUserRequest = {
  id: string;
  displayName: string;
  role?: string;
};

export type LocalRoleRecord = {
  key: string;
  label: string;
  description: string;
};

export type AccessSummary = {
  activeUser: LocalUserRecord;
  roles: LocalRoleRecord[];
  permissionsEnforced: boolean;
  appLockStatus: string;
  encryptionStatus: string;
  securityNote: string;
};

export type AppSettingsResponse = {
  settings: AppSettings;
  activeUser: LocalUserRecord;
  backupReminder: BackupReminderStatus;
  dataSafety: LocalDataSafetyInfo;
};

export async function getAppSettings(): Promise<AppSettingsResponse> {
  return invoke<AppSettingsResponse>(settingsCommands.get);
}

export async function updateAppSettings(
  request: UpdateAppSettingsRequest,
): Promise<AppSettingsResponse> {
  return invoke<AppSettingsResponse>(settingsCommands.update, { request });
}

export async function resetAppSettings(): Promise<AppSettingsResponse> {
  return invoke<AppSettingsResponse>(settingsCommands.reset);
}

export async function listLocalUsers(): Promise<LocalUserRecord[]> {
  return invoke<LocalUserRecord[]>(settingsCommands.listUsers);
}

export async function updateLocalUser(request: UpdateLocalUserRequest): Promise<LocalUserRecord> {
  return invoke<LocalUserRecord>(settingsCommands.updateUser, { request });
}

export async function getAccessSummary(): Promise<AccessSummary> {
  return invoke<AccessSummary>(settingsCommands.accessSummary);
}

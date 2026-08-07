/**
 * App settings and accounts.
 *
 * The desktop version of this screen described a file on somebody's desk: a
 * database path, a folder, an encryption status that said "Not enabled". None
 * of that is true any more, so the shapes changed rather than being kept and
 * filled with plausible-looking strings.
 *
 * What stayed is the export reminder. The free plan takes no automatic copies,
 * which makes an export the only copy of their records the client holds — the
 * reminder matters more now than it did when the data was on their own disk.
 */

import { createDisposableClient, rpc } from "./client";

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
  latestBackupCompletedAt?: string | null;
  daysSinceLatestBackup?: number | null;
  reminderDue: boolean;
  message: string;
};

export type UserStatus = "active" | "pending" | "inactive";

export type UserRecord = {
  id: string;
  displayName: string;
  role: "owner" | "manager" | "viewer" | string;
  status: UserStatus | string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateUserRequest = {
  id: string;
  displayName?: string;
  role?: string;
  status?: UserStatus;
};

export type RoleRecord = {
  key: string;
  label: string;
  description: string;
};

export type AccessSummary = {
  activeUser: UserRecord;
  pendingCount: number;
  roles: RoleRecord[];
  securityNote: string;
};

export type AppSettingsResponse = {
  settings: AppSettings;
  activeUser: UserRecord;
  backupReminder: BackupReminderStatus;
};

export async function getAppSettings(): Promise<AppSettingsResponse> {
  return rpc<AppSettingsResponse>("settings_overview");
}

export async function updateAppSettings(
  request: UpdateAppSettingsRequest,
): Promise<AppSettingsResponse> {
  return rpc<AppSettingsResponse>("update_app_settings", { settings: request });
}

export async function resetAppSettings(): Promise<AppSettingsResponse> {
  return rpc<AppSettingsResponse>("reset_app_settings");
}

export async function listUsers(): Promise<UserRecord[]> {
  return rpc<UserRecord[]>("list_users");
}

export async function updateUser(request: UpdateUserRequest): Promise<UserRecord> {
  return rpc<UserRecord>("update_user", {
    user_id: request.id,
    display_name: request.displayName ?? null,
    role: request.role ?? null,
    status: request.status ?? null,
  });
}

export type NewAccountRequest = {
  displayName: string;
  email: string;
  password: string;
  role: "manager" | "viewer";
};

/**
 * Creates somebody else's account.
 *
 * Two steps that cannot be one. Sign-up has to go through Supabase Auth, which
 * only the browser can reach — there is no service key in this app and adding
 * one would mean an Edge Function holding the keys to every account. So the
 * account is created first, on a throwaway client, and then approved with the
 * owner's own session.
 *
 * `handle_new_user()` makes every account after the first one **pending**,
 * whoever started it. That is right for a stranger signing themselves up and
 * pointless for an owner adding a colleague they are sitting next to, so the
 * approval follows immediately.
 *
 * If the second step fails the account still exists, waiting in the queue the
 * People card already shows — which is a recoverable state and the reason the
 * order is this way round rather than the other.
 */
export async function createAccount(request: NewAccountRequest): Promise<UserRecord[]> {
  const enrolment = createDisposableClient();

  const { data, error } = await enrolment.auth.signUp({
    email: request.email.trim(),
    password: request.password,
    // The trigger reads this, so the person gets the name the owner typed
    // rather than whatever comes before the @ in their address.
    options: { data: { display_name: request.displayName.trim() } },
  });

  if (error) {
    throw new Error(error.message || "Could not create that account.");
  }

  if (!data.user) {
    throw new Error("The account was not created. Try again.");
  }

  await updateUser({ id: data.user.id, role: request.role, status: "active" });

  return listUsers();
}

/**
 * Hands the fleet to somebody else and steps down to manager, in one call.
 *
 * Returns the whole list rather than the one account, because two rows changed
 * and the caller is one of them.
 */
export async function transferOwnership(newOwnerId: string): Promise<UserRecord[]> {
  return rpc<UserRecord[]>("transfer_ownership", { new_owner_id: newOwnerId });
}

export async function getAccessSummary(): Promise<AccessSummary> {
  return rpc<AccessSummary>("access_summary");
}

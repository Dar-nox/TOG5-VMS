use std::collections::BTreeMap;

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::vehicles::photo_storage::generate_local_id;

use super::models::{
    AccessSummary, AppSettings, BackupReminderStatus, ClearAppDataRequest, ClearAppDataResponse,
    ClearAppDataTableResult, LocalRoleRecord, LocalUserRecord, UpdateAppSettingsRequest,
    UpdateLocalUserRequest,
};

const KEY_PREFERRED_CURRENCY: &str = "preferred_currency";
const KEY_DISTANCE_UNIT: &str = "distance_unit";
const KEY_FUEL_EFFICIENCY_UNIT: &str = "fuel_efficiency_unit";
const KEY_DATE_DISPLAY_PREFERENCE: &str = "date_display_preference";
const KEY_DEFAULT_DUE_SOON_DAYS: &str = "default_due_soon_days";
const KEY_DEFAULT_DUE_SOON_KM: &str = "default_due_soon_km";
const KEY_INCLUDE_SETUP_NEEDED: &str = "include_setup_needed_schedules";
const KEY_BACKUP_REMINDER_ENABLED: &str = "backup_reminder_enabled";
const KEY_BACKUP_REMINDER_INTERVAL_DAYS: &str = "backup_reminder_interval_days";
const KEY_MAINTENANCE_ALERTS_ENABLED: &str = "maintenance_alerts_enabled";
const KEY_FUEL_EFFICIENCY_ALERTS_ENABLED: &str = "fuel_efficiency_alerts_enabled";
const KEY_STARTUP_ON_BOOT_ENABLED: &str = "startup_on_boot_enabled";

const VALID_DISTANCE_UNITS: &[&str] = &["km", "mi"];
const VALID_FUEL_EFFICIENCY_UNITS: &[&str] = &["km_per_liter", "liters_per_100km"];
const VALID_DATE_DISPLAY_PREFERENCES: &[&str] = &["yyyy_mm_dd", "dd_mm_yyyy", "mm_dd_yyyy"];
const VALID_ROLES: &[&str] = &["owner", "manager", "viewer"];
const PRODUCT_DATA_TABLES: &[&str] = &[
    "audit_logs",
    "alerts",
    "expenses",
    "repair_records",
    "maintenance_logs",
    "fuel_logs",
    "maintenance_schedules",
    "vehicle_maintenance_settings",
    "trip_drivers",
    "trip_passengers",
    "trip_destinations",
    "trips",
    "vehicle_features",
    "vehicle_documents",
    "vehicles",
    "vehicle_photos",
    "parts_inventory",
];

struct DefaultSetting {
    key: &'static str,
    value: &'static str,
    value_type: &'static str,
    description: &'static str,
}

const DEFAULT_SETTINGS: &[DefaultSetting] = &[
    DefaultSetting {
        key: KEY_PREFERRED_CURRENCY,
        value: "PHP",
        value_type: "string",
        description: "Preferred currency code for display only.",
    },
    DefaultSetting {
        key: KEY_DISTANCE_UNIT,
        value: "km",
        value_type: "string",
        description: "Preferred distance unit for display.",
    },
    DefaultSetting {
        key: KEY_FUEL_EFFICIENCY_UNIT,
        value: "km_per_liter",
        value_type: "string",
        description: "Preferred fuel efficiency display unit.",
    },
    DefaultSetting {
        key: KEY_DATE_DISPLAY_PREFERENCE,
        value: "yyyy_mm_dd",
        value_type: "string",
        description: "Preferred date display style.",
    },
    DefaultSetting {
        key: KEY_DEFAULT_DUE_SOON_DAYS,
        value: "14",
        value_type: "integer",
        description: "Default due-soon days for newly synced maintenance schedules.",
    },
    DefaultSetting {
        key: KEY_DEFAULT_DUE_SOON_KM,
        value: "500",
        value_type: "integer",
        description: "Default due-soon odometer threshold for newly synced schedules.",
    },
    DefaultSetting {
        key: KEY_INCLUDE_SETUP_NEEDED,
        value: "true",
        value_type: "boolean",
        description: "Whether setup-needed schedules should appear in attention lists.",
    },
    DefaultSetting {
        key: KEY_BACKUP_REMINDER_ENABLED,
        value: "true",
        value_type: "boolean",
        description: "Whether to show local backup reminder messaging.",
    },
    DefaultSetting {
        key: KEY_BACKUP_REMINDER_INTERVAL_DAYS,
        value: "7",
        value_type: "integer",
        description: "Days between local backup reminder messages.",
    },
    DefaultSetting {
        key: KEY_MAINTENANCE_ALERTS_ENABLED,
        value: "true",
        value_type: "boolean",
        description: "Whether maintenance alert refresh may create new in-app alerts.",
    },
    DefaultSetting {
        key: KEY_FUEL_EFFICIENCY_ALERTS_ENABLED,
        value: "true",
        value_type: "boolean",
        description: "Whether fuel efficiency drop checks may create new in-app alerts.",
    },
    DefaultSetting {
        key: KEY_STARTUP_ON_BOOT_ENABLED,
        value: "false",
        value_type: "boolean",
        description: "Startup preference. OS registration is future packaging work.",
    },
];

pub fn ensure_default_settings(connection: &Connection) -> Result<usize, String> {
    let mut inserted = 0;

    for setting in DEFAULT_SETTINGS {
        let changed = connection
            .execute(
                "
                INSERT OR IGNORE INTO settings (
                  key,
                  value,
                  value_type,
                  description
                )
                VALUES (?1, ?2, ?3, ?4)
                ",
                params![
                    setting.key,
                    setting.value,
                    setting.value_type,
                    setting.description
                ],
            )
            .map_err(|_| "Could not prepare default settings.".to_string())?;
        inserted += changed;
    }

    Ok(inserted)
}

pub fn get_app_settings(connection: &Connection) -> Result<AppSettings, String> {
    ensure_default_settings(connection)?;
    app_settings_from_rows(read_setting_values(connection)?)
}

pub fn update_app_settings(
    connection: &Connection,
    request: UpdateAppSettingsRequest,
) -> Result<AppSettings, String> {
    let settings = normalize_settings_request(request)?;

    for (key, value, value_type, description) in settings_to_rows(&settings) {
        upsert_setting(connection, key, &value, value_type, description)?;
    }

    get_app_settings(connection)
}

pub fn reset_app_settings(connection: &Connection) -> Result<AppSettings, String> {
    for setting in DEFAULT_SETTINGS {
        upsert_setting(
            connection,
            setting.key,
            setting.value,
            setting.value_type,
            setting.description,
        )?;
    }

    get_app_settings(connection)
}

pub fn ensure_default_owner_user(connection: &Connection) -> Result<LocalUserRecord, String> {
    if let Some(user) = first_active_user(connection)? {
        return Ok(user);
    }

    let id = generate_local_id("user");
    connection
        .execute(
            "
            INSERT INTO users (
              id,
              display_name,
              username,
              role,
              status
            )
            VALUES (?1, 'Local Owner', 'owner', 'owner', 'active')
            ",
            params![id],
        )
        .map_err(|_| "Could not create the default local owner profile.".to_string())?;

    first_active_user(connection)?
        .ok_or_else(|| "Could not load the default local owner profile.".to_string())
}

pub fn list_local_users(connection: &Connection) -> Result<Vec<LocalUserRecord>, String> {
    ensure_default_owner_user(connection)?;

    let mut statement = connection
        .prepare(
            "
            SELECT id, display_name, username, role, status, created_at, updated_at
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY
              CASE role
                WHEN 'owner' THEN 0
                WHEN 'manager' THEN 1
                WHEN 'viewer' THEN 2
                ELSE 3
              END,
              display_name
            ",
        )
        .map_err(|_| "Could not prepare local users.".to_string())?;

    let rows = statement
        .query_map([], user_from_row)
        .map_err(|_| "Could not read local users.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse local users.".to_string())
}

pub fn update_local_user(
    connection: &Connection,
    request: UpdateLocalUserRequest,
) -> Result<LocalUserRecord, String> {
    ensure_default_owner_user(connection)?;
    let id = required_trimmed(request.id, "Choose a local user profile to update.")?;
    let display_name = required_trimmed(request.display_name, "Display name is required.")?;
    let current = get_user(connection, &id)?
        .ok_or_else(|| "Local user profile was not found.".to_string())?;
    let role = match request.role {
        Some(role) => normalize_choice(role, VALID_ROLES, "role")?,
        None => current.role,
    };

    connection
        .execute(
            "
            UPDATE users
            SET
              display_name = ?1,
              role = ?2,
              updated_at = datetime('now')
            WHERE id = ?3
              AND deleted_at IS NULL
            ",
            params![display_name, role, id],
        )
        .map_err(|_| "Could not update the local user profile.".to_string())?;

    get_user(connection, &id)?.ok_or_else(|| "Could not read the updated user profile.".to_string())
}

pub fn access_summary(connection: &Connection) -> Result<AccessSummary, String> {
    let active_user = ensure_default_owner_user(connection)?;

    Ok(AccessSummary {
        active_user,
        roles: role_records(),
        permissions_enforced: false,
        app_lock_status: "Not enabled".to_string(),
        encryption_status: "Not enabled".to_string(),
        security_note: "Local role scaffolding is ready, but there is no login screen, app lock, or database encryption yet. Treat this as convenience access setup, not strong data security.".to_string(),
    })
}

pub fn clear_app_product_data(
    connection: &mut Connection,
    request: ClearAppDataRequest,
) -> Result<ClearAppDataResponse, String> {
    if !request.confirm_clear_data {
        return Err("Confirm the clear-data warning before continuing.".to_string());
    }

    let transaction = connection
        .transaction()
        .map_err(|_| "Could not start the local data clear operation.".to_string())?;
    let mut tables_cleared = Vec::new();

    for table_name in PRODUCT_DATA_TABLES {
        let sql = format!("DELETE FROM {table_name}");
        let rows_deleted = transaction
            .execute(&sql, [])
            .map_err(|_| format!("Could not clear local {table_name} records."))?;

        tables_cleared.push(ClearAppDataTableResult {
            table_name: (*table_name).to_string(),
            rows_deleted,
        });
    }

    transaction
        .commit()
        .map_err(|_| "Could not finish the local data clear operation.".to_string())?;

    ensure_default_settings(connection)?;
    ensure_default_owner_user(connection)?;

    Ok(ClearAppDataResponse {
        message: "Local product data was cleared. Settings, user profile, templates, and backup packages were kept.".to_string(),
        tables_cleared,
        managed_folders_cleared: Vec::new(),
        files_removed: 0,
        settings_kept: true,
        users_kept: true,
        backups_kept: true,
    })
}

pub fn maintenance_alerts_enabled(connection: &Connection) -> Result<bool, String> {
    get_bool_setting(connection, KEY_MAINTENANCE_ALERTS_ENABLED, true)
}

pub fn fuel_efficiency_alerts_enabled(connection: &Connection) -> Result<bool, String> {
    get_bool_setting(connection, KEY_FUEL_EFFICIENCY_ALERTS_ENABLED, true)
}

pub fn schedule_default_thresholds(connection: &Connection) -> Result<(i64, i64), String> {
    let settings = get_app_settings(connection)?;
    Ok((settings.default_due_soon_days, settings.default_due_soon_km))
}

pub fn backup_reminder_status(
    connection: &Connection,
    settings: &AppSettings,
) -> Result<BackupReminderStatus, String> {
    let latest = latest_completed_backup(connection)?;
    let (latest_backup_path, latest_backup_completed_at, days_since_latest_backup) = latest
        .map(|backup| {
            (
                Some(backup.path),
                Some(backup.completed_at),
                backup.days_since_completed,
            )
        })
        .unwrap_or((None, None, None));

    let reminder_due = settings.backup_reminder_enabled
        && match days_since_latest_backup {
            Some(days) => days >= settings.backup_reminder_interval_days,
            None => true,
        };

    let message = if !settings.backup_reminder_enabled {
        "Backup reminders are turned off.".to_string()
    } else if let Some(days) = days_since_latest_backup {
        if reminder_due {
            format!("Last local backup was {days} days ago. Create a fresh backup when convenient.")
        } else {
            format!("Last local backup was {days} days ago.")
        }
    } else {
        "No completed local backup has been recorded yet.".to_string()
    };

    Ok(BackupReminderStatus {
        enabled: settings.backup_reminder_enabled,
        interval_days: settings.backup_reminder_interval_days,
        latest_backup_path,
        latest_backup_completed_at,
        days_since_latest_backup,
        reminder_due,
        message,
    })
}

fn app_settings_from_rows(values: BTreeMap<String, String>) -> Result<AppSettings, String> {
    Ok(AppSettings {
        preferred_currency: setting_string(&values, KEY_PREFERRED_CURRENCY, "PHP"),
        distance_unit: setting_string(&values, KEY_DISTANCE_UNIT, "km"),
        fuel_efficiency_unit: setting_string(&values, KEY_FUEL_EFFICIENCY_UNIT, "km_per_liter"),
        date_display_preference: setting_string(&values, KEY_DATE_DISPLAY_PREFERENCE, "yyyy_mm_dd"),
        default_due_soon_days: setting_i64(&values, KEY_DEFAULT_DUE_SOON_DAYS, 14)?,
        default_due_soon_km: setting_i64(&values, KEY_DEFAULT_DUE_SOON_KM, 500)?,
        include_setup_needed_schedules: setting_bool(&values, KEY_INCLUDE_SETUP_NEEDED, true),
        backup_reminder_enabled: setting_bool(&values, KEY_BACKUP_REMINDER_ENABLED, true),
        backup_reminder_interval_days: setting_i64(&values, KEY_BACKUP_REMINDER_INTERVAL_DAYS, 7)?,
        maintenance_alerts_enabled: setting_bool(&values, KEY_MAINTENANCE_ALERTS_ENABLED, true),
        fuel_efficiency_alerts_enabled: setting_bool(
            &values,
            KEY_FUEL_EFFICIENCY_ALERTS_ENABLED,
            true,
        ),
        startup_on_boot_enabled: setting_bool(&values, KEY_STARTUP_ON_BOOT_ENABLED, false),
    })
}

fn normalize_settings_request(request: UpdateAppSettingsRequest) -> Result<AppSettings, String> {
    let preferred_currency = request.preferred_currency.trim().to_ascii_uppercase();
    if preferred_currency.len() != 3
        || !preferred_currency
            .chars()
            .all(|character| character.is_ascii_uppercase())
    {
        return Err("Preferred currency must be a 3-letter code such as PHP.".to_string());
    }

    if request.default_due_soon_days < 0 {
        return Err("Default due-soon days cannot be negative.".to_string());
    }

    if request.default_due_soon_km < 0 {
        return Err("Default due-soon kilometers cannot be negative.".to_string());
    }

    if request.backup_reminder_interval_days < 1 {
        return Err("Backup reminder interval must be at least 1 day.".to_string());
    }

    Ok(AppSettings {
        preferred_currency,
        distance_unit: normalize_choice(
            request.distance_unit,
            VALID_DISTANCE_UNITS,
            "distance unit",
        )?,
        fuel_efficiency_unit: normalize_choice(
            request.fuel_efficiency_unit,
            VALID_FUEL_EFFICIENCY_UNITS,
            "fuel efficiency unit",
        )?,
        date_display_preference: normalize_choice(
            request.date_display_preference,
            VALID_DATE_DISPLAY_PREFERENCES,
            "date display preference",
        )?,
        default_due_soon_days: request.default_due_soon_days,
        default_due_soon_km: request.default_due_soon_km,
        include_setup_needed_schedules: request.include_setup_needed_schedules,
        backup_reminder_enabled: request.backup_reminder_enabled,
        backup_reminder_interval_days: request.backup_reminder_interval_days,
        maintenance_alerts_enabled: request.maintenance_alerts_enabled,
        fuel_efficiency_alerts_enabled: request.fuel_efficiency_alerts_enabled,
        startup_on_boot_enabled: request.startup_on_boot_enabled,
    })
}

fn settings_to_rows(
    settings: &AppSettings,
) -> Vec<(&'static str, String, &'static str, &'static str)> {
    vec![
        (
            KEY_PREFERRED_CURRENCY,
            settings.preferred_currency.clone(),
            "string",
            "Preferred currency code for display only.",
        ),
        (
            KEY_DISTANCE_UNIT,
            settings.distance_unit.clone(),
            "string",
            "Preferred distance unit for display.",
        ),
        (
            KEY_FUEL_EFFICIENCY_UNIT,
            settings.fuel_efficiency_unit.clone(),
            "string",
            "Preferred fuel efficiency display unit.",
        ),
        (
            KEY_DATE_DISPLAY_PREFERENCE,
            settings.date_display_preference.clone(),
            "string",
            "Preferred date display style.",
        ),
        (
            KEY_DEFAULT_DUE_SOON_DAYS,
            settings.default_due_soon_days.to_string(),
            "integer",
            "Default due-soon days for newly synced maintenance schedules.",
        ),
        (
            KEY_DEFAULT_DUE_SOON_KM,
            settings.default_due_soon_km.to_string(),
            "integer",
            "Default due-soon odometer threshold for newly synced schedules.",
        ),
        (
            KEY_INCLUDE_SETUP_NEEDED,
            settings.include_setup_needed_schedules.to_string(),
            "boolean",
            "Whether setup-needed schedules should appear in attention lists.",
        ),
        (
            KEY_BACKUP_REMINDER_ENABLED,
            settings.backup_reminder_enabled.to_string(),
            "boolean",
            "Whether to show local backup reminder messaging.",
        ),
        (
            KEY_BACKUP_REMINDER_INTERVAL_DAYS,
            settings.backup_reminder_interval_days.to_string(),
            "integer",
            "Days between local backup reminder messages.",
        ),
        (
            KEY_MAINTENANCE_ALERTS_ENABLED,
            settings.maintenance_alerts_enabled.to_string(),
            "boolean",
            "Whether maintenance alert refresh may create new in-app alerts.",
        ),
        (
            KEY_FUEL_EFFICIENCY_ALERTS_ENABLED,
            settings.fuel_efficiency_alerts_enabled.to_string(),
            "boolean",
            "Whether fuel efficiency drop checks may create new in-app alerts.",
        ),
        (
            KEY_STARTUP_ON_BOOT_ENABLED,
            settings.startup_on_boot_enabled.to_string(),
            "boolean",
            "Startup preference. OS registration is future packaging work.",
        ),
    ]
}

fn read_setting_values(connection: &Connection) -> Result<BTreeMap<String, String>, String> {
    let mut statement = connection
        .prepare("SELECT key, value FROM settings")
        .map_err(|_| "Could not prepare app settings.".to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|_| "Could not read app settings.".to_string())?;

    rows.collect::<Result<BTreeMap<_, _>, _>>()
        .map_err(|_| "Could not parse app settings.".to_string())
}

fn upsert_setting(
    connection: &Connection,
    key: &str,
    value: &str,
    value_type: &str,
    description: &str,
) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT INTO settings (
              key,
              value,
              value_type,
              description
            )
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              value_type = excluded.value_type,
              description = excluded.description,
              updated_at = datetime('now')
            ",
            params![key, value, value_type, description],
        )
        .map_err(|_| "Could not save app settings.".to_string())?;

    Ok(())
}

fn get_bool_setting(connection: &Connection, key: &str, default: bool) -> Result<bool, String> {
    ensure_default_settings(connection)?;
    let value = connection
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| "Could not read app setting.".to_string())?;

    Ok(value
        .as_deref()
        .map(|value| parse_bool(value, default))
        .unwrap_or(default))
}

fn setting_string(values: &BTreeMap<String, String>, key: &str, default: &str) -> String {
    values
        .get(key)
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default.to_string())
}

fn setting_i64(values: &BTreeMap<String, String>, key: &str, default: i64) -> Result<i64, String> {
    match values.get(key) {
        Some(value) => value
            .trim()
            .parse::<i64>()
            .map_err(|_| "App settings contain an invalid number.".to_string()),
        None => Ok(default),
    }
}

fn setting_bool(values: &BTreeMap<String, String>, key: &str, default: bool) -> bool {
    values
        .get(key)
        .map(|value| parse_bool(value, default))
        .unwrap_or(default)
}

fn parse_bool(value: &str, default: bool) -> bool {
    match value.trim().to_ascii_lowercase().as_str() {
        "true" | "1" | "yes" | "on" => true,
        "false" | "0" | "no" | "off" => false,
        _ => default,
    }
}

fn first_active_user(connection: &Connection) -> Result<Option<LocalUserRecord>, String> {
    connection
        .query_row(
            "
            SELECT id, display_name, username, role, status, created_at, updated_at
            FROM users
            WHERE deleted_at IS NULL
              AND status = 'active'
            ORDER BY
              CASE role
                WHEN 'owner' THEN 0
                WHEN 'manager' THEN 1
                WHEN 'viewer' THEN 2
                ELSE 3
              END,
              created_at
            LIMIT 1
            ",
            [],
            user_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the active local user.".to_string())
}

fn get_user(connection: &Connection, id: &str) -> Result<Option<LocalUserRecord>, String> {
    connection
        .query_row(
            "
            SELECT id, display_name, username, role, status, created_at, updated_at
            FROM users
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![id],
            user_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the local user profile.".to_string())
}

fn user_from_row(row: &Row<'_>) -> rusqlite::Result<LocalUserRecord> {
    Ok(LocalUserRecord {
        id: row.get(0)?,
        display_name: row.get(1)?,
        username: row.get(2)?,
        role: row.get(3)?,
        status: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn latest_completed_backup(connection: &Connection) -> Result<Option<LatestBackup>, String> {
    connection
        .query_row(
            "
            SELECT
              backup_path,
              completed_at,
              CAST(julianday('now', 'localtime') - julianday(completed_at) AS INTEGER)
            FROM backups
            WHERE completed_at IS NOT NULL
              AND status = 'completed'
              AND backup_path IS NOT NULL
            ORDER BY completed_at DESC, started_at DESC
            LIMIT 1
            ",
            [],
            |row| {
                Ok(LatestBackup {
                    path: row.get(0)?,
                    completed_at: row.get(1)?,
                    days_since_completed: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|_| "Could not read backup reminder history.".to_string())
}

fn role_records() -> Vec<LocalRoleRecord> {
    vec![
        LocalRoleRecord {
            key: "owner".to_string(),
            label: "Owner".to_string(),
            description: "Full local admin role scaffold. Permission enforcement comes later."
                .to_string(),
        },
        LocalRoleRecord {
            key: "manager".to_string(),
            label: "Manager".to_string(),
            description: "Can be used later for day-to-day vehicle and maintenance work."
                .to_string(),
        },
        LocalRoleRecord {
            key: "viewer".to_string(),
            label: "Viewer".to_string(),
            description: "Read-only role scaffold for future access controls.".to_string(),
        },
    ]
}

fn required_trimmed(value: String, message: &str) -> Result<String, String> {
    let trimmed = value.trim().to_string();
    (!trimmed.is_empty())
        .then_some(trimmed)
        .ok_or_else(|| message.to_string())
}

fn normalize_choice(value: String, valid_values: &[&str], label: &str) -> Result<String, String> {
    let normalized = value.trim().to_ascii_lowercase();
    valid_values
        .contains(&normalized.as_str())
        .then_some(normalized)
        .ok_or_else(|| format!("Choose a valid {label}."))
}

#[derive(Debug)]
struct LatestBackup {
    path: String,
    completed_at: String,
    days_since_completed: Option<i64>,
}

#[cfg(test)]
mod tests {
    use crate::db;

    use super::*;

    fn setup_database() -> (tempfile::TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("settings.sqlite3");
        db::initialize_database_at_path(&database_path).expect("database should initialize");
        let connection = db::open_database_at_path(&database_path).expect("database should open");

        (temp_dir, connection)
    }

    fn update_request() -> UpdateAppSettingsRequest {
        UpdateAppSettingsRequest {
            preferred_currency: "php".to_string(),
            distance_unit: "km".to_string(),
            fuel_efficiency_unit: "km_per_liter".to_string(),
            date_display_preference: "yyyy_mm_dd".to_string(),
            default_due_soon_days: 21,
            default_due_soon_km: 750,
            include_setup_needed_schedules: false,
            backup_reminder_enabled: true,
            backup_reminder_interval_days: 14,
            maintenance_alerts_enabled: false,
            fuel_efficiency_alerts_enabled: false,
            startup_on_boot_enabled: true,
        }
    }

    #[test]
    fn default_settings_are_created_and_returned() {
        let (_temp_dir, connection) = setup_database();

        let inserted = ensure_default_settings(&connection).expect("defaults should insert");
        let settings = get_app_settings(&connection).expect("settings should load");

        assert!(inserted > 0);
        assert_eq!(settings.preferred_currency, "PHP");
        assert_eq!(settings.default_due_soon_days, 14);
        assert!(settings.maintenance_alerts_enabled);
    }

    #[test]
    fn update_settings_persists_and_reset_restores_defaults() {
        let (_temp_dir, connection) = setup_database();

        let updated =
            update_app_settings(&connection, update_request()).expect("settings should update");
        assert_eq!(updated.preferred_currency, "PHP");
        assert_eq!(updated.default_due_soon_km, 750);
        assert!(!fuel_efficiency_alerts_enabled(&connection).expect("setting reads"));

        let reset = reset_app_settings(&connection).expect("settings should reset");
        assert_eq!(reset.default_due_soon_km, 500);
        assert!(reset.fuel_efficiency_alerts_enabled);
    }

    #[test]
    fn invalid_settings_are_rejected() {
        let (_temp_dir, connection) = setup_database();

        let negative_days = update_app_settings(
            &connection,
            UpdateAppSettingsRequest {
                default_due_soon_days: -1,
                ..update_request()
            },
        )
        .expect_err("negative days should fail");
        assert!(negative_days.contains("cannot be negative"));

        let invalid_backup_interval = update_app_settings(
            &connection,
            UpdateAppSettingsRequest {
                backup_reminder_interval_days: 0,
                ..update_request()
            },
        )
        .expect_err("invalid backup interval should fail");
        assert!(invalid_backup_interval.contains("at least 1 day"));
    }

    #[test]
    fn default_owner_user_is_created_listed_and_updated() {
        let (_temp_dir, connection) = setup_database();

        let owner = ensure_default_owner_user(&connection).expect("owner should create");
        assert_eq!(owner.display_name, "Local Owner");
        assert_eq!(owner.role, "owner");

        let users = list_local_users(&connection).expect("users should list");
        assert_eq!(users.len(), 1);

        let updated = update_local_user(
            &connection,
            UpdateLocalUserRequest {
                id: owner.id,
                display_name: "Fleet Owner".to_string(),
                role: Some("manager".to_string()),
            },
        )
        .expect("user should update");

        assert_eq!(updated.display_name, "Fleet Owner");
        assert_eq!(updated.role, "manager");
    }

    #[test]
    fn invalid_role_is_rejected() {
        let (_temp_dir, connection) = setup_database();
        let owner = ensure_default_owner_user(&connection).expect("owner should create");

        let error = update_local_user(
            &connection,
            UpdateLocalUserRequest {
                id: owner.id,
                display_name: "Owner".to_string(),
                role: Some("cloud_admin".to_string()),
            },
        )
        .expect_err("invalid role should fail");

        assert!(error.contains("valid role"));
    }

    #[test]
    fn backup_reminder_summary_uses_settings_and_history() {
        let (_temp_dir, connection) = setup_database();
        let settings = get_app_settings(&connection).expect("settings should load");
        let no_backup =
            backup_reminder_status(&connection, &settings).expect("reminder should load");
        assert!(no_backup.reminder_due);

        connection
            .execute(
                "
                INSERT INTO backups (
                  id,
                  backup_path,
                  status,
                  completed_at,
                  verified_at,
                  size_bytes,
                  notes
                )
                VALUES ('backup-1', 'C:/tmp/test.tog5backup', 'completed', datetime('now'), datetime('now'), 10, 'test')
                ",
                [],
            )
            .expect("backup history should insert");

        let recent = backup_reminder_status(&connection, &settings).expect("reminder should load");
        assert!(!recent.reminder_due);
        assert_eq!(
            recent.latest_backup_path.as_deref(),
            Some("C:/tmp/test.tog5backup")
        );
    }

    #[test]
    fn clear_app_product_data_removes_records_but_keeps_settings_users_templates_and_backups() {
        let (_temp_dir, mut connection) = setup_database();
        ensure_default_settings(&connection).expect("settings should exist");
        let owner = ensure_default_owner_user(&connection).expect("owner should exist");

        let unconfirmed = clear_app_product_data(
            &mut connection,
            ClearAppDataRequest {
                confirm_clear_data: false,
            },
        )
        .expect_err("clear should require confirmation");
        assert!(unconfirmed.contains("Confirm"));

        connection
            .execute_batch(
                "
                INSERT INTO maintenance_templates (
                  id,
                  name,
                  category,
                  default_due_soon_days,
                  default_due_soon_km,
                  priority,
                  template_key
                )
                VALUES ('template-1', 'Oil Change', 'engine', 14, 500, 'medium', 'oil_change');

                INSERT INTO vehicles (
                  id,
                  vehicle_name,
                  vehicle_type,
                  fuel_type,
                  current_odometer,
                  status
                )
                VALUES ('vehicle-1', 'Test Vehicle', 'car', 'gasoline', 1000, 'active');

                INSERT INTO vehicle_photos (
                  id,
                  vehicle_id,
                  file_path,
                  original_filename,
                  is_primary
                )
                VALUES ('photo-1', 'vehicle-1', 'vehicle-photos/test.jpg', 'test.jpg', 1);

                UPDATE vehicles
                SET primary_photo_id = 'photo-1'
                WHERE id = 'vehicle-1';

                INSERT INTO vehicle_documents (
                  id,
                  vehicle_id,
                  document_type,
                  file_path
                )
                VALUES ('document-1', 'vehicle-1', 'receipt', 'fuel-receipts/test.pdf');

                INSERT INTO vehicle_features (
                  id,
                  vehicle_id,
                  feature_key,
                  enabled
                )
                VALUES ('feature-1', 'vehicle-1', 'turbo', 1);

                INSERT INTO trips (
                  id,
                  vehicle_id,
                  departure_time,
                  return_time,
                  reason,
                  status
                )
                VALUES ('trip-1', 'vehicle-1', '2026-07-01 08:00:00', '2026-07-01 10:00:00', 'Client visit', 'completed');

                INSERT INTO trip_drivers (
                  id,
                  trip_id,
                  driver_name,
                  sort_order
                )
                VALUES ('trip-driver-1', 'trip-1', 'Driver One', 0);

                INSERT INTO trip_passengers (
                  id,
                  trip_id,
                  passenger_name,
                  sort_order
                )
                VALUES ('trip-passenger-1', 'trip-1', 'Passenger One', 0);

                INSERT INTO trip_destinations (
                  id,
                  trip_id,
                  destination_name,
                  sort_order
                )
                VALUES ('trip-destination-1', 'trip-1', 'Warehouse', 0);

                INSERT INTO fuel_logs (
                  id,
                  vehicle_id,
                  fuel_date,
                  odometer,
                  fuel_type,
                  liters,
                  price_per_liter,
                  total_amount,
                  receipt_document_id,
                  is_full_tank
                )
                VALUES ('fuel-1', 'vehicle-1', '2026-07-01', 1100, 'gasoline', 10, 60, 600, 'document-1', 1);

                INSERT INTO vehicle_maintenance_settings (
                  id,
                  vehicle_id,
                  template_id,
                  status,
                  custom_time_interval_days
                )
                VALUES ('setting-1', 'vehicle-1', 'template-1', 'active', 90);

                INSERT INTO maintenance_schedules (
                  id,
                  vehicle_id,
                  template_id,
                  vehicle_maintenance_setting_id,
                  next_due_date,
                  due_soon_days,
                  due_soon_km,
                  status,
                  priority
                )
                VALUES ('schedule-1', 'vehicle-1', 'template-1', 'setting-1', '2026-08-01', 14, 500, 'due_soon', 'high');

                INSERT INTO maintenance_logs (
                  id,
                  vehicle_id,
                  template_id,
                  schedule_id,
                  completed_date,
                  odometer,
                  work_performed,
                  labor_cost,
                  parts_cost,
                  total_cost,
                  receipt_document_id,
                  before_photo_id,
                  after_photo_id
                )
                VALUES ('log-1', 'vehicle-1', 'template-1', 'schedule-1', '2026-07-01', 1200, 'Changed oil', 100, 200, 300, 'document-1', 'photo-1', 'photo-1');

                INSERT INTO repair_records (
                  id,
                  vehicle_id,
                  repair_date,
                  issue_description,
                  total_cost
                )
                VALUES ('repair-1', 'vehicle-1', '2026-07-01', 'Noise', 500);

                INSERT INTO expenses (
                  id,
                  vehicle_id,
                  expense_date,
                  category,
                  description,
                  amount
                )
                VALUES ('expense-1', 'vehicle-1', '2026-07-01', 'parking', 'Parking', 50);

                INSERT INTO alerts (
                  id,
                  vehicle_id,
                  maintenance_schedule_id,
                  alert_type,
                  priority,
                  title,
                  message,
                  status
                )
                VALUES ('alert-1', 'vehicle-1', 'schedule-1', 'maintenance_due_soon', 'high', 'Due soon', 'Oil Change due soon', 'active');

                INSERT INTO parts_inventory (
                  id,
                  part_name,
                  quantity_on_hand
                )
                VALUES ('part-1', 'Oil Filter', 2);

                INSERT INTO backups (
                  id,
                  backup_path,
                  status,
                  completed_at
                )
                VALUES ('backup-1', 'C:/tmp/test.tog5backup', 'completed', datetime('now'));
                ",
            )
            .expect("test product records should insert");

        connection
            .execute(
                "
                INSERT INTO audit_logs (
                  id,
                  user_id,
                  action,
                  entity_type,
                  entity_id,
                  summary
                )
                VALUES ('audit-1', ?1, 'create', 'vehicle', 'vehicle-1', 'Created vehicle')
                ",
                params![owner.id],
            )
            .expect("audit record should insert");

        let cleared = clear_app_product_data(
            &mut connection,
            ClearAppDataRequest {
                confirm_clear_data: true,
            },
        )
        .expect("product data should clear");

        assert!(cleared.settings_kept);
        assert!(cleared.users_kept);
        assert!(cleared.backups_kept);
        assert!(cleared
            .tables_cleared
            .iter()
            .any(|table| table.table_name == "vehicles" && table.rows_deleted == 1));
        assert!(cleared
            .tables_cleared
            .iter()
            .any(|table| table.table_name == "trips" && table.rows_deleted == 1));

        for table_name in PRODUCT_DATA_TABLES {
            assert_eq!(count_rows(&connection, table_name), 0, "{table_name}");
        }

        assert_eq!(count_rows(&connection, "maintenance_templates"), 1);
        assert!(count_rows(&connection, "settings") > 0);
        assert_eq!(count_rows(&connection, "users"), 1);
        assert_eq!(count_rows(&connection, "backups"), 1);
    }

    fn count_rows(connection: &Connection, table_name: &str) -> i64 {
        let sql = format!("SELECT COUNT(*) FROM {table_name}");
        connection
            .query_row(&sql, [], |row| row.get(0))
            .expect("row count should read")
    }
}

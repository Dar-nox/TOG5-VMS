use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub preferred_currency: String,
    pub distance_unit: String,
    pub fuel_efficiency_unit: String,
    pub date_display_preference: String,
    pub default_due_soon_days: i64,
    pub default_due_soon_km: i64,
    pub include_setup_needed_schedules: bool,
    pub backup_reminder_enabled: bool,
    pub backup_reminder_interval_days: i64,
    pub maintenance_alerts_enabled: bool,
    pub fuel_efficiency_alerts_enabled: bool,
    pub startup_on_boot_enabled: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAppSettingsRequest {
    pub preferred_currency: String,
    pub distance_unit: String,
    pub fuel_efficiency_unit: String,
    pub date_display_preference: String,
    pub default_due_soon_days: i64,
    pub default_due_soon_km: i64,
    pub include_setup_needed_schedules: bool,
    pub backup_reminder_enabled: bool,
    pub backup_reminder_interval_days: i64,
    pub maintenance_alerts_enabled: bool,
    pub fuel_efficiency_alerts_enabled: bool,
    pub startup_on_boot_enabled: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BackupReminderStatus {
    pub enabled: bool,
    pub interval_days: i64,
    pub latest_backup_path: Option<String>,
    pub latest_backup_completed_at: Option<String>,
    pub days_since_latest_backup: Option<i64>,
    pub reminder_due: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalDataSafetyInfo {
    pub database_path: String,
    pub app_data_dir: String,
    pub encryption_status: String,
    pub backup_package_format: String,
    pub startup_registration_status: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsResponse {
    pub settings: AppSettings,
    pub active_user: LocalUserRecord,
    pub backup_reminder: BackupReminderStatus,
    pub data_safety: LocalDataSafetyInfo,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalUserRecord {
    pub id: String,
    pub display_name: String,
    pub username: Option<String>,
    pub role: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLocalUserRequest {
    pub id: String,
    pub display_name: String,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalRoleRecord {
    pub key: String,
    pub label: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AccessSummary {
    pub active_user: LocalUserRecord,
    pub roles: Vec<LocalRoleRecord>,
    pub permissions_enforced: bool,
    pub app_lock_status: String,
    pub encryption_status: String,
    pub security_note: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearAppDataRequest {
    pub confirm_clear_data: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ClearAppDataTableResult {
    pub table_name: String,
    pub rows_deleted: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ClearAppDataResponse {
    pub message: String,
    pub tables_cleared: Vec<ClearAppDataTableResult>,
    pub managed_folders_cleared: Vec<String>,
    pub files_removed: u64,
    pub settings_kept: bool,
    pub users_kept: bool,
    pub backups_kept: bool,
}

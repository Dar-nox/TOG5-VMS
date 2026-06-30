use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceTemplateRuleRecord {
    pub id: String,
    pub template_id: String,
    pub applies_to_vehicle_type: Option<String>,
    pub applies_to_fuel_type: Option<String>,
    pub applies_to_transmission_type: Option<String>,
    pub applies_to_drivetrain: Option<String>,
    pub requires_feature: Option<String>,
    pub excludes_feature: Option<String>,
    pub rule_type: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceTemplateRecord {
    pub id: String,
    pub template_key: Option<String>,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub default_time_interval_days: Option<i64>,
    pub default_odometer_interval_km: Option<i64>,
    pub default_due_soon_days: i64,
    pub default_due_soon_km: i64,
    pub priority: String,
    pub is_active: bool,
    pub rules: Vec<MaintenanceTemplateRuleRecord>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ApplicableMaintenanceTemplate {
    pub template: MaintenanceTemplateRecord,
    pub applicability_status: String,
    pub is_auto_applicable: bool,
    pub reason: String,
    pub warnings: Vec<String>,
    pub matched_rule_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SeedMaintenanceTemplatesResult {
    pub template_count: usize,
    pub rule_count: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceScheduleRecord {
    pub id: String,
    pub vehicle_id: String,
    pub template_id: String,
    pub template_key: Option<String>,
    pub template_name: String,
    pub category: String,
    pub last_completed_date: Option<String>,
    pub last_completed_odometer: Option<f64>,
    pub next_due_date: Option<String>,
    pub next_due_odometer: Option<f64>,
    pub due_soon_days: i64,
    pub due_soon_km: i64,
    pub status: String,
    pub due_status: String,
    pub due_reason: String,
    pub priority: String,
    pub notes: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleMaintenanceSettingRecord {
    pub id: String,
    pub vehicle_id: String,
    pub template_id: String,
    pub template_key: Option<String>,
    pub template_name: String,
    pub category: String,
    pub status: String,
    pub custom_time_interval_days: Option<i64>,
    pub custom_odometer_interval_km: Option<i64>,
    pub custom_due_soon_days: Option<i64>,
    pub custom_due_soon_km: Option<i64>,
    pub effective_due_soon_days: i64,
    pub effective_due_soon_km: i64,
    pub priority: String,
    pub notes: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertVehicleMaintenanceSettingRequest {
    pub vehicle_id: String,
    pub template_id: String,
    pub status: Option<String>,
    pub custom_time_interval_days: Option<i64>,
    pub custom_odometer_interval_km: Option<i64>,
    pub custom_due_soon_days: Option<i64>,
    pub custom_due_soon_km: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SyncMaintenanceSchedulesResult {
    pub vehicle_id: String,
    pub created_count: usize,
    pub updated_count: usize,
    pub skipped_count: usize,
    pub schedules: Vec<MaintenanceScheduleRecord>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AlertRecord {
    pub id: String,
    pub vehicle_id: Option<String>,
    pub vehicle_name: Option<String>,
    pub maintenance_schedule_id: Option<String>,
    pub maintenance_template_name: Option<String>,
    pub alert_type: String,
    pub priority: String,
    pub title: String,
    pub message: String,
    pub related_record_type: Option<String>,
    pub related_record_id: Option<String>,
    pub status: String,
    pub due_date: Option<String>,
    pub snoozed_until: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RefreshMaintenanceAlertsResult {
    pub vehicle_id: String,
    pub created_count: usize,
    pub updated_count: usize,
    pub resolved_count: usize,
    pub active_alerts: Vec<AlertRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DueStatusEvaluation {
    pub status: String,
    pub reason: String,
    pub alert_type: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MaintenanceVehicleProfile {
    pub id: String,
    pub vehicle_type: String,
    pub fuel_type: String,
    pub transmission_type: String,
    pub drivetrain: String,
    pub features: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteMaintenanceScheduleRequest {
    pub schedule_id: String,
    pub completed_date: String,
    pub odometer: Option<f64>,
    pub work_performed: String,
    pub parts_replaced: Option<String>,
    pub labor_cost: Option<f64>,
    pub parts_cost: Option<f64>,
    pub total_cost: Option<f64>,
    pub mechanic_shop: Option<String>,
    pub receipt_document_id: Option<String>,
    pub before_photo_id: Option<String>,
    pub after_photo_id: Option<String>,
    pub warranty_expiration: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMaintenanceRequest {
    pub vehicle_id: String,
    pub template_id: String,
    pub completed_date: String,
    pub odometer: Option<f64>,
    pub work_performed: String,
    pub parts_replaced: Option<String>,
    pub labor_cost: Option<f64>,
    pub parts_cost: Option<f64>,
    pub total_cost: Option<f64>,
    pub mechanic_shop: Option<String>,
    pub receipt_document_id: Option<String>,
    pub before_photo_id: Option<String>,
    pub after_photo_id: Option<String>,
    pub warranty_expiration: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LogMaintenanceResult {
    pub log: MaintenanceLogRecord,
    pub schedule: Option<MaintenanceScheduleRecord>,
    pub resolved_alert_count: usize,
    pub reminder_used: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CompleteMaintenanceScheduleResult {
    pub log: MaintenanceLogRecord,
    pub schedule: MaintenanceScheduleRecord,
    pub resolved_alert_count: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceLogRecord {
    pub id: String,
    pub vehicle_id: String,
    pub vehicle_name: String,
    pub template_id: Option<String>,
    pub template_key: Option<String>,
    pub template_name: Option<String>,
    pub schedule_id: Option<String>,
    pub completed_date: String,
    pub odometer: f64,
    pub work_performed: String,
    pub parts_replaced: Option<String>,
    pub labor_cost: f64,
    pub parts_cost: f64,
    pub total_cost: f64,
    pub mechanic_shop: Option<String>,
    pub receipt_document_id: Option<String>,
    pub receipt_file_path: Option<String>,
    pub receipt_original_filename: Option<String>,
    pub before_photo_id: Option<String>,
    pub before_photo_path: Option<String>,
    pub after_photo_id: Option<String>,
    pub after_photo_path: Option<String>,
    pub warranty_expiration: Option<String>,
    pub next_recommended_date: Option<String>,
    pub next_recommended_odometer: Option<f64>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreMaintenanceReceiptRequest {
    pub vehicle_id: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreMaintenancePhotoRequest {
    pub vehicle_id: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct NewMaintenanceReceipt {
    pub id: String,
    pub vehicle_id: String,
    pub file_path: String,
    pub original_filename: Option<String>,
    pub file_size_bytes: i64,
}

#[derive(Debug, Clone)]
pub struct NewMaintenancePhoto {
    pub id: String,
    pub vehicle_id: String,
    pub file_path: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceAttachmentRecord {
    pub id: String,
    pub vehicle_id: String,
    pub file_path: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size_bytes: i64,
    pub created_at: Option<String>,
}

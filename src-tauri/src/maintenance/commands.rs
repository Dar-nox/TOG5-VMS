use tauri::AppHandle;

use crate::db;

use super::{
    file_storage::{
        maintenance_photos_dir, maintenance_receipts_dir, prepare_maintenance_photo,
        prepare_maintenance_receipt, remove_file_if_present,
    },
    models::{
        AlertRecord, ApplicableMaintenanceTemplate, CompleteMaintenanceScheduleRequest,
        CompleteMaintenanceScheduleResult, LogMaintenanceRequest, LogMaintenanceResult,
        MaintenanceAttachmentRecord, MaintenanceLogRecord, MaintenanceScheduleRecord,
        MaintenanceTemplateRecord, RefreshMaintenanceAlertsResult, SeedMaintenanceTemplatesResult,
        StoreMaintenancePhotoRequest, StoreMaintenanceReceiptRequest,
        SyncMaintenanceSchedulesResult, UpsertVehicleMaintenanceSettingRequest,
        VehicleMaintenanceSettingRecord,
    },
    repository, scheduling, service_history,
};

#[tauri::command]
pub fn list_maintenance_templates(
    app: AppHandle,
) -> Result<Vec<MaintenanceTemplateRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::list_active_templates(&connection)
}

#[tauri::command]
pub fn get_applicable_maintenance_templates_for_vehicle(
    app: AppHandle,
    vehicle_id: String,
) -> Result<Vec<ApplicableMaintenanceTemplate>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::applicable_templates_for_vehicle(&connection, &vehicle_id)
}

#[tauri::command]
pub fn seed_maintenance_templates(
    app: AppHandle,
) -> Result<SeedMaintenanceTemplatesResult, String> {
    let mut connection = db::open_app_connection(&app)?;
    repository::seed_default_templates(&mut connection)
}

#[tauri::command]
pub fn list_maintenance_schedules_for_vehicle(
    app: AppHandle,
    vehicle_id: String,
) -> Result<Vec<MaintenanceScheduleRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    scheduling::list_schedules_for_vehicle(&connection, &vehicle_id)
}

#[tauri::command]
pub fn sync_maintenance_schedules_for_vehicle(
    app: AppHandle,
    vehicle_id: String,
) -> Result<SyncMaintenanceSchedulesResult, String> {
    let connection = db::open_app_connection(&app)?;
    scheduling::sync_schedules_for_vehicle(&connection, &vehicle_id)
}

#[tauri::command]
pub fn list_vehicle_maintenance_settings(
    app: AppHandle,
    vehicle_id: String,
) -> Result<Vec<VehicleMaintenanceSettingRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    scheduling::list_vehicle_maintenance_settings(&connection, &vehicle_id)
}

#[tauri::command]
pub fn upsert_vehicle_maintenance_setting(
    app: AppHandle,
    request: UpsertVehicleMaintenanceSettingRequest,
) -> Result<VehicleMaintenanceSettingRecord, String> {
    let connection = db::open_app_connection(&app)?;
    scheduling::upsert_vehicle_maintenance_setting(&connection, request)
}

#[tauri::command]
pub fn archive_vehicle_maintenance_setting(
    app: AppHandle,
    setting_id: String,
) -> Result<(), String> {
    let connection = db::open_app_connection(&app)?;
    scheduling::archive_vehicle_maintenance_setting(&connection, &setting_id)
}

#[tauri::command]
pub fn refresh_maintenance_alerts_for_vehicle(
    app: AppHandle,
    vehicle_id: String,
) -> Result<RefreshMaintenanceAlertsResult, String> {
    let connection = db::open_app_connection(&app)?;
    scheduling::refresh_maintenance_alerts_for_vehicle(&connection, &vehicle_id)
}

#[tauri::command]
pub fn list_alerts(app: AppHandle) -> Result<Vec<AlertRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    scheduling::list_alerts(&connection)
}

#[tauri::command]
pub fn dismiss_alert(app: AppHandle, alert_id: String) -> Result<(), String> {
    let connection = db::open_app_connection(&app)?;
    scheduling::dismiss_alert(&connection, &alert_id)
}

#[tauri::command]
pub fn complete_maintenance_schedule(
    app: AppHandle,
    request: CompleteMaintenanceScheduleRequest,
) -> Result<CompleteMaintenanceScheduleResult, String> {
    let mut connection = db::open_app_connection(&app)?;
    service_history::complete_maintenance_schedule(&mut connection, request)
}

#[tauri::command]
pub fn log_maintenance(
    app: AppHandle,
    request: LogMaintenanceRequest,
) -> Result<LogMaintenanceResult, String> {
    let mut connection = db::open_app_connection(&app)?;
    service_history::log_maintenance(&mut connection, request)
}

#[tauri::command]
pub fn list_service_history_for_vehicle(
    app: AppHandle,
    vehicle_id: String,
) -> Result<Vec<MaintenanceLogRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    service_history::list_service_history_for_vehicle(&connection, &vehicle_id)
}

#[tauri::command]
pub fn get_maintenance_log(app: AppHandle, id: String) -> Result<MaintenanceLogRecord, String> {
    let connection = db::open_app_connection(&app)?;
    service_history::get_maintenance_log(&connection, &id)?
        .ok_or_else(|| "Service history record was not found.".to_string())
}

#[tauri::command]
pub fn store_maintenance_receipt(
    app: AppHandle,
    request: StoreMaintenanceReceiptRequest,
) -> Result<MaintenanceAttachmentRecord, String> {
    let receipts_dir = maintenance_receipts_dir(&app)?;
    let receipt = prepare_maintenance_receipt(&receipts_dir, request)?;
    let file_path = receipt.file_path.clone();
    let connection = db::open_app_connection(&app)?;

    service_history::insert_maintenance_receipt(&connection, receipt).map_err(|error| {
        remove_file_if_present(&file_path);
        error
    })
}

#[tauri::command]
pub fn store_maintenance_photo(
    app: AppHandle,
    request: StoreMaintenancePhotoRequest,
) -> Result<MaintenanceAttachmentRecord, String> {
    let photos_dir = maintenance_photos_dir(&app)?;
    let photo = prepare_maintenance_photo(&photos_dir, request)?;
    let file_path = photo.file_path.clone();
    let connection = db::open_app_connection(&app)?;

    service_history::insert_maintenance_photo(&connection, photo).map_err(|error| {
        remove_file_if_present(&file_path);
        error
    })
}

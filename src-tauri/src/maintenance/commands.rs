use tauri::AppHandle;

use crate::db;

use super::{
    models::{
        AlertRecord, ApplicableMaintenanceTemplate, MaintenanceScheduleRecord,
        MaintenanceTemplateRecord, RefreshMaintenanceAlertsResult, SeedMaintenanceTemplatesResult,
        SyncMaintenanceSchedulesResult,
    },
    repository, scheduling,
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

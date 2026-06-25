use tauri::AppHandle;

use crate::db;

use super::{
    models::{
        ApplicableMaintenanceTemplate, MaintenanceTemplateRecord, SeedMaintenanceTemplatesResult,
    },
    repository,
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

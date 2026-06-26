use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::db;

use super::{
    models::{
        BackupHistoryRecord, BackupPackageResponse, BackupValidationResult, LocalFileSafetySummary,
        RestoreBackupRequest, RestoreBackupResponse,
    },
    service::{self, BackupContext},
};

#[tauri::command]
pub fn create_backup(app: AppHandle) -> Result<BackupPackageResponse, String> {
    let context = backup_context(&app)?;
    service::create_backup(&context)
}

#[tauri::command]
pub fn validate_backup_file(
    app: AppHandle,
    backup_path: String,
) -> Result<BackupValidationResult, String> {
    let _context = backup_context(&app)?;
    Ok(service::validate_backup_package(&PathBuf::from(
        backup_path.trim(),
    )))
}

#[tauri::command]
pub fn restore_backup(
    app: AppHandle,
    request: RestoreBackupRequest,
) -> Result<RestoreBackupResponse, String> {
    let context = backup_context(&app)?;
    service::restore_backup(&context, request)
}

#[tauri::command]
pub fn list_backups(app: AppHandle) -> Result<Vec<BackupHistoryRecord>, String> {
    let context = backup_context(&app)?;
    service::list_backup_history(&context.database_path)
}

#[tauri::command]
pub fn get_local_file_safety_summary(app: AppHandle) -> Result<LocalFileSafetySummary, String> {
    let context = backup_context(&app)?;
    service::local_file_safety_summary(&context)
}

fn backup_context(app: &AppHandle) -> Result<BackupContext, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Could not find the TOG 5 VMS app data folder.".to_string())?;
    let database_path = db::database_path(app)?;
    let app_version = app.package_info().version.to_string();

    Ok(BackupContext::new(app_data_dir, database_path, app_version))
}

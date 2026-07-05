use std::{
    fs,
    path::{Path, PathBuf},
};

use tauri::{AppHandle, Manager};

use crate::db;

use super::{
    models::{
        AccessSummary, AppSettingsResponse, ClearAppDataRequest, ClearAppDataResponse,
        LocalDataSafetyInfo, LocalUserRecord, UpdateAppSettingsRequest, UpdateLocalUserRequest,
    },
    repository,
};

const CLEARABLE_MANAGED_FOLDERS: &[&str] = &[
    "vehicle-photos",
    "fuel-receipts",
    "maintenance-receipts",
    "maintenance-photos",
];

#[tauri::command]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettingsResponse, String> {
    let connection = db::open_app_connection(&app)?;
    settings_response(&app, &connection)
}

#[tauri::command]
pub fn update_app_settings(
    app: AppHandle,
    request: UpdateAppSettingsRequest,
) -> Result<AppSettingsResponse, String> {
    let connection = db::open_app_connection(&app)?;
    repository::update_app_settings(&connection, request)?;
    settings_response(&app, &connection)
}

#[tauri::command]
pub fn reset_app_settings(app: AppHandle) -> Result<AppSettingsResponse, String> {
    let connection = db::open_app_connection(&app)?;
    repository::reset_app_settings(&connection)?;
    settings_response(&app, &connection)
}

#[tauri::command]
pub fn list_local_users(app: AppHandle) -> Result<Vec<LocalUserRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::list_local_users(&connection)
}

#[tauri::command]
pub fn update_local_user(
    app: AppHandle,
    request: UpdateLocalUserRequest,
) -> Result<LocalUserRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::update_local_user(&connection, request)
}

#[tauri::command]
pub fn get_access_summary(app: AppHandle) -> Result<AccessSummary, String> {
    let connection = db::open_app_connection(&app)?;
    repository::access_summary(&connection)
}

#[tauri::command]
pub fn clear_app_data(
    app: AppHandle,
    request: ClearAppDataRequest,
) -> Result<ClearAppDataResponse, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Could not find the TOG 5 VMS app data folder.".to_string())?;
    let mut connection = db::open_app_connection(&app)?;
    let mut response = repository::clear_app_product_data(&mut connection, request)?;
    let folder_result = clear_managed_folders(&app_data_dir)?;

    response.files_removed = folder_result.files_removed;
    response.managed_folders_cleared = folder_result.folder_names;

    Ok(response)
}

fn settings_response(
    app: &AppHandle,
    connection: &rusqlite::Connection,
) -> Result<AppSettingsResponse, String> {
    let settings = repository::get_app_settings(connection)?;
    let active_user = repository::ensure_default_owner_user(connection)?;
    let backup_reminder = repository::backup_reminder_status(connection, &settings)?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Could not find the TOG 5 VMS app data folder.".to_string())?;
    let database_path = db::database_path(app)?;

    Ok(AppSettingsResponse {
        settings,
        active_user,
        backup_reminder,
        data_safety: LocalDataSafetyInfo {
            database_path: database_path.display().to_string(),
            app_data_dir: app_data_dir.display().to_string(),
            encryption_status: "Not enabled".to_string(),
            backup_package_format: ".tog5backup local folder package".to_string(),
            startup_registration_status:
                "Preference saved only; OS startup registration is future packaging work."
                    .to_string(),
        },
    })
}

struct ClearManagedFolderResult {
    folder_names: Vec<String>,
    files_removed: u64,
}

fn clear_managed_folders(app_data_dir: &Path) -> Result<ClearManagedFolderResult, String> {
    fs::create_dir_all(app_data_dir)
        .map_err(|_| "Could not prepare the app data folder.".to_string())?;

    let mut folder_names = Vec::new();
    let mut files_removed = 0;

    for folder_name in CLEARABLE_MANAGED_FOLDERS {
        let folder_path = app_data_dir.join(folder_name);
        files_removed += count_files(&folder_path)?;

        if folder_path.exists() {
            fs::remove_dir_all(&folder_path)
                .map_err(|_| format!("Could not clear local {folder_name} files."))?;
        }

        fs::create_dir_all(&folder_path)
            .map_err(|_| format!("Could not recreate the local {folder_name} folder."))?;
        folder_names.push((*folder_name).to_string());
    }

    Ok(ClearManagedFolderResult {
        folder_names,
        files_removed,
    })
}

fn count_files(path: &Path) -> Result<u64, String> {
    if !path.exists() {
        return Ok(0);
    }

    let mut count = 0;
    let mut stack: Vec<PathBuf> = vec![path.to_path_buf()];

    while let Some(current_path) = stack.pop() {
        for entry in fs::read_dir(&current_path)
            .map_err(|_| "Could not inspect local app-managed files.".to_string())?
        {
            let entry =
                entry.map_err(|_| "Could not inspect a local app-managed file.".to_string())?;
            let file_type = entry
                .file_type()
                .map_err(|_| "Could not inspect a local app-managed file.".to_string())?;

            if file_type.is_dir() {
                stack.push(entry.path());
            } else if file_type.is_file() {
                count += 1;
            }
        }
    }

    Ok(count)
}

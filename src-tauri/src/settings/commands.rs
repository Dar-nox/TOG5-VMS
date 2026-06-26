use tauri::{AppHandle, Manager};

use crate::db;

use super::{
    models::{
        AccessSummary, AppSettingsResponse, LocalDataSafetyInfo, LocalUserRecord,
        UpdateAppSettingsRequest, UpdateLocalUserRequest,
    },
    repository,
};

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

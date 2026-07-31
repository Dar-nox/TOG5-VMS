use tauri::AppHandle;

use crate::db;

use super::{models::DashboardOverview, repository};

#[tauri::command]
pub fn get_dashboard_overview(app: AppHandle) -> Result<DashboardOverview, String> {
    let connection = db::open_app_connection(&app)?;
    repository::dashboard_overview(&connection)
}

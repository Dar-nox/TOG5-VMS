use tauri::{AppHandle, Manager};

use super::{
    export,
    models::{ExportReportCsvRequest, ExportReportCsvResponse},
};

#[tauri::command]
pub fn export_report_csv(
    app: AppHandle,
    request: ExportReportCsvRequest,
) -> Result<ExportReportCsvResponse, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Could not find the TOG 5 VMS app data folder.".to_string())?;

    export::export_report_csv(&app_data_dir, request)
}

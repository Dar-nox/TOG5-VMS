use tauri::AppHandle;

use crate::db;

use super::{
    models::{
        CompleteTripRequest, StartTripRequest, TripListFilter, TripRecord, TripReportFilter,
        TripReportsOverview,
    },
    repository,
};

#[tauri::command]
pub fn list_trips(
    app: AppHandle,
    filter: Option<TripListFilter>,
) -> Result<Vec<TripRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::list_trips(&connection, filter)
}

#[tauri::command]
pub fn list_open_trips(app: AppHandle) -> Result<Vec<TripRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::list_open_trips(&connection)
}

#[tauri::command]
pub fn get_trip(app: AppHandle, id: String) -> Result<TripRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::get_trip(&connection, &id)?.ok_or_else(|| "Trip was not found.".to_string())
}

#[tauri::command]
pub fn start_trip(app: AppHandle, request: StartTripRequest) -> Result<TripRecord, String> {
    let mut connection = db::open_app_connection(&app)?;
    repository::start_trip(&mut connection, request)
}

#[tauri::command]
pub fn complete_trip(
    app: AppHandle,
    id: String,
    request: CompleteTripRequest,
) -> Result<TripRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::complete_trip(&connection, &id, request)
}

#[tauri::command]
pub fn archive_trip(app: AppHandle, id: String) -> Result<(), String> {
    let connection = db::open_app_connection(&app)?;
    repository::archive_trip(&connection, &id)
}

#[tauri::command]
pub fn get_trip_reports_overview(
    app: AppHandle,
    filter: Option<TripReportFilter>,
) -> Result<TripReportsOverview, String> {
    let connection = db::open_app_connection(&app)?;
    repository::trip_reports_overview(&connection, filter)
}

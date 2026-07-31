use tauri::AppHandle;

use crate::db;

use super::{
    models::{
        FuelEfficiencySummaryRecord, FuelLogMutationRequest, FuelLogRecord, FuelReceiptRecord,
        StoreFuelReceiptRequest,
    },
    receipt_storage::{fuel_receipts_dir, prepare_fuel_receipt, remove_receipt_file_if_present},
    repository,
};

#[tauri::command]
pub fn list_fuel_logs_for_vehicle(
    app: AppHandle,
    vehicle_id: String,
) -> Result<Vec<FuelLogRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::list_fuel_logs_for_vehicle(&connection, &vehicle_id)
}

#[tauri::command]
pub fn get_fuel_log(app: AppHandle, id: String) -> Result<FuelLogRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::get_fuel_log(&connection, &id)?.ok_or_else(|| "Fuel log was not found.".to_string())
}

#[tauri::command]
pub fn create_fuel_log(
    app: AppHandle,
    request: FuelLogMutationRequest,
) -> Result<FuelLogRecord, String> {
    let mut connection = db::open_app_connection(&app)?;
    repository::create_fuel_log(&mut connection, request)
}

#[tauri::command]
pub fn update_fuel_log(
    app: AppHandle,
    id: String,
    request: FuelLogMutationRequest,
) -> Result<FuelLogRecord, String> {
    let mut connection = db::open_app_connection(&app)?;
    repository::update_fuel_log(&mut connection, &id, request)
}

#[tauri::command]
pub fn archive_fuel_log(app: AppHandle, id: String) -> Result<(), String> {
    let connection = db::open_app_connection(&app)?;
    repository::archive_fuel_log(&connection, &id)
}

#[tauri::command]
pub fn store_fuel_receipt(
    app: AppHandle,
    request: StoreFuelReceiptRequest,
) -> Result<FuelReceiptRecord, String> {
    let receipts_dir = fuel_receipts_dir(&app)?;
    let receipt = prepare_fuel_receipt(&receipts_dir, request)?;
    let receipt_path = receipt.file_path.clone();
    let connection = db::open_app_connection(&app)?;

    repository::insert_fuel_receipt(&connection, receipt).map_err(|error| {
        remove_receipt_file_if_present(&receipt_path);
        error
    })
}

#[tauri::command]
pub fn get_fuel_efficiency_summary_for_vehicle(
    app: AppHandle,
    vehicle_id: String,
) -> Result<FuelEfficiencySummaryRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::fuel_efficiency_summary_for_vehicle(&connection, &vehicle_id)
}

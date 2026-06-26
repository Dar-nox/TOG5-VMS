use tauri::AppHandle;

use crate::db;

use super::{
    models::{
        ExpenseListFilter, ExpenseMutationRequest, ExpenseRecord, ExpenseSummaryReport,
        ReportFilter, ReportsOverview, VehicleCostReport,
    },
    repository,
};

#[tauri::command]
pub fn list_expenses(
    app: AppHandle,
    filter: Option<ExpenseListFilter>,
) -> Result<Vec<ExpenseRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::list_expenses(&connection, filter)
}

#[tauri::command]
pub fn list_expenses_for_vehicle(
    app: AppHandle,
    vehicle_id: String,
) -> Result<Vec<ExpenseRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::list_expenses_for_vehicle(&connection, &vehicle_id)
}

#[tauri::command]
pub fn get_expense(app: AppHandle, id: String) -> Result<ExpenseRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::get_expense(&connection, &id)?.ok_or_else(|| "Expense was not found.".to_string())
}

#[tauri::command]
pub fn create_expense(
    app: AppHandle,
    request: ExpenseMutationRequest,
) -> Result<ExpenseRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::create_expense(&connection, request)
}

#[tauri::command]
pub fn update_expense(
    app: AppHandle,
    id: String,
    request: ExpenseMutationRequest,
) -> Result<ExpenseRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::update_expense(&connection, &id, request)
}

#[tauri::command]
pub fn archive_expense(app: AppHandle, id: String) -> Result<(), String> {
    let connection = db::open_app_connection(&app)?;
    repository::archive_expense(&connection, &id)
}

#[tauri::command]
pub fn get_expense_summary(
    app: AppHandle,
    filter: Option<ExpenseListFilter>,
) -> Result<ExpenseSummaryReport, String> {
    let connection = db::open_app_connection(&app)?;
    repository::expense_summary(&connection, filter)
}

#[tauri::command]
pub fn get_vehicle_cost_report(
    app: AppHandle,
    vehicle_id: String,
    filter: Option<ReportFilter>,
) -> Result<VehicleCostReport, String> {
    let connection = db::open_app_connection(&app)?;
    repository::vehicle_cost_report(&connection, &vehicle_id, filter)
}

#[tauri::command]
pub fn get_reports_overview(
    app: AppHandle,
    filter: Option<ReportFilter>,
) -> Result<ReportsOverview, String> {
    let connection = db::open_app_connection(&app)?;
    repository::reports_overview(&connection, filter)
}

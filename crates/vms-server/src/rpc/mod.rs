mod args;
mod backup;
mod dashboard;
mod database;
mod expenses;
mod fuel;
mod maintenance;
mod reports;
mod settings;
mod trips;
mod vehicles;

use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;
use vms_core::{db::PooledSqlite, settings::models::LocalUserRecord, AppPaths};

use crate::{error::ApiError, state::AppState};

/// `Some` when the module owns the command, `None` when the next module in the
/// chain should look at it.
pub type Handled = Option<Result<Value, String>>;

type Dispatcher = fn(&RpcContext, &str, &mut Value) -> Handled;

/// One dispatcher per domain, in the same order the modules are declared. A
/// command belongs to exactly one of them.
const DISPATCHERS: &[Dispatcher] = &[
    vehicles::dispatch,
    fuel::dispatch,
    maintenance::dispatch,
    trips::dispatch,
    expenses::dispatch,
    dashboard::dispatch,
    reports::dispatch,
    settings::dispatch,
    backup::dispatch,
    database::dispatch,
];

/// Every command the web app may call. Kept beside the dispatchers so the
/// test suite can prove that each name still reaches a handler — a typo in a
/// command name is otherwise only found by a person clicking the screen it
/// belongs to.
pub const COMMANDS: &[&str] = &[
    // vehicles
    "list_vehicles",
    "get_vehicle",
    "store_vehicle_photo",
    "create_vehicle",
    "update_vehicle",
    "archive_vehicle",
    // fuel
    "list_fuel_logs_for_vehicle",
    "get_fuel_log",
    "create_fuel_log",
    "update_fuel_log",
    "archive_fuel_log",
    "store_fuel_receipt",
    "get_fuel_efficiency_summary_for_vehicle",
    // maintenance
    "list_maintenance_templates",
    "get_applicable_maintenance_templates_for_vehicle",
    "seed_maintenance_templates",
    "create_maintenance_template",
    "update_maintenance_template",
    "archive_maintenance_template",
    "list_maintenance_schedules_for_vehicle",
    "sync_maintenance_schedules_for_vehicle",
    "list_vehicle_maintenance_settings",
    "upsert_vehicle_maintenance_setting",
    "archive_vehicle_maintenance_setting",
    "refresh_maintenance_alerts_for_vehicle",
    "list_alerts",
    "dismiss_alert",
    "complete_maintenance_schedule",
    "log_maintenance",
    "list_service_history_for_vehicle",
    "get_maintenance_log",
    "store_maintenance_receipt",
    "store_maintenance_photo",
    // trips
    "list_trips",
    "list_open_trips",
    "get_trip",
    "start_trip",
    "complete_trip",
    "archive_trip",
    "get_trip_reports_overview",
    // expenses and reports
    "list_expenses",
    "list_expenses_for_vehicle",
    "get_expense",
    "create_expense",
    "update_expense",
    "archive_expense",
    "get_expense_summary",
    "get_vehicle_cost_report",
    "get_reports_overview",
    "get_dashboard_overview",
    "export_report_csv",
    // settings and users
    "get_app_settings",
    "update_app_settings",
    "reset_app_settings",
    "list_local_users",
    "update_local_user",
    "create_local_user",
    "set_local_user_password",
    "get_access_summary",
    "clear_app_data",
    // backup and diagnostics
    "create_backup",
    "validate_backup_file",
    "restore_backup",
    "list_backups",
    "get_local_file_safety_summary",
    "database_status",
];

/// Everything a command needs to run: the pooled database, the file locations,
/// and the account that asked for it.
pub struct RpcContext {
    state: AppState,
    user: LocalUserRecord,
}

impl RpcContext {
    pub fn new(state: AppState, user: LocalUserRecord) -> Self {
        Self { state, user }
    }

    pub fn state(&self) -> &AppState {
        &self.state
    }

    pub fn user(&self) -> &LocalUserRecord {
        &self.user
    }

    pub fn paths(&self) -> &AppPaths {
        self.state.paths()
    }

    pub fn connection(&self) -> Result<PooledSqlite, String> {
        self.state.connection()
    }
}

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Result<Value, ApiError> {
    for dispatcher in DISPATCHERS {
        if let Some(result) = dispatcher(context, command, args) {
            return result.map_err(ApiError::bad_request);
        }
    }

    Err(ApiError::not_found(format!(
        "TOG 5 VMS does not have a '{command}' action."
    )))
}

/// Runs one command and turns whatever it returns into JSON. Commands that
/// return nothing come back as `null`, which is what the web app expects from
/// the calls it declares as `void`.
fn run<T: Serialize>(operation: impl FnOnce() -> Result<T, String>) -> Result<Value, String> {
    let value = operation()?;

    serde_json::to_value(value).map_err(|_| "Could not prepare that response.".to_string())
}

/// Takes the arguments out of the payload rather than cloning them: a photo
/// upload arrives as a JSON array of ten million bytes, and copying that once
/// per request would be the most expensive thing the server does all day.
fn parse<T: DeserializeOwned>(args: &mut Value) -> Result<T, String> {
    serde_json::from_value(args.take())
        .map_err(|_| "That request was missing some required details.".to_string())
}

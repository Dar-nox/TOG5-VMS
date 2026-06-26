mod db;
pub mod domain;
mod expenses;
mod fuel;
mod maintenance;
mod vehicles;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            db::initialize_app_database(app.handle()).map_err(std::io::Error::other)?;
            let mut connection =
                db::open_app_connection(app.handle()).map_err(std::io::Error::other)?;
            maintenance::repository::seed_default_templates(&mut connection)
                .map_err(std::io::Error::other)?;
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            db::database_status,
            expenses::commands::list_expenses,
            expenses::commands::list_expenses_for_vehicle,
            expenses::commands::get_expense,
            expenses::commands::create_expense,
            expenses::commands::update_expense,
            expenses::commands::archive_expense,
            expenses::commands::get_expense_summary,
            expenses::commands::get_vehicle_cost_report,
            expenses::commands::get_reports_overview,
            fuel::commands::list_fuel_logs_for_vehicle,
            fuel::commands::get_fuel_log,
            fuel::commands::create_fuel_log,
            fuel::commands::update_fuel_log,
            fuel::commands::archive_fuel_log,
            fuel::commands::store_fuel_receipt,
            fuel::commands::get_fuel_efficiency_summary_for_vehicle,
            maintenance::commands::list_maintenance_templates,
            maintenance::commands::get_applicable_maintenance_templates_for_vehicle,
            maintenance::commands::seed_maintenance_templates,
            maintenance::commands::list_maintenance_schedules_for_vehicle,
            maintenance::commands::sync_maintenance_schedules_for_vehicle,
            maintenance::commands::refresh_maintenance_alerts_for_vehicle,
            maintenance::commands::list_alerts,
            maintenance::commands::dismiss_alert,
            maintenance::commands::complete_maintenance_schedule,
            maintenance::commands::list_service_history_for_vehicle,
            maintenance::commands::get_maintenance_log,
            maintenance::commands::store_maintenance_receipt,
            maintenance::commands::store_maintenance_photo,
            vehicles::commands::list_vehicles,
            vehicles::commands::get_vehicle,
            vehicles::commands::store_vehicle_photo,
            vehicles::commands::create_vehicle,
            vehicles::commands::update_vehicle,
            vehicles::commands::archive_vehicle,
        ])
        .run(tauri::generate_context!())
        .expect("error while running TOG 5 VMS");
}

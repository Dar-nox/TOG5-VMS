mod db;
pub mod domain;
mod vehicles;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            db::initialize_app_database(app.handle()).map_err(std::io::Error::other)?;
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            db::database_status,
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

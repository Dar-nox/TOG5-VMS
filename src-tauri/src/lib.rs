mod db;
pub mod domain;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            db::initialize_app_database(app.handle()).map_err(std::io::Error::other)?;
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![db::database_status])
        .run(tauri::generate_context!())
        .expect("error while running TOG 5 VMS");
}

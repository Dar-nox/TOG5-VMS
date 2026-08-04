//! The Windows app.
//!
//! A window with TOG 5 VMS in it, and nothing else. The records live in
//! Postgres and the app talks to them directly, so there is no local database,
//! no backup format, and no commands for the frontend to call — all of which
//! used to be here, and all of which are now Supabase's job.
//!
//! What is left exists so the fleet keeps a Start-menu icon. The web app is
//! the same thing in a browser; anybody who would rather not install
//! something can use that instead.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running TOG 5 VMS");
}

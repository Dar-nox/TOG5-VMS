//! The TOG 5 VMS desktop shell.
//!
//! It is a window and nothing else. The app itself lives on the server and is
//! loaded over HTTPS, so this crate has no database, no commands, and no IPC —
//! only the job of opening TOG 5 VMS without a browser's address bar, tabs, or
//! menus in the way.

use std::{env, fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{WebviewUrl, WebviewWindowBuilder};

const CONFIG_FILE_NAME: &str = "vms-shell.json";

/// Where a fresh install points until somebody edits the config file. This is
/// right on the machine that runs the server and wrong everywhere else, which
/// is the safer way round: it never silently points at a stranger's address.
const DEFAULT_SERVER_URL: &str = "http://127.0.0.1:8787";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShellConfig {
    server_url: String,
}

impl Default for ShellConfig {
    fn default() -> Self {
        Self {
            server_url: DEFAULT_SERVER_URL.to_string(),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = load_config();

    tauri::Builder::default()
        .setup(move |app| {
            let window =
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                    .title("TOG 5 VMS")
                    .inner_size(1200.0, 800.0)
                    .min_inner_size(1024.0, 700.0)
                    // The launcher page reads this, checks the server is up,
                    // and then hands the window over to the app.
                    .initialization_script(format!(
                        "window.__VMS_SERVER_URL__ = {};",
                        serde_json::to_string(&config.server_url)
                            .unwrap_or_else(|_| "\"\"".to_string())
                    ))
                    .build()?;

            let _ = window.set_focus();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running TOG 5 VMS");
}

/// Reads `vms-shell.json` from beside the executable, writing a starter file
/// the first time so whoever installs this has something obvious to edit.
fn load_config() -> ShellConfig {
    let Some(path) = config_path() else {
        return ShellConfig::default();
    };

    if let Ok(contents) = fs::read_to_string(&path) {
        if let Ok(config) = serde_json::from_str::<ShellConfig>(&contents) {
            return config;
        }

        eprintln!(
            "{} could not be read. Using {DEFAULT_SERVER_URL} until it is fixed.",
            path.display()
        );

        return ShellConfig::default();
    }

    let config = ShellConfig::default();
    if let Ok(contents) = serde_json::to_string_pretty(&config) {
        let _ = fs::write(&path, contents);
    }

    config
}

fn config_path() -> Option<PathBuf> {
    let executable = env::current_exe().ok()?;

    Some(executable.parent()?.join(CONFIG_FILE_NAME))
}

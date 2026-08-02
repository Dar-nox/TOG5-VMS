use std::{
    env,
    net::SocketAddr,
    path::{Path, PathBuf},
};

/// Loopback by default: the public route is a Cloudflare Tunnel running on the
/// same machine, so the server itself never needs to listen on the network.
pub const DEFAULT_BIND_ADDRESS: &str = "127.0.0.1:8787";

/// Matches the Tauri bundle identifier, so a server started on a machine that
/// already ran the desktop app picks up the existing data folder untouched.
const APP_DATA_FOLDER_NAME: &str = "com.tog5.vms";

const WEB_FOLDER_NAME: &str = "dist";

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub bind_address: SocketAddr,
    pub data_dir: PathBuf,
    pub web_dir: Option<PathBuf>,
    pub secure_cookies: bool,
}

impl ServerConfig {
    pub fn from_environment() -> Result<Self, String> {
        let bind_address = read_text("VMS_BIND_ADDRESS")
            .unwrap_or_else(|| DEFAULT_BIND_ADDRESS.to_string())
            .parse()
            .map_err(|_| {
                "VMS_BIND_ADDRESS must look like 127.0.0.1:8787 or 0.0.0.0:8787.".to_string()
            })?;

        let data_dir = match read_text("VMS_DATA_DIR") {
            Some(value) => PathBuf::from(value),
            None => default_data_dir()?,
        };

        let web_dir = match read_text("VMS_WEB_DIR") {
            Some(value) => Some(PathBuf::from(value)),
            None => default_web_dir(),
        };

        Ok(Self {
            bind_address,
            data_dir,
            web_dir,
            secure_cookies: read_flag("VMS_SECURE_COOKIES", true)?,
        })
    }
}

fn read_text(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn read_flag(name: &str, default: bool) -> Result<bool, String> {
    let Some(value) = read_text(name) else {
        return Ok(default);
    };

    match value.to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Ok(true),
        "0" | "false" | "no" | "off" => Ok(false),
        _ => Err(format!("{name} must be true or false.")),
    }
}

#[cfg(windows)]
fn default_data_dir() -> Result<PathBuf, String> {
    let roaming = env::var("APPDATA")
        .map_err(|_| "Could not find the Windows app data folder. Set VMS_DATA_DIR.".to_string())?;

    Ok(PathBuf::from(roaming).join(APP_DATA_FOLDER_NAME))
}

#[cfg(not(windows))]
fn default_data_dir() -> Result<PathBuf, String> {
    let home = env::var("HOME")
        .map_err(|_| "Could not find the home folder. Set VMS_DATA_DIR.".to_string())?;

    Ok(PathBuf::from(home)
        .join(".local/share")
        .join(APP_DATA_FOLDER_NAME))
}

/// Looks for the built web app beside the executable first, so an installed
/// service finds it regardless of the working directory it was started in.
fn default_web_dir() -> Option<PathBuf> {
    let beside_executable = env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf))
        .map(|dir| dir.join(WEB_FOLDER_NAME));

    beside_executable
        .into_iter()
        .chain(std::iter::once(PathBuf::from(WEB_FOLDER_NAME)))
        .find(|candidate| candidate.join("index.html").is_file())
}

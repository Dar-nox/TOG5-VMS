pub mod config;
pub mod error;
pub mod rate_limit;
pub mod routes;
pub mod rpc;
pub mod session;
pub mod state;

use std::{fs, net::SocketAddr, time::Duration};

use tokio::net::TcpListener;
use vms_core::{
    auth::repository::purge_expired_sessions,
    backup::service::{apply_pending_restore, BackupContext},
    maintenance, settings, AppPaths, Database,
};

use crate::{config::ServerConfig, error::ApiError, state::AppState};

/// How long the server keeps answering after a restore asks it to restart, so
/// the browser gets the "restore is ready" response before the socket closes.
const RESTART_GRACE: Duration = Duration::from_millis(500);

pub async fn run() -> Result<(), String> {
    start_logging();

    let config = ServerConfig::from_environment()?;
    let bind_address = config.bind_address;
    let state = build_state(config)?;

    let listener = TcpListener::bind(bind_address)
        .await
        .map_err(|error| format!("Could not listen on {bind_address}: {error}"))?;

    tracing::info!(
        address = %bind_address,
        data_dir = %state.paths().data_dir().display(),
        web_app = state.config().web_dir.is_some(),
        "TOG 5 VMS server is ready"
    );

    let app = routes::router(state.clone());

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal(state))
    .await
    .map_err(|error| format!("The server stopped unexpectedly: {error}"))
}

/// Opens the app data folder, finishes anything the last run left half-done,
/// and gets the database ready to answer requests.
pub fn build_state(config: ServerConfig) -> Result<AppState, String> {
    let paths = AppPaths::new(&config.data_dir, env!("CARGO_PKG_VERSION"));

    prepare_folders(&paths)?;
    finish_any_staged_restore(&paths)?;

    let database = Database::initialize(&paths)?;
    prepare_data(&database)?;

    Ok(AppState::new(database, paths, config))
}

/// Runs blocking work — which is all database and file work — off the async
/// runtime, so one slow backup cannot stall every other request.
pub async fn blocking<T, F>(operation: F) -> Result<T, ApiError>
where
    F: FnOnce() -> Result<T, ApiError> + Send + 'static,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(operation)
        .await
        .map_err(|_| ApiError::internal("Something went wrong while handling that request."))?
}

fn start_logging() {
    let filter = tracing_subscriber::EnvFilter::try_from_env("VMS_LOG")
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));

    tracing_subscriber::fmt().with_env_filter(filter).init();
}

fn prepare_folders(paths: &AppPaths) -> Result<(), String> {
    fs::create_dir_all(paths.data_dir())
        .map_err(|_| "Could not prepare the app data folder.".to_string())?;

    for folder in paths.managed_file_dirs() {
        fs::create_dir_all(&folder)
            .map_err(|_| format!("Could not prepare {}.", folder.display()))?;
    }

    Ok(())
}

/// A restore staged by an earlier run replaces the database file, so it has to
/// happen here — before the connection pool opens anything.
fn finish_any_staged_restore(paths: &AppPaths) -> Result<(), String> {
    let context = BackupContext::new(
        paths.data_dir().to_path_buf(),
        paths.database_path(),
        paths.app_version().to_string(),
    );

    if let Some(source) = apply_pending_restore(&context)? {
        tracing::info!(source = %source, "Applied the restore that was waiting");
    }

    Ok(())
}

fn prepare_data(database: &Database) -> Result<(), String> {
    let mut connection = database.connection()?;

    maintenance::repository::seed_default_templates(&mut connection)?;
    settings::repository::ensure_default_settings(&connection)?;
    settings::repository::ensure_default_owner_user(&connection)?;

    let purged = purge_expired_sessions(&connection)?;
    if purged > 0 {
        tracing::info!(purged, "Cleared expired sign-in sessions");
    }

    Ok(())
}

async fn shutdown_signal(state: AppState) {
    let interrupted = async {
        let _ = tokio::signal::ctrl_c().await;
        tracing::info!("Stopping on request");
    };

    let restarting = async {
        state.wait_for_restart_request().await;
        tokio::time::sleep(RESTART_GRACE).await;
        tracing::info!("Stopping so a staged restore can be applied on the next start");
    };

    tokio::select! {
        _ = interrupted => {}
        _ = restarting => {}
    }
}

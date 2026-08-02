use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use tokio::sync::Notify;
use vms_core::{
    backup::service::BackupContext,
    db::{Database, PooledSqlite},
    AppPaths,
};

use crate::{config::ServerConfig, rate_limit::LoginRateLimiter};

/// Everything a request handler needs. Cheap to clone: the pool, the paths,
/// and the config all sit behind shared handles.
#[derive(Clone)]
pub struct AppState {
    database: Database,
    paths: AppPaths,
    config: Arc<ServerConfig>,
    login_limiter: Arc<LoginRateLimiter>,
    restart_requested: Arc<Notify>,
    restarting: Arc<AtomicBool>,
}

impl AppState {
    pub fn new(database: Database, paths: AppPaths, config: ServerConfig) -> Self {
        Self {
            database,
            paths,
            config: Arc::new(config),
            login_limiter: Arc::new(LoginRateLimiter::new()),
            restart_requested: Arc::new(Notify::new()),
            restarting: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn database(&self) -> &Database {
        &self.database
    }

    pub fn paths(&self) -> &AppPaths {
        &self.paths
    }

    pub fn config(&self) -> &ServerConfig {
        &self.config
    }

    pub fn login_limiter(&self) -> &LoginRateLimiter {
        &self.login_limiter
    }

    pub fn connection(&self) -> Result<PooledSqlite, String> {
        self.database.connection()
    }

    pub fn backup_context(&self) -> BackupContext {
        BackupContext::new(
            self.paths.data_dir().to_path_buf(),
            self.database.path().to_path_buf(),
            self.paths.app_version().to_string(),
        )
    }

    /// Asks the process to shut down once the current response has been sent.
    /// A staged restore only takes effect on the next start, so the server has
    /// to bow out for the service manager to bring it back on the new data.
    pub fn request_restart(&self) {
        self.restarting.store(true, Ordering::SeqCst);
        self.restart_requested.notify_one();
    }

    pub async fn wait_for_restart_request(&self) {
        self.restart_requested.notified().await;
    }

    pub fn restart_was_requested(&self) -> bool {
        self.restarting.load(Ordering::SeqCst)
    }
}

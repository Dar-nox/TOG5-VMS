use std::{
    fs,
    path::{Path, PathBuf},
};

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use tauri::{AppHandle, Manager};

pub const DATABASE_FILE_NAME: &str = "tog5-vms.sqlite3";

pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial_schema",
        sql: include_str!("../../migrations/001_initial_schema.sql"),
    },
    Migration {
        version: 2,
        name: "maintenance_template_keys",
        sql: include_str!("../../migrations/002_maintenance_template_keys.sql"),
    },
    Migration {
        version: 3,
        name: "maintenance_schedules_alerts_indexes",
        sql: include_str!("../../migrations/003_maintenance_schedules_alerts_indexes.sql"),
    },
    Migration {
        version: 4,
        name: "trip_logs",
        sql: include_str!("../../migrations/004_trip_logs.sql"),
    },
];

#[derive(Debug, Clone, Copy)]
pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub sql: &'static str,
}

#[derive(Debug, Serialize)]
pub struct DatabaseStatus {
    pub database_path: String,
    pub applied_migrations: Vec<AppliedMigration>,
}

#[derive(Debug, Serialize)]
pub struct AppliedMigration {
    pub version: i64,
    pub name: String,
    pub applied_at: String,
}

pub fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(DATABASE_FILE_NAME))
        .map_err(|error| format!("Could not resolve app data directory: {error}"))
}

pub fn initialize_app_database(app: &AppHandle) -> Result<DatabaseStatus, String> {
    let path = database_path(app)?;
    initialize_database_at_path(&path)
}

pub fn open_app_connection(app: &AppHandle) -> Result<Connection, String> {
    let path = database_path(app)?;
    initialize_database_at_path(&path)?;
    open_database_at_path(&path)
}

pub fn open_database_at_path(path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(path).map_err(|error| {
        format!(
            "Could not open SQLite database '{}': {error}",
            path.display()
        )
    })?;

    configure_connection(&connection)?;
    Ok(connection)
}

pub fn initialize_database_at_path(path: &Path) -> Result<DatabaseStatus, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Could not create database directory '{}': {error}",
                parent.display()
            )
        })?;
    }

    let mut connection = Connection::open(path).map_err(|error| {
        format!(
            "Could not open SQLite database '{}': {error}",
            path.display()
        )
    })?;

    configure_connection(&connection)?;
    run_migrations(&mut connection)?;

    let applied_migrations = applied_migrations(&connection)?;

    Ok(DatabaseStatus {
        database_path: path.display().to_string(),
        applied_migrations,
    })
}

pub(crate) fn configure_connection(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA busy_timeout = 5000;
            ",
        )
        .map_err(|error| format!("Could not configure SQLite connection: {error}"))
}

fn run_migrations(connection: &mut Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS schema_migrations (
              version INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            ",
        )
        .map_err(|error| format!("Could not prepare migration tracker: {error}"))?;

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start migration transaction: {error}"))?;

    for migration in MIGRATIONS {
        let already_applied = transaction
            .query_row(
                "SELECT 1 FROM schema_migrations WHERE version = ?1",
                params![migration.version],
                |_| Ok(()),
            )
            .optional()
            .map_err(|error| {
                format!(
                    "Could not check migration {} ({}): {error}",
                    migration.version, migration.name
                )
            })?
            .is_some();

        if already_applied {
            continue;
        }

        transaction.execute_batch(migration.sql).map_err(|error| {
            format!(
                "Could not apply migration {} ({}): {error}",
                migration.version, migration.name
            )
        })?;

        transaction
            .execute(
                "INSERT INTO schema_migrations (version, name) VALUES (?1, ?2)",
                params![migration.version, migration.name],
            )
            .map_err(|error| {
                format!(
                    "Could not record migration {} ({}): {error}",
                    migration.version, migration.name
                )
            })?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not commit migrations: {error}"))
}

fn applied_migrations(connection: &Connection) -> Result<Vec<AppliedMigration>, String> {
    let mut statement = connection
        .prepare("SELECT version, name, applied_at FROM schema_migrations ORDER BY version")
        .map_err(|error| format!("Could not read migration status: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(AppliedMigration {
                version: row.get(0)?,
                name: row.get(1)?,
                applied_at: row.get(2)?,
            })
        })
        .map_err(|error| format!("Could not query migration status: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not parse migration status: {error}"))
}

#[tauri::command]
pub fn database_status(app: AppHandle) -> Result<DatabaseStatus, String> {
    initialize_app_database(&app)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initializes_database_and_runs_migrations_once() {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("test.sqlite3");

        let first_status =
            initialize_database_at_path(&database_path).expect("first init should succeed");
        let second_status =
            initialize_database_at_path(&database_path).expect("second init should succeed");

        assert!(database_path.exists());
        assert_eq!(first_status.applied_migrations.len(), MIGRATIONS.len());
        assert_eq!(second_status.applied_migrations.len(), MIGRATIONS.len());
        assert_eq!(second_status.applied_migrations[0].version, 1);
        assert_eq!(second_status.applied_migrations[1].version, 2);
        assert_eq!(second_status.applied_migrations[2].version, 3);
        assert_eq!(second_status.applied_migrations[3].version, 4);
    }

    #[test]
    fn initial_schema_contains_phase_two_tables() {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("schema.sqlite3");
        initialize_database_at_path(&database_path).expect("init should succeed");

        let connection = Connection::open(database_path).expect("database should open");
        let mut statement = connection
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
            .expect("table list should prepare");
        let table_names = statement
            .query_map([], |row| row.get::<_, String>(0))
            .expect("table list should query")
            .collect::<Result<Vec<_>, _>>()
            .expect("table names should parse");

        for table in [
            "schema_migrations",
            "users",
            "vehicles",
            "vehicle_photos",
            "vehicle_documents",
            "vehicle_features",
            "fuel_logs",
            "maintenance_templates",
            "maintenance_template_rules",
            "vehicle_maintenance_settings",
            "maintenance_schedules",
            "maintenance_logs",
            "repair_records",
            "parts_inventory",
            "expenses",
            "alerts",
            "settings",
            "backups",
            "audit_logs",
            "trips",
            "trip_drivers",
            "trip_passengers",
            "trip_destinations",
        ] {
            assert!(
                table_names.iter().any(|name| name == table),
                "missing table {table}"
            );
        }
    }
}

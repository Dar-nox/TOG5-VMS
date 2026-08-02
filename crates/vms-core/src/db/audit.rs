use rusqlite::{params, Connection};

use crate::vehicles::photo_storage::generate_local_id;

/// The tables that carry `created_by` and `updated_by`. Attribution is only
/// ever written to a name from this list, so a caller cannot reach an
/// arbitrary table through the table name.
pub const ATTRIBUTED_TABLES: &[&str] = &[
    "vehicles",
    "vehicle_documents",
    "fuel_logs",
    "trips",
    "maintenance_logs",
    "repair_records",
    "expenses",
];

pub struct AuditEntry<'a> {
    pub user_id: Option<&'a str>,
    pub action: &'a str,
    pub entity_type: &'a str,
    pub entity_id: Option<&'a str>,
    pub summary: &'a str,
    pub metadata_json: Option<&'a str>,
}

pub fn record_audit(connection: &Connection, entry: AuditEntry<'_>) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT INTO audit_logs (
              id,
              user_id,
              action,
              entity_type,
              entity_id,
              summary,
              metadata_json
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ",
            params![
                generate_local_id("audit"),
                entry.user_id,
                entry.action,
                entry.entity_type,
                entry.entity_id,
                entry.summary,
                entry.metadata_json,
            ],
        )
        .map_err(|_| "Could not record the activity history entry.".to_string())?;

    Ok(())
}

/// Records who created a row, and who touched it last.
///
/// Written straight after the row itself rather than inside the repositories,
/// so the domain rules stay unaware of who is signed in. The record already
/// exists by the time this runs, which is why a failure here is worth
/// reporting but never worth undoing somebody's work over.
pub fn set_created_by(
    connection: &Connection,
    table: &str,
    id: &str,
    user_id: &str,
) -> Result<(), String> {
    let table = attributed_table(table)?;

    connection
        .execute(
            &format!("UPDATE {table} SET created_by = ?1, updated_by = ?1 WHERE id = ?2"),
            params![user_id, id],
        )
        .map_err(|_| format!("Could not record who added that {table} record."))?;

    Ok(())
}

pub fn set_updated_by(
    connection: &Connection,
    table: &str,
    id: &str,
    user_id: &str,
) -> Result<(), String> {
    let table = attributed_table(table)?;

    connection
        .execute(
            &format!("UPDATE {table} SET updated_by = ?1 WHERE id = ?2"),
            params![user_id, id],
        )
        .map_err(|_| format!("Could not record who changed that {table} record."))?;

    Ok(())
}

fn attributed_table(table: &str) -> Result<&'static str, String> {
    ATTRIBUTED_TABLES
        .iter()
        .find(|attributed| **attributed == table)
        .copied()
        .ok_or_else(|| format!("'{table}' does not record who changed it."))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{initialize_database_at_path, open_database_at_path};

    fn test_connection() -> (tempfile::TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("audit.sqlite3");
        initialize_database_at_path(&database_path).expect("init should succeed");
        let connection = open_database_at_path(&database_path).expect("database should open");

        (temp_dir, connection)
    }

    #[test]
    fn records_an_entry_that_can_be_read_back() {
        let (_temp_dir, connection) = test_connection();

        record_audit(
            &connection,
            AuditEntry {
                user_id: None,
                action: "create",
                entity_type: "vehicle",
                entity_id: Some("vehicle_1"),
                summary: "Added vehicle Service Van 1.",
                metadata_json: None,
            },
        )
        .expect("audit entry should record");

        let (action, entity_id, summary): (String, String, String) = connection
            .query_row(
                "SELECT action, entity_id, summary FROM audit_logs",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("audit entry should be readable");

        assert_eq!(action, "create");
        assert_eq!(entity_id, "vehicle_1");
        assert_eq!(summary, "Added vehicle Service Van 1.");
    }

    fn seed_vehicle_and_user(connection: &Connection) -> (String, String) {
        connection
            .execute(
                "
                INSERT INTO users (id, display_name, username, role, status)
                VALUES ('user_1', 'Maria Santos', 'maria', 'manager', 'active')
                ",
                [],
            )
            .expect("user should insert");
        connection
            .execute(
                "
                INSERT INTO vehicles (
                  id, vehicle_name, vehicle_type, fuel_type, current_odometer, status
                )
                VALUES ('vehicle_1', 'Service Van 1', 'van', 'diesel', 0, 'active')
                ",
                [],
            )
            .expect("vehicle should insert");

        ("user_1".to_string(), "vehicle_1".to_string())
    }

    fn attribution(connection: &Connection) -> (Option<String>, Option<String>) {
        connection
            .query_row(
                "SELECT created_by, updated_by FROM vehicles WHERE id = 'vehicle_1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("vehicle should be readable")
    }

    #[test]
    fn attribution_records_the_author_then_only_the_last_editor() {
        let (_temp_dir, connection) = test_connection();
        let (user_id, vehicle_id) = seed_vehicle_and_user(&connection);

        set_created_by(&connection, "vehicles", &vehicle_id, &user_id)
            .expect("author should record");
        assert_eq!(
            attribution(&connection),
            (Some(user_id.clone()), Some(user_id.clone()))
        );

        connection
            .execute(
                "
                INSERT INTO users (id, display_name, username, role, status)
                VALUES ('user_2', 'Carlos Reyes', 'carlos', 'manager', 'active')
                ",
                [],
            )
            .expect("second user should insert");
        set_updated_by(&connection, "vehicles", &vehicle_id, "user_2")
            .expect("editor should record");

        assert_eq!(
            attribution(&connection),
            (Some(user_id), Some("user_2".to_string())),
            "an edit must not rewrite who originally added the record"
        );
    }

    #[test]
    fn attribution_refuses_a_table_that_does_not_track_it() {
        let (_temp_dir, connection) = test_connection();

        // Would otherwise be a table name going straight into SQL.
        assert!(set_created_by(&connection, "users", "user_1", "user_1").is_err());
        assert!(set_updated_by(&connection, "vehicles WHERE 1=1; --", "x", "user_1").is_err());
    }

    #[test]
    fn rejects_an_entry_for_an_unknown_user() {
        let (_temp_dir, connection) = test_connection();

        let result = record_audit(
            &connection,
            AuditEntry {
                user_id: Some("user_does_not_exist"),
                action: "delete",
                entity_type: "vehicle",
                entity_id: Some("vehicle_1"),
                summary: "Archived a vehicle.",
                metadata_json: None,
            },
        );

        assert!(result.is_err());
    }
}

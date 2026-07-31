use rusqlite::{params, Connection};

use crate::vehicles::photo_storage::generate_local_id;

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

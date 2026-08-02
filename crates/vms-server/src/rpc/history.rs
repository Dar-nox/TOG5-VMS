//! Records who changed what.
//!
//! This sits at the dispatch layer rather than inside the repositories, on
//! purpose: the domain rules should stay unaware of sign-in, and their tests
//! should stay unaware of it too. The cost is that attribution is written just
//! after the row instead of in the same statement — acceptable, because the
//! only reader is a history that is allowed to be a moment behind, and a
//! failure here must never undo somebody's work.

use serde_json::Value;
use vms_core::{
    db::audit::{record_audit, set_created_by, set_updated_by, AuditEntry},
    settings::models::LocalUserRecord,
};

use super::RpcContext;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    Create,
    Update,
    Archive,
}

impl Action {
    fn verb(self) -> &'static str {
        match self {
            Action::Create => "Added",
            Action::Update => "Updated",
            Action::Archive => "Archived",
        }
    }

    fn name(self) -> &'static str {
        match self {
            Action::Create => "create",
            Action::Update => "update",
            Action::Archive => "archive",
        }
    }
}

struct Change {
    command: &'static str,
    /// What the person would call it.
    entity: &'static str,
    /// The table to stamp with `created_by`/`updated_by`, when it has those
    /// columns. Attachments, templates, and settings do not, so they are
    /// recorded in the history only.
    table: Option<&'static str>,
    action: Action,
}

/// Every command that changes something. Commands that only read are absent,
/// which is why a plain day of looking things up leaves no history behind.
const CHANGES: &[Change] = &[
    Change {
        command: "create_vehicle",
        entity: "vehicle",
        table: Some("vehicles"),
        action: Action::Create,
    },
    Change {
        command: "update_vehicle",
        entity: "vehicle",
        table: Some("vehicles"),
        action: Action::Update,
    },
    Change {
        command: "archive_vehicle",
        entity: "vehicle",
        table: Some("vehicles"),
        action: Action::Archive,
    },
    Change {
        command: "store_vehicle_photo",
        entity: "vehicle photo",
        table: None,
        action: Action::Create,
    },
    Change {
        command: "create_fuel_log",
        entity: "fuel log",
        table: Some("fuel_logs"),
        action: Action::Create,
    },
    Change {
        command: "update_fuel_log",
        entity: "fuel log",
        table: Some("fuel_logs"),
        action: Action::Update,
    },
    Change {
        command: "archive_fuel_log",
        entity: "fuel log",
        table: Some("fuel_logs"),
        action: Action::Archive,
    },
    Change {
        command: "store_fuel_receipt",
        entity: "fuel receipt",
        table: None,
        action: Action::Create,
    },
    Change {
        command: "start_trip",
        entity: "trip",
        table: Some("trips"),
        action: Action::Create,
    },
    Change {
        command: "complete_trip",
        entity: "trip",
        table: Some("trips"),
        action: Action::Update,
    },
    Change {
        command: "archive_trip",
        entity: "trip",
        table: Some("trips"),
        action: Action::Archive,
    },
    Change {
        command: "create_expense",
        entity: "expense",
        table: Some("expenses"),
        action: Action::Create,
    },
    Change {
        command: "update_expense",
        entity: "expense",
        table: Some("expenses"),
        action: Action::Update,
    },
    Change {
        command: "archive_expense",
        entity: "expense",
        table: Some("expenses"),
        action: Action::Archive,
    },
    Change {
        command: "log_maintenance",
        entity: "service record",
        table: Some("maintenance_logs"),
        action: Action::Create,
    },
    Change {
        command: "complete_maintenance_schedule",
        entity: "service record",
        table: Some("maintenance_logs"),
        action: Action::Create,
    },
    Change {
        command: "store_maintenance_receipt",
        entity: "maintenance receipt",
        table: None,
        action: Action::Create,
    },
    Change {
        command: "store_maintenance_photo",
        entity: "maintenance photo",
        table: None,
        action: Action::Create,
    },
    Change {
        command: "create_maintenance_template",
        entity: "maintenance template",
        table: None,
        action: Action::Create,
    },
    Change {
        command: "update_maintenance_template",
        entity: "maintenance template",
        table: None,
        action: Action::Update,
    },
    Change {
        command: "archive_maintenance_template",
        entity: "maintenance template",
        table: None,
        action: Action::Archive,
    },
    Change {
        command: "seed_maintenance_templates",
        entity: "maintenance templates",
        table: None,
        action: Action::Create,
    },
    Change {
        command: "upsert_vehicle_maintenance_setting",
        entity: "vehicle maintenance setting",
        table: None,
        action: Action::Update,
    },
    Change {
        command: "archive_vehicle_maintenance_setting",
        entity: "vehicle maintenance setting",
        table: None,
        action: Action::Archive,
    },
    Change {
        command: "dismiss_alert",
        entity: "alert",
        table: None,
        action: Action::Update,
    },
    Change {
        command: "update_app_settings",
        entity: "app settings",
        table: None,
        action: Action::Update,
    },
    Change {
        command: "reset_app_settings",
        entity: "app settings",
        table: None,
        action: Action::Update,
    },
    Change {
        command: "create_local_user",
        entity: "user",
        table: None,
        action: Action::Create,
    },
    Change {
        command: "update_local_user",
        entity: "user",
        table: None,
        action: Action::Update,
    },
    Change {
        command: "set_local_user_password",
        entity: "user password",
        table: None,
        action: Action::Update,
    },
    Change {
        command: "create_backup",
        entity: "backup",
        table: None,
        action: Action::Create,
    },
    Change {
        command: "restore_backup",
        entity: "restore",
        table: None,
        action: Action::Update,
    },
    Change {
        command: "clear_app_data",
        entity: "all fleet data",
        table: None,
        action: Action::Archive,
    },
];

/// Pulls the record id out of the arguments before a command consumes them.
/// Archiving answers with nothing, so this is the only chance to learn which
/// record it was.
pub fn entity_id_from_args(args: &Value) -> Option<String> {
    for key in ["id", "settingId", "templateId", "alertId"] {
        if let Some(id) = args.get(key).and_then(Value::as_str) {
            return Some(id.to_string());
        }
    }

    None
}

/// Called after a command succeeds. Never fails the request: the change has
/// already happened, and refusing to tell somebody their work was saved
/// because the history could not be written would be the wrong trade.
pub fn record(context: &RpcContext, command: &str, response: &Value, id_from_args: Option<&str>) {
    let Some(change) = CHANGES.iter().find(|change| change.command == command) else {
        return;
    };

    let entity_id = entity_id_from_response(response).or_else(|| id_from_args.map(str::to_string));

    if let Err(message) = write(context, change, entity_id.as_deref(), context.user()) {
        tracing::warn!(command, %message, "Could not record this change in the history");
    }
}

fn write(
    context: &RpcContext,
    change: &Change,
    entity_id: Option<&str>,
    user: &LocalUserRecord,
) -> Result<(), String> {
    let connection = context.connection()?;

    if let (Some(table), Some(entity_id)) = (change.table, entity_id) {
        match change.action {
            Action::Create => set_created_by(&connection, table, entity_id, &user.id)?,
            Action::Update | Action::Archive => {
                set_updated_by(&connection, table, entity_id, &user.id)?
            }
        }
    }

    record_audit(
        &connection,
        AuditEntry {
            user_id: Some(&user.id),
            action: change.action.name(),
            entity_type: change.entity,
            entity_id,
            summary: &format!("{} a {}.", change.action.verb(), change.entity),
            metadata_json: None,
        },
    )
}

/// Most commands answer with the record they changed. `log_maintenance` and
/// `complete_maintenance_schedule` wrap theirs in a result object, so the
/// nested log is checked too.
fn entity_id_from_response(response: &Value) -> Option<String> {
    response
        .get("id")
        .or_else(|| response.get("log").and_then(|log| log.get("id")))
        .and_then(Value::as_str)
        .map(str::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn every_listed_command_is_a_real_command() {
        for change in CHANGES {
            assert!(
                super::super::COMMANDS.contains(&change.command),
                "'{}' is in the history table but is not a command",
                change.command
            );
        }
    }

    #[test]
    fn a_command_is_not_listed_twice() {
        for change in CHANGES {
            let listings = CHANGES
                .iter()
                .filter(|other| other.command == change.command)
                .count();

            assert_eq!(listings, 1, "'{}' is listed more than once", change.command);
        }
    }

    #[test]
    fn every_attributed_table_really_records_who_changed_it() {
        for change in CHANGES {
            if let Some(table) = change.table {
                assert!(
                    vms_core::db::audit::ATTRIBUTED_TABLES.contains(&table),
                    "'{table}' has no created_by column to write to"
                );
            }
        }
    }

    #[test]
    fn finds_the_record_id_whether_it_comes_back_or_only_went_in() {
        assert_eq!(
            entity_id_from_response(&json!({ "id": "vehicle_1" })).as_deref(),
            Some("vehicle_1")
        );
        assert_eq!(
            entity_id_from_response(&json!({ "log": { "id": "log_9" } })).as_deref(),
            Some("log_9")
        );
        assert_eq!(entity_id_from_response(&json!(null)), None);

        assert_eq!(
            entity_id_from_args(&json!({ "id": "expense_2" })).as_deref(),
            Some("expense_2")
        );
        assert_eq!(
            entity_id_from_args(&json!({ "alertId": "alert_3" })).as_deref(),
            Some("alert_3")
        );
        assert_eq!(entity_id_from_args(&json!({ "request": {} })), None);
    }
}

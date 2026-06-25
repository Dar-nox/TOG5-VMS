use std::collections::HashSet;

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::{
    models::{
        ApplicableMaintenanceTemplate, MaintenanceTemplateRecord, MaintenanceTemplateRuleRecord,
        MaintenanceVehicleProfile, SeedMaintenanceTemplatesResult,
    },
    seeds::{default_templates, RuleSeed, TemplateSeed},
};

pub fn seed_default_templates(
    connection: &mut Connection,
) -> Result<SeedMaintenanceTemplatesResult, String> {
    let transaction = connection
        .transaction()
        .map_err(|_| "Could not start maintenance template seeding.".to_string())?;
    let seeds = default_templates();
    let mut rule_count = 0;

    for seed in &seeds {
        let template_id = upsert_template(&transaction, seed)?;

        transaction
            .execute(
                "DELETE FROM maintenance_template_rules WHERE template_id = ?1",
                params![template_id],
            )
            .map_err(|_| "Could not refresh maintenance template rules.".to_string())?;

        for (index, rule) in seed.rules.iter().enumerate() {
            insert_rule(&transaction, &template_id, seed.key, index, rule)?;
            rule_count += 1;
        }
    }

    transaction
        .commit()
        .map_err(|_| "Could not finish maintenance template seeding.".to_string())?;

    Ok(SeedMaintenanceTemplatesResult {
        template_count: seeds.len(),
        rule_count,
    })
}

pub fn list_active_templates(
    connection: &Connection,
) -> Result<Vec<MaintenanceTemplateRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              template_key,
              name,
              category,
              description,
              default_time_interval_days,
              default_odometer_interval_km,
              default_due_soon_days,
              default_due_soon_km,
              priority,
              is_active
            FROM maintenance_templates
            WHERE is_active = 1
              AND deleted_at IS NULL
            ORDER BY category, name
            ",
        )
        .map_err(|_| "Could not prepare the maintenance template list.".to_string())?;

    let rows = statement
        .query_map([], template_from_row)
        .map_err(|_| "Could not read maintenance templates.".to_string())?;
    let mut templates = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse maintenance templates.".to_string())?;

    for template in &mut templates {
        template.rules = list_rules_for_template(connection, &template.id)?;
    }

    Ok(templates)
}

pub fn list_rules_for_template(
    connection: &Connection,
    template_id: &str,
) -> Result<Vec<MaintenanceTemplateRuleRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              template_id,
              applies_to_vehicle_type,
              applies_to_fuel_type,
              applies_to_transmission_type,
              applies_to_drivetrain,
              requires_feature,
              excludes_feature,
              rule_type,
              notes
            FROM maintenance_template_rules
            WHERE template_id = ?1
            ORDER BY id
            ",
        )
        .map_err(|_| "Could not prepare maintenance template rules.".to_string())?;

    let rows = statement
        .query_map(params![template_id], rule_from_row)
        .map_err(|_| "Could not read maintenance template rules.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse maintenance template rules.".to_string())
}

pub fn applicable_templates_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<ApplicableMaintenanceTemplate>, String> {
    let vehicle = get_vehicle_profile(connection, vehicle_id)?
        .ok_or_else(|| "Vehicle was not found.".to_string())?;
    let templates = list_active_templates(connection)?;

    Ok(templates
        .into_iter()
        .map(|template| evaluate_template(&vehicle, template))
        .collect())
}

fn upsert_template(connection: &Connection, seed: &TemplateSeed) -> Result<String, String> {
    let existing_id = connection
        .query_row(
            "
            SELECT id
            FROM maintenance_templates
            WHERE template_key = ?1
               OR (template_key IS NULL AND name = ?2)
            LIMIT 1
            ",
            params![seed.key, seed.name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| "Could not check existing maintenance template seed.".to_string())?;

    let template_id = existing_id.unwrap_or_else(|| format!("maintenance_template__{}", seed.key));

    let changed_rows = connection
        .execute(
            "
            UPDATE maintenance_templates
            SET
              template_key = ?1,
              name = ?2,
              category = ?3,
              description = ?4,
              default_time_interval_days = ?5,
              default_odometer_interval_km = ?6,
              default_due_soon_days = ?7,
              default_due_soon_km = ?8,
              priority = ?9,
              is_active = 1,
              updated_at = datetime('now'),
              deleted_at = NULL
            WHERE id = ?10
            ",
            params![
                seed.key,
                seed.name,
                seed.category,
                seed.description,
                seed.default_time_interval_days,
                seed.default_odometer_interval_km,
                seed.default_due_soon_days,
                seed.default_due_soon_km,
                seed.priority,
                template_id
            ],
        )
        .map_err(|_| "Could not update maintenance template seed.".to_string())?;

    if changed_rows == 0 {
        connection
            .execute(
                "
                INSERT INTO maintenance_templates (
                  id,
                  template_key,
                  name,
                  category,
                  description,
                  default_time_interval_days,
                  default_odometer_interval_km,
                  default_due_soon_days,
                  default_due_soon_km,
                  priority,
                  is_active
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1)
                ",
                params![
                    template_id,
                    seed.key,
                    seed.name,
                    seed.category,
                    seed.description,
                    seed.default_time_interval_days,
                    seed.default_odometer_interval_km,
                    seed.default_due_soon_days,
                    seed.default_due_soon_km,
                    seed.priority
                ],
            )
            .map_err(|_| "Could not insert maintenance template seed.".to_string())?;
    }

    Ok(template_id)
}

fn insert_rule(
    connection: &Connection,
    template_id: &str,
    template_key: &str,
    index: usize,
    rule: &RuleSeed,
) -> Result<(), String> {
    let notes = empty_to_none(rule.notes);

    connection
        .execute(
            "
            INSERT INTO maintenance_template_rules (
              id,
              template_id,
              applies_to_vehicle_type,
              applies_to_fuel_type,
              applies_to_transmission_type,
              applies_to_drivetrain,
              requires_feature,
              excludes_feature,
              rule_type,
              notes
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ",
            params![
                format!("maintenance_rule__{}__{:02}", template_key, index + 1),
                template_id,
                rule.applies_to_vehicle_type,
                rule.applies_to_fuel_type,
                rule.applies_to_transmission_type,
                rule.applies_to_drivetrain,
                rule.requires_feature,
                rule.excludes_feature,
                rule.rule_type,
                notes,
            ],
        )
        .map_err(|_| "Could not insert maintenance template rule.".to_string())?;

    Ok(())
}

fn get_vehicle_profile(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Option<MaintenanceVehicleProfile>, String> {
    let vehicle = connection
        .query_row(
            "
            SELECT
              id,
              vehicle_type,
              fuel_type,
              COALESCE(transmission_type, 'unknown'),
              COALESCE(drivetrain, 'unknown')
            FROM vehicles
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![vehicle_id],
            |row| {
                Ok(MaintenanceVehicleProfile {
                    id: row.get(0)?,
                    vehicle_type: row.get(1)?,
                    fuel_type: row.get(2)?,
                    transmission_type: row.get(3)?,
                    drivetrain: row.get(4)?,
                    features: Vec::new(),
                })
            },
        )
        .optional()
        .map_err(|_| "Could not read vehicle maintenance profile.".to_string())?;

    match vehicle {
        Some(mut vehicle) => {
            vehicle.features = enabled_vehicle_features(connection, vehicle_id)?;
            Ok(Some(vehicle))
        }
        None => Ok(None),
    }
}

fn enabled_vehicle_features(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT feature_key
            FROM vehicle_features
            WHERE vehicle_id = ?1
              AND enabled = 1
            ORDER BY feature_key
            ",
        )
        .map_err(|_| "Could not prepare vehicle features.".to_string())?;
    let rows = statement
        .query_map(params![vehicle_id], |row| row.get::<_, String>(0))
        .map_err(|_| "Could not read vehicle features.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse vehicle features.".to_string())
}

fn evaluate_template(
    vehicle: &MaintenanceVehicleProfile,
    template: MaintenanceTemplateRecord,
) -> ApplicableMaintenanceTemplate {
    let enabled_features = vehicle.features.iter().cloned().collect::<HashSet<_>>();
    let rules = template.rules.clone();
    let include_rules = rules
        .iter()
        .filter(|rule| rule.rule_type == "include")
        .collect::<Vec<_>>();
    let excluded_rules = rules
        .iter()
        .filter(|rule| {
            rule.rule_type == "exclude" && rule_matches_vehicle(rule, vehicle, &enabled_features)
        })
        .collect::<Vec<_>>();

    if let Some(rule) = excluded_rules.first() {
        return ApplicableMaintenanceTemplate {
            template,
            applicability_status: "excluded".to_string(),
            is_auto_applicable: false,
            reason: rule.notes.clone().unwrap_or_else(|| {
                "This template is excluded for the selected vehicle.".to_string()
            }),
            warnings: vec!["Not auto-applied for this vehicle.".to_string()],
            matched_rule_ids: excluded_rules.iter().map(|rule| rule.id.clone()).collect(),
        };
    }

    if include_rules.is_empty() {
        return ApplicableMaintenanceTemplate {
            template,
            applicability_status: "applicable".to_string(),
            is_auto_applicable: true,
            reason: "Universal template for most vehicles.".to_string(),
            warnings: Vec::new(),
            matched_rule_ids: Vec::new(),
        };
    }

    let matching_includes = include_rules
        .iter()
        .filter(|rule| rule_matches_vehicle(rule, vehicle, &enabled_features))
        .collect::<Vec<_>>();

    if let Some(rule) = matching_includes.first() {
        return ApplicableMaintenanceTemplate {
            template,
            applicability_status: "applicable".to_string(),
            is_auto_applicable: true,
            reason: rule
                .notes
                .clone()
                .unwrap_or_else(|| "Matches the selected vehicle profile.".to_string()),
            warnings: Vec::new(),
            matched_rule_ids: matching_includes
                .iter()
                .map(|rule| rule.id.clone())
                .collect(),
        };
    }

    if let Some(rule) = include_rules.iter().find(|rule| {
        rule.requires_feature.is_some()
            && rule_matches_without_required_feature(rule, vehicle, &enabled_features)
    }) {
        let feature = rule
            .requires_feature
            .as_deref()
            .unwrap_or("required feature");

        return ApplicableMaintenanceTemplate {
            template,
            applicability_status: "requires_feature".to_string(),
            is_auto_applicable: false,
            reason: format!("Requires vehicle feature: {}.", feature_label(feature)),
            warnings: vec![
                "Add the matching vehicle feature before auto-applying this template.".to_string(),
            ],
            matched_rule_ids: Vec::new(),
        };
    }

    ApplicableMaintenanceTemplate {
        template,
        applicability_status: "not_applicable".to_string(),
        is_auto_applicable: false,
        reason: "Rules do not match the selected vehicle profile.".to_string(),
        warnings: Vec::new(),
        matched_rule_ids: Vec::new(),
    }
}

fn rule_matches_vehicle(
    rule: &MaintenanceTemplateRuleRecord,
    vehicle: &MaintenanceVehicleProfile,
    enabled_features: &HashSet<String>,
) -> bool {
    rule_field_matches(&rule.applies_to_vehicle_type, &vehicle.vehicle_type)
        && rule_field_matches(&rule.applies_to_fuel_type, &vehicle.fuel_type)
        && rule_field_matches(
            &rule.applies_to_transmission_type,
            &vehicle.transmission_type,
        )
        && rule_field_matches(&rule.applies_to_drivetrain, &vehicle.drivetrain)
        && rule
            .requires_feature
            .as_ref()
            .map(|feature| enabled_features.contains(feature))
            .unwrap_or(true)
        && rule
            .excludes_feature
            .as_ref()
            .map(|feature| !enabled_features.contains(feature))
            .unwrap_or(true)
}

fn rule_matches_without_required_feature(
    rule: &MaintenanceTemplateRuleRecord,
    vehicle: &MaintenanceVehicleProfile,
    enabled_features: &HashSet<String>,
) -> bool {
    rule_field_matches(&rule.applies_to_vehicle_type, &vehicle.vehicle_type)
        && rule_field_matches(&rule.applies_to_fuel_type, &vehicle.fuel_type)
        && rule_field_matches(
            &rule.applies_to_transmission_type,
            &vehicle.transmission_type,
        )
        && rule_field_matches(&rule.applies_to_drivetrain, &vehicle.drivetrain)
        && rule
            .excludes_feature
            .as_ref()
            .map(|feature| !enabled_features.contains(feature))
            .unwrap_or(true)
}

fn rule_field_matches(rule_value: &Option<String>, vehicle_value: &str) -> bool {
    rule_value
        .as_ref()
        .map(|value| value == vehicle_value)
        .unwrap_or(true)
}

fn template_from_row(row: &Row<'_>) -> rusqlite::Result<MaintenanceTemplateRecord> {
    Ok(MaintenanceTemplateRecord {
        id: row.get(0)?,
        template_key: row.get(1)?,
        name: row.get(2)?,
        category: row.get(3)?,
        description: row.get(4)?,
        default_time_interval_days: row.get(5)?,
        default_odometer_interval_km: row.get(6)?,
        default_due_soon_days: row.get(7)?,
        default_due_soon_km: row.get(8)?,
        priority: row.get(9)?,
        is_active: int_to_bool(row.get(10)?),
        rules: Vec::new(),
    })
}

fn rule_from_row(row: &Row<'_>) -> rusqlite::Result<MaintenanceTemplateRuleRecord> {
    Ok(MaintenanceTemplateRuleRecord {
        id: row.get(0)?,
        template_id: row.get(1)?,
        applies_to_vehicle_type: row.get(2)?,
        applies_to_fuel_type: row.get(3)?,
        applies_to_transmission_type: row.get(4)?,
        applies_to_drivetrain: row.get(5)?,
        requires_feature: row.get(6)?,
        excludes_feature: row.get(7)?,
        rule_type: row.get(8)?,
        notes: row.get(9)?,
    })
}

fn empty_to_none(value: &str) -> Option<&str> {
    (!value.trim().is_empty()).then_some(value)
}

fn int_to_bool(value: i64) -> bool {
    value != 0
}

fn feature_label(feature: &str) -> String {
    feature.replace('_', " ")
}

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::TempDir;

    use crate::db;

    use super::*;

    fn setup_database() -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("maintenance.sqlite3");
        db::initialize_database_at_path(&database_path).expect("database should initialize");
        let connection = db::open_database_at_path(&database_path).expect("database should open");

        (temp_dir, connection)
    }

    fn seed(connection: &mut Connection) {
        seed_default_templates(connection).expect("templates should seed");
    }

    fn insert_vehicle(
        connection: &Connection,
        id: &str,
        fuel_type: &str,
        transmission_type: &str,
        drivetrain: &str,
    ) {
        connection
            .execute(
                "
                INSERT INTO vehicles (
                  id,
                  vehicle_name,
                  vehicle_type,
                  fuel_type,
                  transmission_type,
                  drivetrain,
                  current_odometer,
                  status
                )
                VALUES (?1, ?2, 'van', ?3, ?4, ?5, 0, 'active')
                ",
                params![
                    id,
                    format!("Test vehicle {id}"),
                    fuel_type,
                    transmission_type,
                    drivetrain
                ],
            )
            .expect("vehicle should insert");
    }

    fn insert_feature(connection: &Connection, vehicle_id: &str, feature: &str) {
        connection
            .execute(
                "
                INSERT INTO vehicle_features (id, vehicle_id, feature_key, enabled)
                VALUES (?1, ?2, ?3, 1)
                ",
                params![format!("{vehicle_id}_{feature}"), vehicle_id, feature],
            )
            .expect("feature should insert");
    }

    fn result_for<'a>(
        results: &'a [ApplicableMaintenanceTemplate],
        key: &str,
    ) -> &'a ApplicableMaintenanceTemplate {
        results
            .iter()
            .find(|result| result.template.template_key.as_deref() == Some(key))
            .unwrap_or_else(|| panic!("missing result for {key}"))
    }

    #[test]
    fn seed_is_idempotent() {
        let (_temp_dir, mut connection) = setup_database();

        let first = seed_default_templates(&mut connection).expect("first seed should pass");
        let second = seed_default_templates(&mut connection).expect("second seed should pass");
        let template_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM maintenance_templates", [], |row| {
                row.get(0)
            })
            .expect("template count should read");
        let rule_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM maintenance_template_rules",
                [],
                |row| row.get(0),
            )
            .expect("rule count should read");

        assert_eq!(first, second);
        assert_eq!(template_count as usize, first.template_count);
        assert_eq!(rule_count as usize, first.rule_count);
    }

    #[test]
    fn universal_templates_apply_to_gasoline_and_diesel() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd");
        insert_vehicle(&connection, "diesel", "diesel", "manual", "rwd");

        let gas_results =
            applicable_templates_for_vehicle(&connection, "gas").expect("gas should evaluate");
        let diesel_results = applicable_templates_for_vehicle(&connection, "diesel")
            .expect("diesel should evaluate");

        assert!(result_for(&gas_results, "brake_inspection").is_auto_applicable);
        assert!(result_for(&diesel_results, "brake_inspection").is_auto_applicable);
    }

    #[test]
    fn diesel_vehicle_does_not_auto_apply_spark_plug_template() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        insert_vehicle(&connection, "diesel", "diesel", "manual", "rwd");

        let results = applicable_templates_for_vehicle(&connection, "diesel").expect("evaluate");
        let spark = result_for(&results, "spark_plug_replacement");

        assert!(!spark.is_auto_applicable);
        assert_eq!(spark.applicability_status, "excluded");
    }

    #[test]
    fn gasoline_vehicle_does_not_auto_apply_def_adblue_template() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd");

        let results = applicable_templates_for_vehicle(&connection, "gas").expect("evaluate");
        let def = result_for(&results, "def_adblue_check_refill");

        assert!(!def.is_auto_applicable);
        assert_eq!(def.applicability_status, "excluded");
    }

    #[test]
    fn full_ev_excludes_combustion_and_diesel_templates() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        insert_vehicle(&connection, "ev", "full_ev", "none", "none");

        let results = applicable_templates_for_vehicle(&connection, "ev").expect("evaluate");

        for key in [
            "engine_oil_change",
            "spark_plug_replacement",
            "fuel_filter_replacement",
            "exhaust_inspection",
            "diesel_fuel_filter_replacement",
            "def_adblue_check_refill",
        ] {
            let result = result_for(&results, key);
            assert!(!result.is_auto_applicable, "{key} should not apply");
        }
    }

    #[test]
    fn manual_vehicle_gets_clutch_and_automatic_does_not() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        insert_vehicle(&connection, "manual", "gasoline", "manual", "fwd");
        insert_vehicle(&connection, "auto", "gasoline", "automatic", "fwd");

        let manual_results =
            applicable_templates_for_vehicle(&connection, "manual").expect("evaluate manual");
        let auto_results =
            applicable_templates_for_vehicle(&connection, "auto").expect("evaluate auto");

        assert!(result_for(&manual_results, "manual_clutch_inspection").is_auto_applicable);
        assert!(!result_for(&auto_results, "manual_clutch_inspection").is_auto_applicable);
    }

    #[test]
    fn awd_and_4wd_get_transfer_case_but_fwd_does_not() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        insert_vehicle(&connection, "awd", "gasoline", "automatic", "awd");
        insert_vehicle(&connection, "fourwd", "gasoline", "automatic", "4wd");
        insert_vehicle(&connection, "fwd", "gasoline", "automatic", "fwd");

        let awd_results =
            applicable_templates_for_vehicle(&connection, "awd").expect("evaluate awd");
        let fourwd_results =
            applicable_templates_for_vehicle(&connection, "fourwd").expect("evaluate 4wd");
        let fwd_results =
            applicable_templates_for_vehicle(&connection, "fwd").expect("evaluate fwd");

        assert!(result_for(&awd_results, "transfer_case_fluid_change").is_auto_applicable);
        assert!(result_for(&fourwd_results, "transfer_case_fluid_change").is_auto_applicable);
        assert!(!result_for(&fwd_results, "transfer_case_fluid_change").is_auto_applicable);
    }

    #[test]
    fn feature_required_templates_only_apply_with_matching_feature() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        insert_vehicle(&connection, "diesel_no_dpf", "diesel", "manual", "rwd");
        insert_vehicle(&connection, "diesel_dpf", "diesel", "manual", "rwd");
        insert_feature(&connection, "diesel_dpf", "diesel_particulate_filter");

        let no_feature_results = applicable_templates_for_vehicle(&connection, "diesel_no_dpf")
            .expect("evaluate no feature");
        let feature_results =
            applicable_templates_for_vehicle(&connection, "diesel_dpf").expect("evaluate feature");

        assert!(!result_for(&no_feature_results, "dpf_inspection").is_auto_applicable);
        assert_eq!(
            result_for(&no_feature_results, "dpf_inspection").applicability_status,
            "requires_feature"
        );
        assert!(result_for(&feature_results, "dpf_inspection").is_auto_applicable);
    }
}

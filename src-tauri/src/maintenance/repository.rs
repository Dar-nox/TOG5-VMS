use std::collections::HashSet;

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::vehicles::photo_storage::generate_local_id;

use super::{
    models::{
        ApplicableMaintenanceTemplate, CreateMaintenanceTemplateRequest, MaintenanceTemplateRecord,
        MaintenanceTemplateRuleRecord, MaintenanceVehicleProfile, SeedMaintenanceTemplatesResult,
        UpdateMaintenanceTemplateRequest,
    },
    seeds::{default_templates, RuleSeed, TemplateSeed},
};

const DEFAULT_DUE_SOON_DAYS: i64 = 14;
const DEFAULT_DUE_SOON_KM: i64 = 500;
const VALID_PRIORITIES: [&str; 4] = ["low", "medium", "high", "critical"];

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

pub fn list_user_maintenance_templates(
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
              AND (
                template_key IS NULL
                OR EXISTS (
                  SELECT 1
                  FROM vehicle_maintenance_settings
                  WHERE vehicle_maintenance_settings.template_id = maintenance_templates.id
                    AND vehicle_maintenance_settings.deleted_at IS NULL
                )
                OR EXISTS (
                  SELECT 1
                  FROM maintenance_schedules
                  WHERE maintenance_schedules.template_id = maintenance_templates.id
                    AND maintenance_schedules.deleted_at IS NULL
                    AND maintenance_schedules.archived_at IS NULL
                )
              )
            ORDER BY name
            ",
        )
        .map_err(|_| "Could not prepare the maintenance item list.".to_string())?;

    let rows = statement
        .query_map([], template_from_row)
        .map_err(|_| "Could not read maintenance items.".to_string())?;
    let mut templates = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse maintenance items.".to_string())?;

    for template in &mut templates {
        template.rules = list_rules_for_template(connection, &template.id)?;
    }

    Ok(templates)
}

pub fn create_maintenance_template(
    connection: &Connection,
    request: CreateMaintenanceTemplateRequest,
) -> Result<MaintenanceTemplateRecord, String> {
    let template = normalize_template_request(NewTemplateRequest {
        name: request.name,
        category: request.category,
        description: request.description,
        default_time_interval_days: request.default_time_interval_days,
        default_odometer_interval_km: request.default_odometer_interval_km,
        default_due_soon_days: request.default_due_soon_days,
        default_due_soon_km: request.default_due_soon_km,
        priority: request.priority,
    })?;

    ensure_template_name_is_available(connection, &template.name, None)?;

    let template_id = generate_local_id("maintenance_template");
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
            VALUES (?1, NULL, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1)
            ",
            params![
                template_id,
                template.name,
                template.category,
                template.description,
                template.default_time_interval_days,
                template.default_odometer_interval_km,
                template.default_due_soon_days,
                template.default_due_soon_km,
                template.priority,
            ],
        )
        .map_err(|_| "Could not add the maintenance item.".to_string())?;

    get_template_by_id(connection, &template_id)?
        .ok_or_else(|| "Maintenance item was saved but could not be read.".to_string())
}

pub fn update_maintenance_template(
    connection: &Connection,
    request: UpdateMaintenanceTemplateRequest,
) -> Result<MaintenanceTemplateRecord, String> {
    let template_id =
        required_trimmed(&request.id, "Choose a maintenance item to edit.")?.to_string();
    ensure_template_is_editable(connection, &template_id)?;

    let template = normalize_template_request(NewTemplateRequest {
        name: request.name,
        category: request.category,
        description: request.description,
        default_time_interval_days: request.default_time_interval_days,
        default_odometer_interval_km: request.default_odometer_interval_km,
        default_due_soon_days: request.default_due_soon_days,
        default_due_soon_km: request.default_due_soon_km,
        priority: request.priority,
    })?;

    ensure_template_name_is_available(connection, &template.name, Some(&template_id))?;

    let changed_rows = connection
        .execute(
            "
            UPDATE maintenance_templates
            SET
              name = ?1,
              category = ?2,
              description = ?3,
              default_time_interval_days = ?4,
              default_odometer_interval_km = ?5,
              default_due_soon_days = ?6,
              default_due_soon_km = ?7,
              priority = ?8,
              is_active = 1,
              updated_at = datetime('now')
            WHERE id = ?9
              AND deleted_at IS NULL
            ",
            params![
                template.name,
                template.category,
                template.description,
                template.default_time_interval_days,
                template.default_odometer_interval_km,
                template.default_due_soon_days,
                template.default_due_soon_km,
                template.priority,
                template_id,
            ],
        )
        .map_err(|_| "Could not update the maintenance item.".to_string())?;

    if changed_rows == 0 {
        return Err("Maintenance item was not found.".to_string());
    }

    get_template_by_id(connection, &template_id)?
        .ok_or_else(|| "Maintenance item was updated but could not be read.".to_string())
}

pub fn archive_maintenance_template(
    connection: &Connection,
    template_id: &str,
) -> Result<(), String> {
    let template_id = required_trimmed(template_id, "Choose a maintenance item to remove.")?;
    let changed_rows = connection
        .execute(
            "
            UPDATE maintenance_templates
            SET
              is_active = 0,
              updated_at = datetime('now')
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![template_id],
        )
        .map_err(|_| "Could not remove the maintenance item.".to_string())?;

    if changed_rows == 0 {
        return Err("Maintenance item was not found.".to_string());
    }

    connection
        .execute(
            "
            UPDATE vehicle_maintenance_settings
            SET
              status = 'disabled',
              updated_at = datetime('now'),
              deleted_at = COALESCE(deleted_at, datetime('now'))
            WHERE template_id = ?1
              AND deleted_at IS NULL
            ",
            params![template_id],
        )
        .map_err(|_| "Could not disable reminders for the removed item.".to_string())?;

    connection
        .execute(
            "
            UPDATE maintenance_schedules
            SET
              status = 'disabled',
              updated_at = datetime('now'),
              archived_at = COALESCE(archived_at, datetime('now'))
            WHERE template_id = ?1
              AND deleted_at IS NULL
              AND archived_at IS NULL
            ",
            params![template_id],
        )
        .map_err(|_| "Could not disable schedules for the removed item.".to_string())?;

    connection
        .execute(
            "
            UPDATE alerts
            SET
              status = 'resolved',
              resolved_at = COALESCE(resolved_at, datetime('now')),
              updated_at = datetime('now')
            WHERE status = 'active'
              AND maintenance_schedule_id IN (
                SELECT id
                FROM maintenance_schedules
                WHERE template_id = ?1
              )
            ",
            params![template_id],
        )
        .map_err(|_| "Could not resolve alerts for the removed item.".to_string())?;

    Ok(())
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

#[derive(Debug)]
struct NewTemplateRequest {
    name: String,
    category: String,
    description: Option<String>,
    default_time_interval_days: Option<i64>,
    default_odometer_interval_km: Option<i64>,
    default_due_soon_days: Option<i64>,
    default_due_soon_km: Option<i64>,
    priority: Option<String>,
}

#[derive(Debug)]
struct NormalizedTemplateRequest {
    name: String,
    category: String,
    description: Option<String>,
    default_time_interval_days: Option<i64>,
    default_odometer_interval_km: Option<i64>,
    default_due_soon_days: i64,
    default_due_soon_km: i64,
    priority: String,
}

fn normalize_template_request(
    request: NewTemplateRequest,
) -> Result<NormalizedTemplateRequest, String> {
    Ok(NormalizedTemplateRequest {
        name: required_trimmed(&request.name, "Maintenance item name is required.")?.to_string(),
        category: normalize_category(&request.category)?,
        description: trim_optional(request.description),
        default_time_interval_days: optional_positive_integer(
            request.default_time_interval_days,
            "Default day interval",
        )?,
        default_odometer_interval_km: optional_positive_integer(
            request.default_odometer_interval_km,
            "Default km interval",
        )?,
        default_due_soon_days: optional_non_negative_integer(
            request.default_due_soon_days,
            "Default warn days",
        )?
        .unwrap_or(DEFAULT_DUE_SOON_DAYS),
        default_due_soon_km: optional_non_negative_integer(
            request.default_due_soon_km,
            "Default warn km",
        )?
        .unwrap_or(DEFAULT_DUE_SOON_KM),
        priority: normalize_priority(request.priority)?,
    })
}

fn required_trimmed<'a>(value: &'a str, message: &str) -> Result<&'a str, String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        return Err(message.to_string());
    }

    Ok(trimmed)
}

fn normalize_category(value: &str) -> Result<String, String> {
    let trimmed = required_trimmed(value, "Maintenance item category is required.")?;
    let category = trimmed
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '_'
            }
        })
        .collect::<String>()
        .split('_')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("_");

    if category.is_empty() {
        return Err("Maintenance item category is required.".to_string());
    }

    Ok(category)
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

fn optional_positive_integer(value: Option<i64>, label: &str) -> Result<Option<i64>, String> {
    match value {
        Some(value) if value <= 0 => Err(format!("{label} must be greater than zero.")),
        Some(value) => Ok(Some(value)),
        None => Ok(None),
    }
}

fn optional_non_negative_integer(value: Option<i64>, label: &str) -> Result<Option<i64>, String> {
    match value {
        Some(value) if value < 0 => Err(format!("{label} cannot be negative.")),
        Some(value) => Ok(Some(value)),
        None => Ok(None),
    }
}

fn normalize_priority(priority: Option<String>) -> Result<String, String> {
    let priority = priority
        .and_then(|priority| {
            let trimmed = priority.trim().to_ascii_lowercase();
            (!trimmed.is_empty()).then_some(trimmed)
        })
        .unwrap_or_else(|| "medium".to_string());

    if !VALID_PRIORITIES.contains(&priority.as_str()) {
        return Err("Choose a valid maintenance item priority.".to_string());
    }

    Ok(priority)
}

fn ensure_template_name_is_available(
    connection: &Connection,
    name: &str,
    except_template_id: Option<&str>,
) -> Result<(), String> {
    let exists = connection
        .query_row(
            "
            SELECT 1
            FROM maintenance_templates
            WHERE lower(name) = lower(?1)
              AND is_active = 1
              AND deleted_at IS NULL
              AND template_key IS NULL
              AND (?2 IS NULL OR id <> ?2)
            LIMIT 1
            ",
            params![name, except_template_id],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check existing maintenance item names.".to_string())?
        .is_some();

    if exists {
        return Err("A maintenance item with this name already exists.".to_string());
    }

    Ok(())
}

fn ensure_template_is_editable(connection: &Connection, template_id: &str) -> Result<(), String> {
    let exists = connection
        .query_row(
            "
            SELECT 1
            FROM maintenance_templates
            WHERE id = ?1
              AND is_active = 1
              AND deleted_at IS NULL
            ",
            params![template_id],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check the maintenance item.".to_string())?
        .is_some();

    if !exists {
        return Err("Maintenance item was not found.".to_string());
    }

    Ok(())
}

fn get_template_by_id(
    connection: &Connection,
    template_id: &str,
) -> Result<Option<MaintenanceTemplateRecord>, String> {
    let mut template = connection
        .query_row(
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
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![template_id],
            template_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the maintenance item.".to_string())?;

    if let Some(template) = &mut template {
        template.rules = list_rules_for_template(connection, &template.id)?;
    }

    Ok(template)
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

    if let Some(template_id) = existing_id {
        connection
            .execute(
                "
                UPDATE maintenance_templates
                SET
                  template_key = COALESCE(template_key, ?1),
                  updated_at = updated_at
                WHERE id = ?2
                ",
                params![seed.key, template_id],
            )
            .map_err(|_| "Could not preserve maintenance template seed.".to_string())?;

        return Ok(template_id);
    }

    let template_id = format!("maintenance_template__{}", seed.key);

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
    fn custom_maintenance_items_can_be_created_updated_and_archived() {
        let (_temp_dir, connection) = setup_database();

        let created = create_maintenance_template(
            &connection,
            CreateMaintenanceTemplateRequest {
                name: "Battery terminal cleaning".to_string(),
                category: "Electrical".to_string(),
                description: Some("Clean corrosion from terminals.".to_string()),
                default_time_interval_days: Some(180),
                default_odometer_interval_km: None,
                default_due_soon_days: Some(14),
                default_due_soon_km: Some(500),
                priority: Some("low".to_string()),
            },
        )
        .expect("item should create");

        assert_eq!(created.name, "Battery terminal cleaning");
        assert_eq!(created.category, "electrical");
        assert_eq!(created.default_time_interval_days, Some(180));
        assert_eq!(created.priority, "low");

        let updated = update_maintenance_template(
            &connection,
            UpdateMaintenanceTemplateRequest {
                id: created.id.clone(),
                name: "Battery terminal service".to_string(),
                category: "Electrical".to_string(),
                description: Some("Clean and tighten terminals.".to_string()),
                default_time_interval_days: Some(365),
                default_odometer_interval_km: None,
                default_due_soon_days: Some(30),
                default_due_soon_km: Some(750),
                priority: Some("medium".to_string()),
            },
        )
        .expect("item should update");

        assert_eq!(updated.name, "Battery terminal service");
        assert_eq!(updated.default_time_interval_days, Some(365));
        assert_eq!(updated.default_due_soon_days, 30);

        insert_vehicle(&connection, "vehicle-1", "gasoline", "automatic", "fwd");
        connection
            .execute(
                "
                INSERT INTO vehicle_maintenance_settings (
                  id,
                  vehicle_id,
                  template_id,
                  status,
                  custom_time_interval_days
                )
                VALUES ('setting-1', 'vehicle-1', ?1, 'active', 365)
                ",
                params![updated.id],
            )
            .expect("setting should insert");
        connection
            .execute(
                "
                INSERT INTO maintenance_schedules (
                  id,
                  vehicle_id,
                  template_id,
                  vehicle_maintenance_setting_id,
                  next_due_date,
                  status
                )
                VALUES ('schedule-1', 'vehicle-1', ?1, 'setting-1', '2026-12-31', 'due_soon')
                ",
                params![updated.id],
            )
            .expect("schedule should insert");
        connection
            .execute(
                "
                INSERT INTO alerts (
                  id,
                  vehicle_id,
                  maintenance_schedule_id,
                  alert_type,
                  priority,
                  title,
                  message,
                  status
                )
                VALUES (
                  'alert-1',
                  'vehicle-1',
                  'schedule-1',
                  'maintenance_due_soon',
                  'high',
                  'Due soon',
                  'Battery terminal service is due soon.',
                  'active'
                )
                ",
                [],
            )
            .expect("alert should insert");

        archive_maintenance_template(&connection, &updated.id).expect("item should archive");

        let active_ids = list_active_templates(&connection)
            .expect("templates should list")
            .into_iter()
            .map(|template| template.id)
            .collect::<Vec<_>>();
        assert!(!active_ids.contains(&updated.id));

        let is_active: i64 = connection
            .query_row(
                "SELECT is_active FROM maintenance_templates WHERE id = ?1",
                params![updated.id],
                |row| row.get(0),
            )
            .expect("archived template should remain in database");
        assert_eq!(is_active, 0);

        let disabled_setting_count: i64 = connection
            .query_row(
                "
                SELECT COUNT(*)
                FROM vehicle_maintenance_settings
                WHERE id = 'setting-1'
                  AND status = 'disabled'
                  AND deleted_at IS NOT NULL
                ",
                [],
                |row| row.get(0),
            )
            .expect("disabled setting count should read");
        let archived_schedule_count: i64 = connection
            .query_row(
                "
                SELECT COUNT(*)
                FROM maintenance_schedules
                WHERE id = 'schedule-1'
                  AND archived_at IS NOT NULL
                ",
                [],
                |row| row.get(0),
            )
            .expect("archived schedule count should read");
        let resolved_alert_count: i64 = connection
            .query_row(
                "
                SELECT COUNT(*)
                FROM alerts
                WHERE id = 'alert-1'
                  AND status = 'resolved'
                  AND resolved_at IS NOT NULL
                ",
                [],
                |row| row.get(0),
            )
            .expect("resolved alert count should read");

        assert_eq!(disabled_setting_count, 1);
        assert_eq!(archived_schedule_count, 1);
        assert_eq!(resolved_alert_count, 1);
    }

    #[test]
    fn user_maintenance_item_list_hides_unconfigured_seeded_defaults() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);

        let initial_visible_items =
            list_user_maintenance_templates(&connection).expect("items should list");
        assert!(initial_visible_items.is_empty());

        create_maintenance_template(
            &connection,
            CreateMaintenanceTemplateRequest {
                name: "Brake Inspection".to_string(),
                category: "Maintenance".to_string(),
                description: None,
                default_time_interval_days: None,
                default_odometer_interval_km: None,
                default_due_soon_days: None,
                default_due_soon_km: None,
                priority: None,
            },
        )
        .expect("custom item should create even when a hidden seeded item has the same name");

        let visible_items =
            list_user_maintenance_templates(&connection).expect("items should list");
        assert_eq!(visible_items.len(), 1);
        assert_eq!(visible_items[0].name, "Brake Inspection");
        assert_eq!(visible_items[0].template_key, None);
    }

    #[test]
    fn seeding_does_not_reactivate_user_removed_builtin_items() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        let oil_template_id: String = connection
            .query_row(
                "SELECT id FROM maintenance_templates WHERE template_key = 'engine_oil_change'",
                [],
                |row| row.get(0),
            )
            .expect("oil template should exist");

        archive_maintenance_template(&connection, &oil_template_id).expect("item should archive");
        seed_default_templates(&mut connection).expect("seed should rerun");

        let is_active: i64 = connection
            .query_row(
                "SELECT is_active FROM maintenance_templates WHERE id = ?1",
                params![oil_template_id],
                |row| row.get(0),
            )
            .expect("template should remain");
        assert_eq!(is_active, 0);
    }

    #[test]
    fn seeding_preserves_user_edits_to_builtin_items() {
        let (_temp_dir, mut connection) = setup_database();
        seed(&mut connection);
        let oil_template_id: String = connection
            .query_row(
                "SELECT id FROM maintenance_templates WHERE template_key = 'engine_oil_change'",
                [],
                |row| row.get(0),
            )
            .expect("oil template should exist");

        update_maintenance_template(
            &connection,
            UpdateMaintenanceTemplateRequest {
                id: oil_template_id.clone(),
                name: "Oil service".to_string(),
                category: "Custom Engine".to_string(),
                description: Some("Client wording".to_string()),
                default_time_interval_days: Some(120),
                default_odometer_interval_km: Some(4_000),
                default_due_soon_days: Some(10),
                default_due_soon_km: Some(300),
                priority: Some("high".to_string()),
            },
        )
        .expect("builtin item should update");

        seed_default_templates(&mut connection).expect("seed should rerun");

        let edited = get_template_by_id(&connection, &oil_template_id)
            .expect("template should read")
            .expect("template should exist");
        assert_eq!(edited.name, "Oil service");
        assert_eq!(edited.category, "custom_engine");
        assert_eq!(edited.default_time_interval_days, Some(120));
        assert_eq!(edited.default_odometer_interval_km, Some(4_000));
        assert_eq!(edited.priority, "high");
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

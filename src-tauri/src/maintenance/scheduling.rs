use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::{settings, vehicles::photo_storage::generate_local_id};

use super::{
    models::{
        AlertRecord, DueStatusEvaluation, MaintenanceScheduleRecord,
        RefreshMaintenanceAlertsResult, SyncMaintenanceSchedulesResult,
    },
    repository,
};

const MAINTENANCE_ALERT_TYPES: &[&str] = &[
    "due_soon_by_date",
    "due_soon_by_odometer",
    "overdue_by_date",
    "overdue_by_odometer",
];

#[derive(Debug, Clone)]
struct ScheduleVehicleProfile {
    id: String,
    vehicle_name: String,
    current_odometer: f64,
    status: String,
    archived_at: Option<String>,
}

#[derive(Debug, Clone)]
struct ScheduleRow {
    id: String,
    vehicle_id: String,
    template_id: String,
    template_key: Option<String>,
    template_name: String,
    category: String,
    last_completed_date: Option<String>,
    last_completed_odometer: Option<f64>,
    next_due_date: Option<String>,
    next_due_odometer: Option<f64>,
    due_soon_days: i64,
    due_soon_km: i64,
    status: String,
    priority: String,
    notes: Option<String>,
    updated_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AlertWriteResult {
    Created,
    Updated,
    Suppressed,
}

pub fn list_schedules_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<MaintenanceScheduleRecord>, String> {
    let vehicle = vehicle_profile(connection, vehicle_id)?;
    let today = current_date(connection)?;
    refresh_schedule_statuses_for_vehicle_on(connection, vehicle_id, &today)?;
    load_schedule_records(connection, &vehicle, &today)
}

pub fn sync_schedules_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<SyncMaintenanceSchedulesResult, String> {
    let today = current_date(connection)?;
    sync_schedules_for_vehicle_on(connection, vehicle_id, &today)
}

pub fn sync_schedules_for_vehicle_on(
    connection: &Connection,
    vehicle_id: &str,
    today: &str,
) -> Result<SyncMaintenanceSchedulesResult, String> {
    let vehicle = vehicle_profile(connection, vehicle_id)?;

    if vehicle_is_archived(&vehicle) {
        return Err("Archived vehicles do not receive new maintenance schedules.".to_string());
    }

    let applicable_templates =
        repository::applicable_templates_for_vehicle(connection, vehicle_id)?;
    let (default_due_soon_days, default_due_soon_km) =
        settings::repository::schedule_default_thresholds(connection)?;
    let mut created_count = 0;
    let mut skipped_count = 0;

    for result in applicable_templates {
        if !result.is_auto_applicable || result.applicability_status != "applicable" {
            skipped_count += 1;
            continue;
        }

        if schedule_exists(connection, vehicle_id, &result.template.id)? {
            skipped_count += 1;
            continue;
        }

        let legal_document = result.template.category == "legal_documents";
        let next_due_date = if legal_document {
            None
        } else {
            match result.template.default_time_interval_days {
                Some(days) => Some(date_plus_days(connection, today, days)?),
                None => None,
            }
        };
        let next_due_odometer = if legal_document {
            None
        } else {
            result
                .template
                .default_odometer_interval_km
                .map(|interval| vehicle.current_odometer + interval as f64)
        };
        let notes =
            schedule_setup_note(legal_document, next_due_date.as_deref(), next_due_odometer);
        let evaluation = evaluate_due_status(
            today,
            vehicle.current_odometer,
            next_due_date.as_deref(),
            next_due_odometer,
            default_due_soon_days,
            default_due_soon_km,
            false,
        );

        connection
            .execute(
                "
                INSERT INTO maintenance_schedules (
                  id,
                  vehicle_id,
                  template_id,
                  next_due_date,
                  next_due_odometer,
                  due_soon_days,
                  due_soon_km,
                  status,
                  priority,
                  notes
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                ",
                params![
                    generate_local_id("maintenance_schedule"),
                    vehicle_id,
                    result.template.id,
                    next_due_date,
                    next_due_odometer,
                    default_due_soon_days,
                    default_due_soon_km,
                    evaluation.status,
                    result.template.priority,
                    notes,
                ],
            )
            .map_err(|_| "Could not create a maintenance schedule.".to_string())?;

        created_count += 1;
    }

    let updated_count = refresh_schedule_statuses_for_vehicle_on(connection, vehicle_id, today)?;
    let schedules = load_schedule_records(connection, &vehicle, today)?;

    Ok(SyncMaintenanceSchedulesResult {
        vehicle_id: vehicle.id,
        created_count,
        updated_count,
        skipped_count,
        schedules,
    })
}

pub fn refresh_maintenance_alerts_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<RefreshMaintenanceAlertsResult, String> {
    let today = current_date(connection)?;
    refresh_maintenance_alerts_for_vehicle_on(connection, vehicle_id, &today)
}

pub fn refresh_maintenance_alerts_for_vehicle_on(
    connection: &Connection,
    vehicle_id: &str,
    today: &str,
) -> Result<RefreshMaintenanceAlertsResult, String> {
    let vehicle = vehicle_profile(connection, vehicle_id)?;
    let mut created_count = 0;
    let mut updated_count = 0;
    let mut resolved_count = 0;

    refresh_schedule_statuses_for_vehicle_on(connection, vehicle_id, today)?;
    let schedules = load_schedule_records(connection, &vehicle, today)?;

    if !settings::repository::maintenance_alerts_enabled(connection)? {
        return Ok(RefreshMaintenanceAlertsResult {
            vehicle_id: vehicle.id,
            created_count,
            updated_count,
            resolved_count,
            active_alerts: list_alerts_for_vehicle(connection, vehicle_id)?,
        });
    }

    for schedule in &schedules {
        if vehicle_is_archived(&vehicle) {
            resolved_count += resolve_active_alerts_for_schedule(connection, &schedule.id, None)?;
            continue;
        }

        let evaluation = evaluate_due_status(
            today,
            vehicle.current_odometer,
            schedule.next_due_date.as_deref(),
            schedule.next_due_odometer,
            schedule.due_soon_days,
            schedule.due_soon_km,
            schedule.status == "disabled",
        );

        match evaluation.alert_type.as_deref() {
            Some(alert_type) => {
                match upsert_schedule_alert(
                    connection,
                    &vehicle,
                    schedule,
                    &evaluation,
                    alert_type,
                )? {
                    AlertWriteResult::Created => created_count += 1,
                    AlertWriteResult::Updated => updated_count += 1,
                    AlertWriteResult::Suppressed => {}
                }
                resolved_count +=
                    resolve_active_alerts_for_schedule(connection, &schedule.id, Some(alert_type))?;
            }
            None => {
                resolved_count +=
                    resolve_active_alerts_for_schedule(connection, &schedule.id, None)?;
            }
        }
    }

    Ok(RefreshMaintenanceAlertsResult {
        vehicle_id: vehicle.id,
        created_count,
        updated_count,
        resolved_count,
        active_alerts: list_alerts_for_vehicle(connection, vehicle_id)?,
    })
}

pub fn list_alerts(connection: &Connection) -> Result<Vec<AlertRecord>, String> {
    let mut statement = connection
        .prepare(&format!(
            "
            {ALERT_SELECT}
            WHERE alerts.deleted_at IS NULL
              AND alerts.status = 'active'
            ORDER BY
              CASE alerts.priority
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                ELSE 3
              END,
              alerts.created_at DESC
            "
        ))
        .map_err(|_| "Could not prepare the alert list.".to_string())?;

    let rows = statement
        .query_map([], alert_from_row)
        .map_err(|_| "Could not read alerts.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse alerts.".to_string())
}

pub fn dismiss_alert(connection: &Connection, alert_id: &str) -> Result<(), String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE alerts
            SET
              status = 'dismissed',
              resolved_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?1
              AND status = 'active'
              AND deleted_at IS NULL
            ",
            params![alert_id],
        )
        .map_err(|_| "Could not dismiss the alert.".to_string())?;

    if updated_rows == 0 {
        return Err("Alert was not found or is already inactive.".to_string());
    }

    Ok(())
}

pub fn evaluate_due_status(
    today: &str,
    current_odometer: f64,
    next_due_date: Option<&str>,
    next_due_odometer: Option<f64>,
    due_soon_days: i64,
    due_soon_km: i64,
    disabled: bool,
) -> DueStatusEvaluation {
    if disabled {
        return DueStatusEvaluation {
            status: "disabled".to_string(),
            reason: "Disabled schedule does not generate alerts.".to_string(),
            alert_type: None,
        };
    }

    let threshold_days = due_soon_days.max(0);
    let threshold_km = due_soon_km.max(0) as f64;
    let today_days = parse_date_to_days(today);
    let mut candidates = Vec::new();

    if let (Some(today_days), Some(next_due_date)) = (today_days, next_due_date) {
        if let Some(due_days) = parse_date_to_days(next_due_date) {
            let days_until_due = due_days - today_days;
            candidates.push(date_due_candidate(days_until_due, threshold_days));
        }
    }

    if let Some(next_due_odometer) = next_due_odometer {
        if current_odometer.is_finite() && next_due_odometer.is_finite() {
            let remaining_km = next_due_odometer - current_odometer;
            candidates.push(odometer_due_candidate(remaining_km, threshold_km));
        }
    }

    candidates
        .into_iter()
        .max_by_key(|candidate| candidate.rank)
        .map(|candidate| DueStatusEvaluation {
            status: candidate.status,
            reason: candidate.reason,
            alert_type: candidate.alert_type,
        })
        .unwrap_or_else(|| DueStatusEvaluation {
            status: "needs_setup".to_string(),
            reason: "Needs setup: no due date or odometer target is set.".to_string(),
            alert_type: None,
        })
}

fn refresh_schedule_statuses_for_vehicle_on(
    connection: &Connection,
    vehicle_id: &str,
    today: &str,
) -> Result<usize, String> {
    let vehicle = vehicle_profile(connection, vehicle_id)?;
    let rows = load_schedule_rows(connection, vehicle_id)?;
    let mut updated_count = 0;

    for row in rows {
        let evaluation = evaluate_due_status(
            today,
            vehicle.current_odometer,
            row.next_due_date.as_deref(),
            row.next_due_odometer,
            row.due_soon_days,
            row.due_soon_km,
            row.status == "disabled",
        );

        if evaluation.status != row.status {
            connection
                .execute(
                    "
                    UPDATE maintenance_schedules
                    SET status = ?1, updated_at = datetime('now')
                    WHERE id = ?2
                    ",
                    params![evaluation.status, row.id],
                )
                .map_err(|_| "Could not update maintenance schedule status.".to_string())?;
            updated_count += 1;
        }
    }

    Ok(updated_count)
}

fn load_schedule_records(
    connection: &Connection,
    vehicle: &ScheduleVehicleProfile,
    today: &str,
) -> Result<Vec<MaintenanceScheduleRecord>, String> {
    let rows = load_schedule_rows(connection, &vehicle.id)?;

    Ok(rows
        .into_iter()
        .map(|row| schedule_record_from_row(row, vehicle.current_odometer, today))
        .collect())
}

fn load_schedule_rows(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<ScheduleRow>, String> {
    let mut statement = connection
        .prepare(&format!(
            "
            {SCHEDULE_SELECT}
            WHERE maintenance_schedules.vehicle_id = ?1
              AND maintenance_schedules.deleted_at IS NULL
            ORDER BY
              CASE maintenance_schedules.status
                WHEN 'overdue' THEN 0
                WHEN 'due_today' THEN 1
                WHEN 'due_soon' THEN 2
                WHEN 'needs_setup' THEN 3
                ELSE 4
              END,
              maintenance_templates.category,
              maintenance_templates.name
            "
        ))
        .map_err(|_| "Could not prepare maintenance schedules.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], schedule_row_from_row)
        .map_err(|_| "Could not read maintenance schedules.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse maintenance schedules.".to_string())
}

fn schedule_record_from_row(
    row: ScheduleRow,
    current_odometer: f64,
    today: &str,
) -> MaintenanceScheduleRecord {
    let evaluation = evaluate_due_status(
        today,
        current_odometer,
        row.next_due_date.as_deref(),
        row.next_due_odometer,
        row.due_soon_days,
        row.due_soon_km,
        row.status == "disabled",
    );

    MaintenanceScheduleRecord {
        id: row.id,
        vehicle_id: row.vehicle_id,
        template_id: row.template_id,
        template_key: row.template_key,
        template_name: row.template_name,
        category: row.category,
        last_completed_date: row.last_completed_date,
        last_completed_odometer: row.last_completed_odometer,
        next_due_date: row.next_due_date,
        next_due_odometer: row.next_due_odometer,
        due_soon_days: row.due_soon_days,
        due_soon_km: row.due_soon_km,
        status: evaluation.status.clone(),
        due_status: evaluation.status,
        due_reason: evaluation.reason,
        priority: row.priority,
        notes: row.notes,
        updated_at: row.updated_at,
    }
}

fn schedule_exists(
    connection: &Connection,
    vehicle_id: &str,
    template_id: &str,
) -> Result<bool, String> {
    connection
        .query_row(
            "
            SELECT 1
            FROM maintenance_schedules
            WHERE vehicle_id = ?1
              AND template_id = ?2
              AND deleted_at IS NULL
            LIMIT 1
            ",
            params![vehicle_id, template_id],
            |_| Ok(()),
        )
        .optional()
        .map(|value| value.is_some())
        .map_err(|_| "Could not check existing maintenance schedules.".to_string())
}

fn vehicle_profile(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<ScheduleVehicleProfile, String> {
    connection
        .query_row(
            "
            SELECT
              id,
              vehicle_name,
              current_odometer,
              status,
              archived_at
            FROM vehicles
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![vehicle_id],
            |row| {
                Ok(ScheduleVehicleProfile {
                    id: row.get(0)?,
                    vehicle_name: row.get(1)?,
                    current_odometer: row.get(2)?,
                    status: row.get(3)?,
                    archived_at: row.get(4)?,
                })
            },
        )
        .optional()
        .map_err(|_| "Could not read the vehicle maintenance schedule profile.".to_string())?
        .ok_or_else(|| "Vehicle was not found.".to_string())
}

fn vehicle_is_archived(vehicle: &ScheduleVehicleProfile) -> bool {
    vehicle.status == "archived" || vehicle.archived_at.is_some()
}

fn schedule_setup_note(
    legal_document: bool,
    next_due_date: Option<&str>,
    next_due_odometer: Option<f64>,
) -> Option<String> {
    if legal_document {
        return Some(
            "Needs setup: enter the real registration or insurance renewal date before alerts."
                .to_string(),
        );
    }

    if next_due_date.is_none() && next_due_odometer.is_none() {
        return Some("Needs setup: no due date or odometer interval is available.".to_string());
    }

    None
}

fn date_plus_days(connection: &Connection, today: &str, days: i64) -> Result<String, String> {
    connection
        .query_row(
            "SELECT date(?1, printf('+%d days', ?2))",
            params![today, days],
            |row| row.get(0),
        )
        .map_err(|_| "Could not calculate the next due date.".to_string())
}

fn current_date(connection: &Connection) -> Result<String, String> {
    connection
        .query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
        .map_err(|_| "Could not read today's date.".to_string())
}

fn upsert_schedule_alert(
    connection: &Connection,
    vehicle: &ScheduleVehicleProfile,
    schedule: &MaintenanceScheduleRecord,
    evaluation: &DueStatusEvaluation,
    alert_type: &str,
) -> Result<AlertWriteResult, String> {
    let existing_alert = connection
        .query_row(
            "
            SELECT id, status
            FROM alerts
            WHERE vehicle_id = ?1
              AND maintenance_schedule_id = ?2
              AND alert_type = ?3
              AND deleted_at IS NULL
            ORDER BY
              CASE status
                WHEN 'active' THEN 0
                WHEN 'dismissed' THEN 1
                WHEN 'resolved' THEN 2
                ELSE 3
              END,
              created_at DESC
            LIMIT 1
            ",
            params![vehicle.id, schedule.id, alert_type],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|_| "Could not check existing maintenance alerts.".to_string())?;

    let (title, message) = alert_title_and_message(vehicle, schedule, evaluation);
    let priority = alert_priority(schedule, &evaluation.status);
    let due_date = schedule.next_due_date.clone();

    match existing_alert {
        Some((alert_id, status)) if status == "active" => {
            connection
                .execute(
                    "
                    UPDATE alerts
                    SET
                      priority = ?1,
                      title = ?2,
                      message = ?3,
                      due_date = ?4,
                      related_record_type = 'maintenance_schedule',
                      related_record_id = ?5,
                      updated_at = datetime('now')
                    WHERE id = ?6
                    ",
                    params![priority, title, message, due_date, schedule.id, alert_id],
                )
                .map_err(|_| "Could not update the maintenance alert.".to_string())?;
            Ok(AlertWriteResult::Updated)
        }
        Some((_alert_id, status)) if status == "dismissed" => Ok(AlertWriteResult::Suppressed),
        _ => {
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
                      related_record_type,
                      related_record_id,
                      status,
                      due_date
                    )
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'maintenance_schedule', ?3, 'active', ?8)
                    ",
                    params![
                        generate_local_id("alert"),
                        vehicle.id,
                        schedule.id,
                        alert_type,
                        priority,
                        title,
                        message,
                        due_date,
                    ],
                )
                .map_err(|_| "Could not create the maintenance alert.".to_string())?;
            Ok(AlertWriteResult::Created)
        }
    }
}

pub(crate) fn resolve_active_alerts_for_schedule(
    connection: &Connection,
    schedule_id: &str,
    keep_alert_type: Option<&str>,
) -> Result<usize, String> {
    let placeholders = MAINTENANCE_ALERT_TYPES
        .iter()
        .map(|alert_type| format!("'{alert_type}'"))
        .collect::<Vec<_>>()
        .join(", ");
    let mut sql = format!(
        "
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = datetime('now'),
          updated_at = datetime('now')
        WHERE maintenance_schedule_id = ?1
          AND status = 'active'
          AND deleted_at IS NULL
          AND alert_type IN ({placeholders})
        "
    );

    if keep_alert_type.is_some() {
        sql.push_str(" AND alert_type != ?2");
    }

    let updated_rows = match keep_alert_type {
        Some(alert_type) => connection.execute(&sql, params![schedule_id, alert_type]),
        None => connection.execute(&sql, params![schedule_id]),
    }
    .map_err(|_| "Could not resolve stale maintenance alerts.".to_string())?;

    Ok(updated_rows)
}

fn list_alerts_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<AlertRecord>, String> {
    let mut statement = connection
        .prepare(&format!(
            "
            {ALERT_SELECT}
            WHERE alerts.vehicle_id = ?1
              AND alerts.deleted_at IS NULL
              AND alerts.status = 'active'
            ORDER BY alerts.created_at DESC
            "
        ))
        .map_err(|_| "Could not prepare the vehicle alert list.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], alert_from_row)
        .map_err(|_| "Could not read vehicle alerts.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse vehicle alerts.".to_string())
}

fn alert_title_and_message(
    vehicle: &ScheduleVehicleProfile,
    schedule: &MaintenanceScheduleRecord,
    evaluation: &DueStatusEvaluation,
) -> (String, String) {
    let title_status = match evaluation.status.as_str() {
        "overdue" => "overdue",
        "due_today" => "due today",
        "due_soon" => "due soon",
        _ => "needs attention",
    };
    let title = format!("{} is {}", schedule.template_name, title_status);
    let message = format!(
        "{} is {} for {}. {}",
        schedule.template_name, title_status, vehicle.vehicle_name, evaluation.reason
    );

    (title, message)
}

fn alert_priority(schedule: &MaintenanceScheduleRecord, status: &str) -> String {
    match status {
        "overdue" => "critical".to_string(),
        "due_today" => "high".to_string(),
        _ => schedule.priority.clone(),
    }
}

#[derive(Debug, Clone)]
struct DueCandidate {
    rank: i64,
    status: String,
    reason: String,
    alert_type: Option<String>,
}

fn date_due_candidate(days_until_due: i64, due_soon_days: i64) -> DueCandidate {
    if days_until_due < 0 {
        return DueCandidate {
            rank: 4,
            status: "overdue".to_string(),
            reason: format!("Overdue by {} days.", days_until_due.abs()),
            alert_type: Some("overdue_by_date".to_string()),
        };
    }

    if days_until_due == 0 {
        return DueCandidate {
            rank: 3,
            status: "due_today".to_string(),
            reason: "Due today.".to_string(),
            alert_type: Some("due_soon_by_date".to_string()),
        };
    }

    if days_until_due <= due_soon_days {
        return DueCandidate {
            rank: 2,
            status: "due_soon".to_string(),
            reason: format!("Due in {days_until_due} days."),
            alert_type: Some("due_soon_by_date".to_string()),
        };
    }

    DueCandidate {
        rank: 1,
        status: "not_due".to_string(),
        reason: format!("Due in {days_until_due} days."),
        alert_type: None,
    }
}

fn odometer_due_candidate(remaining_km: f64, due_soon_km: f64) -> DueCandidate {
    if remaining_km <= 0.0 {
        return DueCandidate {
            rank: 4,
            status: "overdue".to_string(),
            reason: format!("Overdue by {} km.", format_km(remaining_km.abs())),
            alert_type: Some("overdue_by_odometer".to_string()),
        };
    }

    if remaining_km <= due_soon_km {
        return DueCandidate {
            rank: 2,
            status: "due_soon".to_string(),
            reason: format!("Due in {} km.", format_km(remaining_km)),
            alert_type: Some("due_soon_by_odometer".to_string()),
        };
    }

    DueCandidate {
        rank: 1,
        status: "not_due".to_string(),
        reason: format!("Due in {} km.", format_km(remaining_km)),
        alert_type: None,
    }
}

fn format_km(value: f64) -> String {
    let rounded = value.round();
    if (rounded - value).abs() < f64::EPSILON {
        return format!("{}", rounded as i64);
    }

    format!("{value:.1}")
}

fn parse_date_to_days(value: &str) -> Option<i64> {
    let date = value.get(0..10)?;
    let mut parts = date.split('-');
    let year = parts.next()?.parse::<i64>().ok()?;
    let month = parts.next()?.parse::<i64>().ok()?;
    let day = parts.next()?.parse::<i64>().ok()?;

    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }

    Some(days_from_civil(year, month, day))
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let adjusted_year = year - if month <= 2 { 1 } else { 0 };
    let era = if adjusted_year >= 0 {
        adjusted_year
    } else {
        adjusted_year - 399
    } / 400;
    let year_of_era = adjusted_year - era * 400;
    let month_prime = month + if month > 2 { -3 } else { 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;

    era * 146_097 + day_of_era - 719_468
}

const SCHEDULE_SELECT: &str = "
    SELECT
      maintenance_schedules.id,
      maintenance_schedules.vehicle_id,
      maintenance_schedules.template_id,
      maintenance_templates.template_key,
      maintenance_templates.name,
      maintenance_templates.category,
      maintenance_schedules.last_completed_date,
      maintenance_schedules.last_completed_odometer,
      maintenance_schedules.next_due_date,
      maintenance_schedules.next_due_odometer,
      maintenance_schedules.due_soon_days,
      maintenance_schedules.due_soon_km,
      maintenance_schedules.status,
      maintenance_schedules.priority,
      maintenance_schedules.notes,
      maintenance_schedules.updated_at
    FROM maintenance_schedules
    INNER JOIN maintenance_templates
      ON maintenance_templates.id = maintenance_schedules.template_id
     AND maintenance_templates.deleted_at IS NULL
";

fn schedule_row_from_row(row: &Row<'_>) -> rusqlite::Result<ScheduleRow> {
    Ok(ScheduleRow {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        template_id: row.get(2)?,
        template_key: row.get(3)?,
        template_name: row.get(4)?,
        category: row.get(5)?,
        last_completed_date: row.get(6)?,
        last_completed_odometer: row.get(7)?,
        next_due_date: row.get(8)?,
        next_due_odometer: row.get(9)?,
        due_soon_days: row.get(10)?,
        due_soon_km: row.get(11)?,
        status: row.get(12)?,
        priority: row.get(13)?,
        notes: row.get(14)?,
        updated_at: row.get(15)?,
    })
}

const ALERT_SELECT: &str = "
    SELECT
      alerts.id,
      alerts.vehicle_id,
      vehicles.vehicle_name,
      alerts.maintenance_schedule_id,
      maintenance_templates.name,
      alerts.alert_type,
      alerts.priority,
      alerts.title,
      alerts.message,
      alerts.related_record_type,
      alerts.related_record_id,
      alerts.status,
      alerts.due_date,
      alerts.snoozed_until,
      alerts.created_at,
      alerts.updated_at,
      alerts.resolved_at
    FROM alerts
    LEFT JOIN vehicles
      ON vehicles.id = alerts.vehicle_id
    LEFT JOIN maintenance_schedules
      ON maintenance_schedules.id = alerts.maintenance_schedule_id
    LEFT JOIN maintenance_templates
      ON maintenance_templates.id = maintenance_schedules.template_id
";

fn alert_from_row(row: &Row<'_>) -> rusqlite::Result<AlertRecord> {
    Ok(AlertRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        vehicle_name: row.get(2)?,
        maintenance_schedule_id: row.get(3)?,
        maintenance_template_name: row.get(4)?,
        alert_type: row.get(5)?,
        priority: row.get(6)?,
        title: row.get(7)?,
        message: row.get(8)?,
        related_record_type: row.get(9)?,
        related_record_id: row.get(10)?,
        status: row.get(11)?,
        due_date: row.get(12)?,
        snoozed_until: row.get(13)?,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
        resolved_at: row.get(16)?,
    })
}

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::TempDir;

    use crate::db;

    use super::*;
    use crate::maintenance::repository::seed_default_templates;

    fn setup_database() -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("scheduling.sqlite3");
        db::initialize_database_at_path(&database_path).expect("database should initialize");
        let mut connection =
            db::open_database_at_path(&database_path).expect("database should open");
        seed_default_templates(&mut connection).expect("templates should seed");

        (temp_dir, connection)
    }

    fn insert_vehicle(
        connection: &Connection,
        id: &str,
        fuel_type: &str,
        transmission_type: &str,
        drivetrain: &str,
        current_odometer: f64,
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
                VALUES (?1, ?2, 'van', ?3, ?4, ?5, ?6, 'active')
                ",
                params![
                    id,
                    format!("Test vehicle {id}"),
                    fuel_type,
                    transmission_type,
                    drivetrain,
                    current_odometer
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

    fn set_setting(connection: &Connection, key: &str, value: &str, value_type: &str) {
        connection
            .execute(
                "
                INSERT INTO settings (key, value, value_type, description)
                VALUES (?1, ?2, ?3, 'test setting')
                ON CONFLICT(key) DO UPDATE SET
                  value = excluded.value,
                  value_type = excluded.value_type,
                  updated_at = datetime('now')
                ",
                params![key, value, value_type],
            )
            .expect("setting should save");
    }

    fn schedule_for<'a>(
        schedules: &'a [MaintenanceScheduleRecord],
        key: &str,
    ) -> &'a MaintenanceScheduleRecord {
        schedules
            .iter()
            .find(|schedule| schedule.template_key.as_deref() == Some(key))
            .unwrap_or_else(|| panic!("missing schedule for {key}"))
    }

    fn schedule_count(connection: &Connection, vehicle_id: &str) -> i64 {
        connection
            .query_row(
                "SELECT COUNT(*) FROM maintenance_schedules WHERE vehicle_id = ?1",
                params![vehicle_id],
                |row| row.get(0),
            )
            .expect("schedule count should read")
    }

    #[test]
    fn applicable_templates_create_schedules_and_sync_is_idempotent() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 1_000.0);

        let first =
            sync_schedules_for_vehicle_on(&connection, "gas", "2026-01-01").expect("sync first");
        let second =
            sync_schedules_for_vehicle_on(&connection, "gas", "2026-01-01").expect("sync second");

        assert!(first.created_count > 0);
        assert_eq!(second.created_count, 0);
        assert_eq!(
            schedule_count(&connection, "gas") as usize,
            first.schedules.len()
        );
    }

    #[test]
    fn excluded_and_feature_required_templates_do_not_create_schedules_without_feature() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "diesel", "diesel", "manual", "rwd", 2_000.0);

        let result =
            sync_schedules_for_vehicle_on(&connection, "diesel", "2026-01-01").expect("sync");

        assert!(result
            .schedules
            .iter()
            .all(|schedule| schedule.template_key.as_deref() != Some("spark_plug_replacement")));
        assert!(result
            .schedules
            .iter()
            .all(|schedule| schedule.template_key.as_deref() != Some("dpf_inspection")));
    }

    #[test]
    fn feature_required_templates_create_schedules_with_matching_feature() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "diesel", "diesel", "manual", "rwd", 2_000.0);
        insert_feature(&connection, "diesel", "diesel_particulate_filter");

        let result =
            sync_schedules_for_vehicle_on(&connection, "diesel", "2026-01-01").expect("sync");

        assert!(result
            .schedules
            .iter()
            .any(|schedule| schedule.template_key.as_deref() == Some("dpf_inspection")));
    }

    #[test]
    fn next_due_date_and_odometer_are_calculated_from_today_and_current_odometer() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 1_000.0);

        let result = sync_schedules_for_vehicle_on(&connection, "gas", "2026-01-01").expect("sync");
        let oil = schedule_for(&result.schedules, "engine_oil_change");

        assert_eq!(oil.next_due_date.as_deref(), Some("2026-06-30"));
        assert_eq!(oil.next_due_odometer, Some(6_000.0));
    }

    #[test]
    fn new_schedules_use_global_due_soon_threshold_settings() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 1_000.0);
        set_setting(&connection, "default_due_soon_days", "21", "integer");
        set_setting(&connection, "default_due_soon_km", "750", "integer");

        let result = sync_schedules_for_vehicle_on(&connection, "gas", "2026-01-01").expect("sync");
        let oil = schedule_for(&result.schedules, "engine_oil_change");

        assert_eq!(oil.due_soon_days, 21);
        assert_eq!(oil.due_soon_km, 750);
    }

    #[test]
    fn legal_renewals_are_created_as_needs_setup_without_invented_dates() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 1_000.0);

        let result = sync_schedules_for_vehicle_on(&connection, "gas", "2026-01-01").expect("sync");
        let registration = schedule_for(&result.schedules, "registration_renewal");

        assert_eq!(registration.due_status, "needs_setup");
        assert_eq!(registration.next_due_date, None);
        assert!(registration.due_reason.contains("Needs setup"));
    }

    #[test]
    fn due_status_covers_not_due_due_soon_due_today_overdue_and_needs_setup() {
        assert_eq!(
            evaluate_due_status(
                "2026-01-01",
                1_000.0,
                Some("2026-02-01"),
                None,
                14,
                500,
                false,
            )
            .status,
            "not_due"
        );
        assert_eq!(
            evaluate_due_status(
                "2026-01-01",
                1_000.0,
                Some("2026-01-10"),
                None,
                14,
                500,
                false,
            )
            .status,
            "due_soon"
        );
        assert_eq!(
            evaluate_due_status(
                "2026-01-01",
                1_000.0,
                Some("2026-01-01"),
                None,
                14,
                500,
                false,
            )
            .status,
            "due_today"
        );
        assert_eq!(
            evaluate_due_status(
                "2026-01-01",
                1_000.0,
                Some("2025-12-31"),
                None,
                14,
                500,
                false,
            )
            .status,
            "overdue"
        );
        assert_eq!(
            evaluate_due_status("2026-01-01", 1_000.0, None, None, 14, 500, false).status,
            "needs_setup"
        );
    }

    #[test]
    fn due_status_covers_odometer_and_overdue_wins() {
        assert_eq!(
            evaluate_due_status("2026-01-01", 1_000.0, None, Some(1_300.0), 14, 500, false).status,
            "due_soon"
        );
        assert_eq!(
            evaluate_due_status("2026-01-01", 1_500.0, None, Some(1_500.0), 14, 500, false).status,
            "overdue"
        );
        let overdue_wins = evaluate_due_status(
            "2026-01-01",
            1_500.0,
            Some("2026-01-10"),
            Some(1_400.0),
            14,
            500,
            false,
        );

        assert_eq!(overdue_wins.status, "overdue");
        assert_eq!(
            overdue_wins.alert_type.as_deref(),
            Some("overdue_by_odometer")
        );
    }

    #[test]
    fn overdue_alert_is_created_and_not_duplicated() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 7_000.0);
        sync_schedules_for_vehicle_on(&connection, "gas", "2026-01-01").expect("sync");
        let oil_id: String = connection
            .query_row(
                "
                SELECT maintenance_schedules.id
                FROM maintenance_schedules
                INNER JOIN maintenance_templates
                  ON maintenance_templates.id = maintenance_schedules.template_id
                WHERE maintenance_schedules.vehicle_id = 'gas'
                  AND maintenance_templates.template_key = 'engine_oil_change'
                ",
                [],
                |row| row.get(0),
            )
            .expect("oil schedule id should read");

        connection
            .execute(
                "
                UPDATE maintenance_schedules
                SET next_due_date = '2025-12-01', next_due_odometer = 6000
                WHERE id = ?1
                ",
                params![oil_id],
            )
            .expect("schedule should update");

        let first = refresh_maintenance_alerts_for_vehicle_on(&connection, "gas", "2026-01-10")
            .expect("refresh first");
        let second = refresh_maintenance_alerts_for_vehicle_on(&connection, "gas", "2026-01-10")
            .expect("refresh second");
        let active_alert_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM alerts WHERE vehicle_id = 'gas' AND status = 'active'",
                [],
                |row| row.get(0),
            )
            .expect("alert count should read");

        assert_eq!(first.created_count, 1);
        assert_eq!(second.created_count, 0);
        assert_eq!(active_alert_count, 1);
        assert_eq!(
            second.active_alerts[0].maintenance_schedule_id.as_deref(),
            Some(oil_id.as_str())
        );
        assert_eq!(second.active_alerts[0].vehicle_id.as_deref(), Some("gas"));
    }

    #[test]
    fn disabled_maintenance_alert_setting_suppresses_new_alerts() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 7_000.0);
        set_setting(
            &connection,
            "maintenance_alerts_enabled",
            "false",
            "boolean",
        );
        sync_schedules_for_vehicle_on(&connection, "gas", "2026-01-01").expect("sync");
        let oil_id: String = connection
            .query_row(
                "
                SELECT maintenance_schedules.id
                FROM maintenance_schedules
                INNER JOIN maintenance_templates
                  ON maintenance_templates.id = maintenance_schedules.template_id
                WHERE maintenance_schedules.vehicle_id = 'gas'
                  AND maintenance_templates.template_key = 'engine_oil_change'
                ",
                [],
                |row| row.get(0),
            )
            .expect("oil schedule id should read");

        connection
            .execute(
                "
                UPDATE maintenance_schedules
                SET next_due_date = '2025-12-01', next_due_odometer = 6000
                WHERE id = ?1
                ",
                params![oil_id],
            )
            .expect("schedule should update");

        let result = refresh_maintenance_alerts_for_vehicle_on(&connection, "gas", "2026-01-10")
            .expect("refresh should respect settings");
        let active_alert_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM alerts WHERE vehicle_id = 'gas' AND status = 'active'",
                [],
                |row| row.get(0),
            )
            .expect("alert count should read");

        assert_eq!(result.created_count, 0);
        assert_eq!(active_alert_count, 0);
    }

    #[test]
    fn due_soon_alert_is_created() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 1_000.0);
        sync_schedules_for_vehicle_on(&connection, "gas", "2026-01-01").expect("sync");
        let tire_id: String = connection
            .query_row(
                "
                SELECT maintenance_schedules.id
                FROM maintenance_schedules
                INNER JOIN maintenance_templates
                  ON maintenance_templates.id = maintenance_schedules.template_id
                WHERE maintenance_schedules.vehicle_id = 'gas'
                  AND maintenance_templates.template_key = 'tire_pressure_check'
                ",
                [],
                |row| row.get(0),
            )
            .expect("tire schedule id should read");

        connection
            .execute(
                "UPDATE maintenance_schedules SET next_due_date = '2026-01-10' WHERE id = ?1",
                params![tire_id],
            )
            .expect("schedule should update");

        let result = refresh_maintenance_alerts_for_vehicle_on(&connection, "gas", "2026-01-01")
            .expect("refresh");

        assert_eq!(result.created_count, 1);
        assert_eq!(result.active_alerts[0].alert_type, "due_soon_by_date");
    }
}

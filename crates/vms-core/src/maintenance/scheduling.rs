use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::{settings, vehicles::photo_storage::generate_local_id};

use super::models::{
    AlertRecord, DueStatusEvaluation, MaintenanceScheduleRecord, RefreshMaintenanceAlertsResult,
    SyncMaintenanceSchedulesResult, UpsertVehicleMaintenanceSettingRequest,
    VehicleMaintenanceSettingRecord,
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

#[derive(Debug, Clone)]
struct SettingScheduleSource {
    id: String,
    vehicle_id: String,
    template_id: String,
    status: String,
    custom_time_interval_days: Option<i64>,
    custom_odometer_interval_km: Option<i64>,
    due_soon_days: i64,
    due_soon_km: i64,
    priority: String,
}

#[derive(Debug)]
struct NormalizedSettingRequest {
    vehicle_id: String,
    template_id: String,
    status: String,
    custom_time_interval_days: Option<i64>,
    custom_odometer_interval_km: Option<i64>,
    custom_due_soon_days: Option<i64>,
    custom_due_soon_km: Option<i64>,
    notes: Option<String>,
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
    backfill_settings_from_existing_schedules(connection, vehicle_id)?;
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

    backfill_settings_from_existing_schedules(connection, vehicle_id)?;
    let setting_sources = active_setting_sources(connection, vehicle_id)?;
    let mut created_count = 0;
    let mut skipped_count = 0;

    for setting in setting_sources {
        if schedule_exists(connection, vehicle_id, &setting.template_id)? {
            link_existing_schedule_to_setting(connection, &setting)?;
            skipped_count += 1;
            continue;
        }

        let next_due_date = match setting.custom_time_interval_days {
            Some(days) => Some(date_plus_days(connection, today, days)?),
            None => None,
        };
        let next_due_odometer = setting
            .custom_odometer_interval_km
            .map(|interval| vehicle.current_odometer + interval as f64);
        let notes = schedule_setup_note(next_due_date.as_deref(), next_due_odometer);
        let evaluation = evaluate_due_status(
            today,
            vehicle.current_odometer,
            next_due_date.as_deref(),
            next_due_odometer,
            setting.due_soon_days,
            setting.due_soon_km,
            setting.status == "disabled",
        );

        connection
            .execute(
                "
                INSERT INTO maintenance_schedules (
                  id,
                  vehicle_id,
                  template_id,
                  vehicle_maintenance_setting_id,
                  next_due_date,
                  next_due_odometer,
                  due_soon_days,
                  due_soon_km,
                  status,
                  priority,
                  notes
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                ",
                params![
                    generate_local_id("maintenance_schedule"),
                    vehicle_id,
                    setting.template_id,
                    setting.id,
                    next_due_date,
                    next_due_odometer,
                    setting.due_soon_days,
                    setting.due_soon_km,
                    evaluation.status,
                    setting.priority,
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

pub fn list_vehicle_maintenance_settings(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<VehicleMaintenanceSettingRecord>, String> {
    vehicle_profile(connection, vehicle_id)?;
    backfill_settings_from_existing_schedules(connection, vehicle_id)?;
    load_setting_records(connection, vehicle_id)
}

pub fn upsert_vehicle_maintenance_setting(
    connection: &Connection,
    request: UpsertVehicleMaintenanceSettingRequest,
) -> Result<VehicleMaintenanceSettingRecord, String> {
    let mut setting = normalize_setting_request(request)?;
    let vehicle = vehicle_profile(connection, &setting.vehicle_id)?;

    if vehicle_is_archived(&vehicle) {
        return Err("Archived vehicles cannot receive new maintenance reminders.".to_string());
    }

    ensure_template_exists(connection, &setting.template_id)?;
    let (default_due_soon_days, default_due_soon_km) =
        settings::repository::schedule_default_thresholds(connection)?;
    setting.custom_due_soon_days = setting.custom_due_soon_days.or(Some(default_due_soon_days));
    setting.custom_due_soon_km = setting.custom_due_soon_km.or(Some(default_due_soon_km));

    let setting_id = connection
        .query_row(
            "
            SELECT id
            FROM vehicle_maintenance_settings
            WHERE vehicle_id = ?1
              AND template_id = ?2
            LIMIT 1
            ",
            params![setting.vehicle_id, setting.template_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| "Could not check existing maintenance reminder.".to_string())?
        .unwrap_or_else(|| generate_local_id("vehicle_maintenance_setting"));

    let changed_rows = connection
        .execute(
            "
            UPDATE vehicle_maintenance_settings
            SET
              status = ?1,
              custom_time_interval_days = ?2,
              custom_odometer_interval_km = ?3,
              custom_due_soon_days = ?4,
              custom_due_soon_km = ?5,
              notes = ?6,
              deleted_at = NULL,
              updated_at = datetime('now')
            WHERE id = ?7
            ",
            params![
                setting.status,
                setting.custom_time_interval_days,
                setting.custom_odometer_interval_km,
                setting.custom_due_soon_days,
                setting.custom_due_soon_km,
                setting.notes,
                setting_id,
            ],
        )
        .map_err(|_| "Could not update the maintenance reminder.".to_string())?;

    if changed_rows == 0 {
        connection
            .execute(
                "
                INSERT INTO vehicle_maintenance_settings (
                  id,
                  vehicle_id,
                  template_id,
                  status,
                  custom_time_interval_days,
                  custom_odometer_interval_km,
                  custom_due_soon_days,
                  custom_due_soon_km,
                  notes
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ",
                params![
                    setting_id,
                    setting.vehicle_id,
                    setting.template_id,
                    setting.status,
                    setting.custom_time_interval_days,
                    setting.custom_odometer_interval_km,
                    setting.custom_due_soon_days,
                    setting.custom_due_soon_km,
                    setting.notes,
                ],
            )
            .map_err(|_| "Could not create the maintenance reminder.".to_string())?;
    }

    recalculate_schedule_for_setting(connection, &setting_id, None, None, None)?;

    get_vehicle_maintenance_setting(connection, &setting_id)?
        .ok_or_else(|| "Could not read the saved maintenance reminder.".to_string())
}

pub fn archive_vehicle_maintenance_setting(
    connection: &Connection,
    setting_id: &str,
) -> Result<(), String> {
    let setting = setting_source_by_id(connection, setting_id)?
        .ok_or_else(|| "Maintenance reminder was not found.".to_string())?;

    connection
        .execute(
            "
            UPDATE vehicle_maintenance_settings
            SET
              status = 'disabled',
              deleted_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?1
            ",
            params![setting.id],
        )
        .map_err(|_| "Could not remove the maintenance reminder.".to_string())?;

    let schedule_ids = schedule_ids_for_setting(connection, &setting.id)?;
    connection
        .execute(
            "
            UPDATE maintenance_schedules
            SET
              status = 'disabled',
              archived_at = datetime('now'),
              updated_at = datetime('now')
            WHERE vehicle_maintenance_setting_id = ?1
              AND deleted_at IS NULL
            ",
            params![setting.id],
        )
        .map_err(|_| "Could not disable reminder schedules.".to_string())?;

    for schedule_id in schedule_ids {
        resolve_active_alerts_for_schedule(connection, &schedule_id, None)?;
    }

    Ok(())
}

pub(crate) fn schedule_id_for_active_setting(
    connection: &Connection,
    vehicle_id: &str,
    template_id: &str,
    today: &str,
) -> Result<Option<String>, String> {
    backfill_settings_from_existing_schedules(connection, vehicle_id)?;
    let Some(setting) = active_setting_source_for_template(connection, vehicle_id, template_id)?
    else {
        return Ok(None);
    };

    if let Some(schedule_id) = schedule_id_by_vehicle_template(connection, vehicle_id, template_id)?
    {
        link_existing_schedule_to_setting(connection, &setting)?;
        return Ok(Some(schedule_id));
    }

    let vehicle = vehicle_profile(connection, vehicle_id)?;
    let next_due_date = match setting.custom_time_interval_days {
        Some(days) => Some(date_plus_days(connection, today, days)?),
        None => None,
    };
    let next_due_odometer = setting
        .custom_odometer_interval_km
        .map(|interval| vehicle.current_odometer + interval as f64);
    let evaluation = evaluate_due_status(
        today,
        vehicle.current_odometer,
        next_due_date.as_deref(),
        next_due_odometer,
        setting.due_soon_days,
        setting.due_soon_km,
        false,
    );
    let schedule_id = generate_local_id("maintenance_schedule");

    connection
        .execute(
            "
            INSERT INTO maintenance_schedules (
              id,
              vehicle_id,
              template_id,
              vehicle_maintenance_setting_id,
              next_due_date,
              next_due_odometer,
              due_soon_days,
              due_soon_km,
              status,
              priority,
              notes
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ",
            params![
                schedule_id,
                vehicle_id,
                template_id,
                setting.id,
                next_due_date,
                next_due_odometer,
                setting.due_soon_days,
                setting.due_soon_km,
                evaluation.status,
                setting.priority,
                schedule_setup_note(next_due_date.as_deref(), next_due_odometer),
            ],
        )
        .map_err(|_| "Could not create the maintenance reminder schedule.".to_string())?;

    Ok(Some(schedule_id))
}

pub(crate) fn get_setting_intervals_for_schedule(
    connection: &Connection,
    schedule_id: &str,
) -> Result<ScheduleReminderIntervals, String> {
    connection
        .query_row(
            "
            SELECT
              vehicle_maintenance_settings.custom_time_interval_days,
              vehicle_maintenance_settings.custom_odometer_interval_km
            FROM maintenance_schedules
            LEFT JOIN vehicle_maintenance_settings
              ON vehicle_maintenance_settings.id = maintenance_schedules.vehicle_maintenance_setting_id
             AND vehicle_maintenance_settings.deleted_at IS NULL
             AND vehicle_maintenance_settings.status IN ('active', 'manually_added')
            WHERE maintenance_schedules.id = ?1
              AND maintenance_schedules.deleted_at IS NULL
            ",
            params![schedule_id],
            |row| {
                Ok(ScheduleReminderIntervals {
                    time_interval_days: row.get(0)?,
                    odometer_interval_km: row.get(1)?,
                })
            },
        )
        .optional()
        .map_err(|_| "Could not read maintenance reminder intervals.".to_string())?
        .ok_or_else(|| "Maintenance schedule was not found.".to_string())
}

pub(crate) struct ScheduleReminderIntervals {
    pub time_interval_days: Option<i64>,
    pub odometer_interval_km: Option<i64>,
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

    backfill_settings_from_existing_schedules(connection, vehicle_id)?;
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
              AND maintenance_schedules.archived_at IS NULL
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
              AND archived_at IS NULL
            LIMIT 1
            ",
            params![vehicle_id, template_id],
            |_| Ok(()),
        )
        .optional()
        .map(|value| value.is_some())
        .map_err(|_| "Could not check existing maintenance schedules.".to_string())
}

fn schedule_id_by_vehicle_template(
    connection: &Connection,
    vehicle_id: &str,
    template_id: &str,
) -> Result<Option<String>, String> {
    connection
        .query_row(
            "
            SELECT id
            FROM maintenance_schedules
            WHERE vehicle_id = ?1
              AND template_id = ?2
              AND deleted_at IS NULL
              AND archived_at IS NULL
            LIMIT 1
            ",
            params![vehicle_id, template_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| "Could not read the maintenance reminder schedule.".to_string())
}

fn schedule_ids_for_setting(
    connection: &Connection,
    setting_id: &str,
) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id
            FROM maintenance_schedules
            WHERE vehicle_maintenance_setting_id = ?1
              AND deleted_at IS NULL
              AND archived_at IS NULL
            ",
        )
        .map_err(|_| "Could not prepare reminder schedules.".to_string())?;

    let rows = statement
        .query_map(params![setting_id], |row| row.get::<_, String>(0))
        .map_err(|_| "Could not read reminder schedules.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse reminder schedules.".to_string())
}

fn backfill_settings_from_existing_schedules(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<usize, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              maintenance_schedules.id,
              maintenance_schedules.template_id,
              maintenance_schedules.due_soon_days,
              maintenance_schedules.due_soon_km,
              maintenance_schedules.notes,
              maintenance_templates.default_time_interval_days,
              maintenance_templates.default_odometer_interval_km
            FROM maintenance_schedules
            INNER JOIN maintenance_templates
              ON maintenance_templates.id = maintenance_schedules.template_id
             AND maintenance_templates.deleted_at IS NULL
            LEFT JOIN vehicle_maintenance_settings
              ON vehicle_maintenance_settings.id = maintenance_schedules.vehicle_maintenance_setting_id
             AND vehicle_maintenance_settings.deleted_at IS NULL
            WHERE maintenance_schedules.vehicle_id = ?1
              AND maintenance_schedules.deleted_at IS NULL
              AND maintenance_schedules.archived_at IS NULL
              AND vehicle_maintenance_settings.id IS NULL
            ",
        )
        .map_err(|_| "Could not prepare existing maintenance reminders.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<i64>>(5)?,
                row.get::<_, Option<i64>>(6)?,
            ))
        })
        .map_err(|_| "Could not read existing maintenance reminders.".to_string())?;

    let schedule_rows = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse existing maintenance reminders.".to_string())?;
    let mut backfilled_count = 0;

    for (
        schedule_id,
        template_id,
        due_soon_days,
        due_soon_km,
        notes,
        default_time_interval_days,
        default_odometer_interval_km,
    ) in schedule_rows
    {
        let setting_id = connection
            .query_row(
                "
                SELECT id
                FROM vehicle_maintenance_settings
                WHERE vehicle_id = ?1
                  AND template_id = ?2
                LIMIT 1
                ",
                params![vehicle_id, template_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|_| "Could not check existing reminder settings.".to_string())?
            .unwrap_or_else(|| generate_local_id("vehicle_maintenance_setting"));

        let changed_rows = connection
            .execute(
                "
                UPDATE vehicle_maintenance_settings
                SET
                  status = 'active',
                  custom_time_interval_days = COALESCE(custom_time_interval_days, ?1),
                  custom_odometer_interval_km = COALESCE(custom_odometer_interval_km, ?2),
                  custom_due_soon_days = COALESCE(custom_due_soon_days, ?3),
                  custom_due_soon_km = COALESCE(custom_due_soon_km, ?4),
                  notes = COALESCE(notes, ?5),
                  deleted_at = NULL,
                  updated_at = datetime('now')
                WHERE id = ?6
                ",
                params![
                    default_time_interval_days,
                    default_odometer_interval_km,
                    due_soon_days,
                    due_soon_km,
                    notes.clone().or_else(|| {
                        Some("Preserved from earlier maintenance schedule setup.".to_string())
                    }),
                    setting_id,
                ],
            )
            .map_err(|_| "Could not update preserved reminder settings.".to_string())?;

        if changed_rows == 0 {
            connection
                .execute(
                    "
                    INSERT INTO vehicle_maintenance_settings (
                      id,
                      vehicle_id,
                      template_id,
                      status,
                      custom_time_interval_days,
                      custom_odometer_interval_km,
                      custom_due_soon_days,
                      custom_due_soon_km,
                      notes
                    )
                    VALUES (?1, ?2, ?3, 'active', ?4, ?5, ?6, ?7, ?8)
                    ",
                    params![
                        setting_id,
                        vehicle_id,
                        template_id,
                        default_time_interval_days,
                        default_odometer_interval_km,
                        due_soon_days,
                        due_soon_km,
                        notes.unwrap_or_else(|| {
                            "Preserved from earlier maintenance schedule setup.".to_string()
                        }),
                    ],
                )
                .map_err(|_| "Could not preserve existing maintenance schedule.".to_string())?;
        }

        connection
            .execute(
                "
                UPDATE maintenance_schedules
                SET
                  vehicle_maintenance_setting_id = ?1,
                  updated_at = datetime('now')
                WHERE id = ?2
                ",
                params![setting_id, schedule_id],
            )
            .map_err(|_| "Could not link preserved schedule to reminder.".to_string())?;
        backfilled_count += 1;
    }

    Ok(backfilled_count)
}

fn active_setting_sources(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<SettingScheduleSource>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              vehicle_maintenance_settings.id,
              vehicle_maintenance_settings.vehicle_id,
              vehicle_maintenance_settings.template_id,
              vehicle_maintenance_settings.status,
              vehicle_maintenance_settings.custom_time_interval_days,
              vehicle_maintenance_settings.custom_odometer_interval_km,
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_days,
                maintenance_templates.default_due_soon_days
              ),
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_km,
                maintenance_templates.default_due_soon_km
              ),
              maintenance_templates.priority
            FROM vehicle_maintenance_settings
            INNER JOIN maintenance_templates
              ON maintenance_templates.id = vehicle_maintenance_settings.template_id
             AND maintenance_templates.deleted_at IS NULL
             AND maintenance_templates.is_active = 1
            WHERE vehicle_maintenance_settings.vehicle_id = ?1
              AND vehicle_maintenance_settings.deleted_at IS NULL
              AND vehicle_maintenance_settings.status IN ('active', 'manually_added')
            ORDER BY maintenance_templates.category, maintenance_templates.name
            ",
        )
        .map_err(|_| "Could not prepare maintenance reminder settings.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], setting_source_from_row)
        .map_err(|_| "Could not read maintenance reminder settings.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse maintenance reminder settings.".to_string())
}

fn active_setting_source_for_template(
    connection: &Connection,
    vehicle_id: &str,
    template_id: &str,
) -> Result<Option<SettingScheduleSource>, String> {
    connection
        .query_row(
            "
            SELECT
              vehicle_maintenance_settings.id,
              vehicle_maintenance_settings.vehicle_id,
              vehicle_maintenance_settings.template_id,
              vehicle_maintenance_settings.status,
              vehicle_maintenance_settings.custom_time_interval_days,
              vehicle_maintenance_settings.custom_odometer_interval_km,
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_days,
                maintenance_templates.default_due_soon_days
              ),
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_km,
                maintenance_templates.default_due_soon_km
              ),
              maintenance_templates.priority
            FROM vehicle_maintenance_settings
            INNER JOIN maintenance_templates
              ON maintenance_templates.id = vehicle_maintenance_settings.template_id
             AND maintenance_templates.deleted_at IS NULL
             AND maintenance_templates.is_active = 1
            WHERE vehicle_maintenance_settings.vehicle_id = ?1
              AND vehicle_maintenance_settings.template_id = ?2
              AND vehicle_maintenance_settings.deleted_at IS NULL
              AND vehicle_maintenance_settings.status IN ('active', 'manually_added')
            LIMIT 1
            ",
            params![vehicle_id, template_id],
            setting_source_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the maintenance reminder.".to_string())
}

fn setting_source_by_id(
    connection: &Connection,
    setting_id: &str,
) -> Result<Option<SettingScheduleSource>, String> {
    connection
        .query_row(
            "
            SELECT
              vehicle_maintenance_settings.id,
              vehicle_maintenance_settings.vehicle_id,
              vehicle_maintenance_settings.template_id,
              vehicle_maintenance_settings.status,
              vehicle_maintenance_settings.custom_time_interval_days,
              vehicle_maintenance_settings.custom_odometer_interval_km,
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_days,
                maintenance_templates.default_due_soon_days
              ),
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_km,
                maintenance_templates.default_due_soon_km
              ),
              maintenance_templates.priority
            FROM vehicle_maintenance_settings
            INNER JOIN maintenance_templates
              ON maintenance_templates.id = vehicle_maintenance_settings.template_id
             AND maintenance_templates.deleted_at IS NULL
            WHERE vehicle_maintenance_settings.id = ?1
              AND vehicle_maintenance_settings.deleted_at IS NULL
            LIMIT 1
            ",
            params![setting_id],
            setting_source_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the maintenance reminder.".to_string())
}

fn setting_source_from_row(row: &Row<'_>) -> rusqlite::Result<SettingScheduleSource> {
    Ok(SettingScheduleSource {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        template_id: row.get(2)?,
        status: row.get(3)?,
        custom_time_interval_days: row.get(4)?,
        custom_odometer_interval_km: row.get(5)?,
        due_soon_days: row.get(6)?,
        due_soon_km: row.get(7)?,
        priority: row.get(8)?,
    })
}

fn load_setting_records(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<VehicleMaintenanceSettingRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              vehicle_maintenance_settings.id,
              vehicle_maintenance_settings.vehicle_id,
              vehicle_maintenance_settings.template_id,
              maintenance_templates.template_key,
              maintenance_templates.name,
              maintenance_templates.category,
              vehicle_maintenance_settings.status,
              vehicle_maintenance_settings.custom_time_interval_days,
              vehicle_maintenance_settings.custom_odometer_interval_km,
              vehicle_maintenance_settings.custom_due_soon_days,
              vehicle_maintenance_settings.custom_due_soon_km,
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_days,
                maintenance_templates.default_due_soon_days
              ),
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_km,
                maintenance_templates.default_due_soon_km
              ),
              maintenance_templates.priority,
              vehicle_maintenance_settings.notes,
              vehicle_maintenance_settings.updated_at
            FROM vehicle_maintenance_settings
            INNER JOIN maintenance_templates
              ON maintenance_templates.id = vehicle_maintenance_settings.template_id
             AND maintenance_templates.deleted_at IS NULL
            WHERE vehicle_maintenance_settings.vehicle_id = ?1
              AND vehicle_maintenance_settings.deleted_at IS NULL
            ORDER BY maintenance_templates.category, maintenance_templates.name
            ",
        )
        .map_err(|_| "Could not prepare maintenance reminders.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], setting_record_from_row)
        .map_err(|_| "Could not read maintenance reminders.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse maintenance reminders.".to_string())
}

fn get_vehicle_maintenance_setting(
    connection: &Connection,
    setting_id: &str,
) -> Result<Option<VehicleMaintenanceSettingRecord>, String> {
    connection
        .query_row(
            "
            SELECT
              vehicle_maintenance_settings.id,
              vehicle_maintenance_settings.vehicle_id,
              vehicle_maintenance_settings.template_id,
              maintenance_templates.template_key,
              maintenance_templates.name,
              maintenance_templates.category,
              vehicle_maintenance_settings.status,
              vehicle_maintenance_settings.custom_time_interval_days,
              vehicle_maintenance_settings.custom_odometer_interval_km,
              vehicle_maintenance_settings.custom_due_soon_days,
              vehicle_maintenance_settings.custom_due_soon_km,
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_days,
                maintenance_templates.default_due_soon_days
              ),
              COALESCE(
                vehicle_maintenance_settings.custom_due_soon_km,
                maintenance_templates.default_due_soon_km
              ),
              maintenance_templates.priority,
              vehicle_maintenance_settings.notes,
              vehicle_maintenance_settings.updated_at
            FROM vehicle_maintenance_settings
            INNER JOIN maintenance_templates
              ON maintenance_templates.id = vehicle_maintenance_settings.template_id
             AND maintenance_templates.deleted_at IS NULL
            WHERE vehicle_maintenance_settings.id = ?1
              AND vehicle_maintenance_settings.deleted_at IS NULL
            ",
            params![setting_id],
            setting_record_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the maintenance reminder.".to_string())
}

fn setting_record_from_row(row: &Row<'_>) -> rusqlite::Result<VehicleMaintenanceSettingRecord> {
    Ok(VehicleMaintenanceSettingRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        template_id: row.get(2)?,
        template_key: row.get(3)?,
        template_name: row.get(4)?,
        category: row.get(5)?,
        status: row.get(6)?,
        custom_time_interval_days: row.get(7)?,
        custom_odometer_interval_km: row.get(8)?,
        custom_due_soon_days: row.get(9)?,
        custom_due_soon_km: row.get(10)?,
        effective_due_soon_days: row.get(11)?,
        effective_due_soon_km: row.get(12)?,
        priority: row.get(13)?,
        notes: row.get(14)?,
        updated_at: row.get(15)?,
    })
}

fn normalize_setting_request(
    request: UpsertVehicleMaintenanceSettingRequest,
) -> Result<NormalizedSettingRequest, String> {
    let vehicle_id = required_trimmed(request.vehicle_id, "Choose a vehicle.")?;
    let template_id = required_trimmed(request.template_id, "Choose a maintenance item.")?;
    let status = request.status.unwrap_or_else(|| "active".to_string());
    let status = status.trim().to_string();

    if !["active", "manually_added", "disabled", "not_applicable"].contains(&status.as_str()) {
        return Err("Choose a valid reminder status.".to_string());
    }

    let custom_time_interval_days = normalize_optional_non_negative_integer(
        request.custom_time_interval_days,
        "Days interval",
    )?;
    let custom_odometer_interval_km = normalize_optional_non_negative_integer(
        request.custom_odometer_interval_km,
        "Km interval",
    )?;
    let custom_due_soon_days =
        normalize_optional_non_negative_integer(request.custom_due_soon_days, "Due soon days")?;
    let custom_due_soon_km =
        normalize_optional_non_negative_integer(request.custom_due_soon_km, "Due soon km")?;

    if matches!(status.as_str(), "active" | "manually_added")
        && custom_time_interval_days.is_none()
        && custom_odometer_interval_km.is_none()
    {
        return Err(
            "Set at least one reminder interval, such as every 90 days or every 5,000 km."
                .to_string(),
        );
    }

    Ok(NormalizedSettingRequest {
        vehicle_id,
        template_id,
        status,
        custom_time_interval_days,
        custom_odometer_interval_km,
        custom_due_soon_days,
        custom_due_soon_km,
        notes: trim_optional(request.notes),
    })
}

fn normalize_optional_non_negative_integer(
    value: Option<i64>,
    label: &str,
) -> Result<Option<i64>, String> {
    match value {
        Some(value) if value < 0 => Err(format!("{label} cannot be negative.")),
        Some(0) => Ok(None),
        value => Ok(value),
    }
}

fn required_trimmed(value: String, message: &str) -> Result<String, String> {
    let trimmed = value.trim().to_string();
    (!trimmed.is_empty())
        .then_some(trimmed)
        .ok_or_else(|| message.to_string())
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim().to_string();
        (!trimmed.is_empty()).then_some(trimmed)
    })
}

fn ensure_template_exists(connection: &Connection, template_id: &str) -> Result<(), String> {
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

    exists
        .then_some(())
        .ok_or_else(|| "Maintenance item was not found.".to_string())
}

fn link_existing_schedule_to_setting(
    connection: &Connection,
    setting: &SettingScheduleSource,
) -> Result<(), String> {
    connection
        .execute(
            "
            UPDATE maintenance_schedules
            SET
              vehicle_maintenance_setting_id = ?1,
              due_soon_days = ?2,
              due_soon_km = ?3,
              priority = ?4,
              updated_at = datetime('now')
            WHERE vehicle_id = ?5
              AND template_id = ?6
              AND deleted_at IS NULL
              AND archived_at IS NULL
            ",
            params![
                setting.id,
                setting.due_soon_days,
                setting.due_soon_km,
                setting.priority,
                setting.vehicle_id,
                setting.template_id,
            ],
        )
        .map_err(|_| "Could not link schedule to reminder.".to_string())?;

    Ok(())
}

fn recalculate_schedule_for_setting(
    connection: &Connection,
    setting_id: &str,
    completed_date: Option<&str>,
    completed_odometer: Option<f64>,
    current_odometer_override: Option<f64>,
) -> Result<Option<String>, String> {
    let Some(setting) = setting_source_by_id(connection, setting_id)? else {
        return Ok(None);
    };
    let vehicle = vehicle_profile(connection, &setting.vehicle_id)?;
    let today = current_date(connection)?;
    let schedule_id =
        schedule_id_by_vehicle_template(connection, &setting.vehicle_id, &setting.template_id)?;
    let base_date = completed_date.unwrap_or(&today);
    let base_odometer = completed_odometer
        .or(current_odometer_override)
        .unwrap_or(vehicle.current_odometer);
    let next_due_date = match setting.custom_time_interval_days {
        Some(days) => Some(date_plus_days(connection, base_date, days)?),
        None => None,
    };
    let next_due_odometer = setting
        .custom_odometer_interval_km
        .map(|interval| base_odometer + interval as f64);
    let status = evaluate_due_status(
        base_date,
        vehicle.current_odometer.max(base_odometer),
        next_due_date.as_deref(),
        next_due_odometer,
        setting.due_soon_days,
        setting.due_soon_km,
        setting.status == "disabled",
    )
    .status;
    let notes = schedule_setup_note(next_due_date.as_deref(), next_due_odometer);

    match schedule_id {
        Some(schedule_id) => {
            connection
                .execute(
                    "
                    UPDATE maintenance_schedules
                    SET
                      vehicle_maintenance_setting_id = ?1,
                      next_due_date = ?2,
                      next_due_odometer = ?3,
                      due_soon_days = ?4,
                      due_soon_km = ?5,
                      status = ?6,
                      priority = ?7,
                      notes = ?8,
                      archived_at = NULL,
                      updated_at = datetime('now')
                    WHERE id = ?9
                    ",
                    params![
                        setting.id,
                        next_due_date,
                        next_due_odometer,
                        setting.due_soon_days,
                        setting.due_soon_km,
                        status,
                        setting.priority,
                        notes,
                        schedule_id,
                    ],
                )
                .map_err(|_| "Could not update the maintenance reminder schedule.".to_string())?;
            Ok(Some(schedule_id))
        }
        None => {
            let new_schedule_id = generate_local_id("maintenance_schedule");
            connection
                .execute(
                    "
                    INSERT INTO maintenance_schedules (
                      id,
                      vehicle_id,
                      template_id,
                      vehicle_maintenance_setting_id,
                      next_due_date,
                      next_due_odometer,
                      due_soon_days,
                      due_soon_km,
                      status,
                      priority,
                      notes
                    )
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                    ",
                    params![
                        new_schedule_id,
                        setting.vehicle_id,
                        setting.template_id,
                        setting.id,
                        next_due_date,
                        next_due_odometer,
                        setting.due_soon_days,
                        setting.due_soon_km,
                        status,
                        setting.priority,
                        notes,
                    ],
                )
                .map_err(|_| "Could not create the maintenance reminder schedule.".to_string())?;
            Ok(Some(new_schedule_id))
        }
    }
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
    next_due_date: Option<&str>,
    next_due_odometer: Option<f64>,
) -> Option<String> {
    if next_due_date.is_none() && next_due_odometer.is_none() {
        return Some("No reminder interval is set yet.".to_string());
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

    fn template_id(connection: &Connection, key: &str) -> String {
        connection
            .query_row(
                "SELECT id FROM maintenance_templates WHERE template_key = ?1",
                params![key],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| panic!("template {key} should exist"))
    }

    fn save_reminder(
        connection: &Connection,
        vehicle_id: &str,
        template_key: &str,
        days: Option<i64>,
        km: Option<i64>,
    ) {
        connection
            .execute(
                "
                INSERT INTO vehicle_maintenance_settings (
                  id,
                  vehicle_id,
                  template_id,
                  status,
                  custom_time_interval_days,
                  custom_odometer_interval_km
                )
                VALUES (?1, ?2, ?3, 'active', ?4, ?5)
                ",
                params![
                    format!("{vehicle_id}_{template_key}_setting"),
                    vehicle_id,
                    template_id(connection, template_key),
                    days,
                    km,
                ],
            )
            .expect("reminder should save");
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
    fn configured_reminders_create_schedules_and_sync_is_idempotent() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 1_000.0);
        save_reminder(
            &connection,
            "gas",
            "engine_oil_change",
            Some(180),
            Some(5_000),
        );

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
    fn templates_do_not_create_schedules_without_vehicle_reminders() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "diesel", "diesel", "manual", "rwd", 2_000.0);

        let result =
            sync_schedules_for_vehicle_on(&connection, "diesel", "2026-01-01").expect("sync");

        assert_eq!(result.created_count, 0);
        assert!(result.schedules.is_empty());
    }

    #[test]
    fn reminders_can_be_created_for_specific_templates_only() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "diesel", "diesel", "manual", "rwd", 2_000.0);
        save_reminder(&connection, "diesel", "dpf_inspection", Some(365), None);

        let result =
            sync_schedules_for_vehicle_on(&connection, "diesel", "2026-01-01").expect("sync");

        assert_eq!(result.schedules.len(), 1);
        assert_eq!(
            result.schedules[0].template_key.as_deref(),
            Some("dpf_inspection")
        );
    }

    #[test]
    fn next_due_date_and_odometer_are_calculated_from_today_and_current_odometer() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 1_000.0);
        save_reminder(
            &connection,
            "gas",
            "engine_oil_change",
            Some(180),
            Some(5_000),
        );

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
        upsert_vehicle_maintenance_setting(
            &connection,
            UpsertVehicleMaintenanceSettingRequest {
                vehicle_id: "gas".to_string(),
                template_id: template_id(&connection, "engine_oil_change"),
                status: Some("active".to_string()),
                custom_time_interval_days: Some(180),
                custom_odometer_interval_km: Some(5_000),
                custom_due_soon_days: None,
                custom_due_soon_km: None,
                notes: None,
            },
        )
        .expect("reminder should save");

        let schedules = list_schedules_for_vehicle(&connection, "gas").expect("schedules");
        let oil = schedule_for(&schedules, "engine_oil_change");

        assert_eq!(oil.due_soon_days, 21);
        assert_eq!(oil.due_soon_km, 750);
    }

    #[test]
    fn reminder_requires_at_least_one_interval() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "gas", "gasoline", "automatic", "fwd", 1_000.0);

        let error = upsert_vehicle_maintenance_setting(
            &connection,
            UpsertVehicleMaintenanceSettingRequest {
                vehicle_id: "gas".to_string(),
                template_id: template_id(&connection, "registration_renewal"),
                status: Some("active".to_string()),
                custom_time_interval_days: None,
                custom_odometer_interval_km: None,
                custom_due_soon_days: None,
                custom_due_soon_km: None,
                notes: None,
            },
        )
        .expect_err("empty reminder should fail");

        assert!(error.contains("Set at least one reminder interval"));
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
        save_reminder(
            &connection,
            "gas",
            "engine_oil_change",
            Some(180),
            Some(5_000),
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
        save_reminder(
            &connection,
            "gas",
            "engine_oil_change",
            Some(180),
            Some(5_000),
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
        save_reminder(&connection, "gas", "tire_pressure_check", Some(30), None);
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

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::vehicles::photo_storage::generate_local_id;

use super::{
    models::{
        CompleteMaintenanceScheduleRequest, CompleteMaintenanceScheduleResult,
        LogMaintenanceRequest, LogMaintenanceResult, MaintenanceAttachmentRecord,
        MaintenanceLogRecord, MaintenanceScheduleRecord, NewMaintenancePhoto,
        NewMaintenanceReceipt,
    },
    scheduling::{
        evaluate_due_status, get_setting_intervals_for_schedule,
        resolve_active_alerts_for_schedule, schedule_id_for_active_setting,
    },
};

pub fn insert_maintenance_receipt(
    connection: &Connection,
    receipt: NewMaintenanceReceipt,
) -> Result<MaintenanceAttachmentRecord, String> {
    ensure_vehicle_exists(connection, &receipt.vehicle_id)?;

    connection
        .execute(
            "
            INSERT INTO vehicle_documents (
              id,
              vehicle_id,
              document_type,
              file_path,
              original_filename,
              description
            )
            VALUES (?1, ?2, 'maintenance_receipt', ?3, ?4, ?5)
            ",
            params![
                receipt.id,
                receipt.vehicle_id,
                receipt.file_path,
                receipt.original_filename,
                format!(
                    "Stored maintenance receipt; {} bytes",
                    receipt.file_size_bytes
                )
            ],
        )
        .map_err(|_| "Could not save the maintenance receipt record.".to_string())?;

    get_maintenance_receipt(connection, &receipt.id)?
        .ok_or_else(|| "Could not read the saved maintenance receipt record.".to_string())
}

pub fn insert_maintenance_photo(
    connection: &Connection,
    photo: NewMaintenancePhoto,
) -> Result<MaintenanceAttachmentRecord, String> {
    ensure_vehicle_exists(connection, &photo.vehicle_id)?;

    connection
        .execute(
            "
            INSERT INTO vehicle_photos (
              id,
              vehicle_id,
              file_path,
              original_filename,
              mime_type,
              file_size_bytes,
              is_primary
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)
            ",
            params![
                photo.id,
                photo.vehicle_id,
                photo.file_path,
                photo.original_filename,
                photo.mime_type,
                photo.file_size_bytes
            ],
        )
        .map_err(|_| "Could not save the maintenance photo record.".to_string())?;

    get_maintenance_photo(connection, &photo.id)?
        .ok_or_else(|| "Could not read the saved maintenance photo record.".to_string())
}

pub fn complete_maintenance_schedule(
    connection: &mut Connection,
    request: CompleteMaintenanceScheduleRequest,
) -> Result<CompleteMaintenanceScheduleResult, String> {
    let completion = normalize_completion_request(request)?;
    let context = schedule_completion_context(connection, &completion.schedule_id)?;
    ensure_attachment_belongs_to_vehicle(
        connection,
        completion.receipt_document_id.as_deref(),
        &context.vehicle_id,
        "vehicle_documents",
        "maintenance receipt",
    )?;
    ensure_attachment_belongs_to_vehicle(
        connection,
        completion.before_photo_id.as_deref(),
        &context.vehicle_id,
        "vehicle_photos",
        "before photo",
    )?;
    ensure_attachment_belongs_to_vehicle(
        connection,
        completion.after_photo_id.as_deref(),
        &context.vehicle_id,
        "vehicle_photos",
        "after photo",
    )?;

    let completion_odometer = completion.odometer.unwrap_or(context.current_odometer);

    if let Some(last_completed_odometer) = context.last_completed_odometer {
        if completion_odometer < last_completed_odometer {
            return Err(format!(
                "Completion odometer cannot be lower than the previous completed odometer ({last_completed_odometer:.0} km)."
            ));
        }
    }

    let intervals = get_setting_intervals_for_schedule(connection, &completion.schedule_id)?;
    let next_due_date = match intervals.time_interval_days {
        Some(days) => Some(date_plus_days(
            connection,
            &completion.completed_date,
            days,
        )?),
        None => None,
    };
    let next_due_odometer = intervals
        .odometer_interval_km
        .map(|interval| completion_odometer + interval as f64);
    let notes = completion.notes.clone();
    let log_id = generate_local_id("maintenance_log");

    let transaction = connection
        .transaction()
        .map_err(|_| "Could not start completing maintenance.".to_string())?;

    transaction
        .execute(
            "
            INSERT INTO maintenance_logs (
              id,
              vehicle_id,
              template_id,
              schedule_id,
              completed_date,
              odometer,
              work_performed,
              parts_replaced,
              labor_cost,
              parts_cost,
              total_cost,
              mechanic_shop,
              receipt_document_id,
              before_photo_id,
              after_photo_id,
              warranty_expiration,
              next_recommended_date,
              next_recommended_odometer,
              notes
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
            ",
            params![
                log_id,
                context.vehicle_id,
                context.template_id,
                completion.schedule_id,
                completion.completed_date,
                completion_odometer,
                completion.work_performed,
                completion.parts_replaced,
                completion.labor_cost,
                completion.parts_cost,
                completion.total_cost,
                completion.mechanic_shop,
                completion.receipt_document_id,
                completion.before_photo_id,
                completion.after_photo_id,
                completion.warranty_expiration,
                next_due_date,
                next_due_odometer,
                notes
            ],
        )
        .map_err(|_| "Could not create the service history record.".to_string())?;

    transaction
        .execute(
            "
            UPDATE maintenance_schedules
            SET
              last_completed_date = ?1,
              last_completed_odometer = ?2,
              next_due_date = ?3,
              next_due_odometer = ?4,
              status = ?5,
              notes = NULL,
              updated_at = datetime('now')
            WHERE id = ?6
              AND deleted_at IS NULL
            ",
            params![
                completion.completed_date,
                completion_odometer,
                next_due_date,
                next_due_odometer,
                schedule_status_after_completion(
                    &completion.completed_date,
                    context.current_odometer.max(completion_odometer),
                    next_due_date.as_deref(),
                    next_due_odometer,
                    context.due_soon_days,
                    context.due_soon_km,
                    context.status == "disabled",
                ),
                completion.schedule_id
            ],
        )
        .map_err(|_| "Could not update the maintenance schedule.".to_string())?;

    transaction
        .execute(
            "
            UPDATE vehicles
            SET
              current_odometer = ?1,
              updated_at = datetime('now')
            WHERE id = ?2
              AND current_odometer < ?1
              AND deleted_at IS NULL
            ",
            params![completion_odometer, context.vehicle_id],
        )
        .map_err(|_| "Could not update the vehicle odometer.".to_string())?;

    mark_receipt_linked(
        &transaction,
        completion.receipt_document_id.as_deref(),
        &context.vehicle_id,
        &log_id,
    )?;

    let resolved_alert_count =
        resolve_active_alerts_for_schedule(&transaction, &completion.schedule_id, None)?;

    transaction
        .commit()
        .map_err(|_| "Could not finish completing maintenance.".to_string())?;

    let log = get_maintenance_log(connection, &log_id)?
        .ok_or_else(|| "Could not read the service history record.".to_string())?;
    let schedule = get_schedule_record(connection, &completion.schedule_id)?
        .ok_or_else(|| "Could not read the updated maintenance schedule.".to_string())?;

    Ok(CompleteMaintenanceScheduleResult {
        log,
        schedule,
        resolved_alert_count,
    })
}

pub fn log_maintenance(
    connection: &mut Connection,
    request: LogMaintenanceRequest,
) -> Result<LogMaintenanceResult, String> {
    let request = normalize_log_request(request)?;
    ensure_vehicle_exists(connection, &request.vehicle_id)?;
    ensure_template_exists(connection, &request.template_id)?;
    ensure_attachment_belongs_to_vehicle(
        connection,
        request.receipt_document_id.as_deref(),
        &request.vehicle_id,
        "vehicle_documents",
        "maintenance receipt",
    )?;
    ensure_attachment_belongs_to_vehicle(
        connection,
        request.before_photo_id.as_deref(),
        &request.vehicle_id,
        "vehicle_photos",
        "before photo",
    )?;
    ensure_attachment_belongs_to_vehicle(
        connection,
        request.after_photo_id.as_deref(),
        &request.vehicle_id,
        "vehicle_photos",
        "after photo",
    )?;

    let current_odometer = current_vehicle_odometer(connection, &request.vehicle_id)?;
    let completion_odometer = request.odometer.unwrap_or(current_odometer);
    validate_log_odometer_progression(
        connection,
        &request.vehicle_id,
        &request.template_id,
        completion_odometer,
    )?;

    let today = current_date(connection)?;
    let schedule_id = schedule_id_for_active_setting(
        connection,
        &request.vehicle_id,
        &request.template_id,
        &today,
    )?;

    match schedule_id {
        Some(schedule_id) => {
            let result = complete_maintenance_schedule(
                connection,
                CompleteMaintenanceScheduleRequest {
                    schedule_id,
                    completed_date: request.completed_date,
                    odometer: Some(completion_odometer),
                    work_performed: request.work_performed,
                    parts_replaced: request.parts_replaced,
                    labor_cost: Some(request.labor_cost),
                    parts_cost: Some(request.parts_cost),
                    total_cost: Some(request.total_cost),
                    mechanic_shop: request.mechanic_shop,
                    receipt_document_id: request.receipt_document_id,
                    before_photo_id: request.before_photo_id,
                    after_photo_id: request.after_photo_id,
                    warranty_expiration: request.warranty_expiration,
                    notes: request.notes,
                },
            )?;

            Ok(LogMaintenanceResult {
                log: result.log,
                schedule: Some(result.schedule),
                resolved_alert_count: result.resolved_alert_count,
                reminder_used: true,
            })
        }
        None => {
            let log_id = generate_local_id("maintenance_log");
            let transaction = connection
                .transaction()
                .map_err(|_| "Could not start saving maintenance.".to_string())?;

            transaction
                .execute(
                    "
                    INSERT INTO maintenance_logs (
                      id,
                      vehicle_id,
                      template_id,
                      completed_date,
                      odometer,
                      work_performed,
                      parts_replaced,
                      labor_cost,
                      parts_cost,
                      total_cost,
                      mechanic_shop,
                      receipt_document_id,
                      before_photo_id,
                      after_photo_id,
                      warranty_expiration,
                      notes
                    )
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
                    ",
                    params![
                        log_id,
                        request.vehicle_id,
                        request.template_id,
                        request.completed_date,
                        completion_odometer,
                        request.work_performed,
                        request.parts_replaced,
                        request.labor_cost,
                        request.parts_cost,
                        request.total_cost,
                        request.mechanic_shop,
                        request.receipt_document_id,
                        request.before_photo_id,
                        request.after_photo_id,
                        request.warranty_expiration,
                        request.notes,
                    ],
                )
                .map_err(|_| "Could not create the service history record.".to_string())?;

            transaction
                .execute(
                    "
                    UPDATE vehicles
                    SET
                      current_odometer = ?1,
                      updated_at = datetime('now')
                    WHERE id = ?2
                      AND current_odometer < ?1
                      AND deleted_at IS NULL
                    ",
                    params![completion_odometer, request.vehicle_id],
                )
                .map_err(|_| "Could not update the vehicle odometer.".to_string())?;

            mark_receipt_linked(
                &transaction,
                request.receipt_document_id.as_deref(),
                &request.vehicle_id,
                &log_id,
            )?;

            transaction
                .commit()
                .map_err(|_| "Could not finish saving maintenance.".to_string())?;

            let log = get_maintenance_log(connection, &log_id)?
                .ok_or_else(|| "Could not read the service history record.".to_string())?;

            Ok(LogMaintenanceResult {
                log,
                schedule: None,
                resolved_alert_count: 0,
                reminder_used: false,
            })
        }
    }
}

pub fn list_service_history_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<MaintenanceLogRecord>, String> {
    ensure_vehicle_exists(connection, vehicle_id)?;

    let mut statement = connection
        .prepare(&format!(
            "
            {MAINTENANCE_LOG_SELECT}
            WHERE maintenance_logs.vehicle_id = ?1
              AND maintenance_logs.deleted_at IS NULL
            ORDER BY maintenance_logs.completed_date DESC, maintenance_logs.created_at DESC
            "
        ))
        .map_err(|_| "Could not prepare service history.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], maintenance_log_from_row)
        .map_err(|_| "Could not read service history.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse service history.".to_string())
}

pub fn get_maintenance_log(
    connection: &Connection,
    id: &str,
) -> Result<Option<MaintenanceLogRecord>, String> {
    connection
        .query_row(
            &format!(
                "
                {MAINTENANCE_LOG_SELECT}
                WHERE maintenance_logs.id = ?1
                  AND maintenance_logs.deleted_at IS NULL
                "
            ),
            params![id],
            maintenance_log_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the selected service history record.".to_string())
}

fn get_schedule_record(
    connection: &Connection,
    schedule_id: &str,
) -> Result<Option<MaintenanceScheduleRecord>, String> {
    let today = current_date(connection)?;

    connection
        .query_row(
            "
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
              maintenance_schedules.updated_at,
              vehicles.current_odometer
            FROM maintenance_schedules
            JOIN maintenance_templates
              ON maintenance_templates.id = maintenance_schedules.template_id
            JOIN vehicles
              ON vehicles.id = maintenance_schedules.vehicle_id
            WHERE maintenance_schedules.id = ?1
              AND maintenance_schedules.deleted_at IS NULL
            ",
            params![schedule_id],
            |row| {
                let current_odometer: f64 = row.get(16)?;
                let next_due_date: Option<String> = row.get(8)?;
                let next_due_odometer: Option<f64> = row.get(9)?;
                let due_soon_days: i64 = row.get(10)?;
                let due_soon_km: i64 = row.get(11)?;
                let status: String = row.get(12)?;
                let evaluation = evaluate_due_status(
                    &today,
                    current_odometer,
                    next_due_date.as_deref(),
                    next_due_odometer,
                    due_soon_days,
                    due_soon_km,
                    status == "disabled",
                );

                Ok(MaintenanceScheduleRecord {
                    id: row.get(0)?,
                    vehicle_id: row.get(1)?,
                    template_id: row.get(2)?,
                    template_key: row.get(3)?,
                    template_name: row.get(4)?,
                    category: row.get(5)?,
                    last_completed_date: row.get(6)?,
                    last_completed_odometer: row.get(7)?,
                    next_due_date,
                    next_due_odometer,
                    due_soon_days,
                    due_soon_km,
                    status: evaluation.status.clone(),
                    due_status: evaluation.status,
                    due_reason: evaluation.reason,
                    priority: row.get(13)?,
                    notes: row.get(14)?,
                    updated_at: row.get(15)?,
                })
            },
        )
        .optional()
        .map_err(|_| "Could not read the maintenance schedule.".to_string())
}

fn schedule_completion_context(
    connection: &Connection,
    schedule_id: &str,
) -> Result<ScheduleCompletionContext, String> {
    connection
        .query_row(
            "
            SELECT
              maintenance_schedules.vehicle_id,
              maintenance_schedules.template_id,
              maintenance_schedules.last_completed_odometer,
              maintenance_schedules.due_soon_days,
              maintenance_schedules.due_soon_km,
              maintenance_schedules.status,
              vehicles.current_odometer
            FROM maintenance_schedules
            JOIN maintenance_templates
              ON maintenance_templates.id = maintenance_schedules.template_id
            JOIN vehicles
              ON vehicles.id = maintenance_schedules.vehicle_id
            WHERE maintenance_schedules.id = ?1
              AND maintenance_schedules.deleted_at IS NULL
              AND vehicles.deleted_at IS NULL
            ",
            params![schedule_id],
            |row| {
                Ok(ScheduleCompletionContext {
                    vehicle_id: row.get(0)?,
                    template_id: row.get(1)?,
                    last_completed_odometer: row.get(2)?,
                    due_soon_days: row.get(3)?,
                    due_soon_km: row.get(4)?,
                    status: row.get(5)?,
                    current_odometer: row.get(6)?,
                })
            },
        )
        .optional()
        .map_err(|_| "Could not read the selected maintenance schedule.".to_string())?
        .ok_or_else(|| "Maintenance schedule was not found.".to_string())
}

fn normalize_completion_request(
    request: CompleteMaintenanceScheduleRequest,
) -> Result<NormalizedCompletionRequest, String> {
    let schedule_id = required_trimmed(request.schedule_id, "Choose a schedule to complete.")?;
    let completed_date = required_trimmed(request.completed_date, "Completion date is required.")?;
    let work_performed = required_trimmed(request.work_performed, "Work performed is required.")?;
    let odometer = normalize_optional_non_negative_number(request.odometer, "Completion odometer")?;
    let labor_cost = normalize_optional_non_negative_number(request.labor_cost, "Labor cost")?
        .unwrap_or_default();
    let parts_cost = normalize_optional_non_negative_number(request.parts_cost, "Parts cost")?
        .unwrap_or_default();
    let total_cost = normalize_optional_non_negative_number(request.total_cost, "Total cost")?
        .unwrap_or(labor_cost + parts_cost);

    Ok(NormalizedCompletionRequest {
        schedule_id,
        completed_date,
        odometer,
        work_performed,
        parts_replaced: trim_optional(request.parts_replaced),
        labor_cost,
        parts_cost,
        total_cost,
        mechanic_shop: trim_optional(request.mechanic_shop),
        receipt_document_id: trim_optional(request.receipt_document_id),
        before_photo_id: trim_optional(request.before_photo_id),
        after_photo_id: trim_optional(request.after_photo_id),
        warranty_expiration: trim_optional(request.warranty_expiration),
        notes: trim_optional(request.notes),
    })
}

fn normalize_log_request(request: LogMaintenanceRequest) -> Result<NormalizedLogRequest, String> {
    let vehicle_id = required_trimmed(request.vehicle_id, "Choose a vehicle.")?;
    let template_id = required_trimmed(request.template_id, "Choose a maintenance item.")?;
    let completed_date = required_trimmed(request.completed_date, "Completion date is required.")?;
    let work_performed = required_trimmed(request.work_performed, "Work performed is required.")?;
    let odometer = normalize_optional_non_negative_number(request.odometer, "Completion odometer")?;
    let labor_cost = normalize_optional_non_negative_number(request.labor_cost, "Labor cost")?
        .unwrap_or_default();
    let parts_cost = normalize_optional_non_negative_number(request.parts_cost, "Parts cost")?
        .unwrap_or_default();
    let total_cost = normalize_optional_non_negative_number(request.total_cost, "Total cost")?
        .unwrap_or(labor_cost + parts_cost);

    Ok(NormalizedLogRequest {
        vehicle_id,
        template_id,
        completed_date,
        odometer,
        work_performed,
        parts_replaced: trim_optional(request.parts_replaced),
        labor_cost,
        parts_cost,
        total_cost,
        mechanic_shop: trim_optional(request.mechanic_shop),
        receipt_document_id: trim_optional(request.receipt_document_id),
        before_photo_id: trim_optional(request.before_photo_id),
        after_photo_id: trim_optional(request.after_photo_id),
        warranty_expiration: trim_optional(request.warranty_expiration),
        notes: trim_optional(request.notes),
    })
}

fn normalize_optional_non_negative_number(
    value: Option<f64>,
    label: &str,
) -> Result<Option<f64>, String> {
    match value {
        Some(value) if !value.is_finite() => Err(format!("{label} must be a valid number.")),
        Some(value) if value < 0.0 => Err(format!("{label} cannot be negative.")),
        value => Ok(value),
    }
}

fn ensure_vehicle_exists(connection: &Connection, id: &str) -> Result<(), String> {
    let exists = connection
        .query_row(
            "SELECT 1 FROM vehicles WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check the selected vehicle.".to_string())?
        .is_some();

    exists
        .then_some(())
        .ok_or_else(|| "Vehicle was not found.".to_string())
}

fn ensure_template_exists(connection: &Connection, id: &str) -> Result<(), String> {
    let exists = connection
        .query_row(
            "
            SELECT 1
            FROM maintenance_templates
            WHERE id = ?1
              AND is_active = 1
              AND deleted_at IS NULL
            ",
            params![id],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check the selected maintenance item.".to_string())?
        .is_some();

    exists
        .then_some(())
        .ok_or_else(|| "Maintenance item was not found.".to_string())
}

fn current_vehicle_odometer(connection: &Connection, vehicle_id: &str) -> Result<f64, String> {
    connection
        .query_row(
            "
            SELECT current_odometer
            FROM vehicles
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![vehicle_id],
            |row| row.get(0),
        )
        .map_err(|_| "Could not read the vehicle odometer.".to_string())
}

fn validate_log_odometer_progression(
    connection: &Connection,
    vehicle_id: &str,
    template_id: &str,
    odometer: f64,
) -> Result<(), String> {
    let previous_odometer = connection
        .query_row(
            "
            SELECT odometer
            FROM maintenance_logs
            WHERE vehicle_id = ?1
              AND template_id = ?2
              AND deleted_at IS NULL
            ORDER BY completed_date DESC, created_at DESC
            LIMIT 1
            ",
            params![vehicle_id, template_id],
            |row| row.get::<_, f64>(0),
        )
        .optional()
        .map_err(|_| "Could not check previous maintenance odometer.".to_string())?;

    if let Some(previous_odometer) = previous_odometer {
        if odometer < previous_odometer {
            return Err(format!(
                "Completion odometer cannot be lower than the previous completed odometer ({previous_odometer:.0} km)."
            ));
        }
    }

    Ok(())
}

fn ensure_attachment_belongs_to_vehicle(
    connection: &Connection,
    attachment_id: Option<&str>,
    vehicle_id: &str,
    table: &str,
    label: &str,
) -> Result<(), String> {
    let Some(attachment_id) = attachment_id else {
        return Ok(());
    };

    let sql = match table {
        "vehicle_documents" => {
            "
            SELECT vehicle_id
            FROM vehicle_documents
            WHERE id = ?1
              AND vehicle_id = ?2
              AND document_type = 'maintenance_receipt'
              AND deleted_at IS NULL
            "
        }
        "vehicle_photos" => {
            "
            SELECT vehicle_id
            FROM vehicle_photos
            WHERE id = ?1
              AND vehicle_id = ?2
              AND deleted_at IS NULL
            "
        }
        _ => return Err("Unsupported attachment type.".to_string()),
    };

    let exists = connection
        .query_row(sql, params![attachment_id, vehicle_id], |_| Ok(()))
        .optional()
        .map_err(|_| format!("Could not check the selected {label}."))?
        .is_some();

    exists
        .then_some(())
        .ok_or_else(|| format!("Choose a saved {label} for the selected vehicle."))
}

fn mark_receipt_linked(
    connection: &Connection,
    receipt_id: Option<&str>,
    vehicle_id: &str,
    log_id: &str,
) -> Result<(), String> {
    let Some(receipt_id) = receipt_id else {
        return Ok(());
    };

    connection
        .execute(
            "
            UPDATE vehicle_documents
            SET
              related_record_type = 'maintenance_log',
              related_record_id = ?1
            WHERE id = ?2
              AND vehicle_id = ?3
              AND document_type = 'maintenance_receipt'
              AND deleted_at IS NULL
            ",
            params![log_id, receipt_id, vehicle_id],
        )
        .map_err(|_| "Could not link the receipt to the service history record.".to_string())?;

    Ok(())
}

fn get_maintenance_receipt(
    connection: &Connection,
    id: &str,
) -> Result<Option<MaintenanceAttachmentRecord>, String> {
    connection
        .query_row(
            "
            SELECT
              id,
              vehicle_id,
              file_path,
              original_filename,
              NULL AS mime_type,
              description,
              created_at
            FROM vehicle_documents
            WHERE id = ?1
              AND document_type = 'maintenance_receipt'
              AND deleted_at IS NULL
            ",
            params![id],
            attachment_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the maintenance receipt record.".to_string())
}

fn get_maintenance_photo(
    connection: &Connection,
    id: &str,
) -> Result<Option<MaintenanceAttachmentRecord>, String> {
    connection
        .query_row(
            "
            SELECT
              id,
              vehicle_id,
              file_path,
              original_filename,
              mime_type,
              CAST(file_size_bytes AS TEXT),
              created_at
            FROM vehicle_photos
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![id],
            attachment_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the maintenance photo record.".to_string())
}

fn attachment_from_row(row: &Row<'_>) -> rusqlite::Result<MaintenanceAttachmentRecord> {
    let size_source: Option<String> = row.get(5)?;

    Ok(MaintenanceAttachmentRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        file_path: row.get(2)?,
        original_filename: row.get(3)?,
        mime_type: row.get(4)?,
        file_size_bytes: parse_file_size(size_source.as_deref()),
        created_at: row.get(6)?,
    })
}

fn parse_file_size(value: Option<&str>) -> i64 {
    value
        .and_then(|value| value.split_whitespace().find_map(|part| part.parse().ok()))
        .unwrap_or_default()
}

fn date_plus_days(connection: &Connection, date: &str, days: i64) -> Result<String, String> {
    connection
        .query_row(
            "SELECT date(?1, printf('+%d days', ?2))",
            params![date, days],
            |row| row.get(0),
        )
        .map_err(|_| "Could not calculate the next due date.".to_string())
}

fn current_date(connection: &Connection) -> Result<String, String> {
    connection
        .query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
        .map_err(|_| "Could not read today's date.".to_string())
}

fn schedule_status_after_completion(
    completed_date: &str,
    current_odometer: f64,
    next_due_date: Option<&str>,
    next_due_odometer: Option<f64>,
    due_soon_days: i64,
    due_soon_km: i64,
    disabled: bool,
) -> String {
    evaluate_due_status(
        completed_date,
        current_odometer,
        next_due_date,
        next_due_odometer,
        due_soon_days,
        due_soon_km,
        disabled,
    )
    .status
}

fn maintenance_log_from_row(row: &Row<'_>) -> rusqlite::Result<MaintenanceLogRecord> {
    Ok(MaintenanceLogRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        vehicle_name: row.get(2)?,
        template_id: row.get(3)?,
        template_key: row.get(4)?,
        template_name: row.get(5)?,
        schedule_id: row.get(6)?,
        completed_date: row.get(7)?,
        odometer: row.get(8)?,
        work_performed: row.get(9)?,
        parts_replaced: row.get(10)?,
        labor_cost: row.get(11)?,
        parts_cost: row.get(12)?,
        total_cost: row.get(13)?,
        mechanic_shop: row.get(14)?,
        receipt_document_id: row.get(15)?,
        receipt_file_path: row.get(16)?,
        receipt_original_filename: row.get(17)?,
        before_photo_id: row.get(18)?,
        before_photo_path: row.get(19)?,
        after_photo_id: row.get(20)?,
        after_photo_path: row.get(21)?,
        warranty_expiration: row.get(22)?,
        next_recommended_date: row.get(23)?,
        next_recommended_odometer: row.get(24)?,
        notes: row.get(25)?,
        created_at: row.get(26)?,
        updated_at: row.get(27)?,
    })
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

const MAINTENANCE_LOG_SELECT: &str = "
    SELECT
      maintenance_logs.id,
      maintenance_logs.vehicle_id,
      vehicles.vehicle_name,
      maintenance_logs.template_id,
      maintenance_templates.template_key,
      maintenance_templates.name,
      maintenance_logs.schedule_id,
      maintenance_logs.completed_date,
      maintenance_logs.odometer,
      maintenance_logs.work_performed,
      maintenance_logs.parts_replaced,
      maintenance_logs.labor_cost,
      maintenance_logs.parts_cost,
      maintenance_logs.total_cost,
      maintenance_logs.mechanic_shop,
      maintenance_logs.receipt_document_id,
      receipt_documents.file_path AS receipt_file_path,
      receipt_documents.original_filename AS receipt_original_filename,
      maintenance_logs.before_photo_id,
      before_photos.file_path AS before_photo_path,
      maintenance_logs.after_photo_id,
      after_photos.file_path AS after_photo_path,
      maintenance_logs.warranty_expiration,
      maintenance_logs.next_recommended_date,
      maintenance_logs.next_recommended_odometer,
      maintenance_logs.notes,
      maintenance_logs.created_at,
      maintenance_logs.updated_at
    FROM maintenance_logs
    JOIN vehicles
      ON vehicles.id = maintenance_logs.vehicle_id
    LEFT JOIN maintenance_templates
      ON maintenance_templates.id = maintenance_logs.template_id
    LEFT JOIN vehicle_documents AS receipt_documents
      ON receipt_documents.id = maintenance_logs.receipt_document_id
     AND receipt_documents.deleted_at IS NULL
    LEFT JOIN vehicle_photos AS before_photos
      ON before_photos.id = maintenance_logs.before_photo_id
     AND before_photos.deleted_at IS NULL
    LEFT JOIN vehicle_photos AS after_photos
      ON after_photos.id = maintenance_logs.after_photo_id
     AND after_photos.deleted_at IS NULL
";

#[derive(Debug)]
struct NormalizedCompletionRequest {
    schedule_id: String,
    completed_date: String,
    odometer: Option<f64>,
    work_performed: String,
    parts_replaced: Option<String>,
    labor_cost: f64,
    parts_cost: f64,
    total_cost: f64,
    mechanic_shop: Option<String>,
    receipt_document_id: Option<String>,
    before_photo_id: Option<String>,
    after_photo_id: Option<String>,
    warranty_expiration: Option<String>,
    notes: Option<String>,
}

#[derive(Debug)]
struct NormalizedLogRequest {
    vehicle_id: String,
    template_id: String,
    completed_date: String,
    odometer: Option<f64>,
    work_performed: String,
    parts_replaced: Option<String>,
    labor_cost: f64,
    parts_cost: f64,
    total_cost: f64,
    mechanic_shop: Option<String>,
    receipt_document_id: Option<String>,
    before_photo_id: Option<String>,
    after_photo_id: Option<String>,
    warranty_expiration: Option<String>,
    notes: Option<String>,
}

#[derive(Debug)]
struct ScheduleCompletionContext {
    vehicle_id: String,
    template_id: String,
    last_completed_odometer: Option<f64>,
    due_soon_days: i64,
    due_soon_km: i64,
    status: String,
    current_odometer: f64,
}

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::TempDir;

    use crate::db;

    use super::*;
    use crate::maintenance::{repository, scheduling};

    fn setup_database() -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("service-history.sqlite3");
        db::initialize_database_at_path(&database_path).expect("database should initialize");
        let mut connection =
            db::open_database_at_path(&database_path).expect("database should open");
        repository::seed_default_templates(&mut connection).expect("templates should seed");

        (temp_dir, connection)
    }

    fn insert_vehicle(connection: &Connection) {
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
                VALUES ('vehicle-1', 'Service Van', 'van', 'gasoline', 'automatic', 'fwd', 1000, 'active')
                ",
                [],
            )
            .expect("vehicle should insert");
    }

    fn oil_schedule(connection: &Connection) -> MaintenanceScheduleRecord {
        scheduling::upsert_vehicle_maintenance_setting(
            connection,
            crate::maintenance::models::UpsertVehicleMaintenanceSettingRequest {
                vehicle_id: "vehicle-1".to_string(),
                template_id: template_id(connection, "engine_oil_change"),
                status: Some("active".to_string()),
                custom_time_interval_days: Some(180),
                custom_odometer_interval_km: Some(5_000),
                custom_due_soon_days: None,
                custom_due_soon_km: None,
                notes: None,
            },
        )
        .expect("oil reminder should save");
        scheduling::sync_schedules_for_vehicle_on(connection, "vehicle-1", "2026-01-01")
            .expect("sync should work")
            .schedules
            .into_iter()
            .find(|schedule| schedule.template_key.as_deref() == Some("engine_oil_change"))
            .expect("oil schedule should exist")
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

    fn completion_request(schedule_id: &str) -> CompleteMaintenanceScheduleRequest {
        CompleteMaintenanceScheduleRequest {
            schedule_id: schedule_id.to_string(),
            completed_date: "2026-02-01".to_string(),
            odometer: Some(1_500.0),
            work_performed: "Changed engine oil".to_string(),
            parts_replaced: Some("Oil and filter".to_string()),
            labor_cost: Some(500.0),
            parts_cost: Some(1200.0),
            total_cost: None,
            mechanic_shop: Some("Local shop".to_string()),
            receipt_document_id: None,
            before_photo_id: None,
            after_photo_id: None,
            warranty_expiration: Some("2026-08-01".to_string()),
            notes: Some("Routine service".to_string()),
        }
    }

    fn log_request(template_id: String) -> LogMaintenanceRequest {
        LogMaintenanceRequest {
            vehicle_id: "vehicle-1".to_string(),
            template_id,
            completed_date: "2026-02-01".to_string(),
            odometer: Some(1_500.0),
            work_performed: "Changed engine oil".to_string(),
            parts_replaced: Some("Oil and filter".to_string()),
            labor_cost: Some(500.0),
            parts_cost: Some(1200.0),
            total_cost: None,
            mechanic_shop: Some("Local shop".to_string()),
            receipt_document_id: None,
            before_photo_id: None,
            after_photo_id: None,
            warranty_expiration: Some("2026-08-01".to_string()),
            notes: Some("Routine service".to_string()),
        }
    }

    #[test]
    fn completing_schedule_creates_log_and_updates_next_due_values() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection);
        let schedule = oil_schedule(&connection);

        let result =
            complete_maintenance_schedule(&mut connection, completion_request(&schedule.id))
                .expect("completion should save");

        assert_eq!(result.log.work_performed, "Changed engine oil");
        assert_eq!(result.log.total_cost, 1700.0);
        assert_eq!(
            result.schedule.last_completed_date.as_deref(),
            Some("2026-02-01")
        );
        assert_eq!(result.schedule.last_completed_odometer, Some(1_500.0));
        assert_eq!(result.schedule.next_due_date.as_deref(), Some("2026-07-31"));
        assert_eq!(result.schedule.next_due_odometer, Some(6_500.0));

        let logs = list_service_history_for_vehicle(&connection, "vehicle-1")
            .expect("service history should list");
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].template_name.as_deref(), Some("Engine Oil Change"));
    }

    #[test]
    fn logging_without_reminder_creates_history_without_next_due_schedule() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection);
        let oil_template_id = template_id(&connection, "engine_oil_change");

        let result = log_maintenance(&mut connection, log_request(oil_template_id))
            .expect("maintenance log should save");

        assert!(!result.reminder_used);
        assert!(result.schedule.is_none());
        assert_eq!(result.log.schedule_id, None);
        assert_eq!(result.log.next_recommended_date, None);
        assert_eq!(result.log.next_recommended_odometer, None);

        let schedule_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM maintenance_schedules WHERE vehicle_id = 'vehicle-1'",
                [],
                |row| row.get(0),
            )
            .expect("schedule count should read");
        assert_eq!(schedule_count, 0);
    }

    #[test]
    fn logging_with_reminder_updates_next_due_values() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection);
        oil_schedule(&connection);
        let oil_template_id = template_id(&connection, "engine_oil_change");

        let result = log_maintenance(&mut connection, log_request(oil_template_id))
            .expect("maintenance log should save");

        let schedule = result.schedule.expect("reminder schedule should update");
        assert!(result.reminder_used);
        assert_eq!(schedule.next_due_date.as_deref(), Some("2026-07-31"));
        assert_eq!(schedule.next_due_odometer, Some(6_500.0));
        assert_eq!(
            result.log.schedule_id.as_deref(),
            Some(schedule.id.as_str())
        );
    }

    #[test]
    fn completing_due_schedule_resolves_maintenance_alerts_only() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection);
        let schedule = oil_schedule(&connection);

        connection
            .execute(
                "
                UPDATE maintenance_schedules
                SET next_due_date = '2026-01-01'
                WHERE id = ?1
                ",
                params![schedule.id],
            )
            .expect("schedule should update");
        scheduling::refresh_maintenance_alerts_for_vehicle_on(
            &connection,
            "vehicle-1",
            "2026-02-01",
        )
        .expect("alerts should refresh");
        connection
            .execute(
                "
                INSERT INTO alerts (
                  id,
                  vehicle_id,
                  alert_type,
                  priority,
                  title,
                  message,
                  related_record_type,
                  related_record_id,
                  status
                )
                VALUES ('fuel-alert', 'vehicle-1', 'fuel_efficiency_drop', 'medium', 'Fuel drop', 'Fuel drop', 'fuel_log', 'fuel-1', 'active')
                ",
                [],
            )
            .expect("fuel alert should insert");

        let result =
            complete_maintenance_schedule(&mut connection, completion_request(&schedule.id))
                .expect("completion should save");

        assert!(result.resolved_alert_count > 0);
        let active_maintenance_alerts: i64 = connection
            .query_row(
                "
                SELECT COUNT(*)
                FROM alerts
                WHERE maintenance_schedule_id = ?1
                  AND status = 'active'
                ",
                params![schedule.id],
                |row| row.get(0),
            )
            .expect("alert count should read");
        let active_fuel_alerts: i64 = connection
            .query_row(
                "
                SELECT COUNT(*)
                FROM alerts
                WHERE id = 'fuel-alert'
                  AND status = 'active'
                ",
                [],
                |row| row.get(0),
            )
            .expect("fuel alert count should read");

        assert_eq!(active_maintenance_alerts, 0);
        assert_eq!(active_fuel_alerts, 1);
    }

    #[test]
    fn completion_rejects_invalid_odometer_progression() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection);
        let schedule = oil_schedule(&connection);

        complete_maintenance_schedule(&mut connection, completion_request(&schedule.id))
            .expect("first completion should save");

        let error = complete_maintenance_schedule(
            &mut connection,
            CompleteMaintenanceScheduleRequest {
                completed_date: "2026-03-01".to_string(),
                odometer: Some(1_400.0),
                ..completion_request(&schedule.id)
            },
        )
        .expect_err("lower odometer should fail");

        assert!(error.contains("previous completed odometer"));
    }

    #[test]
    fn service_history_is_ordered_newest_first() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection);
        let schedule = oil_schedule(&connection);

        complete_maintenance_schedule(
            &mut connection,
            CompleteMaintenanceScheduleRequest {
                completed_date: "2026-01-01".to_string(),
                odometer: Some(1_100.0),
                ..completion_request(&schedule.id)
            },
        )
        .expect("first completion should save");
        complete_maintenance_schedule(
            &mut connection,
            CompleteMaintenanceScheduleRequest {
                completed_date: "2026-03-01".to_string(),
                odometer: Some(1_800.0),
                work_performed: "Second oil change".to_string(),
                ..completion_request(&schedule.id)
            },
        )
        .expect("second completion should save");

        let logs = list_service_history_for_vehicle(&connection, "vehicle-1")
            .expect("service history should list");
        assert_eq!(logs.len(), 2);
        assert_eq!(logs[0].work_performed, "Second oil change");
    }
}

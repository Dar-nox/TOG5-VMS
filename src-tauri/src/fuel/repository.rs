use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::vehicles::photo_storage::generate_local_id;

use super::models::{
    FuelEfficiencySummaryRecord, FuelLogMutationRequest, FuelLogRecord, FuelReceiptRecord,
    FuelTypeWarningRecord, NewFuelReceipt, NormalizedFuelLogMutation,
};

pub fn insert_fuel_receipt(
    connection: &Connection,
    receipt: NewFuelReceipt,
) -> Result<FuelReceiptRecord, String> {
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
            VALUES (?1, ?2, 'fuel_receipt', ?3, ?4, ?5)
            ",
            params![
                receipt.id,
                receipt.vehicle_id,
                receipt.file_path,
                receipt.original_filename,
                format!("Stored fuel receipt; {} bytes", receipt.file_size_bytes)
            ],
        )
        .map_err(|_| "Could not save the fuel receipt record.".to_string())?;

    get_fuel_receipt(connection, &receipt.id)?
        .ok_or_else(|| "Could not read the saved fuel receipt record.".to_string())
}

pub fn list_fuel_logs_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<FuelLogRecord>, String> {
    ensure_vehicle_exists(connection, vehicle_id)?;

    let mut statement = connection
        .prepare(&format!(
            "
            {FUEL_LOG_SELECT}
            WHERE fuel_logs.vehicle_id = ?1
              AND fuel_logs.deleted_at IS NULL
            ORDER BY fuel_logs.fuel_date DESC, fuel_logs.odometer DESC, fuel_logs.created_at DESC
            "
        ))
        .map_err(|_| "Could not prepare the fuel log list.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], fuel_log_from_row)
        .map_err(|_| "Could not read fuel logs.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse fuel logs.".to_string())
}

pub fn get_fuel_log(connection: &Connection, id: &str) -> Result<Option<FuelLogRecord>, String> {
    connection
        .query_row(
            &format!(
                "
                {FUEL_LOG_SELECT}
                WHERE fuel_logs.id = ?1
                  AND fuel_logs.deleted_at IS NULL
                "
            ),
            params![id],
            fuel_log_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the selected fuel log.".to_string())
}

pub fn create_fuel_log(
    connection: &mut Connection,
    request: FuelLogMutationRequest,
) -> Result<FuelLogRecord, String> {
    let fuel_log = normalize_fuel_log_request(request)?;
    ensure_vehicle_exists(connection, &fuel_log.vehicle_id)?;
    ensure_receipt_belongs_to_vehicle(
        connection,
        fuel_log.receipt_document_id.as_deref(),
        &fuel_log.vehicle_id,
    )?;
    ensure_odometer_does_not_roll_back(connection, &fuel_log.vehicle_id, None, fuel_log.odometer)?;

    let id = generate_local_id("fuel_log");
    let transaction = connection
        .transaction()
        .map_err(|_| "Could not start saving the fuel log.".to_string())?;

    transaction
        .execute(
            "
            INSERT INTO fuel_logs (
              id,
              vehicle_id,
              fuel_date,
              odometer,
              fuel_type,
              liters,
              price_per_liter,
              total_amount,
              station_name,
              receipt_number,
              receipt_document_id,
              is_full_tank,
              notes
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
            ",
            params![
                id,
                fuel_log.vehicle_id,
                fuel_log.fuel_date,
                fuel_log.odometer,
                fuel_log.fuel_type,
                fuel_log.liters,
                fuel_log.price_per_liter,
                fuel_log.total_amount,
                fuel_log.station_name,
                fuel_log.receipt_number,
                fuel_log.receipt_document_id,
                bool_to_int(fuel_log.is_full_tank),
                fuel_log.notes
            ],
        )
        .map_err(|_| "Could not save the fuel log.".to_string())?;

    mark_receipt_linked(
        &transaction,
        fuel_log.receipt_document_id.as_deref(),
        &fuel_log.vehicle_id,
        &id,
    )?;
    update_vehicle_odometer_if_higher(&transaction, &fuel_log.vehicle_id, fuel_log.odometer)?;

    transaction
        .commit()
        .map_err(|_| "Could not finish saving the fuel log.".to_string())?;

    recalculate_efficiency_for_vehicle(connection, &fuel_log.vehicle_id)?;
    refresh_fuel_efficiency_alert_for_vehicle(connection, &fuel_log.vehicle_id)?;

    get_fuel_log(connection, &id)?.ok_or_else(|| "Could not read the saved fuel log.".to_string())
}

pub fn update_fuel_log(
    connection: &mut Connection,
    id: &str,
    request: FuelLogMutationRequest,
) -> Result<FuelLogRecord, String> {
    let existing =
        get_fuel_log(connection, id)?.ok_or_else(|| "Fuel log was not found.".to_string())?;
    let fuel_log = normalize_fuel_log_request(request)?;

    if existing.vehicle_id != fuel_log.vehicle_id {
        return Err("Fuel log vehicle cannot be changed.".to_string());
    }

    ensure_receipt_belongs_to_vehicle(
        connection,
        fuel_log.receipt_document_id.as_deref(),
        &fuel_log.vehicle_id,
    )?;
    ensure_odometer_does_not_roll_back(
        connection,
        &fuel_log.vehicle_id,
        Some(id),
        fuel_log.odometer,
    )?;

    let transaction = connection
        .transaction()
        .map_err(|_| "Could not start updating the fuel log.".to_string())?;

    let updated_rows = transaction
        .execute(
            "
            UPDATE fuel_logs
            SET
              fuel_date = ?1,
              odometer = ?2,
              fuel_type = ?3,
              liters = ?4,
              price_per_liter = ?5,
              total_amount = ?6,
              station_name = ?7,
              receipt_number = ?8,
              receipt_document_id = ?9,
              is_full_tank = ?10,
              notes = ?11,
              updated_at = datetime('now')
            WHERE id = ?12
              AND deleted_at IS NULL
            ",
            params![
                fuel_log.fuel_date,
                fuel_log.odometer,
                fuel_log.fuel_type,
                fuel_log.liters,
                fuel_log.price_per_liter,
                fuel_log.total_amount,
                fuel_log.station_name,
                fuel_log.receipt_number,
                fuel_log.receipt_document_id,
                bool_to_int(fuel_log.is_full_tank),
                fuel_log.notes,
                id
            ],
        )
        .map_err(|_| "Could not update the fuel log.".to_string())?;

    if updated_rows == 0 {
        return Err("Fuel log was not found.".to_string());
    }

    mark_receipt_linked(
        &transaction,
        fuel_log.receipt_document_id.as_deref(),
        &fuel_log.vehicle_id,
        id,
    )?;
    update_vehicle_odometer_if_higher(&transaction, &fuel_log.vehicle_id, fuel_log.odometer)?;

    transaction
        .commit()
        .map_err(|_| "Could not finish updating the fuel log.".to_string())?;

    recalculate_efficiency_for_vehicle(connection, &fuel_log.vehicle_id)?;
    refresh_fuel_efficiency_alert_for_vehicle(connection, &fuel_log.vehicle_id)?;

    get_fuel_log(connection, id)?.ok_or_else(|| "Could not read the updated fuel log.".to_string())
}

pub fn archive_fuel_log(connection: &Connection, id: &str) -> Result<(), String> {
    let existing = get_fuel_log(connection, id)?
        .ok_or_else(|| "Fuel log was not found or is already archived.".to_string())?;

    let updated_rows = connection
        .execute(
            "
            UPDATE fuel_logs
            SET
              deleted_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![id],
        )
        .map_err(|_| "Could not archive the fuel log.".to_string())?;

    if updated_rows == 0 {
        return Err("Fuel log was not found or is already archived.".to_string());
    }

    recalculate_efficiency_for_vehicle(connection, &existing.vehicle_id)?;
    refresh_fuel_efficiency_alert_for_vehicle(connection, &existing.vehicle_id)
}

pub fn fuel_efficiency_summary_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<FuelEfficiencySummaryRecord, String> {
    ensure_vehicle_exists(connection, vehicle_id)?;

    let official_logs = official_efficiency_logs(connection, vehicle_id)?;
    let latest = official_logs.first().map(|(_, value)| *value);
    let recent_average = if official_logs.len() >= 4 {
        Some(
            official_logs[1..4]
                .iter()
                .map(|(_, value)| *value)
                .sum::<f64>()
                / 3.0,
        )
    } else {
        None
    };
    let efficiency_drop_detected = match (latest, recent_average) {
        (Some(latest), Some(average)) => latest < average * 0.8,
        _ => false,
    };

    let warning = if efficiency_drop_detected {
        Some(
            "Latest official fuel efficiency is more than 20% below the recent average."
                .to_string(),
        )
    } else if official_logs.len() < 2 {
        Some(
            "Add at least two full-tank fuel logs to calculate official fuel efficiency."
                .to_string(),
        )
    } else {
        None
    };

    Ok(FuelEfficiencySummaryRecord {
        vehicle_id: vehicle_id.to_string(),
        official_log_count: official_logs.len(),
        latest_km_per_liter: latest,
        recent_average_km_per_liter: recent_average,
        efficiency_drop_detected,
        warning,
    })
}

pub fn normalize_fuel_log_request(
    request: FuelLogMutationRequest,
) -> Result<NormalizedFuelLogMutation, String> {
    let vehicle_id = required_trimmed(request.vehicle_id, "Choose a vehicle before saving.")?;
    let fuel_date = required_trimmed(request.fuel_date, "Fuel date is required.")?;
    let fuel_type = normalize_choice(request.fuel_type, VALID_FUEL_LOG_TYPES, "fuel type")?;

    if !request.odometer.is_finite() {
        return Err("Odometer must be a valid number.".to_string());
    }

    if request.odometer < 0.0 {
        return Err("Odometer cannot be negative.".to_string());
    }

    if !request.liters.is_finite() {
        return Err("Fuel liters must be a valid number.".to_string());
    }

    if request.liters <= 0.0 {
        return Err("Fuel liters must be greater than zero.".to_string());
    }

    let price_per_liter = match request.price_per_liter {
        Some(value) if !value.is_finite() => {
            return Err("Price per liter must be a valid number.".to_string())
        }
        Some(value) if value < 0.0 => return Err("Price per liter cannot be negative.".to_string()),
        value => value,
    };

    let total_amount = match request.total_amount {
        Some(value) if !value.is_finite() => {
            return Err("Total amount must be a valid number.".to_string())
        }
        Some(value) if value < 0.0 => return Err("Total amount cannot be negative.".to_string()),
        Some(value) => value,
        None => price_per_liter
            .map(|price| price * request.liters)
            .ok_or_else(|| "Enter total amount or price per liter.".to_string())?,
    };

    let price_per_liter = price_per_liter.or_else(|| Some(total_amount / request.liters));

    Ok(NormalizedFuelLogMutation {
        vehicle_id,
        fuel_date,
        odometer: request.odometer,
        fuel_type,
        liters: request.liters,
        price_per_liter,
        total_amount,
        station_name: trim_optional(request.station_name),
        receipt_number: trim_optional(request.receipt_number),
        receipt_document_id: trim_optional(request.receipt_document_id),
        is_full_tank: request.is_full_tank,
        notes: trim_optional(request.notes),
    })
}

fn recalculate_efficiency_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<(), String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              odometer,
              fuel_type,
              liters,
              total_amount,
              is_full_tank
            FROM fuel_logs
            WHERE vehicle_id = ?1
              AND deleted_at IS NULL
            ORDER BY odometer ASC, fuel_date ASC, created_at ASC
            ",
        )
        .map_err(|_| "Could not prepare fuel efficiency recalculation.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], |row| {
            Ok(FuelLogCalculationSource {
                id: row.get(0)?,
                odometer: row.get(1)?,
                fuel_type: row.get(2)?,
                liters: row.get(3)?,
                total_amount: row.get(4)?,
                is_full_tank: int_to_bool(row.get(5)?),
            })
        })
        .map_err(|_| "Could not read fuel logs for recalculation.".to_string())?;
    let logs = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse fuel logs for recalculation.".to_string())?;

    let mut previous_full_tank: Option<FullTankCheckpoint> = None;

    for log in logs {
        let mut status = "not_computed".to_string();
        let mut km_per_liter = None;
        let mut liters_per_100km = None;
        let mut cost_per_km = None;

        if log.is_full_tank && !is_def_adblue(&log.fuel_type) {
            if let Some(previous) = &previous_full_tank {
                let distance = log.odometer - previous.odometer;

                if distance > 0.0 && log.liters > 0.0 {
                    status = "official".to_string();
                    km_per_liter = Some(distance / log.liters);
                    liters_per_100km = Some((log.liters / distance) * 100.0);
                    cost_per_km = Some(log.total_amount / distance);
                }
            }

            previous_full_tank = Some(FullTankCheckpoint {
                odometer: log.odometer,
            });
        }

        connection
            .execute(
                "
                UPDATE fuel_logs
                SET
                  efficiency_status = ?1,
                  computed_km_per_liter = ?2,
                  computed_l_per_100km = ?3,
                  computed_cost_per_km = ?4,
                  updated_at = datetime('now')
                WHERE id = ?5
                ",
                params![status, km_per_liter, liters_per_100km, cost_per_km, log.id],
            )
            .map_err(|_| "Could not update fuel efficiency calculations.".to_string())?;
    }

    Ok(())
}

fn refresh_fuel_efficiency_alert_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<(), String> {
    let summary = fuel_efficiency_summary_for_vehicle(connection, vehicle_id)?;
    let latest_official_log = official_efficiency_logs(connection, vehicle_id)?
        .into_iter()
        .next()
        .map(|(id, _)| id);

    if summary.efficiency_drop_detected {
        let alert_id = active_fuel_efficiency_alert_id(connection, vehicle_id)?;
        let title = "Fuel efficiency drop detected";
        let message = match (
            summary.latest_km_per_liter,
            summary.recent_average_km_per_liter,
        ) {
            (Some(latest), Some(average)) => format!(
                "Latest official fuel efficiency is {:.2} km/L, below the recent {:.2} km/L average.",
                latest, average
            ),
            _ => "Latest official fuel efficiency is below the recent average.".to_string(),
        };

        match alert_id {
            Some(alert_id) => {
                connection
                    .execute(
                        "
                        UPDATE alerts
                        SET
                          priority = 'medium',
                          title = ?1,
                          message = ?2,
                          related_record_type = 'fuel_log',
                          related_record_id = ?3,
                          updated_at = datetime('now')
                        WHERE id = ?4
                        ",
                        params![title, message, latest_official_log, alert_id],
                    )
                    .map_err(|_| "Could not update the fuel efficiency alert.".to_string())?;
            }
            None => {
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
                        VALUES (?1, ?2, 'fuel_efficiency_drop', 'medium', ?3, ?4, 'fuel_log', ?5, 'active')
                        ",
                        params![
                            generate_local_id("alert"),
                            vehicle_id,
                            title,
                            message,
                            latest_official_log
                        ],
                    )
                    .map_err(|_| "Could not create the fuel efficiency alert.".to_string())?;
            }
        }
    } else {
        connection
            .execute(
                "
                UPDATE alerts
                SET
                  status = 'resolved',
                  resolved_at = datetime('now'),
                  updated_at = datetime('now')
                WHERE vehicle_id = ?1
                  AND alert_type = 'fuel_efficiency_drop'
                  AND status = 'active'
                  AND deleted_at IS NULL
                ",
                params![vehicle_id],
            )
            .map_err(|_| "Could not resolve old fuel efficiency alerts.".to_string())?;
    }

    Ok(())
}

fn active_fuel_efficiency_alert_id(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Option<String>, String> {
    connection
        .query_row(
            "
            SELECT id
            FROM alerts
            WHERE vehicle_id = ?1
              AND alert_type = 'fuel_efficiency_drop'
              AND status = 'active'
              AND deleted_at IS NULL
            LIMIT 1
            ",
            params![vehicle_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| "Could not check existing fuel efficiency alerts.".to_string())
}

fn official_efficiency_logs(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<(String, f64)>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, computed_km_per_liter
            FROM fuel_logs
            WHERE vehicle_id = ?1
              AND deleted_at IS NULL
              AND efficiency_status = 'official'
              AND computed_km_per_liter IS NOT NULL
            ORDER BY fuel_date DESC, odometer DESC, created_at DESC
            ",
        )
        .map_err(|_| "Could not prepare fuel efficiency summary.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|_| "Could not read fuel efficiency summary.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse fuel efficiency summary.".to_string())
}

fn get_fuel_receipt(
    connection: &Connection,
    id: &str,
) -> Result<Option<FuelReceiptRecord>, String> {
    connection
        .query_row(
            "
            SELECT
              id,
              vehicle_id,
              file_path,
              original_filename,
              description,
              created_at
            FROM vehicle_documents
            WHERE id = ?1
              AND document_type = 'fuel_receipt'
              AND deleted_at IS NULL
            ",
            params![id],
            receipt_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the fuel receipt record.".to_string())
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

fn ensure_receipt_belongs_to_vehicle(
    connection: &Connection,
    receipt_id: Option<&str>,
    vehicle_id: &str,
) -> Result<(), String> {
    let Some(receipt_id) = receipt_id else {
        return Ok(());
    };

    let receipt_vehicle_id = connection
        .query_row(
            "
            SELECT vehicle_id
            FROM vehicle_documents
            WHERE id = ?1
              AND document_type = 'fuel_receipt'
              AND deleted_at IS NULL
            ",
            params![receipt_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|_| "Could not check the selected receipt.".to_string())?;

    match receipt_vehicle_id {
        Some(receipt_vehicle_id) if receipt_vehicle_id == vehicle_id => Ok(()),
        Some(_) => Err("Choose a receipt saved for the selected vehicle.".to_string()),
        None => Err("Choose a saved receipt before linking it.".to_string()),
    }
}

fn ensure_odometer_does_not_roll_back(
    connection: &Connection,
    vehicle_id: &str,
    exclude_id: Option<&str>,
    odometer: f64,
) -> Result<(), String> {
    let latest_odometer: Option<f64> = connection
        .query_row(
            "
            SELECT MAX(odometer)
            FROM fuel_logs
            WHERE vehicle_id = ?1
              AND deleted_at IS NULL
              AND (?2 IS NULL OR id != ?2)
            ",
            params![vehicle_id, exclude_id],
            |row| row.get(0),
        )
        .map_err(|_| "Could not check the previous fuel odometer reading.".to_string())?;

    if let Some(latest_odometer) = latest_odometer {
        if odometer < latest_odometer {
            return Err(format!(
                "Odometer is lower than the latest fuel log reading ({latest_odometer:.0} km)."
            ));
        }
    }

    Ok(())
}

fn mark_receipt_linked(
    connection: &Connection,
    receipt_id: Option<&str>,
    vehicle_id: &str,
    fuel_log_id: &str,
) -> Result<(), String> {
    let Some(receipt_id) = receipt_id else {
        return Ok(());
    };

    let updated_rows = connection
        .execute(
            "
            UPDATE vehicle_documents
            SET
              related_record_type = 'fuel_log',
              related_record_id = ?1
            WHERE id = ?2
              AND vehicle_id = ?3
              AND document_type = 'fuel_receipt'
              AND deleted_at IS NULL
            ",
            params![fuel_log_id, receipt_id, vehicle_id],
        )
        .map_err(|_| "Could not link the receipt to the fuel log.".to_string())?;

    if updated_rows == 0 {
        return Err("Choose a saved receipt before linking it.".to_string());
    }

    Ok(())
}

fn update_vehicle_odometer_if_higher(
    connection: &Connection,
    vehicle_id: &str,
    odometer: f64,
) -> Result<(), String> {
    connection
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
            params![odometer, vehicle_id],
        )
        .map_err(|_| "Could not update the vehicle odometer.".to_string())?;

    Ok(())
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

fn normalize_choice(value: String, valid_values: &[&str], label: &str) -> Result<String, String> {
    let normalized = value.trim().to_ascii_lowercase();
    valid_values
        .contains(&normalized.as_str())
        .then_some(normalized)
        .ok_or_else(|| format!("Choose a valid {label}."))
}

fn is_def_adblue(fuel_type: &str) -> bool {
    fuel_type == "def_adblue"
}

fn fuel_type_warnings(vehicle_fuel_type: &str, fuel_type: &str) -> Vec<FuelTypeWarningRecord> {
    let mut warnings = Vec::new();

    if is_def_adblue(fuel_type) {
        warnings.push(FuelTypeWarningRecord {
            code: "def_adblue_not_fuel".to_string(),
            severity: "warning".to_string(),
            message: "DEF/AdBlue is saved as a fluid entry and is not counted as diesel fuel consumption.".to_string(),
        });
    }

    if !fuel_type_is_compatible(vehicle_fuel_type, fuel_type) {
        warnings.push(FuelTypeWarningRecord {
            code: "fuel_type_mismatch".to_string(),
            severity: "warning".to_string(),
            message: "Fuel type does not match the selected vehicle. Confirm before saving."
                .to_string(),
        });
    }

    warnings
}

fn fuel_type_is_compatible(vehicle_fuel_type: &str, fuel_type: &str) -> bool {
    match vehicle_fuel_type {
        "gasoline" => fuel_type == "gasoline",
        "diesel" => fuel_type == "diesel" || fuel_type == "def_adblue",
        "hybrid_gasoline" => fuel_type == "hybrid_gasoline" || fuel_type == "gasoline",
        "hybrid_diesel" => {
            fuel_type == "hybrid_diesel" || fuel_type == "diesel" || fuel_type == "def_adblue"
        }
        "full_ev" => fuel_type == "full_ev",
        "other" => true,
        _ => vehicle_fuel_type == fuel_type,
    }
}

fn efficiency_reason(status: &str, fuel_type: &str, is_full_tank: bool) -> String {
    if is_def_adblue(fuel_type) {
        return "DEF/AdBlue is not counted as diesel fuel consumption.".to_string();
    }

    if !is_full_tank {
        return "Partial tank saved; official fuel efficiency waits for full-tank entries."
            .to_string();
    }

    if status == "official" {
        return "Calculated between consecutive full-tank fuel logs.".to_string();
    }

    "Waiting for another valid full-tank fuel log before calculating official efficiency."
        .to_string()
}

fn receipt_from_row(row: &Row<'_>) -> rusqlite::Result<FuelReceiptRecord> {
    let description: Option<String> = row.get(4)?;

    Ok(FuelReceiptRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        file_path: row.get(2)?,
        original_filename: row.get(3)?,
        file_size_bytes: parse_file_size_from_description(description.as_deref()),
        created_at: row.get(5)?,
    })
}

fn parse_file_size_from_description(description: Option<&str>) -> i64 {
    description
        .and_then(|description| {
            description
                .split_whitespace()
                .find_map(|part| part.parse().ok())
        })
        .unwrap_or_default()
}

const FUEL_LOG_SELECT: &str = "
    SELECT
      fuel_logs.id,
      fuel_logs.vehicle_id,
      vehicles.vehicle_name,
      vehicles.fuel_type AS vehicle_fuel_type,
      fuel_logs.fuel_date,
      fuel_logs.odometer,
      fuel_logs.fuel_type,
      fuel_logs.liters,
      fuel_logs.price_per_liter,
      fuel_logs.total_amount,
      fuel_logs.station_name,
      fuel_logs.receipt_number,
      fuel_logs.receipt_document_id,
      vehicle_documents.file_path AS receipt_file_path,
      vehicle_documents.original_filename AS receipt_original_filename,
      fuel_logs.is_full_tank,
      fuel_logs.efficiency_status,
      fuel_logs.computed_km_per_liter,
      fuel_logs.computed_l_per_100km,
      fuel_logs.computed_cost_per_km,
      fuel_logs.notes,
      fuel_logs.created_at,
      fuel_logs.updated_at
    FROM fuel_logs
    JOIN vehicles
      ON vehicles.id = fuel_logs.vehicle_id
    LEFT JOIN vehicle_documents
      ON vehicle_documents.id = fuel_logs.receipt_document_id
     AND vehicle_documents.deleted_at IS NULL
";

fn fuel_log_from_row(row: &Row<'_>) -> rusqlite::Result<FuelLogRecord> {
    let vehicle_fuel_type: String = row.get(3)?;
    let fuel_type: String = row.get(6)?;
    let is_full_tank = int_to_bool(row.get(15)?);
    let efficiency_status: String = row.get(16)?;

    Ok(FuelLogRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        vehicle_name: row.get(2)?,
        fuel_date: row.get(4)?,
        odometer: row.get(5)?,
        fuel_type: fuel_type.clone(),
        liters: row.get(7)?,
        price_per_liter: row.get(8)?,
        total_amount: row.get(9)?,
        station_name: row.get(10)?,
        receipt_number: row.get(11)?,
        receipt_document_id: row.get(12)?,
        receipt_file_path: row.get(13)?,
        receipt_original_filename: row.get(14)?,
        is_full_tank,
        efficiency_reason: efficiency_reason(&efficiency_status, &fuel_type, is_full_tank),
        efficiency_status,
        computed_km_per_liter: row.get(17)?,
        computed_l_per_100km: row.get(18)?,
        computed_cost_per_km: row.get(19)?,
        warnings: fuel_type_warnings(&vehicle_fuel_type, &fuel_type),
        notes: row.get(20)?,
        created_at: row.get(21)?,
        updated_at: row.get(22)?,
    })
}

fn bool_to_int(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn int_to_bool(value: i64) -> bool {
    value != 0
}

#[derive(Debug)]
struct FuelLogCalculationSource {
    id: String,
    odometer: f64,
    fuel_type: String,
    liters: f64,
    total_amount: f64,
    is_full_tank: bool,
}

#[derive(Debug)]
struct FullTankCheckpoint {
    odometer: f64,
}

const VALID_FUEL_LOG_TYPES: &[&str] = &[
    "gasoline",
    "diesel",
    "hybrid_gasoline",
    "hybrid_diesel",
    "full_ev",
    "def_adblue",
    "other",
];

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::TempDir;

    use crate::db;

    use super::*;

    fn setup_database() -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("fuel.sqlite3");
        db::initialize_database_at_path(&database_path).expect("database should initialize");
        let connection = db::open_database_at_path(&database_path).expect("database should open");

        (temp_dir, connection)
    }

    fn insert_vehicle(connection: &Connection, id: &str, fuel_type: &str, odometer: f64) {
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
                VALUES (?1, ?2, 'van', ?3, 'automatic', 'fwd', ?4, 'active')
                ",
                params![id, format!("Vehicle {id}"), fuel_type, odometer],
            )
            .expect("vehicle should insert");
    }

    fn request(
        vehicle_id: &str,
        fuel_date: &str,
        odometer: f64,
        liters: f64,
        is_full_tank: bool,
    ) -> FuelLogMutationRequest {
        FuelLogMutationRequest {
            vehicle_id: vehicle_id.to_string(),
            fuel_date: fuel_date.to_string(),
            odometer,
            fuel_type: "diesel".to_string(),
            liters,
            price_per_liter: Some(70.0),
            total_amount: None,
            station_name: Some("  Local station  ".to_string()),
            receipt_number: None,
            receipt_document_id: None,
            is_full_tank,
            notes: None,
        }
    }

    #[test]
    fn creates_lists_updates_and_archives_fuel_logs() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "diesel", 1_000.0);

        let created = create_fuel_log(
            &mut connection,
            request("vehicle-1", "2026-01-01T08:00", 1_100.0, 20.0, true),
        )
        .expect("fuel log should save");
        assert_eq!(created.station_name.as_deref(), Some("Local station"));
        assert_eq!(created.total_amount, 1400.0);

        let listed = list_fuel_logs_for_vehicle(&connection, "vehicle-1").expect("logs list");
        assert_eq!(listed.len(), 1);

        let updated = update_fuel_log(
            &mut connection,
            &created.id,
            FuelLogMutationRequest {
                liters: 22.0,
                total_amount: Some(1540.0),
                ..request("vehicle-1", "2026-01-02T08:00", 1_120.0, 22.0, false)
            },
        )
        .expect("fuel log should update");
        assert_eq!(updated.liters, 22.0);
        assert_eq!(updated.efficiency_status, "not_computed");

        archive_fuel_log(&connection, &created.id).expect("fuel log archives");
        let listed = list_fuel_logs_for_vehicle(&connection, "vehicle-1").expect("logs list");
        assert!(listed.is_empty());
    }

    #[test]
    fn odometer_cannot_go_backwards() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "diesel", 1_000.0);

        create_fuel_log(
            &mut connection,
            request("vehicle-1", "2026-01-01T08:00", 1_500.0, 20.0, true),
        )
        .expect("first log should save");

        let error = create_fuel_log(
            &mut connection,
            request("vehicle-1", "2026-01-02T08:00", 1_400.0, 20.0, true),
        )
        .expect_err("lower odometer should fail");
        assert!(error.contains("Odometer"));
    }

    #[test]
    fn full_tank_rule_controls_official_efficiency() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "diesel", 1_000.0);

        let partial = create_fuel_log(
            &mut connection,
            request("vehicle-1", "2026-01-01T08:00", 1_100.0, 10.0, false),
        )
        .expect("partial log should save");
        assert_eq!(partial.efficiency_status, "not_computed");

        let first_full = create_fuel_log(
            &mut connection,
            request("vehicle-1", "2026-01-02T08:00", 1_200.0, 20.0, true),
        )
        .expect("first full tank should save");
        assert_eq!(first_full.efficiency_status, "not_computed");

        let second_full = create_fuel_log(
            &mut connection,
            request("vehicle-1", "2026-01-03T08:00", 1_500.0, 30.0, true),
        )
        .expect("second full tank should save");
        assert_eq!(second_full.efficiency_status, "official");
        assert_eq!(second_full.computed_km_per_liter, Some(10.0));
        assert_eq!(second_full.computed_cost_per_km, Some(7.0));
    }

    #[test]
    fn def_adblue_does_not_compute_official_diesel_efficiency() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "diesel", 1_000.0);

        create_fuel_log(
            &mut connection,
            request("vehicle-1", "2026-01-01T08:00", 1_200.0, 20.0, true),
        )
        .expect("first full tank should save");
        let def_log = create_fuel_log(
            &mut connection,
            FuelLogMutationRequest {
                fuel_type: "def_adblue".to_string(),
                ..request("vehicle-1", "2026-01-02T08:00", 1_500.0, 8.0, true)
            },
        )
        .expect("def log should save");

        assert_eq!(def_log.efficiency_status, "not_computed");
        assert!(def_log
            .warnings
            .iter()
            .any(|warning| warning.code == "def_adblue_not_fuel"));
    }

    #[test]
    fn fuel_type_mismatch_returns_warning() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "diesel", 1_000.0);

        let log = create_fuel_log(
            &mut connection,
            FuelLogMutationRequest {
                fuel_type: "gasoline".to_string(),
                ..request("vehicle-1", "2026-01-01T08:00", 1_100.0, 20.0, true)
            },
        )
        .expect("fuel log should save with warning");

        assert!(log
            .warnings
            .iter()
            .any(|warning| warning.code == "fuel_type_mismatch"));
    }

    #[test]
    fn receipt_record_is_stored_and_linked_to_fuel_log() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "diesel", 1_000.0);

        let receipt = insert_fuel_receipt(
            &connection,
            NewFuelReceipt {
                id: "receipt-1".to_string(),
                vehicle_id: "vehicle-1".to_string(),
                file_path: "C:/tmp/receipt-1.pdf".to_string(),
                original_filename: Some("receipt.pdf".to_string()),
                file_size_bytes: 123,
            },
        )
        .expect("receipt should insert");
        let log = create_fuel_log(
            &mut connection,
            FuelLogMutationRequest {
                receipt_document_id: Some(receipt.id.clone()),
                ..request("vehicle-1", "2026-01-01T08:00", 1_100.0, 20.0, true)
            },
        )
        .expect("fuel log should save");

        assert_eq!(
            log.receipt_document_id.as_deref(),
            Some(receipt.id.as_str())
        );
        assert_eq!(
            log.receipt_original_filename.as_deref(),
            Some("receipt.pdf")
        );
    }

    #[test]
    fn efficiency_drop_summary_detects_conservative_drop() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "diesel", 1_000.0);

        for (index, odometer) in [1_000.0, 1_300.0, 1_600.0, 1_900.0, 2_050.0]
            .iter()
            .enumerate()
        {
            create_fuel_log(
                &mut connection,
                request(
                    "vehicle-1",
                    &format!("2026-01-0{}T08:00", index + 1),
                    *odometer,
                    30.0,
                    true,
                ),
            )
            .expect("fuel log should save");
        }

        let summary =
            fuel_efficiency_summary_for_vehicle(&connection, "vehicle-1").expect("summary loads");
        assert!(summary.efficiency_drop_detected);

        let active_alert_count: i64 = connection
            .query_row(
                "
                SELECT COUNT(*)
                FROM alerts
                WHERE vehicle_id = 'vehicle-1'
                  AND alert_type = 'fuel_efficiency_drop'
                  AND status = 'active'
                ",
                [],
                |row| row.get(0),
            )
            .expect("alert count should query");
        assert_eq!(active_alert_count, 1);
    }
}

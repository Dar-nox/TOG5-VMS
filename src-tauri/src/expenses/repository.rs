use std::collections::BTreeMap;

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::vehicles::photo_storage::generate_local_id;

use super::models::{
    CategoryTotalRecord, CostEventRecord, ExpenseListFilter, ExpenseMutationRequest, ExpenseRecord,
    ExpenseSummaryReport, MonthlyTotalRecord, NormalizedExpenseMutation, ReportFilter,
    ReportsOverview, VehicleCostReport, VehicleCostSummaryRecord,
};

const SOURCE_RECORD_TYPES: &[&str] = &["fuel_log", "maintenance_log", "repair_record"];
const VALID_RELATED_RECORD_TYPES: &[&str] =
    &["fuel_log", "maintenance_log", "repair_record", "other"];

pub fn list_expenses(
    connection: &Connection,
    filter: Option<ExpenseListFilter>,
) -> Result<Vec<ExpenseRecord>, String> {
    let filter = normalize_expense_filter(filter)?;
    let mut statement = connection
        .prepare(&format!(
            "
            {EXPENSE_SELECT}
            WHERE expenses.deleted_at IS NULL
              AND (?1 IS NULL OR expenses.vehicle_id = ?1)
              AND (?2 IS NULL OR expenses.category = ?2)
              AND (?3 IS NULL OR date(expenses.expense_date) >= date(?3))
              AND (?4 IS NULL OR date(expenses.expense_date) <= date(?4))
            ORDER BY expenses.expense_date DESC, expenses.created_at DESC
            "
        ))
        .map_err(|_| "Could not prepare the expense list.".to_string())?;

    let rows = statement
        .query_map(
            params![
                filter.vehicle_id,
                filter.category,
                filter.start_date,
                filter.end_date
            ],
            expense_from_row,
        )
        .map_err(|_| "Could not read expenses.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse expenses.".to_string())
}

pub fn list_expenses_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Vec<ExpenseRecord>, String> {
    ensure_vehicle_exists(connection, vehicle_id)?;
    list_expenses(
        connection,
        Some(ExpenseListFilter {
            vehicle_id: Some(vehicle_id.to_string()),
            category: None,
            start_date: None,
            end_date: None,
        }),
    )
}

pub fn get_expense(connection: &Connection, id: &str) -> Result<Option<ExpenseRecord>, String> {
    connection
        .query_row(
            &format!(
                "
                {EXPENSE_SELECT}
                WHERE expenses.id = ?1
                  AND expenses.deleted_at IS NULL
                "
            ),
            params![id],
            expense_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the selected expense.".to_string())
}

pub fn create_expense(
    connection: &Connection,
    request: ExpenseMutationRequest,
) -> Result<ExpenseRecord, String> {
    let expense = normalize_expense_request(request)?;
    ensure_vehicle_exists(connection, &expense.vehicle_id)?;
    ensure_receipt_belongs_to_vehicle(
        connection,
        expense.receipt_document_id.as_deref(),
        &expense.vehicle_id,
    )?;
    ensure_related_record_matches_vehicle(
        connection,
        expense.related_record_type.as_deref(),
        expense.related_record_id.as_deref(),
        &expense.vehicle_id,
    )?;

    let id = generate_local_id("expense");
    connection
        .execute(
            "
            INSERT INTO expenses (
              id,
              vehicle_id,
              expense_date,
              category,
              description,
              amount,
              receipt_document_id,
              related_record_type,
              related_record_id,
              notes
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ",
            params![
                id,
                expense.vehicle_id,
                expense.expense_date,
                expense.category,
                expense.description,
                expense.amount,
                expense.receipt_document_id,
                expense.related_record_type,
                expense.related_record_id,
                expense.notes
            ],
        )
        .map_err(|_| "Could not save the expense.".to_string())?;

    get_expense(connection, &id)?.ok_or_else(|| "Could not read the saved expense.".to_string())
}

pub fn update_expense(
    connection: &Connection,
    id: &str,
    request: ExpenseMutationRequest,
) -> Result<ExpenseRecord, String> {
    let existing =
        get_expense(connection, id)?.ok_or_else(|| "Expense was not found.".to_string())?;
    let expense = normalize_expense_request(request)?;
    ensure_vehicle_exists(connection, &expense.vehicle_id)?;
    ensure_receipt_belongs_to_vehicle(
        connection,
        expense.receipt_document_id.as_deref(),
        &expense.vehicle_id,
    )?;
    ensure_related_record_matches_vehicle(
        connection,
        expense.related_record_type.as_deref(),
        expense.related_record_id.as_deref(),
        &expense.vehicle_id,
    )?;

    if let Some(existing_vehicle_id) = existing.vehicle_id {
        if existing_vehicle_id != expense.vehicle_id {
            return Err("Expense vehicle cannot be changed after saving.".to_string());
        }
    }

    let updated_rows = connection
        .execute(
            "
            UPDATE expenses
            SET
              expense_date = ?1,
              category = ?2,
              description = ?3,
              amount = ?4,
              receipt_document_id = ?5,
              related_record_type = ?6,
              related_record_id = ?7,
              notes = ?8,
              updated_at = datetime('now')
            WHERE id = ?9
              AND deleted_at IS NULL
            ",
            params![
                expense.expense_date,
                expense.category,
                expense.description,
                expense.amount,
                expense.receipt_document_id,
                expense.related_record_type,
                expense.related_record_id,
                expense.notes,
                id
            ],
        )
        .map_err(|_| "Could not update the expense.".to_string())?;

    if updated_rows == 0 {
        return Err("Expense was not found.".to_string());
    }

    get_expense(connection, id)?.ok_or_else(|| "Could not read the updated expense.".to_string())
}

pub fn archive_expense(connection: &Connection, id: &str) -> Result<(), String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE expenses
            SET
              deleted_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![id],
        )
        .map_err(|_| "Could not archive the expense.".to_string())?;

    if updated_rows == 0 {
        return Err("Expense was not found or is already archived.".to_string());
    }

    Ok(())
}

pub fn expense_summary(
    connection: &Connection,
    filter: Option<ExpenseListFilter>,
) -> Result<ExpenseSummaryReport, String> {
    let expenses = list_expenses(connection, filter)?;
    let direct_expense_total = sum_amounts(expenses.iter().map(|expense| expense.amount));
    let linked_expense_total = sum_amounts(
        expenses
            .iter()
            .filter(|expense| is_source_linked_expense(expense))
            .map(|expense| expense.amount),
    );
    let manual_expense_total = sum_amounts(
        expenses
            .iter()
            .filter(|expense| !is_source_linked_expense(expense))
            .map(|expense| expense.amount),
    );

    Ok(ExpenseSummaryReport {
        direct_expense_total,
        manual_expense_total,
        linked_expense_total,
        expense_count: expenses.len() as i64,
        category_totals: category_totals_from_expenses(&expenses),
        monthly_totals: monthly_totals_from_expenses(&expenses),
        recent_expenses: expenses.into_iter().take(8).collect(),
    })
}

pub fn reports_overview(
    connection: &Connection,
    filter: Option<ReportFilter>,
) -> Result<ReportsOverview, String> {
    let filter = normalize_report_filter(filter)?;
    let events = combined_cost_events(connection, &filter)?;
    let direct_expenses = list_expenses(
        connection,
        Some(ExpenseListFilter {
            vehicle_id: filter.vehicle_id.clone(),
            category: None,
            start_date: filter.start_date.clone(),
            end_date: filter.end_date.clone(),
        }),
    )?;

    let fuel_total = source_total(&events, "fuel_log");
    let maintenance_total = source_total(&events, "maintenance_log");
    let repair_total = source_total(&events, "repair_record");
    let manual_expense_total = source_total(&events, "expense");
    let linked_expense_total = sum_amounts(
        direct_expenses
            .iter()
            .filter(|expense| is_source_linked_expense(expense))
            .map(|expense| expense.amount),
    );
    let direct_expense_total = sum_amounts(direct_expenses.iter().map(|expense| expense.amount));
    let total_tracked_cost = fuel_total + maintenance_total + repair_total + manual_expense_total;

    Ok(ReportsOverview {
        total_tracked_cost,
        fuel_total,
        maintenance_total,
        repair_total,
        manual_expense_total,
        direct_expense_total,
        linked_expense_total,
        category_totals: category_totals_from_events(&events),
        monthly_totals: monthly_totals_from_events(&events),
        vehicle_summaries: vehicle_cost_summaries(connection, &filter, &events)?,
        recent_cost_events: recent_events(events, 10),
    })
}

pub fn vehicle_cost_report(
    connection: &Connection,
    vehicle_id: &str,
    filter: Option<ReportFilter>,
) -> Result<VehicleCostReport, String> {
    ensure_vehicle_exists(connection, vehicle_id)?;
    let mut filter = normalize_report_filter(filter)?;
    filter.vehicle_id = Some(vehicle_id.to_string());

    let events = combined_cost_events(connection, &filter)?;
    let vehicle = vehicle_cost_summaries(connection, &filter, &events)?
        .into_iter()
        .next()
        .ok_or_else(|| "Vehicle was not found.".to_string())?;

    Ok(VehicleCostReport {
        vehicle,
        category_totals: category_totals_from_events(&events),
        monthly_totals: monthly_totals_from_events(&events),
        recent_cost_events: recent_events(events, 10),
    })
}

fn combined_cost_events(
    connection: &Connection,
    filter: &ReportFilter,
) -> Result<Vec<CostEventRecord>, String> {
    let mut events = Vec::new();
    events.extend(fuel_cost_events(connection, filter)?);
    events.extend(maintenance_cost_events(connection, filter)?);
    events.extend(repair_cost_events(connection, filter)?);
    events.extend(manual_expense_cost_events(connection, filter)?);
    events.sort_by(|left, right| {
        right
            .event_date
            .cmp(&left.event_date)
            .then_with(|| right.source_id.cmp(&left.source_id))
    });

    Ok(events)
}

fn fuel_cost_events(
    connection: &Connection,
    filter: &ReportFilter,
) -> Result<Vec<CostEventRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              fuel_logs.id,
              fuel_logs.vehicle_id,
              vehicles.vehicle_name,
              fuel_logs.fuel_date,
              fuel_logs.fuel_type,
              fuel_logs.total_amount
            FROM fuel_logs
            JOIN vehicles
              ON vehicles.id = fuel_logs.vehicle_id
            WHERE fuel_logs.deleted_at IS NULL
              AND vehicles.deleted_at IS NULL
              AND (?1 IS NULL OR fuel_logs.vehicle_id = ?1)
              AND (?2 IS NULL OR date(fuel_logs.fuel_date) >= date(?2))
              AND (?3 IS NULL OR date(fuel_logs.fuel_date) <= date(?3))
            ",
        )
        .map_err(|_| "Could not prepare fuel cost report.".to_string())?;

    let rows = statement
        .query_map(
            params![filter.vehicle_id, filter.start_date, filter.end_date],
            |row| {
                let fuel_type: String = row.get(4)?;
                Ok(CostEventRecord {
                    source_type: "fuel_log".to_string(),
                    source_id: row.get(0)?,
                    vehicle_id: Some(row.get(1)?),
                    vehicle_name: Some(row.get(2)?),
                    event_date: row.get(3)?,
                    category: "fuel".to_string(),
                    description: format!("Fuel log: {}", label_from_key(&fuel_type)),
                    amount: row.get(5)?,
                })
            },
        )
        .map_err(|_| "Could not read fuel cost report.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse fuel cost report.".to_string())
}

fn maintenance_cost_events(
    connection: &Connection,
    filter: &ReportFilter,
) -> Result<Vec<CostEventRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              maintenance_logs.id,
              maintenance_logs.vehicle_id,
              vehicles.vehicle_name,
              maintenance_logs.completed_date,
              COALESCE(maintenance_templates.name, 'Maintenance service'),
              maintenance_logs.total_cost
            FROM maintenance_logs
            JOIN vehicles
              ON vehicles.id = maintenance_logs.vehicle_id
            LEFT JOIN maintenance_templates
              ON maintenance_templates.id = maintenance_logs.template_id
            WHERE maintenance_logs.deleted_at IS NULL
              AND vehicles.deleted_at IS NULL
              AND (?1 IS NULL OR maintenance_logs.vehicle_id = ?1)
              AND (?2 IS NULL OR date(maintenance_logs.completed_date) >= date(?2))
              AND (?3 IS NULL OR date(maintenance_logs.completed_date) <= date(?3))
            ",
        )
        .map_err(|_| "Could not prepare maintenance cost report.".to_string())?;

    let rows = statement
        .query_map(
            params![filter.vehicle_id, filter.start_date, filter.end_date],
            |row| {
                Ok(CostEventRecord {
                    source_type: "maintenance_log".to_string(),
                    source_id: row.get(0)?,
                    vehicle_id: Some(row.get(1)?),
                    vehicle_name: Some(row.get(2)?),
                    event_date: row.get(3)?,
                    category: "preventive_maintenance".to_string(),
                    description: row.get(4)?,
                    amount: row.get(5)?,
                })
            },
        )
        .map_err(|_| "Could not read maintenance cost report.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse maintenance cost report.".to_string())
}

fn repair_cost_events(
    connection: &Connection,
    filter: &ReportFilter,
) -> Result<Vec<CostEventRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              repair_records.id,
              repair_records.vehicle_id,
              vehicles.vehicle_name,
              repair_records.repair_date,
              repair_records.issue_description,
              repair_records.total_cost
            FROM repair_records
            JOIN vehicles
              ON vehicles.id = repair_records.vehicle_id
            WHERE repair_records.deleted_at IS NULL
              AND vehicles.deleted_at IS NULL
              AND (?1 IS NULL OR repair_records.vehicle_id = ?1)
              AND (?2 IS NULL OR date(repair_records.repair_date) >= date(?2))
              AND (?3 IS NULL OR date(repair_records.repair_date) <= date(?3))
            ",
        )
        .map_err(|_| "Could not prepare repair cost report.".to_string())?;

    let rows = statement
        .query_map(
            params![filter.vehicle_id, filter.start_date, filter.end_date],
            |row| {
                Ok(CostEventRecord {
                    source_type: "repair_record".to_string(),
                    source_id: row.get(0)?,
                    vehicle_id: Some(row.get(1)?),
                    vehicle_name: Some(row.get(2)?),
                    event_date: row.get(3)?,
                    category: "repairs".to_string(),
                    description: row.get(4)?,
                    amount: row.get(5)?,
                })
            },
        )
        .map_err(|_| "Could not read repair cost report.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse repair cost report.".to_string())
}

fn manual_expense_cost_events(
    connection: &Connection,
    filter: &ReportFilter,
) -> Result<Vec<CostEventRecord>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              expenses.id,
              expenses.vehicle_id,
              vehicles.vehicle_name,
              expenses.expense_date,
              expenses.category,
              expenses.description,
              expenses.amount
            FROM expenses
            LEFT JOIN vehicles
              ON vehicles.id = expenses.vehicle_id
            WHERE expenses.deleted_at IS NULL
              AND (
                expenses.related_record_type IS NULL
                OR expenses.related_record_id IS NULL
                OR expenses.related_record_type NOT IN ('fuel_log', 'maintenance_log', 'repair_record')
              )
              AND (?1 IS NULL OR expenses.vehicle_id = ?1)
              AND (?2 IS NULL OR date(expenses.expense_date) >= date(?2))
              AND (?3 IS NULL OR date(expenses.expense_date) <= date(?3))
            ",
        )
        .map_err(|_| "Could not prepare manual expense report.".to_string())?;

    let rows = statement
        .query_map(
            params![filter.vehicle_id, filter.start_date, filter.end_date],
            |row| {
                Ok(CostEventRecord {
                    source_type: "expense".to_string(),
                    source_id: row.get(0)?,
                    vehicle_id: row.get(1)?,
                    vehicle_name: row.get(2)?,
                    event_date: row.get(3)?,
                    category: row.get(4)?,
                    description: row.get(5)?,
                    amount: row.get(6)?,
                })
            },
        )
        .map_err(|_| "Could not read manual expense report.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse manual expense report.".to_string())
}

fn vehicle_cost_summaries(
    connection: &Connection,
    filter: &ReportFilter,
    events: &[CostEventRecord],
) -> Result<Vec<VehicleCostSummaryRecord>, String> {
    let mut vehicles = list_report_vehicles(connection, filter.vehicle_id.as_deref())?;
    vehicles.sort_by(|left, right| left.vehicle_name.cmp(&right.vehicle_name));

    vehicles
        .into_iter()
        .filter(|vehicle| {
            filter.vehicle_id.is_some()
                || events
                    .iter()
                    .any(|event| event.vehicle_id.as_deref() == Some(vehicle.vehicle_id.as_str()))
        })
        .map(|vehicle| {
            let vehicle_events = events
                .iter()
                .filter(|event| event.vehicle_id.as_deref() == Some(vehicle.vehicle_id.as_str()));
            let fuel_total = sum_amounts(
                vehicle_events
                    .clone()
                    .filter(|event| event.source_type == "fuel_log")
                    .map(|event| event.amount),
            );
            let maintenance_total = sum_amounts(
                vehicle_events
                    .clone()
                    .filter(|event| event.source_type == "maintenance_log")
                    .map(|event| event.amount),
            );
            let repair_total = sum_amounts(
                vehicle_events
                    .clone()
                    .filter(|event| event.source_type == "repair_record")
                    .map(|event| event.amount),
            );
            let manual_expense_total = sum_amounts(
                vehicle_events
                    .clone()
                    .filter(|event| event.source_type == "expense")
                    .map(|event| event.amount),
            );
            let total_cost = fuel_total + maintenance_total + repair_total + manual_expense_total;
            let distance = cost_distance_for_vehicle(connection, &vehicle.vehicle_id, filter)?;
            let (cost_per_km, cost_per_km_reason) = match distance {
                Some(distance) if distance > 0.0 => (
                    Some(total_cost / distance),
                    format!(
                        "Calculated from {:.0} km of recorded odometer movement.",
                        distance
                    ),
                ),
                _ => (
                    None,
                    "Needs at least two cost records with different odometer readings.".to_string(),
                ),
            };
            let latest_official_km_per_liter =
                latest_official_efficiency(connection, &vehicle.vehicle_id)?;

            Ok(VehicleCostSummaryRecord {
                vehicle_id: vehicle.vehicle_id,
                vehicle_name: vehicle.vehicle_name,
                fuel_total,
                maintenance_total,
                repair_total,
                manual_expense_total,
                total_cost,
                distance_km: distance,
                cost_per_km,
                cost_per_km_reason,
                latest_official_km_per_liter,
            })
        })
        .collect()
}

fn list_report_vehicles(
    connection: &Connection,
    vehicle_id: Option<&str>,
) -> Result<Vec<ReportVehicle>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, vehicle_name
            FROM vehicles
            WHERE deleted_at IS NULL
              AND archived_at IS NULL
              AND (?1 IS NULL OR id = ?1)
            ORDER BY vehicle_name
            ",
        )
        .map_err(|_| "Could not prepare vehicle cost summaries.".to_string())?;

    let rows = statement
        .query_map(params![vehicle_id], |row| {
            Ok(ReportVehicle {
                vehicle_id: row.get(0)?,
                vehicle_name: row.get(1)?,
            })
        })
        .map_err(|_| "Could not read vehicle cost summaries.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse vehicle cost summaries.".to_string())
}

fn cost_distance_for_vehicle(
    connection: &Connection,
    vehicle_id: &str,
    filter: &ReportFilter,
) -> Result<Option<f64>, String> {
    let min_max: Option<(Option<f64>, Option<f64>)> = connection
        .query_row(
            "
            SELECT MIN(odometer), MAX(odometer)
            FROM (
              SELECT odometer, fuel_date AS event_date
              FROM fuel_logs
              WHERE vehicle_id = ?1
                AND deleted_at IS NULL
              UNION ALL
              SELECT odometer, completed_date AS event_date
              FROM maintenance_logs
              WHERE vehicle_id = ?1
                AND deleted_at IS NULL
              UNION ALL
              SELECT odometer, repair_date AS event_date
              FROM repair_records
              WHERE vehicle_id = ?1
                AND deleted_at IS NULL
                AND odometer IS NOT NULL
            )
            WHERE (?2 IS NULL OR date(event_date) >= date(?2))
              AND (?3 IS NULL OR date(event_date) <= date(?3))
            ",
            params![vehicle_id, filter.start_date, filter.end_date],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|_| "Could not calculate vehicle cost per km.".to_string())?;

    Ok(
        min_max.and_then(|(minimum, maximum)| match (minimum, maximum) {
            (Some(minimum), Some(maximum)) if maximum > minimum => Some(maximum - minimum),
            _ => None,
        }),
    )
}

fn latest_official_efficiency(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<Option<f64>, String> {
    connection
        .query_row(
            "
            SELECT computed_km_per_liter
            FROM fuel_logs
            WHERE vehicle_id = ?1
              AND efficiency_status = 'official'
              AND computed_km_per_liter IS NOT NULL
              AND deleted_at IS NULL
            ORDER BY fuel_date DESC, odometer DESC
            LIMIT 1
            ",
            params![vehicle_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| "Could not read latest fuel efficiency.".to_string())
}

fn normalize_expense_request(
    request: ExpenseMutationRequest,
) -> Result<NormalizedExpenseMutation, String> {
    let vehicle_id = required_trimmed(request.vehicle_id, "Choose a vehicle for the expense.")?;
    let expense_date = required_trimmed(request.expense_date, "Expense date is required.")?;
    let category = normalize_expense_category(request.category)?;
    let description = required_trimmed(request.description, "Expense description is required.")?;

    if !request.amount.is_finite() {
        return Err("Expense amount must be a valid number.".to_string());
    }

    if request.amount < 0.0 {
        return Err("Expense amount cannot be negative.".to_string());
    }

    let related_record_type = match trim_optional(request.related_record_type) {
        Some(record_type) => Some(normalize_choice(
            record_type,
            VALID_RELATED_RECORD_TYPES,
            "related record type",
        )?),
        None => None,
    };
    let related_record_id = trim_optional(request.related_record_id);

    if related_record_id.is_some() && related_record_type.is_none() {
        return Err("Choose what kind of record this expense links to.".to_string());
    }

    if related_record_type.is_some() && related_record_id.is_none() {
        return Err("Enter the related record ID or leave the link blank.".to_string());
    }

    Ok(NormalizedExpenseMutation {
        vehicle_id,
        expense_date,
        category,
        description,
        amount: request.amount,
        receipt_document_id: trim_optional(request.receipt_document_id),
        related_record_type,
        related_record_id,
        notes: trim_optional(request.notes),
    })
}

fn normalize_expense_filter(
    filter: Option<ExpenseListFilter>,
) -> Result<ExpenseListFilter, String> {
    let filter = filter.unwrap_or(ExpenseListFilter {
        vehicle_id: None,
        category: None,
        start_date: None,
        end_date: None,
    });
    let category = match trim_optional(filter.category) {
        Some(category) => Some(normalize_expense_category(category)?),
        None => None,
    };

    Ok(ExpenseListFilter {
        vehicle_id: trim_optional(filter.vehicle_id),
        category,
        start_date: trim_optional(filter.start_date),
        end_date: trim_optional(filter.end_date),
    })
}

fn normalize_report_filter(filter: Option<ReportFilter>) -> Result<ReportFilter, String> {
    let filter = filter.unwrap_or(ReportFilter {
        vehicle_id: None,
        start_date: None,
        end_date: None,
    });

    Ok(ReportFilter {
        vehicle_id: trim_optional(filter.vehicle_id),
        start_date: trim_optional(filter.start_date),
        end_date: trim_optional(filter.end_date),
    })
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

    let exists = connection
        .query_row(
            "
            SELECT 1
            FROM vehicle_documents
            WHERE id = ?1
              AND vehicle_id = ?2
              AND deleted_at IS NULL
            ",
            params![receipt_id, vehicle_id],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check the selected receipt.".to_string())?
        .is_some();

    exists
        .then_some(())
        .ok_or_else(|| "Choose a receipt saved for the selected vehicle.".to_string())
}

fn ensure_related_record_matches_vehicle(
    connection: &Connection,
    related_record_type: Option<&str>,
    related_record_id: Option<&str>,
    vehicle_id: &str,
) -> Result<(), String> {
    let (Some(record_type), Some(record_id)) = (related_record_type, related_record_id) else {
        return Ok(());
    };

    let sql = match record_type {
        "fuel_log" => {
            "
            SELECT 1
            FROM fuel_logs
            WHERE id = ?1
              AND vehicle_id = ?2
              AND deleted_at IS NULL
            "
        }
        "maintenance_log" => {
            "
            SELECT 1
            FROM maintenance_logs
            WHERE id = ?1
              AND vehicle_id = ?2
              AND deleted_at IS NULL
            "
        }
        "repair_record" => {
            "
            SELECT 1
            FROM repair_records
            WHERE id = ?1
              AND vehicle_id = ?2
              AND deleted_at IS NULL
            "
        }
        "other" => return Ok(()),
        _ => return Err("Choose a valid related record type.".to_string()),
    };

    let exists = connection
        .query_row(sql, params![record_id, vehicle_id], |_| Ok(()))
        .optional()
        .map_err(|_| "Could not check the related record.".to_string())?
        .is_some();

    exists
        .then_some(())
        .ok_or_else(|| "Related record was not found for the selected vehicle.".to_string())
}

fn expense_from_row(row: &Row<'_>) -> rusqlite::Result<ExpenseRecord> {
    Ok(ExpenseRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        vehicle_name: row.get(2)?,
        expense_date: row.get(3)?,
        category: row.get(4)?,
        description: row.get(5)?,
        amount: row.get(6)?,
        receipt_document_id: row.get(7)?,
        related_record_type: row.get(8)?,
        related_record_id: row.get(9)?,
        notes: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn category_totals_from_expenses(expenses: &[ExpenseRecord]) -> Vec<CategoryTotalRecord> {
    totals_from_items(
        expenses
            .iter()
            .map(|expense| (expense.category.as_str(), expense.amount)),
    )
}

fn monthly_totals_from_expenses(expenses: &[ExpenseRecord]) -> Vec<MonthlyTotalRecord> {
    monthly_totals_from_items(
        expenses
            .iter()
            .map(|expense| (expense.expense_date.as_str(), expense.amount)),
    )
}

fn category_totals_from_events(events: &[CostEventRecord]) -> Vec<CategoryTotalRecord> {
    totals_from_items(
        events
            .iter()
            .map(|event| (event.category.as_str(), event.amount)),
    )
}

fn monthly_totals_from_events(events: &[CostEventRecord]) -> Vec<MonthlyTotalRecord> {
    monthly_totals_from_items(
        events
            .iter()
            .map(|event| (event.event_date.as_str(), event.amount)),
    )
}

fn totals_from_items<'a>(items: impl Iterator<Item = (&'a str, f64)>) -> Vec<CategoryTotalRecord> {
    let mut totals: BTreeMap<String, (f64, i64)> = BTreeMap::new();

    for (category, amount) in items {
        let entry = totals.entry(category.to_string()).or_insert((0.0, 0));
        entry.0 += amount;
        entry.1 += 1;
    }

    totals
        .into_iter()
        .map(|(category, (total, count))| CategoryTotalRecord {
            category,
            total,
            count,
        })
        .collect()
}

fn monthly_totals_from_items<'a>(
    items: impl Iterator<Item = (&'a str, f64)>,
) -> Vec<MonthlyTotalRecord> {
    let mut totals: BTreeMap<String, (f64, i64)> = BTreeMap::new();

    for (date, amount) in items {
        let month = date.get(0..7).unwrap_or(date).to_string();
        let entry = totals.entry(month).or_insert((0.0, 0));
        entry.0 += amount;
        entry.1 += 1;
    }

    totals
        .into_iter()
        .rev()
        .map(|(month, (total, count))| MonthlyTotalRecord {
            month,
            total,
            count,
        })
        .collect()
}

fn recent_events(mut events: Vec<CostEventRecord>, limit: usize) -> Vec<CostEventRecord> {
    events.sort_by(|left, right| {
        right
            .event_date
            .cmp(&left.event_date)
            .then_with(|| right.source_id.cmp(&left.source_id))
    });
    events.into_iter().take(limit).collect()
}

fn source_total(events: &[CostEventRecord], source_type: &str) -> f64 {
    sum_amounts(
        events
            .iter()
            .filter(|event| event.source_type == source_type)
            .map(|event| event.amount),
    )
}

fn sum_amounts(values: impl Iterator<Item = f64>) -> f64 {
    (values.sum::<f64>() * 100.0).round() / 100.0
}

fn is_source_linked_expense(expense: &ExpenseRecord) -> bool {
    expense
        .related_record_type
        .as_deref()
        .is_some_and(|record_type| SOURCE_RECORD_TYPES.contains(&record_type))
        && expense.related_record_id.is_some()
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

fn normalize_expense_category(value: String) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("Expense category is required.".to_string());
    }

    let normalized = trimmed
        .chars()
        .fold(String::new(), |mut output, character| {
            if character.is_ascii_alphanumeric() {
                output.push(character.to_ascii_lowercase());
            } else if !output.ends_with('_') {
                output.push('_');
            }
            output
        })
        .trim_matches('_')
        .to_string();

    if normalized.is_empty() {
        return Err("Expense category needs at least one letter or number.".to_string());
    }

    if normalized.len() > 60 {
        return Err("Expense category is too long. Use 60 characters or fewer.".to_string());
    }

    Ok(normalized)
}

fn label_from_key(value: &str) -> String {
    value
        .split('_')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

const EXPENSE_SELECT: &str = "
    SELECT
      expenses.id,
      expenses.vehicle_id,
      vehicles.vehicle_name,
      expenses.expense_date,
      expenses.category,
      expenses.description,
      expenses.amount,
      expenses.receipt_document_id,
      expenses.related_record_type,
      expenses.related_record_id,
      expenses.notes,
      expenses.created_at,
      expenses.updated_at
    FROM expenses
    LEFT JOIN vehicles
      ON vehicles.id = expenses.vehicle_id
";

#[derive(Debug)]
struct ReportVehicle {
    vehicle_id: String,
    vehicle_name: String,
}

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::TempDir;

    use crate::db;

    use super::*;

    fn setup_database() -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("expenses.sqlite3");
        db::initialize_database_at_path(&database_path).expect("database should initialize");
        let connection = db::open_database_at_path(&database_path).expect("database should open");

        (temp_dir, connection)
    }

    fn insert_vehicle(connection: &Connection, id: &str, name: &str) {
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
                VALUES (?1, ?2, 'van', 'diesel', 'automatic', 'fwd', 1000, 'active')
                ",
                params![id, name],
            )
            .expect("vehicle should insert");
    }

    fn expense_request(vehicle_id: &str, amount: f64) -> ExpenseMutationRequest {
        ExpenseMutationRequest {
            vehicle_id: vehicle_id.to_string(),
            expense_date: "2026-06-01".to_string(),
            category: "registration".to_string(),
            description: "Registration renewal".to_string(),
            amount,
            receipt_document_id: None,
            related_record_type: None,
            related_record_id: None,
            notes: Some("  Annual renewal  ".to_string()),
        }
    }

    #[test]
    fn creates_lists_updates_and_archives_expenses() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");

        let created = create_expense(&connection, expense_request("vehicle-1", 2500.0))
            .expect("expense should save");
        assert_eq!(created.vehicle_name.as_deref(), Some("Service Van"));
        assert_eq!(created.notes.as_deref(), Some("Annual renewal"));

        let listed =
            list_expenses_for_vehicle(&connection, "vehicle-1").expect("expenses should list");
        assert_eq!(listed.len(), 1);

        let updated = update_expense(
            &connection,
            &created.id,
            ExpenseMutationRequest {
                description: "Updated registration".to_string(),
                amount: 2600.0,
                ..expense_request("vehicle-1", 2500.0)
            },
        )
        .expect("expense should update");
        assert_eq!(updated.description, "Updated registration");
        assert_eq!(updated.amount, 2600.0);

        archive_expense(&connection, &created.id).expect("expense should archive");
        let listed =
            list_expenses_for_vehicle(&connection, "vehicle-1").expect("expenses should list");
        assert!(listed.is_empty());
    }

    #[test]
    fn accepts_custom_expense_category() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");

        let created = create_expense(
            &connection,
            ExpenseMutationRequest {
                category: "Parking Fee".to_string(),
                description: "Airport parking".to_string(),
                ..expense_request("vehicle-1", 350.0)
            },
        )
        .expect("custom category should save");

        assert_eq!(created.category, "parking_fee");

        let filtered = list_expenses(
            &connection,
            Some(ExpenseListFilter {
                vehicle_id: Some("vehicle-1".to_string()),
                category: Some("Parking Fee".to_string()),
                start_date: None,
                end_date: None,
            }),
        )
        .expect("custom category should filter");

        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].id, created.id);
    }

    #[test]
    fn rejects_invalid_expenses() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");

        let negative = create_expense(&connection, expense_request("vehicle-1", -1.0))
            .expect_err("negative amount should fail");
        assert!(negative.contains("cannot be negative"));

        let missing_vehicle = create_expense(&connection, expense_request("", 100.0))
            .expect_err("missing vehicle should fail");
        assert!(missing_vehicle.contains("Choose a vehicle"));

        let missing_date = create_expense(
            &connection,
            ExpenseMutationRequest {
                expense_date: " ".to_string(),
                ..expense_request("vehicle-1", 100.0)
            },
        )
        .expect_err("missing date should fail");
        assert!(missing_date.contains("date"));

        let missing_category = create_expense(
            &connection,
            ExpenseMutationRequest {
                category: " ".to_string(),
                ..expense_request("vehicle-1", 100.0)
            },
        )
        .expect_err("missing category should fail");
        assert!(missing_category.contains("category"));

        let missing_description = create_expense(
            &connection,
            ExpenseMutationRequest {
                description: " ".to_string(),
                ..expense_request("vehicle-1", 100.0)
            },
        )
        .expect_err("missing description should fail");
        assert!(missing_description.contains("description"));
    }

    #[test]
    fn report_aggregation_includes_sources_and_skips_linked_expense_duplicates() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");

        connection
            .execute(
                "
                INSERT INTO fuel_logs (
                  id,
                  vehicle_id,
                  fuel_date,
                  odometer,
                  fuel_type,
                  liters,
                  total_amount,
                  is_full_tank,
                  efficiency_status,
                  computed_km_per_liter
                )
                VALUES ('fuel-1', 'vehicle-1', '2026-06-01T08:00', 1100, 'diesel', 20, 1400, 1, 'official', 10)
                ",
                [],
            )
            .expect("fuel log should insert");
        connection
            .execute(
                "
                INSERT INTO maintenance_logs (
                  id,
                  vehicle_id,
                  completed_date,
                  odometer,
                  work_performed,
                  labor_cost,
                  parts_cost,
                  total_cost
                )
                VALUES ('maint-1', 'vehicle-1', '2026-06-02', 1300, 'Oil change', 500, 1200, 1700)
                ",
                [],
            )
            .expect("maintenance log should insert");
        connection
            .execute(
                "
                INSERT INTO repair_records (
                  id,
                  vehicle_id,
                  repair_date,
                  odometer,
                  issue_description,
                  total_cost
                )
                VALUES ('repair-1', 'vehicle-1', '2026-06-03', 1500, 'Tire repair', 800)
                ",
                [],
            )
            .expect("repair record should insert");

        create_expense(&connection, expense_request("vehicle-1", 300.0))
            .expect("manual expense should save");
        create_expense(
            &connection,
            ExpenseMutationRequest {
                expense_date: "2026-06-02".to_string(),
                category: "preventive_maintenance".to_string(),
                description: "Linked maintenance copy".to_string(),
                amount: 1700.0,
                related_record_type: Some("maintenance_log".to_string()),
                related_record_id: Some("maint-1".to_string()),
                ..expense_request("vehicle-1", 1700.0)
            },
        )
        .expect("linked expense should save");

        let overview = reports_overview(
            &connection,
            Some(ReportFilter {
                vehicle_id: Some("vehicle-1".to_string()),
                start_date: Some("2026-06-01".to_string()),
                end_date: Some("2026-06-30".to_string()),
            }),
        )
        .expect("report should load");

        assert_eq!(overview.fuel_total, 1400.0);
        assert_eq!(overview.maintenance_total, 1700.0);
        assert_eq!(overview.repair_total, 800.0);
        assert_eq!(overview.manual_expense_total, 300.0);
        assert_eq!(overview.linked_expense_total, 1700.0);
        assert_eq!(overview.total_tracked_cost, 4200.0);
        assert!(overview
            .category_totals
            .iter()
            .any(|total| total.category == "fuel" && total.total == 1400.0));

        let vehicle_report = vehicle_cost_report(&connection, "vehicle-1", None)
            .expect("vehicle report should load");
        assert_eq!(vehicle_report.vehicle.total_cost, 4200.0);
        assert_eq!(vehicle_report.vehicle.cost_per_km, Some(10.5));
        assert_eq!(
            vehicle_report.vehicle.latest_official_km_per_liter,
            Some(10.0)
        );
    }

    #[test]
    fn expense_summary_filters_by_category_month_and_vehicle() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");
        insert_vehicle(&connection, "vehicle-2", "Backup Van");

        create_expense(&connection, expense_request("vehicle-1", 200.0))
            .expect("first expense should save");
        create_expense(
            &connection,
            ExpenseMutationRequest {
                vehicle_id: "vehicle-2".to_string(),
                expense_date: "2026-07-01".to_string(),
                category: "cleaning".to_string(),
                description: "Wash".to_string(),
                amount: 100.0,
                receipt_document_id: None,
                related_record_type: None,
                related_record_id: None,
                notes: None,
            },
        )
        .expect("second expense should save");

        let summary = expense_summary(
            &connection,
            Some(ExpenseListFilter {
                vehicle_id: Some("vehicle-1".to_string()),
                category: Some("registration".to_string()),
                start_date: Some("2026-06-01".to_string()),
                end_date: Some("2026-06-30".to_string()),
            }),
        )
        .expect("summary should load");

        assert_eq!(summary.expense_count, 1);
        assert_eq!(summary.direct_expense_total, 200.0);
        assert_eq!(summary.category_totals[0].category, "registration");
        assert_eq!(summary.monthly_totals[0].month, "2026-06");
    }
}

use std::collections::BTreeMap;

use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::vehicles::photo_storage::generate_local_id;

use super::models::{
    CompleteTripRequest, NormalizedStartTrip, StartTripRequest, TripCountRecord, TripListFilter,
    TripRecord, TripReportFilter, TripReportsOverview,
};

const VALID_TRIP_STATUSES: &[&str] = &["open", "completed", "cancelled"];

pub fn list_trips(
    connection: &Connection,
    filter: Option<TripListFilter>,
) -> Result<Vec<TripRecord>, String> {
    let filter = normalize_trip_filter(filter)?;
    let mut statement = connection
        .prepare(&format!(
            "
            {TRIP_SELECT}
            WHERE trips.deleted_at IS NULL
              AND vehicles.deleted_at IS NULL
              AND (?1 IS NULL OR trips.vehicle_id = ?1)
              AND (?2 IS NULL OR trips.status = ?2)
              AND (?3 IS NULL OR date(trips.departure_time) >= date(?3))
              AND (?4 IS NULL OR date(trips.departure_time) <= date(?4))
            ORDER BY
              CASE WHEN trips.status = 'open' THEN 0 ELSE 1 END,
              trips.departure_time DESC,
              trips.created_at DESC
            "
        ))
        .map_err(|_| "Could not prepare the trip list.".to_string())?;

    let rows = statement
        .query_map(
            params![
                filter.vehicle_id,
                filter.status,
                filter.start_date,
                filter.end_date
            ],
            trip_from_row,
        )
        .map_err(|_| "Could not read trips.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse trips.".to_string())?
        .into_iter()
        .map(|trip| hydrate_trip(connection, trip))
        .collect()
}

pub fn list_open_trips(connection: &Connection) -> Result<Vec<TripRecord>, String> {
    list_trips(
        connection,
        Some(TripListFilter {
            vehicle_id: None,
            status: Some("open".to_string()),
            start_date: None,
            end_date: None,
        }),
    )
}

pub fn get_trip(connection: &Connection, id: &str) -> Result<Option<TripRecord>, String> {
    connection
        .query_row(
            &format!(
                "
                {TRIP_SELECT}
                WHERE trips.id = ?1
                  AND trips.deleted_at IS NULL
                "
            ),
            params![id],
            trip_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the selected trip.".to_string())?
        .map(|trip| hydrate_trip(connection, trip))
        .transpose()
}

pub fn start_trip(
    connection: &mut Connection,
    request: StartTripRequest,
) -> Result<TripRecord, String> {
    let trip = normalize_start_trip_request(request)?;
    ensure_vehicle_exists(connection, &trip.vehicle_id)?;
    ensure_vehicle_has_no_open_trip(connection, &trip.vehicle_id)?;

    let id = generate_local_id("trip");
    let transaction = connection
        .transaction()
        .map_err(|_| "Could not start saving the trip.".to_string())?;

    transaction
        .execute(
            "
            INSERT INTO trips (
              id,
              vehicle_id,
              departure_time,
              reason,
              departure_notes,
              status
            )
            VALUES (?1, ?2, ?3, ?4, ?5, 'open')
            ",
            params![
                id,
                trip.vehicle_id,
                trip.departure_time,
                trip.reason,
                trip.departure_notes
            ],
        )
        .map_err(|_| "Could not save the trip.".to_string())?;

    replace_trip_names(
        &transaction,
        &id,
        "trip_drivers",
        "driver_name",
        &trip.drivers,
    )?;
    replace_trip_names(
        &transaction,
        &id,
        "trip_passengers",
        "passenger_name",
        &trip.passengers,
    )?;
    replace_trip_names(
        &transaction,
        &id,
        "trip_destinations",
        "destination_name",
        &trip.destinations,
    )?;

    transaction
        .commit()
        .map_err(|_| "Could not finish saving the trip.".to_string())?;

    get_trip(connection, &id)?.ok_or_else(|| "Could not read the saved trip.".to_string())
}

pub fn complete_trip(
    connection: &Connection,
    id: &str,
    request: CompleteTripRequest,
) -> Result<TripRecord, String> {
    let return_time = required_trimmed(request.return_time, "Return time is required.")?;
    let return_notes = trim_optional(request.return_notes);
    let existing = get_trip(connection, id)?.ok_or_else(|| "Trip was not found.".to_string())?;

    if existing.status != "open" {
        return Err("Only open trips can be ended.".to_string());
    }

    if return_time < existing.departure_time {
        return Err("Return time cannot be before the time out.".to_string());
    }

    let updated_rows = connection
        .execute(
            "
            UPDATE trips
            SET
              return_time = ?1,
              return_notes = ?2,
              status = 'completed',
              updated_at = datetime('now')
            WHERE id = ?3
              AND deleted_at IS NULL
              AND status = 'open'
            ",
            params![return_time, return_notes, id],
        )
        .map_err(|_| "Could not end the trip.".to_string())?;

    if updated_rows == 0 {
        return Err("Trip was not found or has already been ended.".to_string());
    }

    get_trip(connection, id)?.ok_or_else(|| "Could not read the completed trip.".to_string())
}

pub fn archive_trip(connection: &Connection, id: &str) -> Result<(), String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE trips
            SET
              deleted_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![id],
        )
        .map_err(|_| "Could not archive the trip.".to_string())?;

    if updated_rows == 0 {
        return Err("Trip was not found or is already archived.".to_string());
    }

    Ok(())
}

pub fn trip_reports_overview(
    connection: &Connection,
    filter: Option<TripReportFilter>,
) -> Result<TripReportsOverview, String> {
    let filter = normalize_report_filter(filter)?;
    let trips = list_trips(
        connection,
        Some(TripListFilter {
            vehicle_id: filter.vehicle_id,
            status: None,
            start_date: filter.start_date,
            end_date: filter.end_date,
        }),
    )?;

    let total_trips = trips.len() as i64;
    let open_trips = trips.iter().filter(|trip| trip.status == "open").count() as i64;
    let completed_trips = trips
        .iter()
        .filter(|trip| trip.status == "completed")
        .count() as i64;
    let cancelled_trips = trips
        .iter()
        .filter(|trip| trip.status == "cancelled")
        .count() as i64;

    Ok(TripReportsOverview {
        total_trips,
        open_trips,
        completed_trips,
        cancelled_trips,
        trips_by_vehicle: top_counts(trips.iter().map(|trip| trip.vehicle_name.as_str()), 10),
        trips_by_driver: top_counts(
            trips
                .iter()
                .flat_map(|trip| trip.drivers.iter().map(String::as_str)),
            10,
        ),
        trips_by_destination: top_counts(
            trips
                .iter()
                .flat_map(|trip| trip.destinations.iter().map(String::as_str)),
            10,
        ),
        recent_trips: trips.into_iter().take(10).collect(),
    })
}

fn hydrate_trip(connection: &Connection, mut trip: TripRecord) -> Result<TripRecord, String> {
    trip.drivers = list_trip_names(connection, "trip_drivers", "driver_name", &trip.id)?;
    trip.passengers = list_trip_names(connection, "trip_passengers", "passenger_name", &trip.id)?;
    trip.destinations = list_trip_names(
        connection,
        "trip_destinations",
        "destination_name",
        &trip.id,
    )?;
    Ok(trip)
}

fn list_trip_names(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
    trip_id: &str,
) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(&format!(
            "
            SELECT {column_name}
            FROM {table_name}
            WHERE trip_id = ?1
              AND deleted_at IS NULL
            ORDER BY sort_order ASC, created_at ASC
            "
        ))
        .map_err(|_| "Could not prepare trip details.".to_string())?;

    let rows = statement
        .query_map(params![trip_id], |row| row.get::<_, String>(0))
        .map_err(|_| "Could not read trip details.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse trip details.".to_string())
}

fn replace_trip_names(
    connection: &Connection,
    trip_id: &str,
    table_name: &str,
    column_name: &str,
    names: &[String],
) -> Result<(), String> {
    connection
        .execute(
            &format!("UPDATE {table_name} SET deleted_at = datetime('now') WHERE trip_id = ?1"),
            params![trip_id],
        )
        .map_err(|_| "Could not update trip details.".to_string())?;

    for (index, name) in names.iter().enumerate() {
        connection
            .execute(
                &format!(
                    "
                    INSERT INTO {table_name} (
                      id,
                      trip_id,
                      {column_name},
                      sort_order
                    )
                    VALUES (?1, ?2, ?3, ?4)
                    "
                ),
                params![
                    generate_local_id("trip_detail"),
                    trip_id,
                    name,
                    index as i64
                ],
            )
            .map_err(|_| "Could not save trip details.".to_string())?;
    }

    Ok(())
}

fn normalize_start_trip_request(request: StartTripRequest) -> Result<NormalizedStartTrip, String> {
    let vehicle_id = required_trimmed(request.vehicle_id, "Choose a vehicle for this trip.")?;
    let departure_time = required_trimmed(request.departure_time, "Time out is required.")?;
    let reason = required_trimmed(request.reason, "Reason for trip is required.")?;
    let drivers = normalize_name_list(request.drivers, true, "At least one driver is required.")?;
    let passengers = normalize_name_list(request.passengers, false, "")?;
    let destinations = normalize_name_list(
        request.destinations,
        true,
        "At least one destination is required.",
    )?;

    Ok(NormalizedStartTrip {
        vehicle_id,
        departure_time,
        drivers,
        passengers,
        reason,
        destinations,
        departure_notes: trim_optional(request.departure_notes),
    })
}

fn normalize_name_list(
    values: Vec<String>,
    required: bool,
    required_message: &str,
) -> Result<Vec<String>, String> {
    let names = values
        .into_iter()
        .filter_map(|value| {
            let trimmed = value.trim().to_string();
            (!trimmed.is_empty()).then_some(trimmed)
        })
        .collect::<Vec<_>>();

    if required && names.is_empty() {
        return Err(required_message.to_string());
    }

    if names.iter().any(|name| name.chars().count() > 120) {
        return Err("Trip names and destinations must be 120 characters or fewer.".to_string());
    }

    if names.len() > 20 {
        return Err("Use 20 entries or fewer in each trip list.".to_string());
    }

    Ok(names)
}

fn normalize_trip_filter(filter: Option<TripListFilter>) -> Result<TripListFilter, String> {
    let filter = filter.unwrap_or(TripListFilter {
        vehicle_id: None,
        status: None,
        start_date: None,
        end_date: None,
    });

    Ok(TripListFilter {
        vehicle_id: trim_optional(filter.vehicle_id),
        status: normalize_optional_status(filter.status)?,
        start_date: trim_optional(filter.start_date),
        end_date: trim_optional(filter.end_date),
    })
}

fn normalize_report_filter(filter: Option<TripReportFilter>) -> Result<TripReportFilter, String> {
    let filter = filter.unwrap_or(TripReportFilter {
        vehicle_id: None,
        start_date: None,
        end_date: None,
    });

    Ok(TripReportFilter {
        vehicle_id: trim_optional(filter.vehicle_id),
        start_date: trim_optional(filter.start_date),
        end_date: trim_optional(filter.end_date),
    })
}

fn normalize_optional_status(status: Option<String>) -> Result<Option<String>, String> {
    let Some(status) = trim_optional(status) else {
        return Ok(None);
    };
    let normalized = status.to_ascii_lowercase();
    VALID_TRIP_STATUSES
        .contains(&normalized.as_str())
        .then_some(Some(normalized))
        .ok_or_else(|| "Choose a valid trip status.".to_string())
}

fn ensure_vehicle_exists(connection: &Connection, id: &str) -> Result<(), String> {
    let exists = connection
        .query_row(
            "
            SELECT 1
            FROM vehicles
            WHERE id = ?1
              AND deleted_at IS NULL
              AND archived_at IS NULL
              AND status != 'archived'
            ",
            params![id],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check the selected vehicle.".to_string())?
        .is_some();

    exists
        .then_some(())
        .ok_or_else(|| "Vehicle was not found or is archived.".to_string())
}

fn ensure_vehicle_has_no_open_trip(
    connection: &Connection,
    vehicle_id: &str,
) -> Result<(), String> {
    let has_open_trip = connection
        .query_row(
            "
            SELECT 1
            FROM trips
            WHERE vehicle_id = ?1
              AND status = 'open'
              AND deleted_at IS NULL
            ",
            params![vehicle_id],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check existing open trips.".to_string())?
        .is_some();

    (!has_open_trip).then_some(()).ok_or_else(|| {
        "This vehicle already has an open trip. End it before starting another.".to_string()
    })
}

fn top_counts<'a>(items: impl Iterator<Item = &'a str>, limit: usize) -> Vec<TripCountRecord> {
    let mut counts: BTreeMap<String, i64> = BTreeMap::new();

    for item in items {
        let trimmed = item.trim();
        if trimmed.is_empty() {
            continue;
        }
        *counts.entry(trimmed.to_string()).or_insert(0) += 1;
    }

    let mut rows = counts
        .into_iter()
        .map(|(label, count)| TripCountRecord { label, count })
        .collect::<Vec<_>>();
    rows.sort_by(|left, right| {
        right
            .count
            .cmp(&left.count)
            .then_with(|| left.label.cmp(&right.label))
    });
    rows.into_iter().take(limit).collect()
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

const TRIP_SELECT: &str = "
    SELECT
      trips.id,
      trips.vehicle_id,
      vehicles.vehicle_name,
      trips.departure_time,
      trips.return_time,
      trips.reason,
      trips.departure_notes,
      trips.return_notes,
      trips.status,
      trips.created_at,
      trips.updated_at
    FROM trips
    JOIN vehicles
      ON vehicles.id = trips.vehicle_id
";

fn trip_from_row(row: &Row<'_>) -> rusqlite::Result<TripRecord> {
    Ok(TripRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        vehicle_name: row.get(2)?,
        departure_time: row.get(3)?,
        return_time: row.get(4)?,
        reason: row.get(5)?,
        departure_notes: row.get(6)?,
        return_notes: row.get(7)?,
        status: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        destinations: Vec::new(),
        drivers: Vec::new(),
        passengers: Vec::new(),
    })
}

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::TempDir;

    use crate::db;

    use super::*;

    fn setup_database() -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("trips.sqlite3");
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

    fn start_request(vehicle_id: &str) -> StartTripRequest {
        StartTripRequest {
            vehicle_id: vehicle_id.to_string(),
            departure_time: "2026-07-05T08:00".to_string(),
            drivers: vec![" Ana ".to_string(), "Ben".to_string()],
            passengers: vec!["Passenger 1".to_string()],
            reason: "Client visit".to_string(),
            destinations: vec!["Warehouse".to_string(), "Client Site".to_string()],
            departure_notes: Some("Bring documents".to_string()),
        }
    }

    #[test]
    fn starts_lists_and_completes_trip_with_multiple_people_and_destinations() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");

        let trip = start_trip(&mut connection, start_request("vehicle-1")).expect("trip starts");

        assert_eq!(trip.status, "open");
        assert_eq!(trip.vehicle_name, "Service Van");
        assert_eq!(trip.drivers, vec!["Ana", "Ben"]);
        assert_eq!(trip.passengers, vec!["Passenger 1"]);
        assert_eq!(trip.destinations, vec!["Warehouse", "Client Site"]);

        let open = list_open_trips(&connection).expect("open trips list");
        assert_eq!(open.len(), 1);

        let completed = complete_trip(
            &connection,
            &trip.id,
            CompleteTripRequest {
                return_time: "2026-07-05T18:30".to_string(),
                return_notes: Some("Returned safely".to_string()),
            },
        )
        .expect("trip completes");

        assert_eq!(completed.status, "completed");
        assert_eq!(completed.return_time.as_deref(), Some("2026-07-05T18:30"));
        assert_eq!(completed.return_notes.as_deref(), Some("Returned safely"));
        assert!(list_open_trips(&connection)
            .expect("open trips list")
            .is_empty());
    }

    #[test]
    fn rejects_missing_required_fields_and_duplicate_open_vehicle_trip() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");

        let missing_driver = start_trip(
            &mut connection,
            StartTripRequest {
                drivers: vec![" ".to_string()],
                ..start_request("vehicle-1")
            },
        )
        .expect_err("driver should be required");
        assert!(missing_driver.contains("driver"));

        start_trip(&mut connection, start_request("vehicle-1")).expect("first trip starts");
        let duplicate = start_trip(&mut connection, start_request("vehicle-1"))
            .expect_err("second open trip should fail");
        assert!(duplicate.contains("already has an open trip"));
    }

    #[test]
    fn rejects_return_before_departure() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");
        let trip = start_trip(&mut connection, start_request("vehicle-1")).expect("trip starts");

        let result = complete_trip(
            &connection,
            &trip.id,
            CompleteTripRequest {
                return_time: "2026-07-05T07:30".to_string(),
                return_notes: None,
            },
        )
        .expect_err("return before departure should fail");

        assert!(result.contains("before the time out"));
    }

    #[test]
    fn trip_reports_aggregate_counts() {
        let (_temp_dir, mut connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Service Van");
        insert_vehicle(&connection, "vehicle-2", "Backup Van");

        let first = start_trip(&mut connection, start_request("vehicle-1")).expect("trip starts");
        complete_trip(
            &connection,
            &first.id,
            CompleteTripRequest {
                return_time: "2026-07-05T18:30".to_string(),
                return_notes: None,
            },
        )
        .expect("trip completes");

        start_trip(
            &mut connection,
            StartTripRequest {
                drivers: vec!["Ana".to_string()],
                destinations: vec!["Warehouse".to_string()],
                ..start_request("vehicle-2")
            },
        )
        .expect("second trip starts");

        let report = trip_reports_overview(&connection, None).expect("report should load");

        assert_eq!(report.total_trips, 2);
        assert_eq!(report.open_trips, 1);
        assert_eq!(report.completed_trips, 1);
        assert!(report
            .trips_by_driver
            .iter()
            .any(|count| count.label == "Ana" && count.count == 2));
        assert!(report
            .trips_by_destination
            .iter()
            .any(|count| count.label == "Warehouse" && count.count == 2));
    }
}

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::{
    models::{
        NewVehiclePhoto, NormalizedVehicleMutation, VehicleMutationRequest, VehiclePhotoRecord,
        VehicleRecord,
    },
    photo_storage::generate_local_id,
};

pub fn insert_vehicle_photo(
    connection: &Connection,
    photo: NewVehiclePhoto,
) -> Result<VehiclePhotoRecord, String> {
    connection
        .execute(
            "
            INSERT INTO vehicle_photos (
              id, vehicle_id, file_path, original_filename, mime_type, file_size_bytes, is_primary
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ",
            params![
                photo.id,
                photo.vehicle_id,
                photo.file_path,
                photo.original_filename,
                photo.mime_type,
                photo.file_size_bytes,
                bool_to_int(photo.is_primary)
            ],
        )
        .map_err(|_| "Could not save the vehicle picture record.".to_string())?;

    get_vehicle_photo(connection, &photo.id)?
        .ok_or_else(|| "Could not read the saved vehicle picture record.".to_string())
}

pub fn list_vehicles(connection: &Connection) -> Result<Vec<VehicleRecord>, String> {
    let mut statement = connection
        .prepare(&format!(
            "
            {VEHICLE_SELECT}
            WHERE vehicles.deleted_at IS NULL
              AND vehicles.archived_at IS NULL
              AND vehicles.status != 'archived'
            ORDER BY vehicles.updated_at DESC, vehicles.created_at DESC
            "
        ))
        .map_err(|_| "Could not prepare the vehicle list.".to_string())?;

    let rows = statement
        .query_map([], vehicle_from_row)
        .map_err(|_| "Could not read the vehicle list.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse the vehicle list.".to_string())
}

pub fn get_vehicle(connection: &Connection, id: &str) -> Result<Option<VehicleRecord>, String> {
    connection
        .query_row(
            &format!(
                "
                {VEHICLE_SELECT}
                WHERE vehicles.id = ?1
                  AND vehicles.deleted_at IS NULL
                "
            ),
            params![id],
            vehicle_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the selected vehicle.".to_string())
}

pub fn create_vehicle(
    connection: &mut Connection,
    request: VehicleMutationRequest,
) -> Result<VehicleRecord, String> {
    let vehicle = normalize_vehicle_request(request)?;
    ensure_photo_exists(connection, &vehicle.primary_photo_id)?;

    let id = generate_local_id("vehicle");
    let transaction = connection
        .transaction()
        .map_err(|_| "Could not start saving the vehicle.".to_string())?;

    transaction
        .execute(
            "
            INSERT INTO vehicles (
              id,
              vehicle_name,
              primary_photo_id,
              plate_number,
              vehicle_type,
              fuel_type,
              transmission_type,
              drivetrain,
              current_odometer,
              status,
              notes
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ",
            params![
                id,
                vehicle.vehicle_name,
                vehicle.primary_photo_id,
                vehicle.plate_number,
                vehicle.vehicle_type,
                vehicle.fuel_type,
                vehicle.transmission_type,
                vehicle.drivetrain,
                vehicle.current_odometer,
                vehicle.status,
                vehicle.notes
            ],
        )
        .map_err(|_| "Could not save the vehicle.".to_string())?;

    mark_primary_photo(&transaction, &id, &vehicle.primary_photo_id)?;

    transaction
        .commit()
        .map_err(|_| "Could not finish saving the vehicle.".to_string())?;

    get_vehicle(connection, &id)?.ok_or_else(|| "Could not read the saved vehicle.".to_string())
}

pub fn update_vehicle(
    connection: &mut Connection,
    id: &str,
    request: VehicleMutationRequest,
) -> Result<VehicleRecord, String> {
    let vehicle = normalize_vehicle_request(request)?;
    ensure_vehicle_exists(connection, id)?;
    ensure_photo_exists(connection, &vehicle.primary_photo_id)?;

    let transaction = connection
        .transaction()
        .map_err(|_| "Could not start updating the vehicle.".to_string())?;

    let updated_rows = transaction
        .execute(
            "
            UPDATE vehicles
            SET
              vehicle_name = ?1,
              primary_photo_id = ?2,
              plate_number = ?3,
              vehicle_type = ?4,
              fuel_type = ?5,
              transmission_type = ?6,
              drivetrain = ?7,
              current_odometer = ?8,
              status = ?9,
              notes = ?10,
              updated_at = datetime('now'),
              archived_at = CASE WHEN ?9 = 'archived' THEN COALESCE(archived_at, datetime('now')) ELSE NULL END
            WHERE id = ?11
              AND deleted_at IS NULL
            ",
            params![
                vehicle.vehicle_name,
                vehicle.primary_photo_id,
                vehicle.plate_number,
                vehicle.vehicle_type,
                vehicle.fuel_type,
                vehicle.transmission_type,
                vehicle.drivetrain,
                vehicle.current_odometer,
                vehicle.status,
                vehicle.notes,
                id
            ],
        )
        .map_err(|_| "Could not update the vehicle.".to_string())?;

    if updated_rows == 0 {
        return Err("Vehicle was not found.".to_string());
    }

    mark_primary_photo(&transaction, id, &vehicle.primary_photo_id)?;

    transaction
        .commit()
        .map_err(|_| "Could not finish updating the vehicle.".to_string())?;

    get_vehicle(connection, id)?.ok_or_else(|| "Could not read the updated vehicle.".to_string())
}

pub fn archive_vehicle(connection: &Connection, id: &str) -> Result<(), String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE vehicles
            SET
              status = 'archived',
              archived_at = COALESCE(archived_at, datetime('now')),
              updated_at = datetime('now')
            WHERE id = ?1
              AND deleted_at IS NULL
              AND archived_at IS NULL
            ",
            params![id],
        )
        .map_err(|_| "Could not archive the vehicle.".to_string())?;

    if updated_rows == 0 {
        return Err("Vehicle was not found or is already archived.".to_string());
    }

    Ok(())
}

pub fn normalize_vehicle_request(
    request: VehicleMutationRequest,
) -> Result<NormalizedVehicleMutation, String> {
    let vehicle_name = required_trimmed(request.vehicle_name, "Vehicle name is required.")?;
    let primary_photo_id =
        required_trimmed(request.primary_photo_id, "Vehicle picture is required.")?;
    let vehicle_type = normalize_choice(request.vehicle_type, VALID_VEHICLE_TYPES, "vehicle type")?;
    let fuel_type = normalize_choice(request.fuel_type, VALID_FUEL_TYPES, "fuel type")?;
    let transmission_type = normalize_optional_choice(
        request.transmission_type,
        VALID_TRANSMISSION_TYPES,
        "transmission",
        "unknown",
    )?;
    let drivetrain = normalize_optional_choice(
        request.drivetrain,
        VALID_DRIVETRAINS,
        "drivetrain",
        "unknown",
    )?;
    let status =
        normalize_optional_choice(request.status, VALID_STATUSES, "vehicle status", "active")?;

    if !request.current_odometer.is_finite() {
        return Err("Current odometer must be a valid number.".to_string());
    }

    if request.current_odometer < 0.0 {
        return Err("Current odometer cannot be negative.".to_string());
    }

    Ok(NormalizedVehicleMutation {
        vehicle_name,
        primary_photo_id,
        plate_number: trim_optional(request.plate_number),
        vehicle_type,
        fuel_type,
        transmission_type,
        drivetrain,
        current_odometer: request.current_odometer,
        status,
        notes: trim_optional(request.notes),
    })
}

fn get_vehicle_photo(
    connection: &Connection,
    id: &str,
) -> Result<Option<VehiclePhotoRecord>, String> {
    connection
        .query_row(
            "
            SELECT
              id,
              vehicle_id,
              file_path,
              original_filename,
              mime_type,
              file_size_bytes,
              is_primary,
              created_at
            FROM vehicle_photos
            WHERE id = ?1
              AND deleted_at IS NULL
            ",
            params![id],
            photo_from_row,
        )
        .optional()
        .map_err(|_| "Could not read the vehicle picture record.".to_string())
}

fn ensure_photo_exists(connection: &Connection, id: &str) -> Result<(), String> {
    let exists = connection
        .query_row(
            "SELECT 1 FROM vehicle_photos WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check the selected vehicle picture.".to_string())?
        .is_some();

    exists
        .then_some(())
        .ok_or_else(|| "Choose a saved vehicle picture before saving.".to_string())
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

fn mark_primary_photo(
    connection: &Connection,
    vehicle_id: &str,
    primary_photo_id: &str,
) -> Result<(), String> {
    connection
        .execute(
            "UPDATE vehicle_photos SET is_primary = 0 WHERE vehicle_id = ?1",
            params![vehicle_id],
        )
        .map_err(|_| "Could not update the vehicle picture selection.".to_string())?;

    let updated_rows = connection
        .execute(
            "
            UPDATE vehicle_photos
            SET vehicle_id = ?1, is_primary = 1
            WHERE id = ?2
              AND deleted_at IS NULL
            ",
            params![vehicle_id, primary_photo_id],
        )
        .map_err(|_| "Could not link the selected vehicle picture.".to_string())?;

    if updated_rows == 0 {
        return Err("Choose a saved vehicle picture before saving.".to_string());
    }

    Ok(())
}

const VEHICLE_SELECT: &str = "
    SELECT
      vehicles.id,
      vehicles.vehicle_name,
      vehicles.primary_photo_id,
      vehicle_photos.file_path AS primary_photo_path,
      vehicle_photos.mime_type AS primary_photo_mime_type,
      vehicles.plate_number,
      vehicles.vehicle_type,
      vehicles.fuel_type,
      COALESCE(vehicles.transmission_type, 'unknown') AS transmission_type,
      COALESCE(vehicles.drivetrain, 'unknown') AS drivetrain,
      vehicles.current_odometer,
      vehicles.status,
      vehicles.notes,
      vehicles.created_at,
      vehicles.updated_at,
      vehicles.archived_at
    FROM vehicles
    LEFT JOIN vehicle_photos
      ON vehicle_photos.id = vehicles.primary_photo_id
     AND vehicle_photos.deleted_at IS NULL
";

fn vehicle_from_row(row: &Row<'_>) -> rusqlite::Result<VehicleRecord> {
    Ok(VehicleRecord {
        id: row.get(0)?,
        vehicle_name: row.get(1)?,
        primary_photo_id: row.get(2)?,
        primary_photo_path: row.get(3)?,
        primary_photo_mime_type: row.get(4)?,
        plate_number: row.get(5)?,
        vehicle_type: row.get(6)?,
        fuel_type: row.get(7)?,
        transmission_type: row.get(8)?,
        drivetrain: row.get(9)?,
        current_odometer: row.get(10)?,
        status: row.get(11)?,
        notes: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
        archived_at: row.get(15)?,
    })
}

fn photo_from_row(row: &Row<'_>) -> rusqlite::Result<VehiclePhotoRecord> {
    Ok(VehiclePhotoRecord {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        file_path: row.get(2)?,
        original_filename: row.get(3)?,
        mime_type: row.get(4)?,
        file_size_bytes: row.get(5)?,
        is_primary: int_to_bool(row.get(6)?),
        created_at: row.get(7)?,
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

fn normalize_choice(value: String, valid_values: &[&str], label: &str) -> Result<String, String> {
    let normalized = value.trim().to_ascii_lowercase();
    valid_values
        .contains(&normalized.as_str())
        .then_some(normalized)
        .ok_or_else(|| format!("Choose a valid {label}."))
}

fn normalize_optional_choice(
    value: Option<String>,
    valid_values: &[&str],
    label: &str,
    default_value: &str,
) -> Result<String, String> {
    match trim_optional(value) {
        Some(value) => normalize_choice(value, valid_values, label),
        None => Ok(default_value.to_string()),
    }
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

const VALID_VEHICLE_TYPES: &[&str] =
    &["sedan", "suv", "van", "truck", "bus", "motorcycle", "other"];
const VALID_FUEL_TYPES: &[&str] = &[
    "gasoline",
    "diesel",
    "hybrid_gasoline",
    "hybrid_diesel",
    "full_ev",
    "other",
];
const VALID_TRANSMISSION_TYPES: &[&str] = &["manual", "automatic", "cvt", "dct", "none", "unknown"];
const VALID_DRIVETRAINS: &[&str] = &["fwd", "rwd", "awd", "4wd", "none", "unknown"];
const VALID_STATUSES: &[&str] = &[
    "active",
    "under_maintenance",
    "inactive",
    "sold_disposed",
    "archived",
];

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    use crate::db;

    use super::*;

    fn setup_database() -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("vehicles.sqlite3");
        db::initialize_database_at_path(&database_path).expect("database should initialize");
        let connection = db::open_database_at_path(&database_path).expect("database should open");

        (temp_dir, connection)
    }

    fn insert_staged_photo(connection: &Connection) -> VehiclePhotoRecord {
        insert_vehicle_photo(
            connection,
            NewVehiclePhoto {
                id: "photo-1".to_string(),
                vehicle_id: None,
                file_path: "C:/tmp/photo-1.jpg".to_string(),
                original_filename: Some("photo-1.jpg".to_string()),
                mime_type: Some("image/jpeg".to_string()),
                file_size_bytes: 128,
                is_primary: true,
            },
        )
        .expect("photo should insert")
    }

    fn sample_request(photo_id: &str) -> VehicleMutationRequest {
        VehicleMutationRequest {
            vehicle_name: "  Delivery Van  ".to_string(),
            primary_photo_id: photo_id.to_string(),
            plate_number: None,
            vehicle_type: "van".to_string(),
            fuel_type: "diesel".to_string(),
            transmission_type: Some("manual".to_string()),
            drivetrain: Some("rwd".to_string()),
            current_odometer: 1200.0,
            status: Some("active".to_string()),
            notes: Some("  Daily route vehicle  ".to_string()),
        }
    }

    #[test]
    fn creates_vehicle_with_optional_plate_number_and_primary_photo() {
        let (_temp_dir, mut connection) = setup_database();
        let photo = insert_staged_photo(&connection);

        let vehicle =
            create_vehicle(&mut connection, sample_request(&photo.id)).expect("vehicle saves");

        assert_eq!(vehicle.vehicle_name, "Delivery Van");
        assert_eq!(vehicle.plate_number, None);
        assert_eq!(vehicle.primary_photo_id.as_deref(), Some(photo.id.as_str()));
        assert_eq!(
            vehicle.primary_photo_path.as_deref(),
            Some(photo.file_path.as_str())
        );

        let linked_vehicle_id: String = connection
            .query_row(
                "SELECT vehicle_id FROM vehicle_photos WHERE id = ?1",
                params![photo.id],
                |row| row.get(0),
            )
            .expect("photo should be linked");
        assert_eq!(linked_vehicle_id, vehicle.id);
    }

    #[test]
    fn lists_updates_and_archives_vehicles() {
        let (_temp_dir, mut connection) = setup_database();
        let photo = insert_staged_photo(&connection);
        let vehicle =
            create_vehicle(&mut connection, sample_request(&photo.id)).expect("vehicle saves");

        let listed = list_vehicles(&connection).expect("vehicles should list");
        assert_eq!(listed.len(), 1);

        let update_request = VehicleMutationRequest {
            vehicle_name: "Updated Van".to_string(),
            plate_number: Some("ABC 123".to_string()),
            current_odometer: 1400.0,
            ..sample_request(&photo.id)
        };
        let updated =
            update_vehicle(&mut connection, &vehicle.id, update_request).expect("vehicle updates");
        assert_eq!(updated.vehicle_name, "Updated Van");
        assert_eq!(updated.plate_number.as_deref(), Some("ABC 123"));
        assert_eq!(updated.current_odometer, 1400.0);

        archive_vehicle(&connection, &vehicle.id).expect("vehicle archives");
        let active_list = list_vehicles(&connection).expect("vehicles should list");
        assert!(active_list.is_empty());
        let archived = get_vehicle(&connection, &vehicle.id)
            .expect("vehicle should read")
            .expect("vehicle should exist");
        assert_eq!(archived.status, "archived");
        assert!(archived.archived_at.is_some());
    }

    #[test]
    fn rejects_missing_photo_and_negative_odometer() {
        let (_temp_dir, mut connection) = setup_database();

        let missing_photo = create_vehicle(&mut connection, sample_request("missing-photo"))
            .expect_err("missing photo should fail");
        assert!(missing_photo.contains("picture"));

        let photo = insert_staged_photo(&connection);
        let negative_odometer = VehicleMutationRequest {
            current_odometer: -1.0,
            ..sample_request(&photo.id)
        };
        let result = create_vehicle(&mut connection, negative_odometer)
            .expect_err("negative odometer should fail");
        assert!(result.contains("odometer"));
    }
}

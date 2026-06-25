use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VehiclePhotoRecord {
    pub id: String,
    pub vehicle_id: Option<String>,
    pub file_path: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size_bytes: i64,
    pub is_primary: bool,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleRecord {
    pub id: String,
    pub vehicle_name: String,
    pub primary_photo_id: Option<String>,
    pub primary_photo_path: Option<String>,
    pub primary_photo_mime_type: Option<String>,
    pub plate_number: Option<String>,
    pub vehicle_type: String,
    pub fuel_type: String,
    pub transmission_type: String,
    pub drivetrain: String,
    pub current_odometer: f64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreVehiclePhotoRequest {
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleMutationRequest {
    pub vehicle_name: String,
    pub primary_photo_id: String,
    pub plate_number: Option<String>,
    pub vehicle_type: String,
    pub fuel_type: String,
    pub transmission_type: Option<String>,
    pub drivetrain: Option<String>,
    pub current_odometer: f64,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NormalizedVehicleMutation {
    pub vehicle_name: String,
    pub primary_photo_id: String,
    pub plate_number: Option<String>,
    pub vehicle_type: String,
    pub fuel_type: String,
    pub transmission_type: String,
    pub drivetrain: String,
    pub current_odometer: f64,
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NewVehiclePhoto {
    pub id: String,
    pub vehicle_id: Option<String>,
    pub file_path: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub file_size_bytes: i64,
    pub is_primary: bool,
}

use tauri::AppHandle;

use crate::db;

use super::{
    models::{StoreVehiclePhotoRequest, VehicleMutationRequest, VehiclePhotoRecord, VehicleRecord},
    photo_storage::{prepare_vehicle_photo, remove_photo_file_if_present, vehicle_photos_dir},
    repository,
};

#[tauri::command]
pub fn list_vehicles(app: AppHandle) -> Result<Vec<VehicleRecord>, String> {
    let connection = db::open_app_connection(&app)?;
    repository::list_vehicles(&connection)
}

#[tauri::command]
pub fn get_vehicle(app: AppHandle, id: String) -> Result<VehicleRecord, String> {
    let connection = db::open_app_connection(&app)?;
    repository::get_vehicle(&connection, &id)?.ok_or_else(|| "Vehicle was not found.".to_string())
}

#[tauri::command]
pub fn store_vehicle_photo(
    app: AppHandle,
    request: StoreVehiclePhotoRequest,
) -> Result<VehiclePhotoRecord, String> {
    let photos_dir = vehicle_photos_dir(&app)?;
    let photo = prepare_vehicle_photo(&photos_dir, request)?;
    let photo_path = photo.file_path.clone();
    let connection = db::open_app_connection(&app)?;

    repository::insert_vehicle_photo(&connection, photo).map_err(|error| {
        remove_photo_file_if_present(&photo_path);
        error
    })
}

#[tauri::command]
pub fn create_vehicle(
    app: AppHandle,
    request: VehicleMutationRequest,
) -> Result<VehicleRecord, String> {
    let mut connection = db::open_app_connection(&app)?;
    repository::create_vehicle(&mut connection, request)
}

#[tauri::command]
pub fn update_vehicle(
    app: AppHandle,
    id: String,
    request: VehicleMutationRequest,
) -> Result<VehicleRecord, String> {
    let mut connection = db::open_app_connection(&app)?;
    repository::update_vehicle(&mut connection, &id, request)
}

#[tauri::command]
pub fn archive_vehicle(app: AppHandle, id: String) -> Result<(), String> {
    let connection = db::open_app_connection(&app)?;
    repository::archive_vehicle(&connection, &id)
}

use std::{
    fs,
    path::{Path, PathBuf},
};

use tauri::{AppHandle, Manager};

use crate::vehicles::photo_storage::generate_local_id;

use super::models::{
    NewMaintenancePhoto, NewMaintenanceReceipt, StoreMaintenancePhotoRequest,
    StoreMaintenanceReceiptRequest,
};

const MAX_MAINTENANCE_FILE_BYTES: usize = 10 * 1024 * 1024;

pub fn maintenance_receipts_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("maintenance-receipts"))
        .map_err(|_| "Could not find the app data folder for maintenance receipts.".to_string())
}

pub fn maintenance_photos_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("maintenance-photos"))
        .map_err(|_| "Could not find the app data folder for maintenance photos.".to_string())
}

pub fn prepare_maintenance_receipt(
    receipts_dir: &Path,
    request: StoreMaintenanceReceiptRequest,
) -> Result<NewMaintenanceReceipt, String> {
    validate_file_bytes(&request.bytes, "maintenance receipt")?;
    fs::create_dir_all(receipts_dir)
        .map_err(|_| "Could not create the local maintenance receipt folder.".to_string())?;

    let vehicle_id = required_trimmed(request.vehicle_id, "Choose a vehicle before saving.")?;
    let id = generate_local_id("maintenance_receipt");
    let extension = receipt_extension(
        request.original_filename.as_deref(),
        request.mime_type.as_deref(),
    )
    .ok_or_else(|| "Choose a PNG, JPG, WEBP, or PDF maintenance receipt.".to_string())?;
    let file_path = receipts_dir.join(format!("{id}.{extension}"));

    fs::write(&file_path, &request.bytes)
        .map_err(|_| "Could not save the maintenance receipt locally.".to_string())?;

    Ok(NewMaintenanceReceipt {
        id,
        vehicle_id,
        file_path: file_path.display().to_string(),
        original_filename: trim_optional(request.original_filename),
        file_size_bytes: request.bytes.len() as i64,
    })
}

pub fn prepare_maintenance_photo(
    photos_dir: &Path,
    request: StoreMaintenancePhotoRequest,
) -> Result<NewMaintenancePhoto, String> {
    validate_file_bytes(&request.bytes, "maintenance photo")?;
    fs::create_dir_all(photos_dir)
        .map_err(|_| "Could not create the local maintenance photo folder.".to_string())?;

    let vehicle_id = required_trimmed(request.vehicle_id, "Choose a vehicle before saving.")?;
    let id = generate_local_id("maintenance_photo");
    let extension = photo_extension(
        request.original_filename.as_deref(),
        request.mime_type.as_deref(),
    )
    .ok_or_else(|| "Choose a PNG, JPG, or WEBP maintenance photo.".to_string())?;
    let file_path = photos_dir.join(format!("{id}.{extension}"));

    fs::write(&file_path, &request.bytes)
        .map_err(|_| "Could not save the maintenance photo locally.".to_string())?;

    Ok(NewMaintenancePhoto {
        id,
        vehicle_id,
        file_path: file_path.display().to_string(),
        original_filename: trim_optional(request.original_filename),
        mime_type: normalize_mime_type(request.mime_type.as_deref(), &extension),
        file_size_bytes: request.bytes.len() as i64,
    })
}

pub fn remove_file_if_present(file_path: &str) {
    let _ = fs::remove_file(file_path);
}

fn validate_file_bytes(bytes: &[u8], label: &str) -> Result<(), String> {
    if bytes.is_empty() {
        return Err(format!("Choose a {label} file before saving."));
    }

    if bytes.len() > MAX_MAINTENANCE_FILE_BYTES {
        return Err("Maintenance files must be 10 MB or smaller.".to_string());
    }

    Ok(())
}

fn receipt_extension(original_filename: Option<&str>, mime_type: Option<&str>) -> Option<String> {
    extension_from_filename(original_filename, true)
        .or_else(|| mime_type.and_then(|value| extension_from_mime_type(value, true)))
}

fn photo_extension(original_filename: Option<&str>, mime_type: Option<&str>) -> Option<String> {
    extension_from_filename(original_filename, false)
        .or_else(|| mime_type.and_then(|value| extension_from_mime_type(value, false)))
}

fn extension_from_filename(original_filename: Option<&str>, allow_pdf: bool) -> Option<String> {
    original_filename
        .and_then(|filename| Path::new(filename).extension())
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .and_then(|extension| normalize_extension(&extension, allow_pdf))
}

fn normalize_extension(extension: &str, allow_pdf: bool) -> Option<String> {
    match extension {
        "jpg" | "jpeg" => Some("jpg".to_string()),
        "png" => Some("png".to_string()),
        "webp" => Some("webp".to_string()),
        "pdf" if allow_pdf => Some("pdf".to_string()),
        _ => None,
    }
}

fn extension_from_mime_type(mime_type: &str, allow_pdf: bool) -> Option<String> {
    match mime_type.to_ascii_lowercase().as_str() {
        "image/jpeg" | "image/jpg" => Some("jpg".to_string()),
        "image/png" => Some("png".to_string()),
        "image/webp" => Some("webp".to_string()),
        "application/pdf" if allow_pdf => Some("pdf".to_string()),
        _ => None,
    }
}

fn normalize_mime_type(mime_type: Option<&str>, extension: &str) -> Option<String> {
    let trimmed = mime_type.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    });

    trimmed.or_else(|| {
        Some(
            match extension {
                "jpg" => "image/jpeg",
                "png" => "image/png",
                "webp" => "image/webp",
                _ => return None,
            }
            .to_string(),
        )
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_maintenance_receipts_and_photos_to_requested_folders() {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let receipt = prepare_maintenance_receipt(
            temp_dir.path(),
            StoreMaintenanceReceiptRequest {
                vehicle_id: "vehicle-1".to_string(),
                original_filename: Some("receipt.pdf".to_string()),
                mime_type: Some("application/pdf".to_string()),
                bytes: vec![1, 2, 3],
            },
        )
        .expect("receipt should save");
        let photo = prepare_maintenance_photo(
            temp_dir.path(),
            StoreMaintenancePhotoRequest {
                vehicle_id: "vehicle-1".to_string(),
                original_filename: Some("before.jpg".to_string()),
                mime_type: Some("image/jpeg".to_string()),
                bytes: vec![4, 5, 6],
            },
        )
        .expect("photo should save");

        assert!(Path::new(&receipt.file_path).exists());
        assert!(Path::new(&photo.file_path).exists());
        assert_eq!(photo.mime_type.as_deref(), Some("image/jpeg"));
    }
}

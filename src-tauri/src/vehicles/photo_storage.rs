use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, Manager};

use super::models::{NewVehiclePhoto, StoreVehiclePhotoRequest};

const MAX_PHOTO_BYTES: usize = 10 * 1024 * 1024;
static NEXT_ID_SUFFIX: AtomicU64 = AtomicU64::new(1);

pub fn vehicle_photos_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("vehicle-photos"))
        .map_err(|_| "Could not find the app data folder for vehicle photos.".to_string())
}

pub fn prepare_vehicle_photo(
    photos_dir: &Path,
    request: StoreVehiclePhotoRequest,
) -> Result<NewVehiclePhoto, String> {
    validate_photo_request(&request)?;
    fs::create_dir_all(photos_dir)
        .map_err(|_| "Could not create the local vehicle photo folder.".to_string())?;

    let id = generate_local_id("photo");
    let extension = photo_extension(
        request.original_filename.as_deref(),
        request.mime_type.as_deref(),
    )
    .ok_or_else(|| "Choose a PNG, JPG, WEBP, or GIF image for the vehicle picture.".to_string())?;
    let file_path = photos_dir.join(format!("{id}.{extension}"));

    fs::write(&file_path, &request.bytes)
        .map_err(|_| "Could not save the vehicle picture in the app data folder.".to_string())?;

    Ok(NewVehiclePhoto {
        id,
        vehicle_id: None,
        file_path: file_path.display().to_string(),
        original_filename: trim_optional(request.original_filename),
        mime_type: normalize_mime_type(request.mime_type.as_deref(), &extension),
        file_size_bytes: request.bytes.len() as i64,
        is_primary: true,
    })
}

pub fn remove_photo_file_if_present(file_path: &str) {
    let _ = fs::remove_file(file_path);
}

pub fn generate_local_id(prefix: &str) -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    let suffix = NEXT_ID_SUFFIX.fetch_add(1, Ordering::Relaxed);

    format!("{prefix}_{timestamp}_{suffix}")
}

fn validate_photo_request(request: &StoreVehiclePhotoRequest) -> Result<(), String> {
    if request.bytes.is_empty() {
        return Err("Choose a vehicle picture before saving.".to_string());
    }

    if request.bytes.len() > MAX_PHOTO_BYTES {
        return Err("Vehicle pictures must be 10 MB or smaller.".to_string());
    }

    Ok(())
}

fn photo_extension(original_filename: Option<&str>, mime_type: Option<&str>) -> Option<String> {
    if let Some(filename) = original_filename {
        let extension = Path::new(filename)
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_ascii_lowercase());

        if let Some(extension) = extension.and_then(normalize_extension) {
            return Some(extension);
        }
    }

    mime_type.and_then(extension_from_mime_type)
}

fn normalize_extension(extension: String) -> Option<String> {
    match extension.as_str() {
        "jpg" | "jpeg" => Some("jpg".to_string()),
        "png" => Some("png".to_string()),
        "webp" => Some("webp".to_string()),
        "gif" => Some("gif".to_string()),
        _ => None,
    }
}

fn extension_from_mime_type(mime_type: &str) -> Option<String> {
    match mime_type.to_ascii_lowercase().as_str() {
        "image/jpeg" | "image/jpg" => Some("jpg".to_string()),
        "image/png" => Some("png".to_string()),
        "image/webp" => Some("webp".to_string()),
        "image/gif" => Some("gif".to_string()),
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
                "gif" => "image/gif",
                _ => return None,
            }
            .to_string(),
        )
    })
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
    fn writes_photo_bytes_to_the_requested_folder() {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let photo = prepare_vehicle_photo(
            temp_dir.path(),
            StoreVehiclePhotoRequest {
                original_filename: Some("front.jpg".to_string()),
                mime_type: Some("image/jpeg".to_string()),
                bytes: vec![1, 2, 3],
            },
        )
        .expect("photo should save");

        assert!(Path::new(&photo.file_path).exists());
        assert_eq!(photo.original_filename.as_deref(), Some("front.jpg"));
        assert_eq!(photo.mime_type.as_deref(), Some("image/jpeg"));
        assert_eq!(photo.file_size_bytes, 3);
    }
}

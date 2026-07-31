use std::{fs, path::Path};

use crate::vehicles::photo_storage::generate_local_id;

use super::models::{NewFuelReceipt, StoreFuelReceiptRequest};

const MAX_RECEIPT_BYTES: usize = 10 * 1024 * 1024;

pub fn prepare_fuel_receipt(
    receipts_dir: &Path,
    request: StoreFuelReceiptRequest,
) -> Result<NewFuelReceipt, String> {
    validate_receipt_request(&request)?;
    fs::create_dir_all(receipts_dir)
        .map_err(|_| "Could not create the local fuel receipt folder.".to_string())?;

    let vehicle_id = required_trimmed(request.vehicle_id, "Choose a vehicle before saving.")?;
    let id = generate_local_id("fuel_receipt");
    let extension = receipt_extension(
        request.original_filename.as_deref(),
        request.mime_type.as_deref(),
    )
    .ok_or_else(|| "Choose a PNG, JPG, WEBP, or PDF receipt file.".to_string())?;
    let file_path = receipts_dir.join(format!("{id}.{extension}"));

    fs::write(&file_path, &request.bytes)
        .map_err(|_| "Could not save the fuel receipt in the app data folder.".to_string())?;

    Ok(NewFuelReceipt {
        id,
        vehicle_id,
        file_path: file_path.display().to_string(),
        original_filename: trim_optional(request.original_filename),
        file_size_bytes: request.bytes.len() as i64,
    })
}

pub fn remove_receipt_file_if_present(file_path: &str) {
    let _ = fs::remove_file(file_path);
}

fn validate_receipt_request(request: &StoreFuelReceiptRequest) -> Result<(), String> {
    if request.bytes.is_empty() {
        return Err("Choose a receipt file before saving.".to_string());
    }

    if request.bytes.len() > MAX_RECEIPT_BYTES {
        return Err("Fuel receipt files must be 10 MB or smaller.".to_string());
    }

    Ok(())
}

fn receipt_extension(original_filename: Option<&str>, mime_type: Option<&str>) -> Option<String> {
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
        "pdf" => Some("pdf".to_string()),
        _ => None,
    }
}

fn extension_from_mime_type(mime_type: &str) -> Option<String> {
    match mime_type.to_ascii_lowercase().as_str() {
        "image/jpeg" | "image/jpg" => Some("jpg".to_string()),
        "image/png" => Some("png".to_string()),
        "image/webp" => Some("webp".to_string()),
        "application/pdf" => Some("pdf".to_string()),
        _ => None,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_receipt_bytes_to_the_requested_folder() {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let receipt = prepare_fuel_receipt(
            temp_dir.path(),
            StoreFuelReceiptRequest {
                vehicle_id: "vehicle-1".to_string(),
                original_filename: Some("receipt.pdf".to_string()),
                mime_type: Some("application/pdf".to_string()),
                bytes: vec![1, 2, 3],
            },
        )
        .expect("receipt should save");

        assert!(Path::new(&receipt.file_path).exists());
        assert_eq!(receipt.vehicle_id, "vehicle-1");
        assert_eq!(receipt.original_filename.as_deref(), Some("receipt.pdf"));
        assert_eq!(receipt.file_size_bytes, 3);
    }
}

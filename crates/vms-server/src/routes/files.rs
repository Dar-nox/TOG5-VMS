use std::path::{Component, Path as StdPath};

use axum::{
    extract::{Path, State},
    http::header::{CACHE_CONTROL, CONTENT_TYPE},
    response::{IntoResponse, Response},
};
use vms_core::paths::MANAGED_FILE_DIRS;

use crate::{error::ApiError, session::CurrentUser, state::AppState};

const MISSING_FILE: &str = "That file is no longer available.";

/// Serves vehicle photos and receipts, replacing the desktop build's asset
/// protocol. Sign-in is required, and the requested name has to resolve to a
/// file that really sits inside one of the four managed folders — a name is a
/// name, never a path.
pub async fn serve(
    State(state): State<AppState>,
    CurrentUser(_user): CurrentUser,
    Path((kind, name)): Path<(String, String)>,
) -> Result<Response, ApiError> {
    let folder = MANAGED_FILE_DIRS
        .iter()
        .find(|managed| **managed == kind)
        .ok_or_else(|| ApiError::not_found(MISSING_FILE))?;
    let file_name = single_file_name(&name)?;

    let folder_path = tokio::fs::canonicalize(state.paths().data_dir().join(folder))
        .await
        .map_err(|_| ApiError::not_found(MISSING_FILE))?;
    let file_path = tokio::fs::canonicalize(folder_path.join(file_name))
        .await
        .map_err(|_| ApiError::not_found(MISSING_FILE))?;

    if !file_path.starts_with(&folder_path) {
        return Err(ApiError::not_found(MISSING_FILE));
    }

    let bytes = tokio::fs::read(&file_path)
        .await
        .map_err(|_| ApiError::not_found(MISSING_FILE))?;
    let content_type = mime_guess::from_path(&file_path).first_or_octet_stream();

    Ok((
        [
            (CONTENT_TYPE, content_type.as_ref()),
            // Private, because these are somebody's fuel receipts.
            (CACHE_CONTROL, "private, max-age=3600"),
        ],
        bytes,
    )
        .into_response())
}

fn single_file_name(name: &str) -> Result<&str, ApiError> {
    if name.is_empty() || name.contains('/') || name.contains('\\') {
        return Err(ApiError::not_found(MISSING_FILE));
    }

    let mut components = StdPath::new(name).components();

    match (components.next(), components.next()) {
        (Some(Component::Normal(_)), None) => Ok(name),
        _ => Err(ApiError::not_found(MISSING_FILE)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_anything_that_is_not_a_plain_file_name() {
        assert!(single_file_name("photo_1.jpg").is_ok());

        for attempt in [
            "",
            "..",
            "../secrets.txt",
            "..\\secrets.txt",
            "nested/photo.jpg",
            "nested\\photo.jpg",
            "/etc/passwd",
            "C:\\Windows\\win.ini",
        ] {
            assert!(
                single_file_name(attempt).is_err(),
                "'{attempt}' should not be accepted as a managed file name"
            );
        }
    }
}

use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::paths::{AppPaths, MANAGED_FILE_DIRS};

pub struct ClearManagedFolderResult {
    pub folder_names: Vec<String>,
    pub files_removed: u64,
}

pub fn clear_managed_folders(paths: &AppPaths) -> Result<ClearManagedFolderResult, String> {
    fs::create_dir_all(paths.data_dir())
        .map_err(|_| "Could not prepare the app data folder.".to_string())?;

    let mut folder_names = Vec::new();
    let mut files_removed = 0;

    for folder_name in MANAGED_FILE_DIRS {
        let folder_path = paths.data_dir().join(folder_name);
        files_removed += count_files(&folder_path)?;

        if folder_path.exists() {
            fs::remove_dir_all(&folder_path)
                .map_err(|_| format!("Could not clear local {folder_name} files."))?;
        }

        fs::create_dir_all(&folder_path)
            .map_err(|_| format!("Could not recreate the local {folder_name} folder."))?;
        folder_names.push((*folder_name).to_string());
    }

    Ok(ClearManagedFolderResult {
        folder_names,
        files_removed,
    })
}

pub fn count_files(path: &Path) -> Result<u64, String> {
    if !path.exists() {
        return Ok(0);
    }

    let mut count = 0;
    let mut stack: Vec<PathBuf> = vec![path.to_path_buf()];

    while let Some(current_path) = stack.pop() {
        for entry in fs::read_dir(&current_path)
            .map_err(|_| "Could not inspect local app-managed files.".to_string())?
        {
            let entry =
                entry.map_err(|_| "Could not inspect a local app-managed file.".to_string())?;
            let file_type = entry
                .file_type()
                .map_err(|_| "Could not inspect a local app-managed file.".to_string())?;

            if file_type.is_dir() {
                stack.push(entry.path());
            } else if file_type.is_file() {
                count += 1;
            }
        }
    }

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clears_every_managed_folder_and_reports_removed_files() {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let paths = AppPaths::new(temp_dir.path().to_path_buf(), "0.3.0");

        fs::create_dir_all(paths.vehicle_photos_dir()).expect("photo dir should be created");
        fs::write(paths.vehicle_photos_dir().join("a.jpg"), [1, 2, 3])
            .expect("photo should be written");
        fs::create_dir_all(paths.fuel_receipts_dir()).expect("receipt dir should be created");
        fs::write(paths.fuel_receipts_dir().join("b.png"), [4, 5]).expect("receipt should write");

        let result = clear_managed_folders(&paths).expect("folders should clear");

        assert_eq!(result.files_removed, 2);
        assert_eq!(result.folder_names.len(), MANAGED_FILE_DIRS.len());
        assert!(paths.vehicle_photos_dir().exists());
        assert_eq!(count_files(&paths.vehicle_photos_dir()).expect("count"), 0);
    }
}

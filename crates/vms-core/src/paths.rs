use std::path::{Path, PathBuf};

use crate::db::DATABASE_FILE_NAME;

pub const VEHICLE_PHOTOS_DIR: &str = "vehicle-photos";
pub const FUEL_RECEIPTS_DIR: &str = "fuel-receipts";
pub const MAINTENANCE_RECEIPTS_DIR: &str = "maintenance-receipts";
pub const MAINTENANCE_PHOTOS_DIR: &str = "maintenance-photos";

pub const MANAGED_FILE_DIRS: &[&str] = &[
    VEHICLE_PHOTOS_DIR,
    FUEL_RECEIPTS_DIR,
    MAINTENANCE_RECEIPTS_DIR,
    MAINTENANCE_PHOTOS_DIR,
];

#[derive(Debug, Clone)]
pub struct AppPaths {
    data_dir: PathBuf,
    app_version: String,
}

impl AppPaths {
    pub fn new(data_dir: impl Into<PathBuf>, app_version: impl Into<String>) -> Self {
        Self {
            data_dir: data_dir.into(),
            app_version: app_version.into(),
        }
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    pub fn app_version(&self) -> &str {
        &self.app_version
    }

    pub fn database_path(&self) -> PathBuf {
        self.data_dir.join(DATABASE_FILE_NAME)
    }

    pub fn vehicle_photos_dir(&self) -> PathBuf {
        self.data_dir.join(VEHICLE_PHOTOS_DIR)
    }

    pub fn fuel_receipts_dir(&self) -> PathBuf {
        self.data_dir.join(FUEL_RECEIPTS_DIR)
    }

    pub fn maintenance_receipts_dir(&self) -> PathBuf {
        self.data_dir.join(MAINTENANCE_RECEIPTS_DIR)
    }

    pub fn maintenance_photos_dir(&self) -> PathBuf {
        self.data_dir.join(MAINTENANCE_PHOTOS_DIR)
    }

    pub fn managed_file_dirs(&self) -> Vec<PathBuf> {
        MANAGED_FILE_DIRS
            .iter()
            .map(|name| self.data_dir.join(name))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_every_managed_location_under_the_data_dir() {
        let paths = AppPaths::new(PathBuf::from("/data/tog5"), "0.3.0");

        assert_eq!(paths.database_path(), Path::new("/data/tog5/tog5-vms.sqlite3"));
        assert_eq!(paths.vehicle_photos_dir(), Path::new("/data/tog5/vehicle-photos"));
        assert_eq!(paths.fuel_receipts_dir(), Path::new("/data/tog5/fuel-receipts"));
        assert_eq!(paths.app_version(), "0.3.0");
        assert_eq!(paths.managed_file_dirs().len(), MANAGED_FILE_DIRS.len());
    }
}

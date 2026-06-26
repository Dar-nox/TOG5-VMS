use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupManifest {
    pub app_name: String,
    pub app_version: String,
    pub format_version: i64,
    pub created_at: String,
    pub database_file_name: String,
    pub included_folders: Vec<String>,
    pub file_count: usize,
    pub total_size_bytes: u64,
    pub checksum_algorithm: String,
    pub files: Vec<BackupManifestFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupManifestFile {
    pub path: String,
    pub size_bytes: u64,
    pub checksum: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupPackageResponse {
    pub id: String,
    pub backup_path: String,
    pub manifest: BackupManifest,
    pub size_bytes: u64,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupValidationResult {
    pub backup_path: String,
    pub valid: bool,
    pub manifest: Option<BackupManifest>,
    pub issues: Vec<FileIntegrityIssue>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBackupRequest {
    pub backup_path: String,
    pub confirm_restore: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBackupResponse {
    pub restored: bool,
    pub restart_required: bool,
    pub restored_from: String,
    pub safety_backup_path: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupHistoryRecord {
    pub id: String,
    pub backup_path: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub verified_at: Option<String>,
    pub size_bytes: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FileIntegrityIssue {
    pub severity: String,
    pub code: String,
    pub message: String,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderSummary {
    pub folder_name: String,
    pub folder_path: String,
    pub exists: bool,
    pub file_count: usize,
    pub total_size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileSafetySummary {
    pub database_path: String,
    pub database_exists: bool,
    pub managed_folders: Vec<ManagedFolderSummary>,
    pub referenced_file_count: usize,
    pub missing_reference_count: usize,
    pub issues: Vec<FileIntegrityIssue>,
}

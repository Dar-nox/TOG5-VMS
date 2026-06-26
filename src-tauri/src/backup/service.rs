use std::{
    fs,
    io::Read,
    path::{Component, Path, PathBuf},
};

use rusqlite::{params, Connection, OpenFlags, OptionalExtension};

use crate::{
    db::{self, DATABASE_FILE_NAME, MIGRATIONS},
    vehicles::photo_storage::generate_local_id,
};

use super::models::{
    BackupHistoryRecord, BackupManifest, BackupManifestFile, BackupPackageResponse,
    BackupValidationResult, FileIntegrityIssue, LocalFileSafetySummary, ManagedFolderSummary,
    RestoreBackupRequest, RestoreBackupResponse,
};

const BACKUP_FORMAT_VERSION: i64 = 1;
const CHECKSUM_ALGORITHM: &str = "fnv1a64";
const MANIFEST_FILE_NAME: &str = "manifest.json";
const BACKUP_FOLDER_NAME: &str = "backups";
const DATABASE_PACKAGE_PATH: &str = "database/tog5-vms.sqlite3";
const MANAGED_FOLDERS: &[&str] = &[
    "vehicle-photos",
    "fuel-receipts",
    "maintenance-receipts",
    "maintenance-photos",
];

#[derive(Debug, Clone)]
pub struct BackupContext {
    pub app_data_dir: PathBuf,
    pub database_path: PathBuf,
    pub backup_root_dir: PathBuf,
    pub app_version: String,
}

impl BackupContext {
    pub fn new(app_data_dir: PathBuf, database_path: PathBuf, app_version: String) -> Self {
        let backup_root_dir = app_data_dir.join(BACKUP_FOLDER_NAME);

        Self {
            app_data_dir,
            database_path,
            backup_root_dir,
            app_version,
        }
    }
}

pub fn create_backup(context: &BackupContext) -> Result<BackupPackageResponse, String> {
    create_backup_with_note(context, "Manual backup created from Backup & Restore.")
}

pub fn create_backup_with_note(
    context: &BackupContext,
    history_note: &str,
) -> Result<BackupPackageResponse, String> {
    fs::create_dir_all(&context.backup_root_dir)
        .map_err(|_| "Could not create the local backup folder.".to_string())?;

    let id = generate_local_id("backup");
    let package_dir = context
        .backup_root_dir
        .join(format!("tog5-vms-{id}.tog5backup"));

    if package_dir.exists() {
        fs::remove_dir_all(&package_dir)
            .map_err(|_| "Could not prepare the backup package folder.".to_string())?;
    }

    fs::create_dir_all(package_dir.join("database"))
        .map_err(|_| "Could not create the backup database folder.".to_string())?;
    fs::create_dir_all(package_dir.join("files"))
        .map_err(|_| "Could not create the backup files folder.".to_string())?;

    let snapshot_path = package_dir.join(DATABASE_PACKAGE_PATH);
    create_database_snapshot(&context.database_path, &snapshot_path)?;

    for folder_name in MANAGED_FOLDERS {
        let source = context.app_data_dir.join(folder_name);
        let destination = package_dir.join("files").join(folder_name);
        fs::create_dir_all(&destination)
            .map_err(|_| format!("Could not create backup folder for {folder_name}."))?;

        if source.exists() {
            copy_directory_contents(&source, &destination)?;
        }
    }

    let files = collect_manifest_files(&package_dir)?;
    let total_size_bytes = files.iter().map(|file| file.size_bytes).sum();
    let manifest = BackupManifest {
        app_name: "TOG 5 VMS".to_string(),
        app_version: context.app_version.clone(),
        format_version: BACKUP_FORMAT_VERSION,
        created_at: current_timestamp(&context.database_path)?,
        database_file_name: DATABASE_FILE_NAME.to_string(),
        included_folders: MANAGED_FOLDERS
            .iter()
            .map(|folder| (*folder).to_string())
            .collect(),
        file_count: files.len(),
        total_size_bytes,
        checksum_algorithm: CHECKSUM_ALGORITHM.to_string(),
        files,
    };

    write_manifest(&package_dir, &manifest)?;
    let package_size = directory_size(&package_dir)?;

    record_backup_history(
        &context.database_path,
        &id,
        &package_dir,
        "completed",
        Some(package_size as i64),
        history_note,
        true,
    )?;

    Ok(BackupPackageResponse {
        id,
        backup_path: package_dir.display().to_string(),
        manifest,
        size_bytes: package_size,
        status: "completed".to_string(),
        message: "Backup package created locally.".to_string(),
    })
}

pub fn validate_backup_package(package_path: &Path) -> BackupValidationResult {
    let mut issues = Vec::new();
    let backup_path = package_path.display().to_string();

    if !package_path.exists() {
        issues.push(issue(
            "error",
            "package_missing",
            "Backup package was not found.",
            Some(package_path),
        ));
        return BackupValidationResult {
            backup_path,
            valid: false,
            manifest: None,
            issues,
        };
    }

    if !package_path.is_dir() {
        issues.push(issue(
            "error",
            "package_not_folder",
            "This backup format must be a .tog5backup folder.",
            Some(package_path),
        ));
        return BackupValidationResult {
            backup_path,
            valid: false,
            manifest: None,
            issues,
        };
    }

    let manifest_path = package_path.join(MANIFEST_FILE_NAME);
    let manifest = match read_manifest(&manifest_path) {
        Ok(manifest) => manifest,
        Err(error) => {
            issues.push(issue(
                "error",
                "manifest_invalid",
                &error,
                Some(&manifest_path),
            ));
            return BackupValidationResult {
                backup_path,
                valid: false,
                manifest: None,
                issues,
            };
        }
    };

    if manifest.format_version != BACKUP_FORMAT_VERSION {
        issues.push(issue(
            "error",
            "unsupported_format_version",
            "This backup format version is not supported by this app build.",
            Some(&manifest_path),
        ));
    }

    if manifest.database_file_name != DATABASE_FILE_NAME {
        issues.push(issue(
            "error",
            "database_name_mismatch",
            "The backup manifest does not describe the expected TOG 5 VMS database.",
            Some(&manifest_path),
        ));
    }

    if manifest.checksum_algorithm != CHECKSUM_ALGORITHM {
        issues.push(issue(
            "error",
            "unsupported_checksum",
            "The backup checksum format is not supported by this app build.",
            Some(&manifest_path),
        ));
    }

    let database_path = package_path.join(DATABASE_PACKAGE_PATH);
    if !database_path.exists() {
        issues.push(issue(
            "error",
            "database_missing",
            "The backup database snapshot is missing.",
            Some(&database_path),
        ));
    } else if let Err(error) = validate_database_snapshot(&database_path) {
        issues.push(issue(
            "error",
            "database_invalid",
            &error,
            Some(&database_path),
        ));
    }

    for file in &manifest.files {
        match validate_manifest_file(package_path, file) {
            Ok(()) => {}
            Err(error) => issues.push(error),
        }
    }

    let valid = !issues.iter().any(|issue| issue.severity == "error");

    BackupValidationResult {
        backup_path,
        valid,
        manifest: Some(manifest),
        issues,
    }
}

pub fn restore_backup(
    context: &BackupContext,
    request: RestoreBackupRequest,
) -> Result<RestoreBackupResponse, String> {
    if !request.confirm_restore {
        return Err("Confirm restore before replacing local app data.".to_string());
    }

    let package_path = PathBuf::from(request.backup_path.trim());
    let validation = validate_backup_package(&package_path);
    if !validation.valid {
        return Err("Backup validation failed. Existing data was not changed.".to_string());
    }

    let restore_id = generate_local_id("restore");
    let staging_dir = context
        .app_data_dir
        .join(format!("restore-staging-{restore_id}"));
    if staging_dir.exists() {
        fs::remove_dir_all(&staging_dir)
            .map_err(|_| "Could not prepare restore staging.".to_string())?;
    }

    fs::create_dir_all(&staging_dir)
        .map_err(|_| "Could not create restore staging.".to_string())?;

    let safety_backup = create_backup_with_note(
        context,
        "Pre-restore safety backup created before replacing local app data.",
    )?;

    copy_restore_payload_to_staging(&package_path, &staging_dir)?;
    apply_staged_restore(context, &staging_dir)?;
    let _ = fs::remove_dir_all(&staging_dir);

    record_backup_history(
        &context.database_path,
        &restore_id,
        &package_path,
        "restored",
        validation
            .manifest
            .as_ref()
            .map(|manifest| manifest.total_size_bytes as i64),
        "Restore applied from a validated local backup package. Restart required.",
        true,
    )?;

    Ok(RestoreBackupResponse {
        restored: true,
        restart_required: true,
        restored_from: package_path.display().to_string(),
        safety_backup_path: safety_backup.backup_path,
        message: "Restore completed. Restart TOG 5 VMS before continuing to work.".to_string(),
    })
}

pub fn list_backup_history(database_path: &Path) -> Result<Vec<BackupHistoryRecord>, String> {
    if !database_path.exists() {
        return Ok(Vec::new());
    }

    let connection = db::open_database_at_path(database_path)?;
    let mut statement = connection
        .prepare(
            "
            SELECT
              id,
              backup_path,
              status,
              started_at,
              completed_at,
              verified_at,
              size_bytes,
              notes
            FROM backups
            ORDER BY started_at DESC, created_at DESC
            ",
        )
        .map_err(|_| "Could not prepare backup history.".to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(BackupHistoryRecord {
                id: row.get(0)?,
                backup_path: row.get(1)?,
                status: row.get(2)?,
                started_at: row.get(3)?,
                completed_at: row.get(4)?,
                verified_at: row.get(5)?,
                size_bytes: row.get(6)?,
                notes: row.get(7)?,
            })
        })
        .map_err(|_| "Could not read backup history.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse backup history.".to_string())
}

pub fn local_file_safety_summary(
    context: &BackupContext,
) -> Result<LocalFileSafetySummary, String> {
    let mut issues = Vec::new();
    let mut managed_folders = Vec::new();

    for folder_name in MANAGED_FOLDERS {
        let folder_path = context.app_data_dir.join(folder_name);
        let exists = folder_path.exists();
        let (file_count, total_size_bytes) = if exists {
            folder_counts(&folder_path)?
        } else {
            issues.push(issue(
                "warning",
                "managed_folder_missing",
                &format!(
                    "The managed folder '{folder_name}' does not exist yet. It will be created when needed."
                ),
                Some(&folder_path),
            ));
            (0, 0)
        };

        managed_folders.push(ManagedFolderSummary {
            folder_name: (*folder_name).to_string(),
            folder_path: folder_path.display().to_string(),
            exists,
            file_count,
            total_size_bytes,
        });
    }

    let mut referenced_file_count = 0;
    let mut missing_reference_count = 0;
    if context.database_path.exists() {
        let connection = db::open_database_at_path(&context.database_path)?;
        for referenced_file in referenced_file_paths(&connection)? {
            referenced_file_count += 1;
            if !Path::new(&referenced_file.path).exists() {
                missing_reference_count += 1;
                issues.push(issue(
                    "warning",
                    "referenced_file_missing",
                    &format!(
                        "{} references a local file that is missing.",
                        referenced_file.source_label
                    ),
                    Some(Path::new(&referenced_file.path)),
                ));
            }
        }
    } else {
        issues.push(issue(
            "error",
            "database_missing",
            "The local TOG 5 VMS database was not found.",
            Some(&context.database_path),
        ));
    }

    Ok(LocalFileSafetySummary {
        database_path: context.database_path.display().to_string(),
        database_exists: context.database_path.exists(),
        managed_folders,
        referenced_file_count,
        missing_reference_count,
        issues,
    })
}

fn create_database_snapshot(database_path: &Path, snapshot_path: &Path) -> Result<(), String> {
    if !database_path.exists() {
        return Err(
            "The local database does not exist yet, so a backup cannot be created.".to_string(),
        );
    }

    if snapshot_path.exists() {
        fs::remove_file(snapshot_path)
            .map_err(|_| "Could not prepare the database snapshot.".to_string())?;
    }

    let connection = db::open_database_at_path(database_path)?;
    let snapshot = snapshot_path.display().to_string();
    connection
        .execute("VACUUM main INTO ?1", params![snapshot])
        .map_err(|_| "Could not create a consistent database snapshot.".to_string())?;

    Ok(())
}

fn validate_database_snapshot(database_path: &Path) -> Result<(), String> {
    let connection = Connection::open_with_flags(database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|_| "The backup database could not be opened safely.".to_string())?;

    let migration_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
            row.get(0)
        })
        .map_err(|_| "The backup database is missing migration history.".to_string())?;

    if migration_count < MIGRATIONS.len() as i64 {
        return Err("The backup database is older than the supported local schema.".to_string());
    }

    for table in [
        "vehicles",
        "fuel_logs",
        "maintenance_logs",
        "expenses",
        "backups",
    ] {
        let exists = connection
            .query_row(
                "
                SELECT 1
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = ?1
                ",
                params![table],
                |_| Ok(()),
            )
            .optional()
            .map_err(|_| "Could not inspect the backup database schema.".to_string())?
            .is_some();

        if !exists {
            return Err(format!(
                "The backup database is missing the '{table}' table."
            ));
        }
    }

    Ok(())
}

fn copy_restore_payload_to_staging(package_path: &Path, staging_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(staging_dir).map_err(|_| "Could not create restore staging.".to_string())?;

    let database_source = package_path.join(DATABASE_PACKAGE_PATH);
    fs::copy(&database_source, staging_dir.join(DATABASE_FILE_NAME))
        .map_err(|_| "Could not stage the backup database.".to_string())?;

    for folder_name in MANAGED_FOLDERS {
        let source = package_path.join("files").join(folder_name);
        let destination = staging_dir.join(folder_name);
        fs::create_dir_all(&destination).map_err(|_| format!("Could not stage {folder_name}."))?;

        if source.exists() {
            copy_directory_contents(&source, &destination)?;
        }
    }

    Ok(())
}

fn apply_staged_restore(context: &BackupContext, staging_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(&context.app_data_dir)
        .map_err(|_| "Could not prepare the app data folder for restore.".to_string())?;

    remove_sqlite_sidecars(&context.database_path);
    fs::copy(staging_dir.join(DATABASE_FILE_NAME), &context.database_path)
        .map_err(|_| "Could not replace the local database with the restored copy.".to_string())?;
    remove_sqlite_sidecars(&context.database_path);

    for folder_name in MANAGED_FOLDERS {
        let source = staging_dir.join(folder_name);
        let destination = context.app_data_dir.join(folder_name);

        if destination.exists() {
            fs::remove_dir_all(&destination)
                .map_err(|_| format!("Could not prepare {folder_name} for restore."))?;
        }

        fs::create_dir_all(&destination)
            .map_err(|_| format!("Could not restore {folder_name}."))?;

        if source.exists() {
            copy_directory_contents(&source, &destination)?;
        }
    }

    Ok(())
}

fn remove_sqlite_sidecars(database_path: &Path) {
    let _ = fs::remove_file(path_with_suffix(database_path, "-wal"));
    let _ = fs::remove_file(path_with_suffix(database_path, "-shm"));
}

fn path_with_suffix(path: &Path, suffix: &str) -> PathBuf {
    PathBuf::from(format!("{}{}", path.display(), suffix))
}

fn write_manifest(package_dir: &Path, manifest: &BackupManifest) -> Result<(), String> {
    let json = serde_json::to_string_pretty(manifest)
        .map_err(|_| "Could not prepare the backup manifest.".to_string())?;
    fs::write(package_dir.join(MANIFEST_FILE_NAME), json)
        .map_err(|_| "Could not write the backup manifest.".to_string())
}

fn read_manifest(path: &Path) -> Result<BackupManifest, String> {
    let bytes =
        fs::read(path).map_err(|_| "Backup manifest is missing or unreadable.".to_string())?;
    serde_json::from_slice(&bytes).map_err(|_| "Backup manifest is not valid JSON.".to_string())
}

fn collect_manifest_files(package_dir: &Path) -> Result<Vec<BackupManifestFile>, String> {
    let mut paths = Vec::new();
    collect_files(package_dir, &mut paths)?;
    paths.retain(|path| {
        path.strip_prefix(package_dir)
            .ok()
            .and_then(|relative| relative.to_str())
            != Some(MANIFEST_FILE_NAME)
    });
    paths.sort();

    paths
        .into_iter()
        .map(|path| {
            let relative = path
                .strip_prefix(package_dir)
                .map_err(|_| "Could not prepare backup manifest paths.".to_string())?;
            let relative = normalize_relative_path(relative)?;
            let metadata =
                fs::metadata(&path).map_err(|_| "Could not inspect a backup file.".to_string())?;
            let checksum = checksum_file(&path)?;

            Ok(BackupManifestFile {
                path: relative,
                size_bytes: metadata.len(),
                checksum,
            })
        })
        .collect()
}

fn validate_manifest_file(
    package_path: &Path,
    file: &BackupManifestFile,
) -> Result<(), FileIntegrityIssue> {
    let relative_path = Path::new(&file.path);
    if !is_safe_relative_path(relative_path) {
        return Err(issue(
            "error",
            "path_traversal",
            "Backup manifest contains an unsafe file path.",
            Some(relative_path),
        ));
    }

    let path = package_path.join(relative_path);
    if !path.exists() {
        return Err(issue(
            "error",
            "manifest_file_missing",
            "A file listed in the backup manifest is missing.",
            Some(&path),
        ));
    }

    let metadata = fs::metadata(&path).map_err(|_| {
        issue(
            "error",
            "manifest_file_unreadable",
            "A file listed in the backup manifest could not be inspected.",
            Some(&path),
        )
    })?;

    if metadata.len() != file.size_bytes {
        return Err(issue(
            "error",
            "size_mismatch",
            "A backup file size does not match the manifest.",
            Some(&path),
        ));
    }

    let checksum = checksum_file(&path).map_err(|_| {
        issue(
            "error",
            "checksum_unreadable",
            "A backup file could not be read for checksum validation.",
            Some(&path),
        )
    })?;

    if checksum != file.checksum {
        return Err(issue(
            "error",
            "checksum_mismatch",
            "A backup file checksum does not match the manifest.",
            Some(&path),
        ));
    }

    Ok(())
}

fn copy_directory_contents(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination)
        .map_err(|_| "Could not create a local file folder.".to_string())?;

    for entry in
        fs::read_dir(source).map_err(|_| "Could not read a local file folder.".to_string())?
    {
        let entry = entry.map_err(|_| "Could not read a local file entry.".to_string())?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());

        if source_path.is_dir() {
            copy_directory_contents(&source_path, &destination_path)?;
        } else if source_path.is_file() {
            fs::copy(&source_path, &destination_path)
                .map_err(|_| "Could not copy a local file.".to_string())?;
        }
    }

    Ok(())
}

fn collect_files(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(dir).map_err(|_| "Could not read a local folder.".to_string())? {
        let entry = entry.map_err(|_| "Could not read a local file entry.".to_string())?;
        let path = entry.path();

        if path.is_dir() {
            collect_files(&path, files)?;
        } else if path.is_file() {
            files.push(path);
        }
    }

    Ok(())
}

fn directory_size(path: &Path) -> Result<u64, String> {
    let mut files = Vec::new();
    collect_files(path, &mut files)?;
    files.into_iter().try_fold(0_u64, |total, path| {
        fs::metadata(path)
            .map(|metadata| total + metadata.len())
            .map_err(|_| "Could not calculate backup size.".to_string())
    })
}

fn folder_counts(path: &Path) -> Result<(usize, u64), String> {
    let mut files = Vec::new();
    collect_files(path, &mut files)?;
    let total_size = files.iter().try_fold(0_u64, |total, path| {
        fs::metadata(path)
            .map(|metadata| total + metadata.len())
            .map_err(|_| "Could not inspect local file storage.".to_string())
    })?;

    Ok((files.len(), total_size))
}

fn checksum_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|_| "Could not read a local file.".to_string())?;
    let mut hash = 0xcbf29ce484222325_u64;
    let mut buffer = [0_u8; 8192];

    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|_| "Could not calculate a file checksum.".to_string())?;
        if read == 0 {
            break;
        }

        for byte in &buffer[..read] {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
    }

    Ok(format!("{hash:016x}"))
}

fn referenced_file_paths(connection: &Connection) -> Result<Vec<ReferencedFile>, String> {
    let mut files = Vec::new();
    let mut photo_statement = connection
        .prepare(
            "
            SELECT id, file_path
            FROM vehicle_photos
            WHERE deleted_at IS NULL
            ",
        )
        .map_err(|_| "Could not inspect vehicle photo references.".to_string())?;
    let photos = photo_statement
        .query_map([], |row| {
            Ok(ReferencedFile {
                source_label: format!("Vehicle photo {}", row.get::<_, String>(0)?),
                path: row.get(1)?,
            })
        })
        .map_err(|_| "Could not read vehicle photo references.".to_string())?;
    files.extend(
        photos
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| "Could not parse vehicle photo references.".to_string())?,
    );

    let mut document_statement = connection
        .prepare(
            "
            SELECT id, file_path
            FROM vehicle_documents
            WHERE deleted_at IS NULL
            ",
        )
        .map_err(|_| "Could not inspect document references.".to_string())?;
    let documents = document_statement
        .query_map([], |row| {
            Ok(ReferencedFile {
                source_label: format!("Vehicle document {}", row.get::<_, String>(0)?),
                path: row.get(1)?,
            })
        })
        .map_err(|_| "Could not read document references.".to_string())?;
    files.extend(
        documents
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| "Could not parse document references.".to_string())?,
    );

    Ok(files)
}

fn record_backup_history(
    database_path: &Path,
    id: &str,
    backup_path: &Path,
    status: &str,
    size_bytes: Option<i64>,
    notes: &str,
    completed: bool,
) -> Result<(), String> {
    let connection = db::open_database_at_path(database_path)?;
    connection
        .execute(
            "
            INSERT INTO backups (
              id,
              backup_path,
              status,
              completed_at,
              verified_at,
              size_bytes,
              notes
            )
            VALUES (?1, ?2, ?3, CASE WHEN ?4 THEN datetime('now') ELSE NULL END, CASE WHEN ?4 THEN datetime('now') ELSE NULL END, ?5, ?6)
            ",
            params![
                id,
                backup_path.display().to_string(),
                status,
                completed,
                size_bytes,
                notes
            ],
        )
        .map_err(|_| "Could not record backup history.".to_string())?;

    Ok(())
}

fn current_timestamp(database_path: &Path) -> Result<String, String> {
    let connection = db::open_database_at_path(database_path)?;
    connection
        .query_row("SELECT datetime('now')", [], |row| row.get(0))
        .map_err(|_| "Could not timestamp the backup manifest.".to_string())
}

fn normalize_relative_path(path: &Path) -> Result<String, String> {
    if !is_safe_relative_path(path) {
        return Err("Could not prepare a safe backup path.".to_string());
    }

    Ok(path
        .components()
        .filter_map(|component| match component {
            Component::Normal(part) => Some(part.to_string_lossy().to_string()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/"))
}

fn is_safe_relative_path(path: &Path) -> bool {
    path.components().all(|component| match component {
        Component::Normal(_) | Component::CurDir => true,
        Component::ParentDir | Component::RootDir | Component::Prefix(_) => false,
    })
}

fn issue(severity: &str, code: &str, message: &str, path: Option<&Path>) -> FileIntegrityIssue {
    FileIntegrityIssue {
        severity: severity.to_string(),
        code: code.to_string(),
        message: message.to_string(),
        path: path.map(|path| path.display().to_string()),
    }
}

#[derive(Debug)]
struct ReferencedFile {
    source_label: String,
    path: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_context() -> (tempfile::TempDir, BackupContext) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let app_data_dir = temp_dir.path().join("app-data");
        fs::create_dir_all(&app_data_dir).expect("app data should be created");
        let database_path = app_data_dir.join(DATABASE_FILE_NAME);
        db::initialize_database_at_path(&database_path).expect("database should initialize");

        let context = BackupContext::new(app_data_dir, database_path, "0.1.0-test".to_string());
        (temp_dir, context)
    }

    fn seed_backup_data(context: &BackupContext) {
        let connection =
            db::open_database_at_path(&context.database_path).expect("database should open");
        fs::create_dir_all(context.app_data_dir.join("vehicle-photos"))
            .expect("vehicle photos folder should exist");
        fs::create_dir_all(context.app_data_dir.join("fuel-receipts"))
            .expect("fuel receipts folder should exist");
        fs::create_dir_all(context.app_data_dir.join("maintenance-receipts"))
            .expect("maintenance receipts folder should exist");
        fs::create_dir_all(context.app_data_dir.join("maintenance-photos"))
            .expect("maintenance photos folder should exist");

        let vehicle_photo = context
            .app_data_dir
            .join("vehicle-photos")
            .join("front.jpg");
        let fuel_receipt = context.app_data_dir.join("fuel-receipts").join("fuel.pdf");
        let maintenance_receipt = context
            .app_data_dir
            .join("maintenance-receipts")
            .join("service.pdf");
        let maintenance_photo = context
            .app_data_dir
            .join("maintenance-photos")
            .join("before.jpg");
        fs::write(&vehicle_photo, b"vehicle").expect("vehicle photo should write");
        fs::write(&fuel_receipt, b"fuel").expect("fuel receipt should write");
        fs::write(&maintenance_receipt, b"maintenance").expect("maintenance receipt should write");
        fs::write(&maintenance_photo, b"photo").expect("maintenance photo should write");

        connection
            .execute(
                "
                INSERT INTO vehicles (
                  id,
                  vehicle_name,
                  vehicle_type,
                  fuel_type,
                  transmission_type,
                  drivetrain,
                  current_odometer,
                  status
                )
                VALUES ('vehicle-1', 'Backup Van', 'van', 'diesel', 'automatic', 'fwd', 1000, 'active')
                ",
                [],
            )
            .expect("vehicle should insert");
        connection
            .execute(
                "
                INSERT INTO vehicle_photos (
                  id,
                  vehicle_id,
                  file_path,
                  original_filename,
                  is_primary
                )
                VALUES ('photo-1', 'vehicle-1', ?1, 'front.jpg', 1)
                ",
                params![vehicle_photo.display().to_string()],
            )
            .expect("photo should insert");
        connection
            .execute(
                "
                INSERT INTO vehicle_documents (
                  id,
                  vehicle_id,
                  document_type,
                  file_path,
                  original_filename
                )
                VALUES ('fuel-doc-1', 'vehicle-1', 'fuel_receipt', ?1, 'fuel.pdf')
                ",
                params![fuel_receipt.display().to_string()],
            )
            .expect("fuel document should insert");
        connection
            .execute(
                "
                INSERT INTO vehicle_documents (
                  id,
                  vehicle_id,
                  document_type,
                  file_path,
                  original_filename
                )
                VALUES ('maintenance-doc-1', 'vehicle-1', 'maintenance_receipt', ?1, 'service.pdf')
                ",
                params![maintenance_receipt.display().to_string()],
            )
            .expect("maintenance document should insert");
        connection
            .execute(
                "
                INSERT INTO vehicle_photos (
                  id,
                  vehicle_id,
                  file_path,
                  original_filename,
                  is_primary
                )
                VALUES ('maintenance-photo-1', 'vehicle-1', ?1, 'before.jpg', 0)
                ",
                params![maintenance_photo.display().to_string()],
            )
            .expect("maintenance photo should insert");
    }

    #[test]
    fn creates_backup_package_with_manifest_database_and_managed_files() {
        let (_temp_dir, context) = setup_context();
        seed_backup_data(&context);

        let backup = create_backup(&context).expect("backup should create");
        let package = PathBuf::from(&backup.backup_path);

        assert!(package.join(MANIFEST_FILE_NAME).exists());
        assert!(package.join(DATABASE_PACKAGE_PATH).exists());
        assert!(package.join("files/vehicle-photos/front.jpg").exists());
        assert!(package.join("files/fuel-receipts/fuel.pdf").exists());
        assert!(package
            .join("files/maintenance-receipts/service.pdf")
            .exists());
        assert!(package.join("files/maintenance-photos/before.jpg").exists());
        assert!(backup.manifest.file_count >= 5);
        assert!(backup.manifest.total_size_bytes > 0);
    }

    #[test]
    fn backup_database_opens_and_contains_expected_data() {
        let (_temp_dir, context) = setup_context();
        seed_backup_data(&context);

        let backup = create_backup(&context).expect("backup should create");
        let backup_database = PathBuf::from(&backup.backup_path).join(DATABASE_PACKAGE_PATH);
        validate_database_snapshot(&backup_database).expect("snapshot should validate");

        let connection = db::open_database_at_path(&backup_database).expect("snapshot opens");
        let vehicle_name: String = connection
            .query_row(
                "SELECT vehicle_name FROM vehicles WHERE id = 'vehicle-1'",
                [],
                |row| row.get(0),
            )
            .expect("vehicle should exist");
        assert_eq!(vehicle_name, "Backup Van");
    }

    #[test]
    fn backup_validation_catches_missing_manifest_database_unsupported_version_and_checksum() {
        let (_temp_dir, context) = setup_context();
        seed_backup_data(&context);
        let backup = create_backup(&context).expect("backup should create");
        let package = PathBuf::from(&backup.backup_path);

        assert!(validate_backup_package(&package).valid);

        let missing_manifest = context.backup_root_dir.join("missing-manifest.tog5backup");
        fs::create_dir_all(&missing_manifest).expect("package should create");
        assert!(!validate_backup_package(&missing_manifest).valid);

        let missing_database = context.backup_root_dir.join("missing-database.tog5backup");
        copy_directory_contents(&package, &missing_database).expect("package should copy");
        fs::remove_file(missing_database.join(DATABASE_PACKAGE_PATH))
            .expect("database should remove");
        assert!(validate_backup_package(&missing_database)
            .issues
            .iter()
            .any(|issue| issue.code == "database_missing"));

        let unsupported = context.backup_root_dir.join("unsupported.tog5backup");
        copy_directory_contents(&package, &unsupported).expect("package should copy");
        let mut manifest =
            read_manifest(&unsupported.join(MANIFEST_FILE_NAME)).expect("manifest should read");
        manifest.format_version = 999;
        write_manifest(&unsupported, &manifest).expect("manifest should write");
        assert!(validate_backup_package(&unsupported)
            .issues
            .iter()
            .any(|issue| issue.code == "unsupported_format_version"));

        fs::write(package.join("files/vehicle-photos/front.jpg"), b"changed")
            .expect("file should change");
        assert!(validate_backup_package(&package)
            .issues
            .iter()
            .any(|issue| issue.code == "size_mismatch" || issue.code == "checksum_mismatch"));
    }

    #[test]
    fn backup_validation_rejects_path_traversal_manifest_entries() {
        let (_temp_dir, context) = setup_context();
        seed_backup_data(&context);
        let backup = create_backup(&context).expect("backup should create");
        let package = PathBuf::from(&backup.backup_path);
        let mut manifest =
            read_manifest(&package.join(MANIFEST_FILE_NAME)).expect("manifest should read");
        manifest.files.push(BackupManifestFile {
            path: "../evil.txt".to_string(),
            size_bytes: 1,
            checksum: "bad".to_string(),
        });
        write_manifest(&package, &manifest).expect("manifest should write");

        assert!(validate_backup_package(&package)
            .issues
            .iter()
            .any(|issue| issue.code == "path_traversal"));
    }

    #[test]
    fn restore_applies_validated_backup_and_creates_safety_backup() {
        let (_source_temp, source_context) = setup_context();
        seed_backup_data(&source_context);
        let backup = create_backup(&source_context).expect("backup should create");

        let (_target_temp, target_context) = setup_context();
        let target_connection =
            db::open_database_at_path(&target_context.database_path).expect("target opens");
        target_connection
            .execute(
                "
                INSERT INTO vehicles (
                  id,
                  vehicle_name,
                  vehicle_type,
                  fuel_type,
                  current_odometer,
                  status
                )
                VALUES ('old-vehicle', 'Old Data', 'van', 'diesel', 0, 'active')
                ",
                [],
            )
            .expect("old vehicle should insert");
        drop(target_connection);

        let response = restore_backup(
            &target_context,
            RestoreBackupRequest {
                backup_path: backup.backup_path.clone(),
                confirm_restore: true,
            },
        )
        .expect("restore should apply");

        assert!(response.restart_required);
        assert!(Path::new(&response.safety_backup_path).exists());
        assert!(target_context
            .app_data_dir
            .join("vehicle-photos/front.jpg")
            .exists());

        let restored = db::open_database_at_path(&target_context.database_path)
            .expect("restored database opens");
        let restored_name: String = restored
            .query_row(
                "SELECT vehicle_name FROM vehicles WHERE id = 'vehicle-1'",
                [],
                |row| row.get(0),
            )
            .expect("restored vehicle exists");
        assert_eq!(restored_name, "Backup Van");
    }

    #[test]
    fn failed_validation_does_not_replace_existing_data() {
        let (_target_temp, target_context) = setup_context();
        let target_connection =
            db::open_database_at_path(&target_context.database_path).expect("target opens");
        target_connection
            .execute(
                "
                INSERT INTO vehicles (
                  id,
                  vehicle_name,
                  vehicle_type,
                  fuel_type,
                  current_odometer,
                  status
                )
                VALUES ('old-vehicle', 'Old Data', 'van', 'diesel', 0, 'active')
                ",
                [],
            )
            .expect("old vehicle should insert");
        drop(target_connection);

        let invalid_package = target_context.backup_root_dir.join("invalid.tog5backup");
        fs::create_dir_all(&invalid_package).expect("invalid package should create");

        let error = restore_backup(
            &target_context,
            RestoreBackupRequest {
                backup_path: invalid_package.display().to_string(),
                confirm_restore: true,
            },
        )
        .expect_err("invalid restore should fail");
        assert!(error.contains("validation failed"));

        let database = db::open_database_at_path(&target_context.database_path)
            .expect("target database opens");
        let old_name: String = database
            .query_row(
                "SELECT vehicle_name FROM vehicles WHERE id = 'old-vehicle'",
                [],
                |row| row.get(0),
            )
            .expect("old data remains");
        assert_eq!(old_name, "Old Data");
    }

    #[test]
    fn local_file_safety_reports_missing_references_and_folder_counts() {
        let (_temp_dir, context) = setup_context();
        seed_backup_data(&context);
        let missing_path = context.app_data_dir.join("vehicle-photos/missing.jpg");
        let connection = db::open_database_at_path(&context.database_path).expect("database opens");
        connection
            .execute(
                "
                INSERT INTO vehicle_photos (
                  id,
                  vehicle_id,
                  file_path,
                  original_filename,
                  is_primary
                )
                VALUES ('missing-photo', 'vehicle-1', ?1, 'missing.jpg', 0)
                ",
                params![missing_path.display().to_string()],
            )
            .expect("missing photo should insert");

        let summary = local_file_safety_summary(&context).expect("summary should load");
        assert!(summary
            .managed_folders
            .iter()
            .any(|folder| folder.folder_name == "vehicle-photos" && folder.file_count >= 1));
        assert_eq!(summary.missing_reference_count, 1);
        assert!(summary
            .issues
            .iter()
            .any(|issue| issue.code == "referenced_file_missing"));
    }
}

import { invoke } from "./client";

const backupCommands = {
  create: "create_backup",
  validate: "validate_backup_file",
  restore: "restore_backup",
  list: "list_backups",
  safetySummary: "get_local_file_safety_summary",
} as const;

export type BackupManifestFile = {
  path: string;
  sizeBytes: number;
  checksum: string;
};

export type BackupManifest = {
  appName: string;
  appVersion: string;
  formatVersion: number;
  createdAt: string;
  databaseFileName: string;
  includedFolders: string[];
  fileCount: number;
  totalSizeBytes: number;
  checksumAlgorithm: string;
  files: BackupManifestFile[];
};

export type FileIntegrityIssue = {
  severity: "warning" | "error" | string;
  code: string;
  message: string;
  path?: string | null;
};

export type BackupPackageResponse = {
  id: string;
  backupPath: string;
  manifest: BackupManifest;
  sizeBytes: number;
  status: string;
  message: string;
};

export type BackupValidationResult = {
  backupPath: string;
  valid: boolean;
  manifest?: BackupManifest | null;
  issues: FileIntegrityIssue[];
};

export type RestoreBackupRequest = {
  backupPath: string;
  confirmRestore: boolean;
};

export type RestoreBackupResponse = {
  restored: boolean;
  restartRequired: boolean;
  restoredFrom: string;
  safetyBackupPath: string;
  message: string;
};

export type BackupHistoryRecord = {
  id: string;
  backupPath: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  verifiedAt?: string | null;
  sizeBytes?: number | null;
  notes?: string | null;
};

export type ManagedFolderSummary = {
  folderName: string;
  folderPath: string;
  exists: boolean;
  fileCount: number;
  totalSizeBytes: number;
};

export type LocalFileSafetySummary = {
  databasePath: string;
  databaseExists: boolean;
  managedFolders: ManagedFolderSummary[];
  referencedFileCount: number;
  missingReferenceCount: number;
  issues: FileIntegrityIssue[];
};

export async function createBackup(): Promise<BackupPackageResponse> {
  return invoke<BackupPackageResponse>(backupCommands.create);
}

export async function validateBackupFile(backupPath: string): Promise<BackupValidationResult> {
  return invoke<BackupValidationResult>(backupCommands.validate, { backupPath });
}

export async function restoreBackup(request: RestoreBackupRequest): Promise<RestoreBackupResponse> {
  return invoke<RestoreBackupResponse>(backupCommands.restore, { request });
}

export async function listBackups(): Promise<BackupHistoryRecord[]> {
  return invoke<BackupHistoryRecord[]>(backupCommands.list);
}

export async function getLocalFileSafetySummary(): Promise<LocalFileSafetySummary> {
  return invoke<LocalFileSafetySummary>(backupCommands.safetySummary);
}

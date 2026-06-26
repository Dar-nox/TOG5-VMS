import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBackup,
  getLocalFileSafetySummary,
  listBackups,
  restoreBackup,
  validateBackupFile,
  type BackupHistoryRecord,
  type BackupPackageResponse,
  type BackupValidationResult,
  type FileIntegrityIssue,
  type LocalFileSafetySummary,
} from "../../services/api/backup";

export function BackupRestoreModule() {
  const [safetySummary, setSafetySummary] = useState<LocalFileSafetySummary | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryRecord[]>([]);
  const [selectedBackupPath, setSelectedBackupPath] = useState("");
  const [validation, setValidation] = useState<BackupValidationResult | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupPackageResponse | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const latestBackup = useMemo(() => backupHistory[0] ?? null, [backupHistory]);

  const loadBackupData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [summary, history] = await Promise.all([getLocalFileSafetySummary(), listBackups()]);
      setSafetySummary(summary);
      setBackupHistory(history);
      setSelectedBackupPath((currentPath) => currentPath || history[0]?.backupPath || "");
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBackupData();
  }, [loadBackupData]);

  const handleCreateBackup = useCallback(async () => {
    setCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setValidation(null);

    try {
      const backup = await createBackup();
      setLastBackup(backup);
      setSelectedBackupPath(backup.backupPath);
      setSuccessMessage(`Backup created: ${backup.backupPath}`);
      await loadBackupData();
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setCreating(false);
    }
  }, [loadBackupData]);

  const handleValidate = useCallback(async () => {
    if (!selectedBackupPath.trim()) {
      setErrorMessage("Enter a backup package path before validating.");
      return;
    }

    setValidating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setRestoreConfirmation(false);

    try {
      const result = await validateBackupFile(selectedBackupPath);
      setValidation(result);
      setSuccessMessage(
        result.valid
          ? "Backup validation passed. Review the details before restoring."
          : "Backup validation found issues. Restore is disabled until they are fixed.",
      );
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setValidating(false);
    }
  }, [selectedBackupPath]);

  const handleRestore = useCallback(async () => {
    if (!validation?.valid) {
      setErrorMessage("Validate a backup successfully before restoring.");
      return;
    }

    if (!restoreConfirmation) {
      setErrorMessage("Confirm the restore warning before continuing.");
      return;
    }

    setRestoring(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await restoreBackup({
        backupPath: selectedBackupPath,
        confirmRestore: true,
      });
      setSuccessMessage(`${response.message} Safety backup: ${response.safetyBackupPath}`);
      setRestoreConfirmation(false);
      await loadBackupData();
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setRestoring(false);
    }
  }, [loadBackupData, restoreConfirmation, selectedBackupPath, validation?.valid]);

  return (
    <div className="backup-module">
      <section className="backup-workspace">
        <div className="backup-header">
          <div>
            <h2>Backup & Restore</h2>
            <p>
              Create local backup packages for the SQLite database and app-managed files. Restore
              validates the package and creates a safety backup first.
            </p>
          </div>

          <button
            className="primary-button"
            disabled={creating}
            type="button"
            onClick={() => void handleCreateBackup()}
          >
            {creating ? "Creating backup..." : "Create backup"}
          </button>
        </div>

        {loading ? <div className="maintenance-empty-note">Checking local files...</div> : null}
        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}
        {successMessage ? <div className="backup-success-note">{successMessage}</div> : null}

        <BackupStatusPanel
          lastBackup={lastBackup}
          latestHistory={latestBackup}
          safetySummary={safetySummary}
        />

        <div className="backup-grid">
          <LocalFileSafetyPanel summary={safetySummary} />
          <RestorePanel
            backupHistory={backupHistory}
            restoring={restoring}
            restoreConfirmation={restoreConfirmation}
            selectedBackupPath={selectedBackupPath}
            validating={validating}
            validation={validation}
            onConfirmChange={setRestoreConfirmation}
            onPathChange={(value) => {
              setSelectedBackupPath(value);
              setValidation(null);
              setRestoreConfirmation(false);
            }}
            onRestore={() => void handleRestore()}
            onValidate={() => void handleValidate()}
          />
        </div>

        <BackupHistoryPanel
          history={backupHistory}
          onSelectBackup={(path) => {
            setSelectedBackupPath(path);
            setValidation(null);
            setRestoreConfirmation(false);
          }}
        />
      </section>
    </div>
  );
}

function BackupStatusPanel(props: {
  safetySummary: LocalFileSafetySummary | null;
  latestHistory: BackupHistoryRecord | null;
  lastBackup: BackupPackageResponse | null;
}) {
  const issueCount = props.safetySummary?.issues.length ?? 0;
  const missingReferences = props.safetySummary?.missingReferenceCount ?? 0;

  return (
    <div className="backup-summary-grid" aria-label="Backup status summary">
      <BackupMetric
        label="Database"
        value={props.safetySummary?.databaseExists ? "Found" : "Missing"}
      />
      <BackupMetric
        label="Managed files"
        value={`${totalManagedFiles(props.safetySummary).toLocaleString()} files`}
      />
      <BackupMetric label="Missing references" value={missingReferences.toLocaleString()} />
      <BackupMetric label="Safety warnings" value={issueCount.toLocaleString()} />
      <BackupMetric
        label="Latest backup"
        value={props.lastBackup?.manifest.createdAt ?? props.latestHistory?.completedAt ?? "None"}
      />
    </div>
  );
}

function BackupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="backup-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LocalFileSafetyPanel({ summary }: { summary: LocalFileSafetySummary | null }) {
  return (
    <section className="backup-panel">
      <div>
        <h3>Local file safety</h3>
        <p>Checks the database and app-managed folders used by vehicle photos and receipts.</p>
      </div>

      {summary ? (
        <>
          <div className="backup-path-note">
            <strong>Database</strong>
            <span>{summary.databasePath}</span>
          </div>

          <div className="backup-folder-list">
            {summary.managedFolders.map((folder) => (
              <div className="backup-folder-row" key={folder.folderName}>
                <div>
                  <strong>{labelFromKey(folder.folderName)}</strong>
                  <span>{folder.folderPath}</span>
                </div>
                <em>{folder.exists ? `${folder.fileCount} files` : "Not created yet"}</em>
              </div>
            ))}
          </div>

          <IssueList issues={summary.issues} emptyText="No local file safety issues found." />
        </>
      ) : (
        <div className="maintenance-empty-note">Local file safety summary is loading.</div>
      )}
    </section>
  );
}

function RestorePanel(props: {
  backupHistory: BackupHistoryRecord[];
  selectedBackupPath: string;
  validation: BackupValidationResult | null;
  validating: boolean;
  restoring: boolean;
  restoreConfirmation: boolean;
  onPathChange: (value: string) => void;
  onValidate: () => void;
  onRestore: () => void;
  onConfirmChange: (value: boolean) => void;
}) {
  return (
    <section className="backup-panel">
      <div>
        <h3>Validate and restore</h3>
        <p>
          Restore replaces local app data only after validation and confirmation. Restart is
          required after restore.
        </p>
      </div>

      <label className="form-field">
        <span>Backup package path</span>
        <input
          list="backup-history-paths"
          type="text"
          value={props.selectedBackupPath}
          onChange={(event) => props.onPathChange(event.target.value)}
        />
      </label>
      <datalist id="backup-history-paths">
        {props.backupHistory.map((backup) => (
          <option key={backup.id} value={backup.backupPath} />
        ))}
      </datalist>

      <div className="backup-action-row">
        <button
          className="secondary-button"
          disabled={props.validating}
          type="button"
          onClick={props.onValidate}
        >
          {props.validating ? "Validating..." : "Validate backup"}
        </button>
      </div>

      {props.validation ? <ValidationResultCard validation={props.validation} /> : null}

      <label className="backup-confirm-row">
        <input
          checked={props.restoreConfirmation}
          type="checkbox"
          onChange={(event) => props.onConfirmChange(event.target.checked)}
        />
        <span>
          I understand restore will replace local app data after creating a safety backup, and the
          app should be restarted afterward.
        </span>
      </label>

      <div className="backup-action-row">
        <button
          className="danger-button"
          disabled={!props.validation?.valid || !props.restoreConfirmation || props.restoring}
          type="button"
          onClick={props.onRestore}
        >
          {props.restoring ? "Restoring..." : "Restore validated backup"}
        </button>
      </div>
    </section>
  );
}

function ValidationResultCard({ validation }: { validation: BackupValidationResult }) {
  return (
    <div className={validation.valid ? "backup-success-note" : "inline-error"}>
      <strong>{validation.valid ? "Backup is valid" : "Backup needs attention"}</strong>
      {validation.manifest ? (
        <span>
          {validation.manifest.fileCount} files / {formatBytes(validation.manifest.totalSizeBytes)}{" "}
          / created {validation.manifest.createdAt}
        </span>
      ) : null}
      <IssueList issues={validation.issues} emptyText="No validation issues found." />
    </div>
  );
}

function BackupHistoryPanel(props: {
  history: BackupHistoryRecord[];
  onSelectBackup: (path: string) => void;
}) {
  return (
    <section className="backup-panel">
      <div>
        <h3>Backup history</h3>
        <p>Local backup and restore records saved in the SQLite database.</p>
      </div>

      {props.history.length === 0 ? (
        <div className="maintenance-empty-note">No backup history yet.</div>
      ) : (
        <div className="backup-history-list">
          {props.history.map((backup) => (
            <article className="backup-history-card" key={backup.id}>
              <div>
                <div className="maintenance-card-heading">
                  <span className="maintenance-category">{backup.status}</span>
                  <span className="priority-pill">{formatBytes(backup.sizeBytes ?? 0)}</span>
                </div>
                <h3>{backup.completedAt ?? backup.startedAt}</h3>
                <p>{backup.backupPath}</p>
                {backup.notes ? (
                  <div className="maintenance-action-note">{backup.notes}</div>
                ) : null}
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => props.onSelectBackup(backup.backupPath)}
              >
                Use this path
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function IssueList({ issues, emptyText }: { issues: FileIntegrityIssue[]; emptyText: string }) {
  if (issues.length === 0) {
    return <div className="maintenance-empty-note">{emptyText}</div>;
  }

  return (
    <div className="backup-issue-list">
      {issues.map((issue) => (
        <div className={`backup-issue ${issue.severity}`} key={`${issue.code}-${issue.path ?? ""}`}>
          <strong>{issue.message}</strong>
          {issue.path ? <span>{issue.path}</span> : null}
        </div>
      ))}
    </div>
  );
}

function totalManagedFiles(summary: LocalFileSafetySummary | null) {
  return summary?.managedFolders.reduce((total, folder) => total + folder.fileCount, 0) ?? 0;
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function labelFromKey(value: string) {
  return value
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

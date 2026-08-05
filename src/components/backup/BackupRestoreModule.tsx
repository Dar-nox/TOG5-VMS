import { useCallback, useEffect, useState } from "react";
import {
  exportAllData,
  getStorageSummary,
  listExports,
  type ExportHistoryRecord,
  type ExportSummary,
  type StorageSummary,
} from "../../services/api/backup";

/**
 * The old version of this screen made and restored zip files on somebody's
 * disk. There is no disk any more, and a browser cannot put a database back —
 * so this screen explains where the records actually are and lets anyone take
 * a copy for themselves.
 */
export function BackupRestoreModule() {
  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const [lastExport, setLastExport] = useState<ExportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [exports, storageSummary] = await Promise.all([listExports(), getStorageSummary()]);
      setHistory(exports);
      setStorage(storageSummary);
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setErrorMessage(null);

    try {
      setLastExport(await exportAllData());
      await loadPageData();
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setExporting(false);
    }
  }, [loadPageData]);

  return (
    <div className="backup-module">
      <section className="backup-workspace">
        <div className="backup-header">
          <div>
            <h2>Backup</h2>
            <p>Where the records are kept, and how to hold a copy of your own.</p>
          </div>

          <button
            className="primary-button"
            disabled={exporting}
            type="button"
            onClick={() => void handleExport()}
          >
            {exporting ? "Exporting..." : "Export everything"}
          </button>
        </div>

        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

        {lastExport ? (
          <div className="backup-success-note">
            {lastExport.filename} downloaded — {lastExport.totalRecords.toLocaleString()} records,{" "}
            {formatSize(lastExport.sizeBytes)}. It is wherever this device saves downloads.
          </div>
        ) : null}

        <section className="settings-card">
          <div>
            <h3>Where your records live</h3>
            <p>
              Everything is on a hosted database rather than one computer. It is encrypted on the
              way there and where it sits, and everyone signed in sees the same records the moment
              they change.
            </p>
            <p>
              The plan this runs on takes no automatic copies. That is the reason for the button
              above: an export is the only copy of your records that you hold yourself, and it is
              worth taking one regularly.
            </p>
          </div>

          {storage ? (
            <div className="settings-path-list">
              <div className="settings-path-row">
                <strong>Photos</strong>
                <span>{storage.photoCount.toLocaleString()} stored as files</span>
              </div>
              <div className="settings-path-row">
                <strong>Receipts and documents</strong>
                <span>{storage.documentCount.toLocaleString()} stored as files</span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="settings-card">
          <div>
            <h3>What an export contains</h3>
            <p>
              One file holding every record: vehicles, trips, fuel, service history, reminders,
              expenses, alerts, and who did what. Photos and receipts are files rather than records
              and stay on the server — the export lists each one so nothing is unaccounted for.
            </p>
            <p>
              Putting an export back is not something the app can do by itself. If it ever comes to
              that, the file has everything needed to rebuild the fleet, and it should be handed to
              whoever looks after the system.
            </p>
          </div>
        </section>

        <section className="settings-card">
          <div>
            <h3>Recent exports</h3>
            <p>Taken by anyone signed in. This is what the reminder in Settings counts from.</p>
          </div>

          {loading ? (
            <div className="maintenance-empty-note">Loading...</div>
          ) : history.length === 0 ? (
            <div className="maintenance-empty-note">
              No export has been taken yet. Now would be a good time.
            </div>
          ) : (
            <div className="settings-user-list">
              {history.map((record) => (
                <div className="settings-user-row" key={record.id}>
                  <span>{new Date(record.createdAt).toLocaleString()}</span>
                  <em>{totalOf(record.recordCounts).toLocaleString()} records</em>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function totalOf(counts: Record<string, number>): number {
  return Object.values(counts ?? {}).reduce((sum, count) => sum + count, 0);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
